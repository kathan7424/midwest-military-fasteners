<?php
/**
 * Shippo Delivery Webhook — auto-completes WC orders when Shippo reports DELIVERED.
 *
 * Registers:
 *   - WC Integration  →  WooCommerce › Settings › Integration › Shippo Webhook
 *   - REST endpoint   →  POST /wp-json/custom/v1/shippo/webhook
 *
 * Flow:
 *   Shippo track_updated (DELIVERED)
 *     → signature verified via HMAC-SHA256 (X-Shippo-Signature header)
 *     → WC order located (metadata → regex → tracking-number meta search)
 *     → $order->update_status('completed') fires woocommerce_order_status_changed
 *     → existing mmf_send_certificates_ready_email() sends the documents email
 *     → Documents tab in My Account becomes accessible
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

// ============================================================
// WC INTEGRATION
// ============================================================

add_filter( 'woocommerce_integrations', 'mmf_register_shippo_integration' );

/**
 * @param class-string[] $integrations
 * @return class-string[]
 */
function mmf_register_shippo_integration( array $integrations ): array {
	$integrations[] = 'MMF_Shippo_Integration';
	return $integrations;
}

/**
 * Adds a Shippo Webhook settings panel under WooCommerce → Settings → Integration.
 */
class MMF_Shippo_Integration extends WC_Integration {

	public function __construct() {
		$this->id                 = 'mmf_shippo_webhook';
		$this->method_title       = __( 'Shippo Webhook', 'midwest-military' );
		$this->method_description = __(
			'Automatically mark WooCommerce orders as Completed when Shippo reports the shipment as Delivered. '
			. 'Once completed, the Documents email is sent and the customer\'s Documents tab becomes accessible.',
			'midwest-military'
		);

		$this->init_form_fields();
		$this->init_settings();

		add_action(
			'woocommerce_update_options_integration_' . $this->id,
			array( $this, 'process_admin_options' )
		);
	}

	public function init_form_fields(): void {
		$webhook_url = rest_url( 'custom/v1/shippo/webhook' );

		$this->form_fields = array(

			'webhook_url_info' => array(
				'title' => __( 'Webhook Setup', 'midwest-military' ),
				'type'  => 'info',
				'desc'  => wp_kses(
					sprintf(
						/* translators: %s: webhook endpoint URL */
						__(
							'<strong>Step 1</strong> — Copy this endpoint URL:<br>'
							. '<code style="word-break:break-all;">%s</code><br><br>'
							. '<strong>Step 2</strong> — In the <a href="https://app.goshippo.com/settings/api/" target="_blank" rel="noopener noreferrer">Shippo dashboard</a> '
							. 'go to <strong>Settings &rarr; API &rarr; Webhooks &rarr; Add Webhook</strong>: '
							. 'select event <code>track_updated</code>, paste the URL above, and save.<br><br>'
							. '<strong>Step 3</strong> — Copy the <em>signing secret</em> Shippo shows after saving into the '
							. '<strong>Webhook Signing Secret</strong> field below, then click <em>Save changes</em>.<br><br>'
							. '<strong>Step 4 (verify)</strong> — Enable <strong>Debug log</strong> below; every call Shippo makes '
							. 'is then recorded in WooCommerce &rarr; Status &rarr; Logs (source <code>mmf-shippo-webhook</code>).',
							'midwest-military'
						),
						esc_url( $webhook_url )
					),
					array(
						'a'      => array( 'href' => true, 'target' => true, 'rel' => true ),
						'strong' => array(),
						'em'     => array(),
						'br'     => array(),
						'code'   => array( 'style' => true ),
					)
				),
			),

			'webhook_secret' => array(
				'title'       => __( 'Webhook Signing Secret', 'midwest-military' ),
				'type'        => 'password',
				'description' => __(
					'Copy the secret token shown in Shippo → Settings → Webhooks after creating the webhook. '
					. 'Used to verify that requests come from Shippo (HMAC-SHA256). '
					. 'Leave blank to skip verification — do not leave blank in production.',
					'midwest-military'
				),
				'default'     => '',
				'desc_tip'    => false,
			),

			'auto_complete' => array(
				'title'       => __( 'Auto-Complete on Delivery', 'midwest-military' ),
				'type'        => 'checkbox',
				'label'       => __( 'Mark order as Completed when Shippo reports DELIVERED', 'midwest-military' ),
				'description' => __(
					'When enabled, the WooCommerce order status is updated to Completed automatically. '
					. 'This triggers the Documents email and unlocks the Documents tab in My Account.',
					'midwest-military'
				),
				'default'     => 'yes',
				'desc_tip'    => false,
			),

			'enable_logging' => array(
				'title'       => __( 'Debug log', 'midwest-military' ),
				'type'        => 'checkbox',
				'label'       => __( 'Enable logging', 'midwest-military' ),
				// Same pattern as WooCommerce core gateways (Stripe, PayPal):
				// checkbox + link into the standard WC log viewer.
				'description' => sprintf(
					/* translators: %s: URL of the WooCommerce log viewer filtered to this source */
					__(
						'Log every incoming Shippo webhook call — received, skipped, rejected, or completed — inside '
						. '<a href="%s">WooCommerce &rarr; Status &rarr; Logs</a> (source <code>mmf-shippo-webhook</code>). '
						. 'Useful during development to confirm the integration works; disable in production once verified.',
						'midwest-military'
					),
					esc_url( admin_url( 'admin.php?page=wc-status&tab=logs&source=mmf-shippo-webhook' ) )
				),
				'default'     => 'no',
				'desc_tip'    => false,
			),
		);
	}

	/**
	 * Render the custom "info" field type (read-only text, no input).
	 *
	 * @param string $key  Field key.
	 * @param array  $data Field config.
	 * @return string HTML.
	 */
	public function generate_info_html( string $key, array $data ): string {
		ob_start();
		?>
		<tr valign="top">
			<th scope="row" class="titledesc">
				<label><?php echo esc_html( $data['title'] ); ?></label>
			</th>
			<td class="forminp">
				<p class="description"><?php echo wp_kses_post( $data['desc'] ); ?></p>
			</td>
		</tr>
		<?php
		return (string) ob_get_clean();
	}

}

/**
 * Record a webhook event when logging is enabled.
 *
 * WooCommerce-standard logging: wc_get_logger() with a dedicated source, so
 * entries appear in WooCommerce → Status → Logs with WC's own retention,
 * rotation, and viewer. No-ops entirely when the setting is off. Never log
 * secrets or signatures here.
 *
 * @param string $message Log line.
 */
function mmf_shippo_log( string $message ): void {
	$settings = (array) get_option( 'woocommerce_mmf_shippo_webhook_settings', array() );

	if ( ( $settings['enable_logging'] ?? 'no' ) !== 'yes' ) {
		return;
	}

	if ( function_exists( 'wc_get_logger' ) ) {
		wc_get_logger()->info( $message, array( 'source' => 'mmf-shippo-webhook' ) );
	}
}

// ============================================================
// REST ENDPOINT REGISTRATION
// ============================================================

add_action( 'rest_api_init', 'mmf_register_shippo_webhook_route' );

function mmf_register_shippo_webhook_route(): void {
	register_rest_route(
		'custom/v1',
		'/shippo/webhook',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mmf_shippo_webhook_handler',
			// Signature is verified inside the handler; no WP auth needed.
			'permission_callback' => '__return_true',
		)
	);
}

// ============================================================
// WEBHOOK HANDLER
// ============================================================

/**
 * Handle a Shippo track_updated webhook call.
 *
 * @param WP_REST_Request $request Incoming request.
 * @return WP_REST_Response
 */
function mmf_shippo_webhook_handler( WP_REST_Request $request ): WP_REST_Response {
	// Read settings directly from the WC option to avoid an extra object instantiation.
	$settings     = (array) get_option( 'woocommerce_mmf_shippo_webhook_settings', array() );
	$secret       = trim( (string) ( $settings['webhook_secret'] ?? '' ) );
	$auto_complete = isset( $settings['auto_complete'] ) ? $settings['auto_complete'] : 'yes';

	// ---- Signature verification ----
	if ( $secret !== '' ) {
		$raw_body = $request->get_body();
		// WP_REST_Request::get_header() normalises headers: hyphens → underscores, lowercase.
		$sig      = (string) $request->get_header( 'x_shippo_signature' );
		$expected = hash_hmac( 'sha256', $raw_body, $secret );

		if ( ! hash_equals( $expected, $sig ) ) {
			error_log( '[MMF Shippo] Webhook rejected: invalid signature.' );
			mmf_shippo_log( 'REJECTED — invalid signature (check the signing secret matches Shippo).' );
			return new WP_REST_Response( array( 'error' => 'Invalid signature.' ), 401 );
		}
	}

	// ---- Parse payload ----
	$payload = $request->get_json_params();

	if ( empty( $payload ) || ! is_array( $payload ) ) {
		return new WP_REST_Response( array( 'error' => 'Empty or non-JSON payload.' ), 400 );
	}

	$event = sanitize_text_field( (string) ( $payload['event'] ?? '' ) );

	if ( $event !== 'track_updated' ) {
		mmf_shippo_log( sprintf( 'Received event "%s" — skipped (only track_updated is processed).', $event ?: 'unknown' ) );
		return new WP_REST_Response(
			array( 'ok' => true, 'skipped' => 'Not a track_updated event.' ),
			200
		);
	}

	$data            = is_array( $payload['data'] ?? null ) ? $payload['data'] : array();
	$tracking_status = is_array( $data['tracking_status'] ?? null ) ? $data['tracking_status'] : array();
	$status          = strtoupper( sanitize_text_field( (string) ( $tracking_status['status'] ?? '' ) ) );

	if ( $status !== 'DELIVERED' ) {
		mmf_shippo_log( sprintf( 'track_updated received — tracking status %s, waiting for DELIVERED.', $status ?: 'unknown' ) );
		return new WP_REST_Response(
			array( 'ok' => true, 'skipped' => 'Status is not DELIVERED (' . $status . ').' ),
			200
		);
	}

	if ( $auto_complete !== 'yes' ) {
		mmf_shippo_log( 'DELIVERED received but Auto-Complete is disabled in settings — no status change made.' );
		return new WP_REST_Response(
			array( 'ok' => true, 'skipped' => 'Auto-complete is disabled in settings.' ),
			200
		);
	}

	$tracking_number = sanitize_text_field( (string) ( $data['tracking_number'] ?? '' ) );
	$metadata        = sanitize_text_field( (string) ( $data['metadata'] ?? '' ) );
	$carrier         = sanitize_text_field( (string) ( $data['carrier'] ?? '' ) );
	$status_date     = sanitize_text_field( (string) ( $tracking_status['status_date'] ?? '' ) );

	// ---- Find order ----
	$order = mmf_find_order_for_shippo( $tracking_number, $metadata );

	if ( ! $order ) {
		error_log( sprintf(
			'[MMF Shippo] Order not found. tracking=%s metadata=%s',
			$tracking_number,
			$metadata
		) );
		mmf_shippo_log( sprintf( 'DELIVERED received but NO matching WC order (tracking %s) — set the order ID as label metadata in Shippo, or save the tracking number on the order.', $tracking_number ?: 'unknown' ) );
		// Return 200 so Shippo does not retry — this is a data mismatch, not a server error.
		return new WP_REST_Response(
			array( 'ok' => true, 'skipped' => 'WC order not found.' ),
			200
		);
	}

	$order_id = $order->get_id();

	// ---- Store delivery meta ----
	if ( $tracking_number !== '' ) {
		$order->update_meta_data( '_shippo_tracking_number', $tracking_number );
	}
	if ( $carrier !== '' ) {
		$order->update_meta_data( '_shippo_carrier', $carrier );
	}
	if ( $status_date !== '' ) {
		$order->update_meta_data( '_shippo_delivered_at', $status_date );
	}
	$order->save_meta_data();

	// ---- Idempotency guard ----
	if ( $order->has_status( 'completed' ) ) {
		error_log( sprintf( '[MMF Shippo] Order #%d already completed — skipping.', $order_id ) );
		mmf_shippo_log( sprintf( 'Order #%d already Completed — duplicate DELIVERED event ignored.', $order_id ) );
		return new WP_REST_Response(
			array( 'ok' => true, 'skipped' => 'Order already completed.', 'order_id' => $order_id ),
			200
		);
	}

	// ---- Complete the order ----
	// This triggers woocommerce_order_status_changed → mmf_send_certificates_ready_email()
	// which sends the Documents email and makes the Documents tab accessible.
	$order->update_status(
		'completed',
		sprintf(
			/* translators: %s: Shippo tracking number */
			__( 'Auto-completed by Shippo webhook — shipment delivered. Tracking: %s', 'midwest-military' ),
			$tracking_number
		)
	);

	/**
	 * Fires after a Shippo DELIVERED event successfully completes a WC order.
	 *
	 * @param int    $order_id        WC order ID.
	 * @param string $tracking_number Shippo tracking number.
	 * @param array  $data            Full Shippo tracking data payload.
	 */
	do_action( 'mmf_order_delivered_by_shippo', $order_id, $tracking_number, $data );

	error_log( sprintf(
		'[MMF Shippo] Order #%d marked completed. Tracking: %s Carrier: %s',
		$order_id,
		$tracking_number,
		$carrier
	) );
	mmf_shippo_log( sprintf(
		'✓ Order #%d auto-completed (DELIVERED, tracking %s%s) — certificates email + My Account docs triggered.',
		$order_id,
		$tracking_number ?: 'n/a',
		$carrier ? ', ' . $carrier : ''
	) );

	return new WP_REST_Response(
		array( 'ok' => true, 'order_id' => $order_id ),
		200
	);
}

// ============================================================
// ORDER LOOKUP
// ============================================================

/**
 * Find a WC_Order that matches a Shippo delivery event.
 *
 * Three strategies, in priority order:
 *   1. metadata is a bare numeric string → treat as order ID.
 *   2. metadata contains "order_id:NNN", "#NNN", or "order NNN" pattern.
 *   3. Search order meta for known tracking-number keys.
 *
 * Strategy 3 covers orders where Shippo label metadata was not set but
 * the tracking number was saved to WC by another plugin (Shippo for WC,
 * Shipment Tracking, Advanced Shipment Tracking, etc.).
 *
 * @param string $tracking_number Shippo tracking number.
 * @param string $metadata        Shippo metadata string (set at label creation time).
 * @return WC_Order|null
 */
function mmf_find_order_for_shippo( string $tracking_number, string $metadata ): ?WC_Order {

	// Strategy 1: bare numeric metadata → order ID.
	if ( $metadata !== '' && ctype_digit( $metadata ) ) {
		$order = wc_get_order( (int) $metadata );
		if ( $order instanceof WC_Order ) {
			return $order;
		}
	}

	// Strategy 2: parse "order_id:NNN", "order NNN", "order #NNN", "#NNN".
	if ( $metadata !== '' ) {
		if ( preg_match( '/(?:order[_\s]*(?:id[:\s]+|#)?|#)(\d+)/i', $metadata, $m ) ) {
			$order = wc_get_order( (int) $m[1] );
			if ( $order instanceof WC_Order ) {
				return $order;
			}
		}
	}

	// Strategy 3: search orders by tracking number stored in meta.
	if ( $tracking_number !== '' ) {
		$meta_keys = array(
			'_shippo_tracking_number',
			'shippo_tracking_number',
			'_wc_shippo_tracking_number',
			'_wc_shipment_tracking_items', // AST/Shipment Tracking plugin (array value, checked below).
			'_tracking_number',
			'_shipment_tracking_number',
		);

		foreach ( $meta_keys as $meta_key ) {
			if ( $meta_key === '_wc_shipment_tracking_items' ) {
				// This meta stores a serialised array; wc_get_orders meta_value search won't match.
				// Skip here — handled by mmf_get_order_tracking() if needed.
				continue;
			}

			$orders = wc_get_orders( array(
				'meta_key'     => $meta_key,
				'meta_value'   => $tracking_number,
				'meta_compare' => '=',
				'limit'        => 1,
				'return'       => 'objects',
				// Include custom statuses (wc-shipped) — the default status list
				// would skip orders an admin already marked as Shipped.
				'status'       => array_keys( wc_get_order_statuses() ),
			) );

			if ( ! empty( $orders ) && $orders[0] instanceof WC_Order ) {
				return $orders[0];
			}
		}
	}

	return null;
}
