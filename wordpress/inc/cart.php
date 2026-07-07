<?php
/**
 * WooCommerce cart REST API for headless frontend.
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

add_action( 'rest_api_init', 'mmf_register_cart_routes' );

/**
 * Register cart REST routes.
 */
function mmf_register_cart_routes(): void {
	register_rest_route(
		'custom/v1',
		'/cart',
		array(
			array(
				'methods'             => 'GET',
				'callback'            => 'mmf_cart_get',
				'permission_callback' => 'mmf_cart_permission',
			),
			array(
				'methods'             => 'POST',
				'callback'            => 'mmf_cart_add',
				'permission_callback' => 'mmf_cart_permission',
			),
		)
	);

	register_rest_route(
		'custom/v1',
		'/cart/remove',
		array(
			'methods'             => 'POST',
			'callback'            => 'mmf_cart_remove',
			'permission_callback' => 'mmf_cart_permission',
		)
	);
}

/**
 * Cart routes require a logged-in customer.
 */
function mmf_cart_permission(): bool {
	return is_user_logged_in();
}

/**
 * Bootstrap WooCommerce session and cart for REST requests.
 */
function mmf_bootstrap_wc_cart(): bool {
	if ( ! function_exists( 'WC' ) ) {
		return false;
	}

	if ( null === WC()->session ) {
		$handler        = apply_filters( 'woocommerce_session_handler', 'WC_Session_Handler' );
		WC()->session   = new $handler();
		WC()->session->init();
	}

	if ( null === WC()->customer ) {
		WC()->customer = new WC_Customer( get_current_user_id(), true );
	}

	if ( null === WC()->cart ) {
		WC()->cart = new WC_Cart();
	}

	WC()->cart->get_cart_from_session();

	return true;
}

/**
 * Persist cart session after REST mutations.
 */
function mmf_save_wc_cart_session(): void {
	if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->session ) {
		return;
	}

	WC()->cart->calculate_totals();
	WC()->session->set_customer_session_cookie( true );
	WC()->session->save_data();
}

/**
 * Format cart payload for API responses.
 *
 * @return array
 */
function mmf_format_cart_response(): array {
	$cart = WC()->cart;
	$cart->calculate_totals();

	$items = array();

	foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {
		$product = $cart_item['data'];

		if ( ! $product || ! $product->exists() ) {
			continue;
		}

		$line_total = (float) $product->get_price() * (int) $cart_item['quantity'];

		$items[] = array(
			'key'        => $cart_item_key,
			'product_id' => (int) $cart_item['product_id'],
			'quantity'   => (int) $cart_item['quantity'],
			'sku'        => sanitize_text_field( (string) $product->get_sku() ),
			'name'       => $product->get_name(),
			'price'      => (float) wc_get_price_to_display( $product ),
			'line_total' => $line_total,
			'price_html' => wp_kses_post( wc_price( $line_total ) ),
			'url'        => get_permalink( $product->get_id() ),
		);
	}

	return array(
		'items'        => $items,
		'item_count'   => (int) $cart->get_cart_contents_count(),
		'subtotal'     => wp_kses_post( $cart->get_cart_subtotal() ),
		'total'        => wp_kses_post( $cart->get_total() ),
		'checkout_url' => esc_url_raw( wc_get_checkout_url() ),
		'cart_url'     => esc_url_raw( wc_get_cart_url() ),
	);
}

/**
 * GET /custom/v1/cart
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_cart_get() {
	if ( ! mmf_bootstrap_wc_cart() ) {
		return new WP_Error(
			'woocommerce_missing',
			'WooCommerce is not active.',
			array( 'status' => 500 )
		);
	}

	return rest_ensure_response( mmf_format_cart_response() );
}

/**
 * POST /custom/v1/cart
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_cart_add( WP_REST_Request $request ) {
	if ( ! mmf_bootstrap_wc_cart() ) {
		return new WP_Error(
			'woocommerce_missing',
			'WooCommerce is not active.',
			array( 'status' => 500 )
		);
	}

	$product_id = absint( $request->get_param( 'product_id' ) );
	$sku        = sanitize_text_field( (string) $request->get_param( 'sku' ) );
	$quantity   = max( 1, absint( $request->get_param( 'quantity' ) ) );

	if ( ! $product_id && $sku ) {
		$product_id = (int) wc_get_product_id_by_sku( $sku );
	}

	if ( ! $product_id ) {
		return new WP_Error(
			'invalid_product',
			'A valid product is required.',
			array( 'status' => 400 )
		);
	}

	$product = wc_get_product( $product_id );

	if ( ! $product || ! $product->is_purchasable() ) {
		return new WP_Error(
			'product_unavailable',
			'This product cannot be added to your order.',
			array( 'status' => 400 )
		);
	}

	$cart_item_key = WC()->cart->add_to_cart( $product_id, $quantity );

	if ( ! $cart_item_key ) {
		return new WP_Error(
			'add_failed',
			'Unable to add this item to your order.',
			array( 'status' => 400 )
		);
	}

	mmf_save_wc_cart_session();

	return rest_ensure_response(
		array(
			'message'       => 'Item added to your order.',
			'cart_item_key' => $cart_item_key,
			'cart'          => mmf_format_cart_response(),
		)
	);
}

/**
 * POST /custom/v1/cart/remove
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_cart_remove( WP_REST_Request $request ) {
	if ( ! mmf_bootstrap_wc_cart() ) {
		return new WP_Error(
			'woocommerce_missing',
			'WooCommerce is not active.',
			array( 'status' => 500 )
		);
	}

	$cart_item_key = sanitize_text_field( (string) $request->get_param( 'cart_item_key' ) );

	if ( empty( $cart_item_key ) ) {
		return new WP_Error(
			'missing_key',
			'Cart item key is required.',
			array( 'status' => 400 )
		);
	}

	$removed = WC()->cart->remove_cart_item( $cart_item_key );

	if ( ! $removed ) {
		return new WP_Error(
			'remove_failed',
			'Unable to remove this item from your order.',
			array( 'status' => 400 )
		);
	}

	mmf_save_wc_cart_session();

	return rest_ensure_response(
		array(
			'message' => 'Item removed from your order.',
			'cart'    => mmf_format_cart_response(),
		)
	);
}
