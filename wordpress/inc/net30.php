<?php
/**
 * Net 30 payment terms — WooCommerce COD repurposed per SOW.
 *
 * - COD gateway is renamed "Net 30" by the admin in WC → Settings → Payments
 *   (WC settings stay the source of truth for the title/description).
 * - Visibility is restricted to customers flagged `mmf_net30_eligible` = yes.
 *   Everyone else never sees the option — at checkout or via the Store API.
 *
 * User meta:
 *   mmf_net30_eligible — 'yes' | '' (admin-managed flag)
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

add_filter( 'woocommerce_available_payment_gateways', 'mmf_filter_net30_gateway', 20 );
add_action( 'show_user_profile', 'mmf_render_net30_user_field' );
add_action( 'edit_user_profile', 'mmf_render_net30_user_field' );
add_action( 'personal_options_update', 'mmf_save_net30_user_field' );
add_action( 'edit_user_profile_update', 'mmf_save_net30_user_field' );
add_filter( 'manage_users_columns', 'mmf_add_net30_users_column' );
add_filter( 'manage_users_custom_column', 'mmf_render_net30_users_column', 10, 3 );

/**
 * "Net 30" column in WP Admin → Users so staff can see approvals at a glance.
 *
 * @param array $columns Users list columns.
 * @return array
 */
function mmf_add_net30_users_column( array $columns ): array {
	if ( current_user_can( 'manage_woocommerce' ) ) {
		$columns['mmf_net30'] = __( 'Net 30', 'midwest-military' );
	}

	return $columns;
}

/**
 * Clickable toggle in the column — flips eligibility via AJAX, no page reload.
 *
 * @param string $output      Column output.
 * @param string $column_name Column key.
 * @param int    $user_id     User ID.
 * @return string
 */
function mmf_render_net30_users_column( $output, $column_name, $user_id ) {
	if ( 'mmf_net30' !== $column_name ) {
		return $output;
	}

	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return $output;
	}

	$eligible = mmf_is_net30_eligible( (int) $user_id );

	return sprintf(
		'<button type="button" class="button button-small mmf-net30-toggle" data-user-id="%d" data-eligible="%s" title="%s" style="%s">%s</button>',
		(int) $user_id,
		$eligible ? '1' : '0',
		esc_attr__( 'Click to toggle Net 30 eligibility', 'midwest-military' ),
		$eligible
			? 'color:#fff;background:#2e7d32;border-color:#2e7d32;'
			: 'color:#50575e;',
		$eligible
			? '&#10003; ' . esc_html__( 'Eligible', 'midwest-military' )
			: esc_html__( 'Disabled', 'midwest-military' )
	);
}

add_action( 'admin_footer-users.php', 'mmf_net30_users_toggle_script' );
add_action( 'wp_ajax_mmf_toggle_net30', 'mmf_ajax_toggle_net30' );

/**
 * Inline JS for the Users-list toggle buttons.
 */
function mmf_net30_users_toggle_script(): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}

	$nonce = wp_create_nonce( 'mmf_net30_toggle' );
	?>
	<script>
	document.addEventListener('click', function (event) {
		var button = event.target.closest('.mmf-net30-toggle');
		if (!button) return;

		button.disabled = true;

		var body = new URLSearchParams({
			action: 'mmf_toggle_net30',
			user_id: button.dataset.userId,
			_wpnonce: '<?php echo esc_js( $nonce ); ?>'
		});

		fetch(ajaxurl, { method: 'POST', credentials: 'same-origin', body: body })
			.then(function (response) { return response.json(); })
			.then(function (data) {
				if (!data || !data.success) throw new Error();
				var eligible = data.data.eligible;
				button.dataset.eligible = eligible ? '1' : '0';
				button.innerHTML = eligible ? '&#10003; Eligible' : 'Disabled';
				button.style.cssText = eligible
					? 'color:#fff;background:#2e7d32;border-color:#2e7d32;'
					: 'color:#50575e;';
			})
			.catch(function () { alert('Could not update Net 30 status — try again.'); })
			.finally(function () { button.disabled = false; });
	});
	</script>
	<?php
}

/**
 * AJAX: toggle a customer's Net 30 eligibility.
 */
function mmf_ajax_toggle_net30(): void {
	check_ajax_referer( 'mmf_net30_toggle' );

	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
	}

	$user_id = absint( $_POST['user_id'] ?? 0 );

	if ( ! $user_id || ! get_userdata( $user_id ) ) {
		wp_send_json_error( array( 'message' => 'Invalid user.' ), 400 );
	}

	$eligible = ! mmf_is_net30_eligible( $user_id );

	if ( $eligible ) {
		update_user_meta( $user_id, 'mmf_net30_eligible', 'yes' );
	} else {
		delete_user_meta( $user_id, 'mmf_net30_eligible' );
	}

	wp_send_json_success( array( 'eligible' => $eligible ) );
}

/**
 * Whether a customer may use Net 30 (COD) at checkout.
 *
 * @param int $user_id User ID.
 * @return bool
 */
function mmf_is_net30_eligible( int $user_id ): bool {
	if ( $user_id <= 0 ) {
		return false;
	}

	return 'yes' === get_user_meta( $user_id, 'mmf_net30_eligible', true );
}

/**
 * Hide the COD ("Net 30") gateway from customers who are not flagged.
 *
 * Runs for classic checkout AND the Store API (headless checkout) — both
 * resolve available gateways through this filter. Admin screens are left
 * untouched so staff can always take manual Net 30 orders.
 *
 * @param array $gateways Available gateways.
 * @return array
 */
function mmf_filter_net30_gateway( array $gateways ): array {
	if ( is_admin() && ! wp_doing_ajax() && ! ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return $gateways;
	}

	if ( isset( $gateways['cod'] ) && ! mmf_is_net30_eligible( get_current_user_id() ) ) {
		unset( $gateways['cod'] );
	}

	return $gateways;
}

/**
 * Admin user-profile checkbox.
 *
 * @param WP_User $user User being edited.
 */
function mmf_render_net30_user_field( WP_User $user ): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}

	$eligible = mmf_is_net30_eligible( (int) $user->ID );
	?>
	<h2><?php esc_html_e( 'Net 30 Payment Terms', 'midwest-military' ); ?></h2>
	<table class="form-table" role="presentation">
		<tr>
			<th><label for="mmf_net30_eligible"><?php esc_html_e( 'Net 30 eligible', 'midwest-military' ); ?></label></th>
			<td>
				<label>
					<input type="checkbox" name="mmf_net30_eligible" id="mmf_net30_eligible" value="yes" <?php checked( $eligible ); ?> />
					<?php esc_html_e( 'Allow this customer to place orders on Net 30 terms (shows the Net 30 payment option at checkout).', 'midwest-military' ); ?>
				</label>
			</td>
		</tr>
	</table>
	<?php
}

/**
 * Save the flag.
 *
 * @param int $user_id User ID.
 */
function mmf_save_net30_user_field( int $user_id ): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}

	if ( isset( $_POST['mmf_net30_eligible'] ) && 'yes' === $_POST['mmf_net30_eligible'] ) {
		update_user_meta( $user_id, 'mmf_net30_eligible', 'yes' );
	} else {
		delete_user_meta( $user_id, 'mmf_net30_eligible' );
	}
}
