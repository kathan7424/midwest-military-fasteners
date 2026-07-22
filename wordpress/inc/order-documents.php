<?php
/**
 * Post-purchase product documents — spec sheets + product certificates.
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', 'mmf_register_shipped_order_status' );
add_filter( 'wc_order_statuses', 'mmf_add_shipped_status_label' );
add_action( 'rest_api_init', 'mmf_register_order_documents_routes' );
add_action( 'woocommerce_checkout_create_order_line_item', 'mmf_store_order_line_item_documents', 10, 4 );

/**
 * Register "shipped" as a real WordPress post status.
 *
 * WooCommerce order statuses need TWO registrations: this one
 * (register_post_status, so WP's own admin-list queries and status counts
 * recognize wc-shipped as a real status — without it, orders moved to
 * Shipped silently vanish from Orders → All since the "All" list query only
 * includes statuses WordPress has actually registered) and the wc_order_statuses
 * filter below (so it shows up as a label/option in WC's own status dropdown
 * and status tabs). There is no single "woocommerce_register_shop_order_statuses"
 * filter — that hook name doesn't exist in WooCommerce core.
 */
function mmf_register_shipped_order_status(): void {
	register_post_status(
		'wc-shipped',
		array(
			'label'                     => _x( 'Shipped', 'Order status', 'woocommerce' ),
			'public'                    => true,
			'exclude_from_search'       => false,
			'show_in_admin_all_list'    => true,
			'show_in_admin_status_list' => true,
			'label_count'               => _n_noop(
				'Shipped <span class="count">(%s)</span>',
				'Shipped <span class="count">(%s)</span>',
				'woocommerce'
			),
		)
	);
}

/**
 * Add "Shipped" to the order status dropdown in WC admin, right after
 * Processing — matching where it actually sits in the fulfillment flow.
 *
 * @param array $order_statuses Existing status labels.
 * @return array
 */
function mmf_add_shipped_status_label( array $order_statuses ): array {
	$with_shipped = array();
	foreach ( $order_statuses as $key => $label ) {
		$with_shipped[ $key ] = $label;
		if ( 'wc-processing' === $key ) {
			$with_shipped['wc-shipped'] = _x( 'Shipped', 'Order status', 'woocommerce' );
		}
	}
	// Safety net: if wc-processing wasn't found (unlikely), still add it.
	if ( ! isset( $with_shipped['wc-shipped'] ) ) {
		$with_shipped['wc-shipped'] = _x( 'Shipped', 'Order status', 'woocommerce' );
	}
	return $with_shipped;
}
add_action( 'woocommerce_order_status_changed', 'mmf_send_certificates_ready_email', 10, 4 );
// Fallback: stamp cert opt-in on line items AFTER order is created AND after
// Store API extension callbacks have run. In recent WC Blocks versions the
// update_callback fires after create_or_update_draft_order(), so the session
// is empty when woocommerce_checkout_create_order_line_item fires. This hook
// is the authoritative write path.
add_action( 'woocommerce_store_api_checkout_order_processed', 'mmf_stamp_cert_opted_in_fallback' );

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

	// Spec sheet URL — stored at purchase time so it survives product edits.
	$spec_url = esc_url_raw( specparts_get_product_spec_url( $product_id ) );
	if ( $spec_url ) {
		$item->add_meta_data( '_mmf_spec_file_url', $spec_url, true );
	}

	// Certificate file URL — stored at purchase time for the same reason.
	$cert_url = esc_url_raw( (string) get_post_meta( $product_id, '_certificate_file_url', true ) );
	if ( $cert_url ) {
		$item->add_meta_data( '_mmf_certificate_file_url', $cert_url, true );
	}

	// Always record the cart item key so the post-order fallback hook can
	// look up the right line item regardless of callback timing.
	$item->add_meta_data( '_mmf_cart_item_key', $cart_item_key, true );

	// Cert opt-in flag: read from the request-scoped global (set by the Store
	// API update_callback). In WC Blocks the callback fires AFTER order line
	// items are created, so the global may already be populated by the time
	// this hook runs if another request path fires first — but the authoritative
	// stamp is done in mmf_stamp_cert_opted_in_fallback (below), which is
	// guaranteed to run after both order creation AND extension callbacks.
	global $mmf_cert_opted_in_request_map;
	$opted_in_map = ! empty( $mmf_cert_opted_in_request_map )
		? $mmf_cert_opted_in_request_map
		: ( WC()->session ? (array) WC()->session->get( 'mmf_cert_opted_in', array() ) : array() );
	$is_opted_in = ! empty( $opted_in_map[ $cart_item_key ] );
	if ( $is_opted_in ) {
		$item->add_meta_data( '_mmf_cert_opted_in', '1', true );
	}
	if ( function_exists( 'mmf_cert_log' ) ) {
		mmf_cert_log(
			'line_item hook (early — may run before update_callback)',
			array(
				'cart_item_key' => $cart_item_key,
				'opted_in_map'  => $opted_in_map,
				'stamped'       => $is_opted_in,
			)
		);
	}
}

/**
 * Fallback: stamp _mmf_cert_opted_in on order items after both order creation
 * AND Store API extension callbacks have completed.
 *
 * In WC Blocks, woocommerce_checkout_create_order_line_item fires during
 * create_or_update_draft_order(), which runs BEFORE extension callbacks in
 * recent versions. This hook is guaranteed to fire after both, making it the
 * authoritative write for the opt-in flag.
 *
 * @param WC_Order $order The completed draft order.
 */
function mmf_stamp_cert_opted_in_fallback( WC_Order $order ): void {
	global $mmf_cert_opted_in_request_map;

	if ( empty( $mmf_cert_opted_in_request_map ) ) {
		$mmf_cert_opted_in_request_map = WC()->session
			? (array) WC()->session->get( 'mmf_cert_opted_in', array() )
			: array();
	}

	if ( function_exists( 'mmf_cert_log' ) ) {
		mmf_cert_log(
			'authoritative fallback hook (woocommerce_store_api_checkout_order_processed)',
			array(
				'order_id'     => $order->get_id(),
				'opted_in_map' => $mmf_cert_opted_in_request_map,
			)
		);
	}

	if ( empty( $mmf_cert_opted_in_request_map ) ) {
		return;
	}

	foreach ( $order->get_items() as $item ) {
		if ( ! $item instanceof WC_Order_Item_Product ) {
			continue;
		}

		if ( '1' === (string) $item->get_meta( '_mmf_cert_opted_in', true ) ) {
			continue; // already stamped by the line-item hook
		}

		$cart_item_key = (string) $item->get_meta( '_mmf_cart_item_key', true );
		$matched       = $cart_item_key && ! empty( $mmf_cert_opted_in_request_map[ $cart_item_key ] );

		if ( function_exists( 'mmf_cert_log' ) ) {
			mmf_cert_log(
				'fallback hook — per-item match check',
				array(
					'order_id'      => $order->get_id(),
					'item_id'       => $item->get_id(),
					'cart_item_key' => $cart_item_key,
					'matched'       => $matched,
				)
			);
		}

		if ( $matched ) {
			$item->update_meta_data( '_mmf_cert_opted_in', '1' );
			$item->save();
		}
	}

	if ( WC()->session ) {
		WC()->session->set( 'mmf_cert_opted_in', array() );
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

	// Include all registered statuses so custom ones (e.g. wc-shipped) are
	// not silently excluded by the WC_Order_Query default status list.
	$orders = wc_get_orders(
		array(
			'customer_id' => get_current_user_id(),
			'limit'       => 50,
			'orderby'     => 'date',
			'order'       => 'DESC',
			'status'      => array_keys( wc_get_order_statuses() ),
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

		// Certificates are only available after the order ships (shipped/completed)
		// AND only for items the customer opted in to at checkout (SOW).
		$certs_available = in_array( $order_status, array( 'completed', 'shipped' ), true );

		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product ) {
				continue;
			}

			$items[] = array(
				'name'     => $item->get_name(),
				'quantity' => (int) $item->get_quantity(),
			);

			if ( $certs_available && mmf_item_cert_opted_in( $item ) ) {
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
 * Did the customer opt in to certification for this line item at purchase?
 *
 * Opt-in is recorded on the order line item as _mmf_cert_opted_in = '1' by
 * mmf_store_order_line_item_documents at checkout. No separate $0 product is
 * needed — the cert file URL lives on the physical product meta.
 *
 * @param WC_Order_Item_Product $item Line item.
 * @return bool
 */
function mmf_item_cert_opted_in( $item ): bool {
	return $item instanceof WC_Order_Item_Product
		&& '1' === (string) $item->get_meta( '_mmf_cert_opted_in', true );
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

		// Certificates only after shipped/completed AND only when the customer
		// opted in at checkout; spec sheets always available.
		$certs_available = in_array( $order_status, array( 'completed', 'shipped' ), true );

		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product ) {
				continue;
			}

			$product = $item->get_product();
			$docs    = mmf_get_line_item_documents( $item );

			$spec_url = $docs['spec_file_url'];
			$cert_url = ( $certs_available && mmf_item_cert_opted_in( $item ) )
				? $docs['certificate_file_url']
				: '';

			if ( ! $spec_url && ! $cert_url ) {
				continue;
			}

			$short_desc = '';
			if ( $product ) {
				$raw = $product->get_short_description() ?: $product->get_description();
				$short_desc = wp_strip_all_tags( html_entity_decode( $raw, ENT_QUOTES, 'UTF-8' ) );
			}

			$items[] = array(
				'product_id'           => $product ? $product->get_id() : 0,
				'sku'                  => $product ? $product->get_sku() : '',
				'name'                 => $item->get_name(),
				'description'          => $short_desc,
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
 * Send "certificates ready" email when an order transitions to shipped/completed.
 *
 * Fires only on the first transition into a cert-eligible status so re-marking
 * completed→processing→completed doesn't spam the customer. Silently skips
 * orders with no certificate on any line item.
 *
 * @param int      $order_id   Order ID.
 * @param string   $old_status Previous status (without wc- prefix).
 * @param string   $new_status New status (without wc- prefix).
 * @param WC_Order $order      Order object.
 */
function mmf_send_certificates_ready_email( int $order_id, string $old_status, string $new_status, WC_Order $order ): void {
	$cert_statuses = array( 'completed', 'shipped' );

	// Trigger source matters for debugging — Shippo's webhook and the admin
	// status dropdown both call $order->update_status(), which fires this
	// hook synchronously and identically either way. shippo-webhook.php sets
	// this global true only for the duration of ITS update_status() call, so
	// it's a reliable way to tell the two triggers apart in the log.
	global $mmf_shippo_triggering_status_change;
	$trigger_source = ! empty( $mmf_shippo_triggering_status_change ) ? 'shippo_webhook' : 'admin_or_other';

	if ( function_exists( 'mmf_cert_log' ) ) {
		mmf_cert_log(
			'mmf_send_certificates_ready_email invoked',
			array(
				'order_id'       => $order_id,
				'old_status'     => $old_status,
				'new_status'     => $new_status,
				'trigger_source' => $trigger_source,
			)
		);
	}

	if ( ! in_array( $new_status, $cert_statuses, true ) ) {
		if ( function_exists( 'mmf_cert_log' ) ) {
			mmf_cert_log( 'email skipped — new_status not cert-eligible', array( 'order_id' => $order_id, 'new_status' => $new_status ) );
		}
		return;
	}

	// Don't re-send if already in a cert-eligible status (e.g. shipped → completed).
	if ( in_array( $old_status, $cert_statuses, true ) ) {
		if ( function_exists( 'mmf_cert_log' ) ) {
			mmf_cert_log( 'email skipped — already was cert-eligible (re-transition)', array( 'order_id' => $order_id, 'old_status' => $old_status ) );
		}
		return;
	}

	// Hard once-only guard: survives any status cycle (completed → processing →
	// completed) and covers both the admin path and the Shippo webhook path.
	if ( '1' === (string) $order->get_meta( '_mmf_cert_email_sent', true ) ) {
		if ( function_exists( 'mmf_cert_log' ) ) {
			mmf_cert_log( 'email skipped — already sent (once-only guard)', array( 'order_id' => $order_id ) );
		}
		return;
	}

	// Only send if the customer OPTED IN at checkout (cert product in the
	// order) and the opted-in item actually has a certificate file (SOW:
	// no opt-in → no certificate delivery, ever). Collect the files so the
	// email can deliver direct download links per item.
	$cert_files      = array();
	$per_item_debug  = array();
	foreach ( $order->get_items() as $item ) {
		if ( ! $item instanceof WC_Order_Item_Product ) {
			continue;
		}
		$opted_in = mmf_item_cert_opted_in( $item );
		$docs     = mmf_get_line_item_documents( $item );
		$per_item_debug[] = array(
			'item_id'              => $item->get_id(),
			'product_name'         => $item->get_name(),
			'opted_in_meta'        => $item->get_meta( '_mmf_cert_opted_in', true ),
			'opted_in_resolved'    => $opted_in,
			'certificate_file_url' => $docs['certificate_file_url'],
		);
		if ( ! $opted_in ) {
			continue;
		}
		if ( ! empty( $docs['certificate_file_url'] ) ) {
			$cert_files[] = array(
				'name' => $item->get_name(),
				'url'  => $docs['certificate_file_url'],
			);
		}
	}

	if ( function_exists( 'mmf_cert_log' ) ) {
		mmf_cert_log( 'per-item opt-in + cert-file check', array( 'order_id' => $order_id, 'items' => $per_item_debug, 'cert_files_found' => count( $cert_files ) ) );
	}

	if ( empty( $cert_files ) ) {
		if ( function_exists( 'mmf_cert_log' ) ) {
			mmf_cert_log( 'email skipped — no opted-in item has a certificate file', array( 'order_id' => $order_id ) );
		}
		return;
	}

	$to            = $order->get_billing_email();
	$customer_name = trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
	$order_number  = $order->get_order_number();
	$site_name     = get_bloginfo( 'name' );

	// Headless: the customer's account lives on the Next.js site, not WP.
	// Same convention as the password-reset email (MMF_FRONTEND_URL constant
	// in wp-config.php, overridable via the mmf_frontend_url filter).
	$frontend_url = apply_filters( 'mmf_frontend_url', defined( 'MMF_FRONTEND_URL' ) ? MMF_FRONTEND_URL : home_url() );
	$account_url  = rtrim( $frontend_url, '/' ) . '/my-account';

	$subject = sprintf( 'Your product certificates are ready — Order #%s', $order_number );

	ob_start();
	?>
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%;">
      <tr>
        <td style="background:#0a1628;padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">
            <?php echo esc_html( $site_name ); ?>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">
            Hi <?php echo esc_html( $customer_name ?: 'there' ); ?>,
          </p>
          <p style="margin:0 0 16px;font-size:16px;color:#444444;line-height:1.6;">
            Great news — your product certificates for <strong>Order #<?php echo esc_html( $order_number ); ?></strong>
            are now available for download.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e0e0e0;">
            <?php foreach ( $cert_files as $cert_file ) : ?>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #eeeeee;font-size:14px;color:#1a1a1a;">
                <?php echo esc_html( $cert_file['name'] ); ?>
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid #eeeeee;text-align:right;">
                <a href="<?php echo esc_url( $cert_file['url'] ); ?>"
                   style="color:#cc9900;font-size:14px;font-weight:bold;text-decoration:underline;">
                  Download Certificate
                </a>
              </td>
            </tr>
            <?php endforeach; ?>
          </table>
          <p style="margin:0 0 24px;font-size:16px;color:#444444;line-height:1.6;">
            You can also re-download these anytime from the <strong>Certifications</strong> section of your account.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr>
              <td style="background:#cc9900;border-radius:2px;">
                <a href="<?php echo esc_url( $account_url ); ?>"
                   style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">
                  Go to My Account
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:13px;color:#888888;line-height:1.5;">
            If you have any questions, please reply to this email or contact our support team.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f4f4f4;padding:20px 32px;border-top:1px solid #e0e0e0;">
          <p style="margin:0;font-size:12px;color:#999999;text-align:center;">
            &copy; <?php echo esc_html( (string) gmdate( 'Y' ) ); ?> <?php echo esc_html( $site_name ); ?>. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>
	<?php
	$html = ob_get_clean();

	$sent = wp_mail(
		$to,
		$subject,
		$html,
		array( 'Content-Type: text/html; charset=UTF-8' )
	);

	// Mark sent only on success so a mail-server hiccup still allows a retry
	// on the next eligible status change.
	if ( $sent ) {
		$order->update_meta_data( '_mmf_cert_email_sent', '1' );
		$order->save_meta_data();
	}
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

	$order_status    = $order->get_status();
	$certs_available = in_array( $order_status, array( 'completed', 'shipped' ), true );

	$line_items = array();
	foreach ( $order->get_items() as $item ) {
		if ( ! $item instanceof WC_Order_Item_Product ) {
			continue;
		}

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
			// SOW: cert download only when opted in at checkout + shipped/completed.
			'certificate_file_url' => ( $certs_available && mmf_item_cert_opted_in( $item ) )
				? $docs['certificate_file_url']
				: '',
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
