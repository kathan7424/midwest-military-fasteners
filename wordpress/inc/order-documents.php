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

	register_rest_route(
		'custom/v1',
		'/orders',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_customer_order_history',
			'permission_callback' => 'is_user_logged_in',
		)
	);

	register_rest_route(
		'custom/v1',
		'/orders/(?P<id>\d+)',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_single_order_detail',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'id' => array(
					'validate_callback' => function ( $param ) {
						return is_numeric( $param );
					},
				),
			),
		)
	);
}

/**
 * Shipment tracking entries for an order — Shippo-plugin friendly.
 *
 * The Shippo for WooCommerce plugin (and the common Shipment Tracking /
 * Advanced Shipment Tracking plugins) each store tracking differently.
 * This reads every known location so the API keeps working no matter
 * which plugin fulfils the order. Extend via `mmf_order_tracking_entries`.
 *
 * @param WC_Order $order Order.
 * @return array<int, array{tracking_number:string, carrier:string, url:string, date_shipped:string}>
 */
function mmf_get_order_tracking( WC_Order $order ): array {
	$entries = array();

	// 1. Shipment Tracking / AST plugins — array of tracking items.
	$st_items = $order->get_meta( '_wc_shipment_tracking_items' );
	if ( is_array( $st_items ) ) {
		foreach ( $st_items as $st_item ) {
			$number = sanitize_text_field( (string) ( $st_item['tracking_number'] ?? '' ) );
			if ( $number === '' ) {
				continue;
			}

			$carrier = sanitize_text_field(
				(string) ( $st_item['tracking_provider'] ?: ( $st_item['custom_tracking_provider'] ?? '' ) )
			);

			$date_shipped = '';
			if ( ! empty( $st_item['date_shipped'] ) && is_numeric( $st_item['date_shipped'] ) ) {
				$date_shipped = date_i18n( get_option( 'date_format' ), (int) $st_item['date_shipped'] );
			}

			$entries[] = array(
				'tracking_number' => $number,
				'carrier'         => $carrier,
				'url'             => esc_url_raw( (string) ( $st_item['custom_tracking_link'] ?? '' ) )
					?: mmf_carrier_tracking_url( $carrier, $number ),
				'date_shipped'    => $date_shipped,
			);
		}
	}

	// 2. Shippo plugin / generic single-value meta.
	if ( empty( $entries ) ) {
		$single_key_sets = array(
			array( '_shippo_tracking_number', '_shippo_carrier', '_shippo_tracking_url' ),
			array( 'shippo_tracking_number', 'shippo_carrier', 'shippo_tracking_url' ),
			array( '_tracking_number', '_tracking_provider', '_tracking_url' ),
		);

		foreach ( $single_key_sets as $keys ) {
			$number = sanitize_text_field( (string) $order->get_meta( $keys[0] ) );
			if ( $number === '' ) {
				continue;
			}

			$carrier = sanitize_text_field( (string) $order->get_meta( $keys[1] ) );

			$entries[] = array(
				'tracking_number' => $number,
				'carrier'         => $carrier,
				'url'             => esc_url_raw( (string) $order->get_meta( $keys[2] ) )
					?: mmf_carrier_tracking_url( $carrier, $number ),
				'date_shipped'    => '',
			);
			break;
		}
	}

	/**
	 * Filter the tracking entries exposed on the order APIs.
	 *
	 * @param array    $entries Tracking entries.
	 * @param WC_Order $order   Order.
	 */
	return apply_filters( 'mmf_order_tracking_entries', $entries, $order );
}

/**
 * Public tracking URL for the major US carriers (MMF ships domestic only).
 *
 * @param string $carrier Carrier name/slug as stored by the tracking plugin.
 * @param string $number  Tracking number.
 * @return string Empty string when the carrier is unknown.
 */
function mmf_carrier_tracking_url( string $carrier, string $number ): string {
	$number = rawurlencode( $number );

	switch ( strtolower( trim( $carrier ) ) ) {
		case 'ups':
			return 'https://www.ups.com/track?tracknum=' . $number;
		case 'fedex':
			return 'https://www.fedex.com/fedextrack/?trknbr=' . $number;
		case 'usps':
			return 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' . $number;
		case 'dhl':
		case 'dhl express':
			return 'https://www.dhl.com/us-en/home/tracking.html?tracking-id=' . $number;
		default:
			return '';
	}
}

/**
 * GET /custom/v1/orders — the customer's order history (WC standard data).
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_customer_order_history() {
	if ( ! function_exists( 'wc_get_orders' ) ) {
		return new WP_Error( 'woocommerce_missing', 'WooCommerce is not active.', array( 'status' => 500 ) );
	}

	$orders = wc_get_orders(
		array(
			'customer_id' => get_current_user_id(),
			'limit'       => 50,
			'orderby'     => 'date',
			'order'       => 'DESC',
		)
	);

	$history = array();

	foreach ( $orders as $order ) {
		if ( ! $order instanceof WC_Order ) {
			continue;
		}

		$items        = array();
		$certificates = array();
		$order_status = $order->get_status();

		// Certificates are only available after the order ships (shipped/completed).
		$certs_available = in_array( $order_status, array( 'completed', 'shipped' ), true );

		foreach ( $order->get_items() as $item ) {
			$items[] = array(
				'name'     => $item->get_name(),
				'quantity' => (int) $item->get_quantity(),
			);

			if ( $certs_available ) {
				$docs = mmf_get_line_item_documents( $item );
				if ( $docs['certificate_file_url'] && ! in_array( $docs['certificate_file_url'], $certificates, true ) ) {
					$certificates[] = $docs['certificate_file_url'];
				}
			}
		}

		$date = $order->get_date_created();

		$history[] = array(
			'order_id'             => $order->get_id(),
			'order_number'         => $order->get_order_number(),
			'date'                 => $date ? $date->date_i18n( get_option( 'date_format' ) ) : '',
			'status'               => $order->get_status(),
			'status_label'         => wc_get_order_status_name( $order->get_status() ),
			'total'                => mmf_plain_price( (float) $order->get_total(), $order->get_currency() ),
			'payment_method_title' => $order->get_payment_method_title(),
			'item_count'           => (int) $order->get_item_count(),
			'items'                => $items,
			'certificates'         => $certificates,
			'tracking'             => mmf_get_order_tracking( $order ),
		);
	}

	return rest_ensure_response( array( 'orders' => $history ) );
}

/**
 * WooCommerce-formatted price as plain text for JSON APIs.
 *
 * wc_price() returns HTML ("<span>&#36;160.00</span>") — headless clients
 * render text, so tags are stripped AND entities decoded ("$160.00").
 * Symbol, position, decimals and separators still come from
 * WooCommerce → Settings → General (source of truth).
 *
 * @param float  $amount   Amount.
 * @param string $currency Currency code (defaults to store currency).
 * @return string
 */
function mmf_plain_price( float $amount, string $currency = '' ): string {
	$args = $currency ? array( 'currency' => $currency ) : array();

	return html_entity_decode(
		wp_strip_all_tags( wc_price( $amount, $args ) ),
		ENT_QUOTES,
		'UTF-8'
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
			'status'      => array( 'processing', 'completed', 'shipped' ),
			'limit'       => 20,
			'orderby'     => 'date',
			'order'       => 'DESC',
		)
	);

	$payload = array();

	foreach ( $orders as $order ) {
		$items        = array();
		$order_status = $order->get_status();

		// Certificates only after shipped/completed; spec sheets for any status.
		$certs_available = in_array( $order_status, array( 'completed', 'shipped' ), true );

		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product ) {
				continue;
			}

			$product = $item->get_product();
			$docs    = mmf_get_line_item_documents( $item );

			$spec_url = $docs['spec_file_url'];
			$cert_url = $certs_available ? $docs['certificate_file_url'] : '';

			if ( ! $spec_url && ! $cert_url ) {
				continue;
			}

			$items[] = array(
				'product_id'           => $product ? $product->get_id() : 0,
				'sku'                  => $product ? $product->get_sku() : '',
				'name'                 => $item->get_name(),
				'quantity'             => (int) $item->get_quantity(),
				'spec_file_url'        => $spec_url,
				'certificate_file_url' => $cert_url,
			);
		}

		if ( empty( $items ) ) {
			continue;
		}

		$payload[] = array(
			'order_id'     => $order->get_id(),
			'order_number' => $order->get_order_number(),
			'order_date'   => $order->get_date_created() ? $order->get_date_created()->date( 'Y-m-d' ) : '',
			'order_status' => $order_status,
			'items'        => $items,
		);
	}

	return rest_ensure_response(
		array(
			'orders' => $payload,
		)
	);
}

/**
 * GET /custom/v1/orders/{id} — single order detail (WC My Account → View Order).
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_single_order_detail( WP_REST_Request $request ) {
	if ( ! function_exists( 'wc_get_order' ) ) {
		return new WP_Error( 'woocommerce_missing', 'WooCommerce is not active.', array( 'status' => 500 ) );
	}

	$order_id = (int) $request->get_param( 'id' );
	$order    = wc_get_order( $order_id );

	if ( ! $order || ! $order instanceof WC_Order ) {
		return new WP_Error( 'not_found', 'Order not found.', array( 'status' => 404 ) );
	}

	if ( (int) $order->get_customer_id() !== get_current_user_id() ) {
		return new WP_Error( 'forbidden', 'You do not have access to this order.', array( 'status' => 403 ) );
	}

	$order_status   = $order->get_status();
	$certs_available = in_array( $order_status, array( 'completed', 'shipped' ), true );

	$line_items = array();
	foreach ( $order->get_items() as $item ) {
		$product = $item->get_product();
		$docs    = mmf_get_line_item_documents( $item );

		$line_items[] = array(
			'product_id'           => $product ? $product->get_id() : 0,
			'sku'                  => $product ? $product->get_sku() : '',
			'name'                 => $item->get_name(),
			'quantity'             => (int) $item->get_quantity(),
			'subtotal'             => mmf_plain_price( (float) $item->get_subtotal(), $order->get_currency() ),
			'total'                => mmf_plain_price( (float) $item->get_total(), $order->get_currency() ),
			'spec_file_url'        => $docs['spec_file_url'],
			'certificate_file_url' => $certs_available ? $docs['certificate_file_url'] : '',
		);
	}

	$date = $order->get_date_created();

	return rest_ensure_response(
		array(
			'order_id'             => $order->get_id(),
			'order_number'         => $order->get_order_number(),
			'date'                 => $date ? $date->date_i18n( get_option( 'date_format' ) ) : '',
			'status'               => $order_status,
			'status_label'         => wc_get_order_status_name( $order_status ),
			'subtotal'             => mmf_plain_price( (float) $order->get_subtotal(), $order->get_currency() ),
			'shipping_total'       => mmf_plain_price( (float) $order->get_shipping_total(), $order->get_currency() ),
			'tax_total'            => mmf_plain_price( (float) $order->get_total_tax(), $order->get_currency() ),
			'discount_total'       => mmf_plain_price( (float) $order->get_discount_total(), $order->get_currency() ),
			'total'                => mmf_plain_price( (float) $order->get_total(), $order->get_currency() ),
			'payment_method'       => $order->get_payment_method(),
			'payment_method_title' => $order->get_payment_method_title(),
			'customer_note'        => $order->get_customer_note(),
			'tracking'             => mmf_get_order_tracking( $order ),
			'line_items'           => $line_items,
			'billing_address'      => array(
				'first_name' => $order->get_billing_first_name(),
				'last_name'  => $order->get_billing_last_name(),
				'company'    => $order->get_billing_company(),
				'address_1'  => $order->get_billing_address_1(),
				'address_2'  => $order->get_billing_address_2(),
				'city'       => $order->get_billing_city(),
				'state'      => $order->get_billing_state(),
				'postcode'   => $order->get_billing_postcode(),
				'country'    => $order->get_billing_country(),
				'email'      => $order->get_billing_email(),
				'phone'      => $order->get_billing_phone(),
			),
			'shipping_address'     => array(
				'first_name' => $order->get_shipping_first_name(),
				'last_name'  => $order->get_shipping_last_name(),
				'company'    => $order->get_shipping_company(),
				'address_1'  => $order->get_shipping_address_1(),
				'address_2'  => $order->get_shipping_address_2(),
				'city'       => $order->get_shipping_city(),
				'state'      => $order->get_shipping_state(),
				'postcode'   => $order->get_shipping_postcode(),
				'country'    => $order->get_shipping_country(),
			),
		)
	);
}
