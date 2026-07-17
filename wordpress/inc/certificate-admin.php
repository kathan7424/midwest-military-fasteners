<?php
/**
 * Product Certifications — read-only WooCommerce admin dashboard.
 *
 * Shows every order line item where the customer opted in to a product
 * certificate at checkout, whether the certificate email has gone out yet,
 * and why not if it hasn't. Visibility only — the send itself is fully
 * automatic (see mmf_send_certificates_ready_email in order-documents.php),
 * this page just answers "did it actually happen for this order."
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', 'mmf_register_certificate_admin_menu' );

/**
 * WooCommerce submenu for the product certifications dashboard.
 */
function mmf_register_certificate_admin_menu(): void {
	add_submenu_page(
		'woocommerce',
		__( 'Product Certifications', 'midwest-military' ),
		__( 'Product Certifications', 'midwest-military' ),
		'manage_woocommerce',
		'mmf-product-certificates',
		'mmf_render_certificate_admin_page'
	);
}

/**
 * Find every order line item with a recorded certificate opt-in.
 *
 * Order LINE ITEM meta lives in the classic order-items tables regardless of
 * whether HPOS is enabled for order data itself, so this query is safe on
 * either storage mode.
 *
 * @param int $limit Max rows.
 * @return array<int, array{order_item_id:int, order_id:int}>
 */
function mmf_get_cert_opted_in_order_items( int $limit = 200 ): array {
	global $wpdb;

	$sql = $wpdb->prepare(
		"
		SELECT oi.order_item_id, oi.order_id
		FROM {$wpdb->prefix}woocommerce_order_itemmeta im
		INNER JOIN {$wpdb->prefix}woocommerce_order_items oi
			ON oi.order_item_id = im.order_item_id
		WHERE im.meta_key = '_mmf_cert_opted_in'
			AND im.meta_value = '1'
		ORDER BY oi.order_item_id DESC
		LIMIT %d
		",
		$limit
	);

	$rows = $wpdb->get_results( $sql, ARRAY_A );

	return array_map(
		static function ( array $row ): array {
			return array(
				'order_item_id' => (int) $row['order_item_id'],
				'order_id'      => (int) $row['order_id'],
			);
		},
		$rows ?: array()
	);
}

/**
 * Build one dashboard row from an opted-in order line item.
 *
 * @param int $order_item_id Order item ID.
 * @param int $order_id      Parent order ID.
 * @return array<string, mixed>|null Null if the order or item no longer exists.
 */
function mmf_format_cert_admin_row( int $order_item_id, int $order_id ): ?array {
	$order = wc_get_order( $order_id );
	if ( ! $order instanceof WC_Order ) {
		return null;
	}

	$item = null;
	foreach ( $order->get_items() as $candidate ) {
		if ( $candidate->get_id() === $order_item_id ) {
			$item = $candidate;
			break;
		}
	}

	if ( ! $item instanceof WC_Order_Item_Product ) {
		return null;
	}

	$cert_url      = (string) $item->get_meta( '_mmf_certificate_file_url', true );
	$order_status  = $order->get_status();
	$cert_statuses = array( 'completed', 'shipped' );
	$email_sent    = '1' === (string) $order->get_meta( '_mmf_cert_email_sent', true );

	if ( $email_sent ) {
		$state = 'sent';
	} elseif ( ! $cert_url ) {
		// Opted in, but the product's certificate file was removed/missing
		// after the order was placed — mmf_send_certificates_ready_email
		// silently skips this item for exactly this reason.
		$state = 'no_file';
	} elseif ( in_array( $order_status, $cert_statuses, true ) ) {
		// Should have sent — if it hasn't, mail delivery is the likely gap
		// (mmf_send_certificates_ready_email only marks _mmf_cert_email_sent
		// on a successful wp_mail() call, so it retries next status change).
		$state = 'send_pending';
	} else {
		// Normal — order hasn't reached completed/shipped yet.
		$state = 'awaiting_fulfillment';
	}

	return array(
		'order_id'      => $order_id,
		'order_number'  => $order->get_order_number(),
		'order_status'  => wc_get_order_status_name( $order_status ),
		'order_date'    => $order->get_date_created() ? $order->get_date_created()->date( 'M j, Y' ) : '',
		'customer_name' => trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ) ?: __( 'Guest', 'midwest-military' ),
		'customer_email' => $order->get_billing_email(),
		'product_name'  => $item->get_name(),
		'sku'           => $item->get_product() ? $item->get_product()->get_sku() : '',
		'cert_url'      => $cert_url,
		'state'         => $state,
		'edit_url'      => $order->get_edit_order_url(),
	);
}

/**
 * Render the Product Certifications dashboard.
 */
function mmf_render_certificate_admin_page(): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You do not have permission to access this page.', 'midwest-military' ) );
	}

	$items = mmf_get_cert_opted_in_order_items( 200 );
	$rows  = array();
	foreach ( $items as $item ) {
		$row = mmf_format_cert_admin_row( $item['order_item_id'], $item['order_id'] );
		if ( $row ) {
			$rows[] = $row;
		}
	}

	$counts = array( 'sent' => 0, 'send_pending' => 0, 'no_file' => 0, 'awaiting_fulfillment' => 0 );
	foreach ( $rows as $r ) {
		++$counts[ $r['state'] ];
	}

	$state_labels = array(
		'sent'                  => __( 'Sent', 'midwest-military' ),
		'send_pending'          => __( 'Not sent yet — check logs', 'midwest-military' ),
		'no_file'               => __( 'No certificate file on product', 'midwest-military' ),
		'awaiting_fulfillment'  => __( 'Awaiting order completion', 'midwest-military' ),
	);
	$state_colors = array(
		'sent'                 => '#3a7d44',
		'send_pending'         => '#b81c23',
		'no_file'              => '#b81c23',
		'awaiting_fulfillment' => '#8c8f94',
	);
	?>
	<div class="wrap">
		<h1>
			<span class="dashicons dashicons-media-spreadsheet" style="vertical-align: middle;"></span>
			<?php esc_html_e( 'Product Certifications', 'midwest-military' ); ?>
		</h1>
		<p>
			<?php esc_html_e( 'Every order line item where the customer opted in to a product certificate at checkout — free (SOW) certificates, not sales tax exemption. The certificate email sends automatically when the order reaches Completed or Shipped; this page is visibility only, nothing here needs action unless a row is flagged below.', 'midwest-military' ); ?>
		</p>

		<ul style="display:flex; gap:24px; list-style:none; padding:0; margin:16px 0 24px;">
			<li><strong style="color:#3a7d44;font-size:20px;"><?php echo (int) $counts['sent']; ?></strong> <?php esc_html_e( 'Sent', 'midwest-military' ); ?></li>
			<li><strong style="color:#8c8f94;font-size:20px;"><?php echo (int) $counts['awaiting_fulfillment']; ?></strong> <?php esc_html_e( 'Awaiting fulfillment', 'midwest-military' ); ?></li>
			<li><strong style="color:#b81c23;font-size:20px;"><?php echo (int) $counts['send_pending']; ?></strong> <?php esc_html_e( 'Not sent — needs a look', 'midwest-military' ); ?></li>
			<li><strong style="color:#b81c23;font-size:20px;"><?php echo (int) $counts['no_file']; ?></strong> <?php esc_html_e( 'Missing certificate file', 'midwest-military' ); ?></li>
		</ul>

		<table class="wp-list-table widefat fixed striped">
			<thead>
				<tr>
					<th><?php esc_html_e( 'Order', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Date', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Customer', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Product', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Order Status', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Certificate Email', 'midwest-military' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php if ( empty( $rows ) ) : ?>
					<tr>
						<td colspan="6"><?php esc_html_e( 'No certificate opt-ins recorded yet.', 'midwest-military' ); ?></td>
					</tr>
				<?php else : ?>
					<?php foreach ( $rows as $row ) : ?>
						<tr>
							<td><a href="<?php echo esc_url( $row['edit_url'] ); ?>">#<?php echo esc_html( $row['order_number'] ); ?></a></td>
							<td><?php echo esc_html( $row['order_date'] ); ?></td>
							<td>
								<?php echo esc_html( $row['customer_name'] ); ?><br />
								<span style="color:#8c8f94;font-size:12px;"><?php echo esc_html( $row['customer_email'] ); ?></span>
							</td>
							<td>
								<?php echo esc_html( $row['product_name'] ); ?>
								<?php if ( $row['sku'] ) : ?>
									<br /><span style="color:#8c8f94;font-size:12px;">SKU: <?php echo esc_html( $row['sku'] ); ?></span>
								<?php endif; ?>
								<?php if ( $row['cert_url'] ) : ?>
									<br /><a href="<?php echo esc_url( $row['cert_url'] ); ?>" target="_blank" rel="noopener noreferrer" style="font-size:12px;"><?php esc_html_e( 'View certificate file', 'midwest-military' ); ?></a>
								<?php endif; ?>
							</td>
							<td><?php echo esc_html( $row['order_status'] ); ?></td>
							<td>
								<span style="color: <?php echo esc_attr( $state_colors[ $row['state'] ] ); ?>; font-weight: 600;">
									<?php echo esc_html( $state_labels[ $row['state'] ] ); ?>
								</span>
							</td>
						</tr>
					<?php endforeach; ?>
				<?php endif; ?>
			</tbody>
		</table>

		<p style="margin-top:16px; color:#8c8f94; font-size:13px;">
			<?php esc_html_e( 'Showing the most recent 200 opted-in line items.', 'midwest-military' ); ?>
			<?php esc_html_e( '"Not sent — needs a look" means the order already reached Completed/Shipped but the email never went out — check WooCommerce → Status → Logs, or that wp_mail() is deliverable on this server.', 'midwest-military' ); ?>
		</p>
	</div>
	<?php
}
