<?php
/**
 * WooCommerce cart REST API for headless frontend.
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

// Custom /custom/v1/cart endpoints removed — all cart operations now go
// through the WooCommerce Store API (/wc/store/v1/cart/*) which supports
// guest carts via Cart-Token. The old custom endpoints required login
// (mmf_cart_permission returned is_user_logged_in()) which blocked guest
// checkout — WooCommerce standard allows guest carts.

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

// ---------------------------------------------------------------------------
// WooCommerce Store API extension — exposes has_certificate per cart item
// so the headless checkout knows which items have a cert file available.
// No separate $0 product is created; the cert file URL lives on the physical
// product (_certificate_file_url meta). Opt-in is recorded at order time via
// the checkout extensions payload (woocommerce_store_api_register_update_callback).
// ---------------------------------------------------------------------------

add_action(
	'woocommerce_blocks_loaded',
	function () {
		// Cart item read extension — tells headless checkout if a cert is available.
		if ( function_exists( 'woocommerce_store_api_register_endpoint_data' ) ) {
			woocommerce_store_api_register_endpoint_data(
				array(
					'endpoint'        => Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema::IDENTIFIER,
					'namespace'       => 'mmf_cert',
					'data_callback'   => 'mmf_cert_store_api_data',
					'schema_callback' => 'mmf_cert_store_api_schema',
					'schema_type'     => ARRAY_A,
				)
			);
		}

		// Checkout update callback — captures the cert opt-in map from the
		// checkout POST body (extensions.mmf_cert.cert_opted_in) and stashes
		// it in the WC session so the line-item hook can read it.
		if ( function_exists( 'woocommerce_store_api_register_update_callback' ) ) {
			woocommerce_store_api_register_update_callback(
				array(
					'namespace' => 'mmf_cert',
					'callback'  => 'mmf_cert_checkout_update_callback',
				)
			);
		}
	}
);

/**
 * Request-scoped store for the cert opt-in map.
 *
 * In WC Blocks, the update_callback fires AFTER order line items are created.
 * Using a PHP global means the map is available in the same request even if
 * the session write happens too late for woocommerce_checkout_create_order_line_item.
 * The authoritative stamp is done in mmf_stamp_cert_opted_in_fallback (order-documents.php)
 * which runs on woocommerce_store_api_checkout_order_processed.
 *
 * @var array<string, bool>
 */
$mmf_cert_opted_in_request_map = array();

/**
 * Capture cert opt-in selections from the checkout POST.
 *
 * Stores in both a PHP global (same-request access) and the WC session
 * (cross-hook access). Called by the WC Store API update_callback mechanism.
 *
 * @param array $data extensions.mmf_cert from the checkout POST body.
 */
function mmf_cert_checkout_update_callback( array $data ): void {
	global $mmf_cert_opted_in_request_map;

	$opted_in = ( isset( $data['cert_opted_in'] ) && is_array( $data['cert_opted_in'] ) )
		? $data['cert_opted_in']
		: array();

	$mmf_cert_opted_in_request_map = $opted_in;

	if ( WC()->session ) {
		WC()->session->set( 'mmf_cert_opted_in', $opted_in );
	}
}

/**
 * Data injected into each Store API cart item under extensions.mmf_cert.
 *
 * @param array $cart_item Raw WC cart item array.
 * @return array
 */
function mmf_cert_store_api_data( array $cart_item ): array {
	$product_id      = isset( $cart_item['product_id'] ) ? (int) $cart_item['product_id'] : 0;
	$has_certificate = ! empty( get_post_meta( $product_id, '_certificate_file_url', true ) );

	return array(
		'has_certificate' => $has_certificate,
	);
}

/**
 * JSON Schema for extensions.mmf_cert on each Store API cart item.
 *
 * @return array
 */
function mmf_cert_store_api_schema(): array {
	return array(
		'has_certificate' => array(
			'description' => 'True when a certificate file is available for this product.',
			'type'        => 'boolean',
			'context'     => array( 'view', 'edit' ),
			'readonly'    => true,
		),
	);
}
