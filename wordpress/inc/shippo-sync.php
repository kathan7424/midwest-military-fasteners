<?php
/**
 * Shippo Shipment pre-creation — fires when a WC order enters "processing".
 *
 * Creates a Shipment (with address + parcel data) in Shippo so the admin
 * sees all Package fields pre-filled when generating a label in the Shippo
 * dashboard. Without this, Shippo shows "Package info required" because
 * the plugin syncs Orders but does not create Shipments.
 *
 * Token is read exclusively from the plugin's WC settings row (DB).
 * It is never logged, echoed, or stored anywhere else.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'woocommerce_order_status_processing', 'mmf_push_shippo_shipment', 99, 1 );

/**
 * Push a Shipment to Shippo for the given WC order.
 *
 * @param int $order_id
 */
function mmf_push_shippo_shipment( int $order_id ): void {
	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		return;
	}

	// Idempotent: skip if we already created a Shipment for this order.
	if ( $order->get_meta( '_mmf_shippo_shipment_id', true ) ) {
		return;
	}

	$logger = wc_get_logger();
	$ctx    = array( 'source' => 'mmf-shippo-sync' );

	// ── 1. Read API token from plugin settings (never hardcoded) ────────────
	$plugin_settings = get_option( 'woocommerce_wc-shippo-shipping_settings', array() );
	$sandbox         = ! empty( $plugin_settings['sandbox'] ) && 'yes' === $plugin_settings['sandbox'];
	$token_key       = $sandbox ? 'testApiToken' : 'liveApiToken';
	$api_token       = isset( $plugin_settings[ $token_key ] ) ? trim( (string) $plugin_settings[ $token_key ] ) : '';

	if ( '' === $api_token ) {
		$logger->warning(
			sprintf( 'Order #%d — Shippo %s token not set in plugin settings; skipping Shipment creation.', $order_id, $sandbox ? 'test' : 'live' ),
			$ctx
		);
		return;
	}

	// ── 2. Ship-from address (WC store settings) ────────────────────────────
	$default_country_state = get_option( 'woocommerce_default_country', 'US' ); // e.g. "US:MI"
	$country_parts         = explode( ':', $default_country_state );
	$store_country         = $country_parts[0] ?? 'US';
	$store_state           = $country_parts[1] ?? '';

	$address_from = array(
		'name'    => html_entity_decode( get_bloginfo( 'name' ), ENT_QUOTES, 'UTF-8' ),
		'email'   => get_option( 'woocommerce_email_from_address', get_option( 'admin_email', '' ) ),
		'street1' => (string) get_option( 'woocommerce_store_address', '' ),
		'street2' => (string) get_option( 'woocommerce_store_address_2', '' ),
		'city'    => (string) get_option( 'woocommerce_store_city', '' ),
		'state'   => $store_state,
		'zip'     => (string) get_option( 'woocommerce_store_postcode', '' ),
		'country' => $store_country,
	);

	if ( '' === $address_from['street1'] || '' === $address_from['city'] || '' === $address_from['zip'] ) {
		$logger->warning(
			sprintf( 'Order #%d — WC store address incomplete (street/city/zip); skipping Shipment creation.', $order_id ),
			$ctx
		);
		return;
	}

	// ── 3. Ship-to address (from the order's shipping address) ──────────────
	$ship_first = $order->get_shipping_first_name();
	$ship_last  = $order->get_shipping_last_name();
	// Fall back to billing name if shipping name is empty (some checkout flows).
	if ( '' === trim( $ship_first . $ship_last ) ) {
		$ship_first = $order->get_billing_first_name();
		$ship_last  = $order->get_billing_last_name();
	}

	$address_to = array(
		'name'    => trim( $ship_first . ' ' . $ship_last ),
		'email'   => $order->get_billing_email(),
		'phone'   => $order->get_billing_phone(),
		'street1' => $order->get_shipping_address_1() ?: $order->get_billing_address_1(),
		'street2' => $order->get_shipping_address_2() ?: $order->get_billing_address_2(),
		'city'    => $order->get_shipping_city() ?: $order->get_billing_city(),
		'state'   => $order->get_shipping_state() ?: $order->get_billing_state(),
		'zip'     => $order->get_shipping_postcode() ?: $order->get_billing_postcode(),
		'country' => $order->get_shipping_country() ?: $order->get_billing_country() ?: 'US',
	);

	if ( '' === $address_to['street1'] || '' === $address_to['city'] || '' === $address_to['zip'] ) {
		$logger->warning(
			sprintf( 'Order #%d — Ship-to address incomplete; skipping Shipment creation.', $order_id ),
			$ctx
		);
		return;
	}

	// ── 4. Build parcel from order items ────────────────────────────────────
	// WC stores dims in woocommerce_dimension_unit and weight in woocommerce_weight_unit.
	// Shippo accepts: distance_unit = cm|in|ft|mm|m|yd; mass_unit = g|oz|lb|kg.
	$wc_dim_unit    = strtolower( (string) get_option( 'woocommerce_dimension_unit', 'in' ) );
	$wc_weight_unit = strtolower( (string) get_option( 'woocommerce_weight_unit', 'lbs' ) );

	// WC uses "lbs"; Shippo expects "lb".
	$shippo_mass_unit = ( 'lbs' === $wc_weight_unit ) ? 'lb' : $wc_weight_unit;

	$max_length = 0.0;
	$max_width  = 0.0;
	$max_height = 0.0;
	$total_weight = 0.0;
	$has_dims   = false;
	$has_weight = false;
	$missing_items = array();

	foreach ( $order->get_items() as $item ) {
		/** @var WC_Order_Item_Product $item */
		$product = $item->get_product();
		if ( ! $product ) {
			continue;
		}

		$qty    = max( 1, (int) $item->get_quantity() );
		$weight = (float) $product->get_weight();
		$length = (float) $product->get_length();
		$width  = (float) $product->get_width();
		$height = (float) $product->get_height();

		$item_missing = array();
		if ( $weight <= 0 ) {
			$item_missing[] = 'weight';
		}
		if ( $length <= 0 || $width <= 0 || $height <= 0 ) {
			$item_missing[] = 'dimensions';
		}

		if ( ! empty( $item_missing ) ) {
			$missing_items[] = sprintf( '%s (SKU: %s) missing %s', $product->get_name(), $product->get_sku(), implode( ' + ', $item_missing ) );
		}

		if ( $weight > 0 ) {
			$total_weight += $weight * $qty;
			$has_weight    = true;
		}

		if ( $length > 0 ) {
			$max_length = max( $max_length, $length );
			$has_dims   = true;
		}
		if ( $width > 0 ) {
			$max_width = max( $max_width, $width );
		}
		if ( $height > 0 ) {
			$max_height = max( $max_height, $height );
		}
	}

	if ( ! empty( $missing_items ) ) {
		$logger->warning(
			sprintf( 'Order #%d — some products missing data (Shippo will show blank fields for these): %s', $order_id, implode( '; ', $missing_items ) ),
			$ctx
		);
	}

	// Need at minimum a non-zero weight for Shippo to calculate rates.
	if ( ! $has_weight || $total_weight <= 0 ) {
		$logger->warning(
			sprintf( 'Order #%d — no product weight found; cannot create Shippo Shipment. Add weight to all products.', $order_id ),
			$ctx
		);
		return;
	}

	// If dims are missing, use a minimal placeholder so Shippo can still
	// accept the Shipment — admin will adjust in the dashboard.
	if ( ! $has_dims || $max_length <= 0 || $max_width <= 0 || $max_height <= 0 ) {
		$max_length = max( $max_length, 1.0 );
		$max_width  = max( $max_width, 1.0 );
		$max_height = max( $max_height, 1.0 );
		$logger->warning(
			sprintf( 'Order #%d — one or more product dimensions missing; using placeholder 1×1×1 %s. Update product data.', $order_id, $wc_dim_unit ),
			$ctx
		);
	}

	$parcel = array(
		'length'        => (string) round( $max_length, 2 ),
		'width'         => (string) round( $max_width, 2 ),
		'height'        => (string) round( $max_height, 2 ),
		'distance_unit' => $wc_dim_unit,
		'weight'        => (string) round( $total_weight, 4 ),
		'mass_unit'     => $shippo_mass_unit,
	);

	// ── 5. Call Shippo Shipments API ─────────────────────────────────────────
	$payload = array(
		'address_from' => $address_from,
		'address_to'   => $address_to,
		'parcels'      => array( $parcel ),
		'metadata'     => (string) $order_id,   // webhook uses this to match the WC order
		'async'        => false,
	);

	$response = wp_remote_post(
		'https://api.goshippo.com/shipments/',
		array(
			'timeout' => 30,
			'headers' => array(
				'Authorization' => 'ShippoToken ' . $api_token,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
		)
	);

	if ( is_wp_error( $response ) ) {
		$logger->error(
			sprintf( 'Order #%d — Shippo API request failed: %s', $order_id, $response->get_error_message() ),
			$ctx
		);
		return;
	}

	$http_code   = (int) wp_remote_retrieve_response_code( $response );
	$body        = wp_remote_retrieve_body( $response );
	$shipment    = json_decode( $body, true );
	$shipment_id = $shipment['object_id'] ?? '';

	if ( 201 !== $http_code || '' === $shipment_id ) {
		$error_text = ( isset( $shipment['detail'] ) )
			? (string) $shipment['detail']
			: sprintf( 'HTTP %d', $http_code );
		$logger->error(
			sprintf( 'Order #%d — Shippo returned an error: %s', $order_id, $error_text ),
			$ctx
		);
		return;
	}

	// ── 6. Persist Shipment ID on the order ─────────────────────────────────
	$order->update_meta_data( '_mmf_shippo_shipment_id', sanitize_text_field( $shipment_id ) );
	$order->save_meta_data();

	$logger->info(
		sprintf(
			'Order #%d — Shippo Shipment created: %s (%.4f %s, %s×%s×%s %s)',
			$order_id,
			$shipment_id,
			$total_weight,
			$shippo_mass_unit,
			round( $max_length, 2 ),
			round( $max_width, 2 ),
			round( $max_height, 2 ),
			$wc_dim_unit
		),
		$ctx
	);
}
