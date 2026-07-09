<?php
/**
 * Post-purchase product documents — spec sheets + product certificates.
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

add_action( 'rest_api_init', 'mmf_register_order_documents_routes' );
add_action( 'woocommerce_checkout_create_order_line_item', 'mmf_store_order_line_item_documents', 10, 4 );

/**
 * Persist document URLs on the order line item at purchase time.
 *
 * @param WC_Order_Item_Product $item          Line item.
 * @param string                $cart_item_key Cart key.
 * @param array                 $values        Cart values.
 * @param WC_Order              $order         Order.
 */
function mmf_store_order_line_item_documents( $item, $cart_item_key, $values, $order ): void {
	$product_id = isset( $values['product_id'] ) ? (int) $values['product_id'] : 0;
	if ( $product_id <= 0 ) {
		return;
	}

	$spec_url = esc_url_raw( specparts_get_product_spec_url( $product_id ) );
	$cert_url = esc_url_raw( (string) get_post_meta( $product_id, '_certificate_file_url', true ) );

	if ( $spec_url ) {
		$item->add_meta_data( '_mmf_spec_file_url', $spec_url, true );
	}

	if ( $cert_url ) {
		$item->add_meta_data( '_mmf_certificate_file_url', $cert_url, true );
	}
}

/**
 * Register REST routes.
 */
function mmf_register_order_documents_routes(): void {
	register_rest_route(
		'custom/v1',
		'/orders/documents',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_customer_order_documents',
			'permission_callback' => 'is_user_logged_in',
		)
	);
}

/**
 * Resolve document URLs for a line item (order meta first, product fallback).
 *
 * @param WC_Order_Item_Product $item Line item.
 * @return array{spec_file_url:string,certificate_file_url:string}
 */
function mmf_get_line_item_documents( $item ): array {
	$spec_url = esc_url_raw( (string) $item->get_meta( '_mmf_spec_file_url', true ) );
	$cert_url = esc_url_raw( (string) $item->get_meta( '_mmf_certificate_file_url', true ) );

	$product = $item->get_product();
	if ( $product ) {
		if ( ! $spec_url ) {
			$spec_url = esc_url_raw( specparts_get_product_spec_url( $product->get_id() ) );
		}
		if ( ! $cert_url ) {
			$cert_url = esc_url_raw( (string) get_post_meta( $product->get_id(), '_certificate_file_url', true ) );
		}
	}

	return array(
		'spec_file_url'        => $spec_url,
		'certificate_file_url' => $cert_url,
	);
}

/**
 * GET /custom/v1/orders/documents
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_customer_order_documents() {
	if ( ! function_exists( 'wc_get_orders' ) ) {
		return new WP_Error( 'woocommerce_missing', 'WooCommerce is not active.', array( 'status' => 500 ) );
	}

	$user_id = get_current_user_id();
	$orders  = wc_get_orders(
		array(
			'customer_id' => $user_id,
			'status'      => array( 'processing', 'completed' ),
			'limit'       => 20,
			'orderby'     => 'date',
			'order'       => 'DESC',
		)
	);

	$payload = array();

	foreach ( $orders as $order ) {
		$items = array();

		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product ) {
				continue;
			}

			$product = $item->get_product();
			$docs    = mmf_get_line_item_documents( $item );

			if ( ! $docs['spec_file_url'] && ! $docs['certificate_file_url'] ) {
				continue;
			}

			$items[] = array(
				'product_id'           => $product ? $product->get_id() : 0,
				'sku'                  => $product ? $product->get_sku() : '',
				'name'                 => $item->get_name(),
				'quantity'             => (int) $item->get_quantity(),
				'spec_file_url'        => $docs['spec_file_url'],
				'certificate_file_url' => $docs['certificate_file_url'],
			);
		}

		if ( empty( $items ) ) {
			continue;
		}

		$payload[] = array(
			'order_id'     => $order->get_id(),
			'order_number' => $order->get_order_number(),
			'order_date'   => $order->get_date_created() ? $order->get_date_created()->date( 'Y-m-d' ) : '',
			'items'        => $items,
		);
	}

	return rest_ensure_response(
		array(
			'orders' => $payload,
		)
	);
}
