<?php
/**
 * Sales tax exemption certificates — user meta, admin approval, WC/TaxJar exempt.
 *
 * User meta:
 *   mmf_tax_exemption_cert     — public URL to uploaded PDF
 *   mmf_tax_exemption_expiry   — Y-m-d expiry date
 *   mmf_tax_exemption_status   — pending|approved|rejected
 *   mmf_tax_exemption_submitted_at
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

define( 'MMF_TAX_STATUS_PENDING', 'pending' );
define( 'MMF_TAX_STATUS_APPROVED', 'approved' );
define( 'MMF_TAX_STATUS_REJECTED', 'rejected' );

add_action( 'rest_api_init', 'mmf_register_tax_exemption_routes' );
add_action( 'show_user_profile', 'mmf_render_tax_exemption_user_fields' );
add_action( 'edit_user_profile', 'mmf_render_tax_exemption_user_fields' );
add_action( 'personal_options_update', 'mmf_save_tax_exemption_user_fields' );
add_action( 'edit_user_profile_update', 'mmf_save_tax_exemption_user_fields' );
add_filter( 'woocommerce_customer_is_tax_exempt', 'mmf_filter_customer_tax_exempt', 20, 2 );
add_action( 'wp_login', 'mmf_sync_customer_tax_exempt_flag', 10, 2 );
add_action( 'woocommerce_created_customer', 'mmf_sync_customer_tax_exempt_flag_on_id', 10, 1 );

// User profile fields remain available; primary management is WooCommerce → Tax Certificates.

/**
 * Register REST routes.
 */
function mmf_register_tax_exemption_routes(): void {
	register_rest_route(
		'custom/v1',
		'/tax-exemption',
		array(
			array(
				'methods'             => 'GET',
				'callback'            => 'mmf_tax_exemption_get',
				'permission_callback' => 'is_user_logged_in',
			),
			array(
				'methods'             => 'POST',
				'callback'            => 'mmf_tax_exemption_upload',
				'permission_callback' => 'is_user_logged_in',
			),
		)
	);
}

/**
 * Parse expiry date into Y-m-d.
 *
 * @param string $value Raw date.
 * @return string
 */
function mmf_normalize_tax_exemption_expiry( string $value ): string {
	$value = trim( $value );
	if ( $value === '' ) {
		return '';
	}

	$timestamp = strtotime( $value );
	if ( ! $timestamp ) {
		return '';
	}

	return gmdate( 'Y-m-d', $timestamp );
}

/**
 * @param int $user_id User ID.
 * @return string
 */
function mmf_get_tax_exemption_status( int $user_id ): string {
	$status = sanitize_key( (string) get_user_meta( $user_id, 'mmf_tax_exemption_status', true ) );

	if ( in_array( $status, array( MMF_TAX_STATUS_PENDING, MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true ) ) {
		return $status;
	}

	return '';
}

/**
 * Whether the customer should be tax exempt at checkout.
 *
 * @param int $user_id User ID.
 * @return bool
 */
function mmf_is_tax_exempt_customer( int $user_id ): bool {
	if ( $user_id <= 0 ) {
		return false;
	}

	if ( MMF_TAX_STATUS_APPROVED !== mmf_get_tax_exemption_status( $user_id ) ) {
		return false;
	}

	$expiry = mmf_normalize_tax_exemption_expiry( (string) get_user_meta( $user_id, 'mmf_tax_exemption_expiry', true ) );
	if ( $expiry === '' ) {
		return false;
	}

	return strtotime( $expiry . ' 23:59:59' ) >= time();
}

/**
 * Build notice payload for cart / account UI.
 *
 * @param int $user_id User ID.
 * @return array<string, mixed>
 */
function mmf_format_tax_exemption_response( int $user_id ): array {
	$status   = mmf_get_tax_exemption_status( $user_id );
	$expiry   = mmf_normalize_tax_exemption_expiry( (string) get_user_meta( $user_id, 'mmf_tax_exemption_expiry', true ) );
	$cert_url = esc_url_raw( (string) get_user_meta( $user_id, 'mmf_tax_exemption_cert', true ) );
	$is_valid = mmf_is_tax_exempt_customer( $user_id );

	if ( $cert_url && $status === '' ) {
		$status = MMF_TAX_STATUS_PENDING;
	}

	$notice_type = 'none';
	$message     = '';

	if ( $cert_url && MMF_TAX_STATUS_PENDING === $status ) {
		$notice_type = 'pending';
		$message     = 'Your sales tax exemption document is awaiting admin approval.';
	} elseif ( MMF_TAX_STATUS_REJECTED === $status ) {
		$notice_type = 'rejected';
		$message     = 'Your sales tax exemption document was not approved. Please upload a new document.';
	} elseif ( $expiry !== '' && MMF_TAX_STATUS_APPROVED === $status ) {
		$days_left = (int) floor( ( strtotime( $expiry . ' 23:59:59' ) - time() ) / DAY_IN_SECONDS );

		if ( $days_left < 0 ) {
			$notice_type = 'expired';
			$message     = 'Your sales tax exemption document has expired. Please upload a new document.';
		} elseif ( $days_left <= 30 ) {
			$notice_type = 'expiring';
			$message     = 'Your sales tax exemption document is about to expire.';
		}
	} elseif ( $expiry !== '' && $cert_url && MMF_TAX_STATUS_PENDING !== $status && MMF_TAX_STATUS_REJECTED !== $status ) {
		$days_left = (int) floor( ( strtotime( $expiry . ' 23:59:59' ) - time() ) / DAY_IN_SECONDS );

		if ( $days_left < 0 ) {
			$notice_type = 'expired';
			$message     = 'Your sales tax exemption document has expired. Please upload a new document.';
		}
	} elseif ( ! $cert_url ) {
		$notice_type = 'missing';
		$message     = 'Upload your sales tax exemption document to qualify for tax-free orders.';
	}

	$submitted_at = (string) get_user_meta( $user_id, 'mmf_tax_exemption_submitted_at', true );

	return array(
		'status'          => $status,
		'expiry_date'     => $expiry,
		'certificate_url' => $cert_url,
		'submitted_at'    => $submitted_at,
		'has_certificate' => (bool) $cert_url,
		'is_tax_exempt'   => $is_valid,
		'notice_type'     => $notice_type,
		'message'         => $message,
		'show_notice'     => mmf_should_show_tax_exemption_notice( $notice_type, $is_valid ),
	);
}

/**
 * Cart/account upload banner — only when tax does not apply or action is required.
 *
 * @param string $notice_type Notice type.
 * @param bool   $is_valid    Whether customer is currently tax exempt.
 * @return bool
 */
function mmf_should_show_tax_exemption_notice( string $notice_type, bool $is_valid ): bool {
	if ( $is_valid ) {
		return false;
	}

	return in_array( $notice_type, array( 'pending', 'rejected', 'expired', 'missing', 'expiring' ), true );
}

/**
 * GET /custom/v1/tax-exemption
 *
 * @return WP_REST_Response
 */
function mmf_tax_exemption_get(): WP_REST_Response {
	return rest_ensure_response( mmf_format_tax_exemption_response( get_current_user_id() ) );
}

/**
 * Upload and store a new sales tax exemption document.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function mmf_tax_exemption_upload( WP_REST_Request $request ) {
	$user_id = get_current_user_id();
	$expiry  = mmf_normalize_tax_exemption_expiry( sanitize_text_field( (string) $request->get_param( 'expiry_date' ) ) );

	if ( $expiry === '' ) {
		return new WP_Error(
			'missing_expiry',
			'Expiry date is required.',
			array( 'status' => 400 )
		);
	}

	if ( empty( $_FILES['certificate'] ) || empty( $_FILES['certificate']['name'] ) ) {
		return new WP_Error(
			'missing_certificate',
			'Certificate file is required.',
			array( 'status' => 400 )
		);
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$attachment_id = media_handle_upload( 'certificate', 0 );

	if ( is_wp_error( $attachment_id ) ) {
		return new WP_Error(
			'upload_failed',
			$attachment_id->get_error_message(),
			array( 'status' => 400 )
		);
	}

	$cert_url = wp_get_attachment_url( $attachment_id );

	update_user_meta( $user_id, 'mmf_tax_exemption_cert', esc_url_raw( (string) $cert_url ) );
	update_user_meta( $user_id, 'mmf_tax_exemption_expiry', $expiry );
	update_user_meta( $user_id, 'mmf_tax_exemption_status', MMF_TAX_STATUS_PENDING );
	update_user_meta( $user_id, 'mmf_tax_exemption_submitted_at', current_time( 'mysql' ) );

	mmf_sync_customer_tax_exempt_flag_on_id( $user_id );
	mmf_queue_tax_cert_admin_email( $user_id );

	return rest_ensure_response(
		array_merge(
			mmf_format_tax_exemption_response( $user_id ),
			array(
				'success' => true,
				'message' => 'Tax exemption document uploaded. It will apply after admin approval.',
			)
		)
	);
}

/**
 * WooCommerce tax exempt filter for TaxJar and core tax.
 *
 * @param bool        $is_exempt Current value.
 * @param WC_Customer $customer  Customer.
 * @return bool
 */
function mmf_filter_customer_tax_exempt( bool $is_exempt, $customer ): bool {
	if ( $is_exempt ) {
		return true;
	}

	$user_id = $customer instanceof WC_Customer ? (int) $customer->get_id() : 0;

	return mmf_is_tax_exempt_customer( $user_id );
}

/**
 * Sync WC customer VAT exempt flag after login.
 *
 * @param string  $user_login Login.
 * @param WP_User $user       User.
 */
function mmf_sync_customer_tax_exempt_flag( string $user_login, WP_User $user ): void {
	mmf_sync_customer_tax_exempt_flag_on_id( (int) $user->ID );
}

/**
 * @param int $user_id User ID.
 */
function mmf_sync_customer_tax_exempt_flag_on_id( int $user_id ): void {
	if ( ! function_exists( 'WC' ) || $user_id <= 0 ) {
		return;
	}

	$customer = new WC_Customer( $user_id );
	$customer->set_is_vat_exempt( mmf_is_tax_exempt_customer( $user_id ) );
	$customer->save();
}

/**
 * Admin user profile fields.
 *
 * @param WP_User $user User.
 */
function mmf_render_tax_exemption_user_fields( WP_User $user ): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}

	$status   = mmf_get_tax_exemption_status( (int) $user->ID );
	$expiry   = get_user_meta( $user->ID, 'mmf_tax_exemption_expiry', true );
	$cert_url = get_user_meta( $user->ID, 'mmf_tax_exemption_cert', true );
	?>
	<h2><?php esc_html_e( 'Sales Tax Exemption', 'midwest-military' ); ?></h2>
	<table class="form-table" role="presentation">
		<tr>
			<th><label for="mmf_tax_exemption_status"><?php esc_html_e( 'Approval Status', 'midwest-military' ); ?></label></th>
			<td>
				<select name="mmf_tax_exemption_status" id="mmf_tax_exemption_status">
					<option value=""><?php esc_html_e( '— None —', 'midwest-military' ); ?></option>
					<option value="pending" <?php selected( $status, MMF_TAX_STATUS_PENDING ); ?>><?php esc_html_e( 'Pending', 'midwest-military' ); ?></option>
					<option value="approved" <?php selected( $status, MMF_TAX_STATUS_APPROVED ); ?>><?php esc_html_e( 'Approved', 'midwest-military' ); ?></option>
					<option value="rejected" <?php selected( $status, MMF_TAX_STATUS_REJECTED ); ?>><?php esc_html_e( 'Rejected', 'midwest-military' ); ?></option>
				</select>
				<p class="description"><?php esc_html_e( 'Approved + valid expiry date = no sales tax (TaxJar/WooCommerce).', 'midwest-military' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="mmf_tax_exemption_expiry"><?php esc_html_e( 'Expiry Date', 'midwest-military' ); ?></label></th>
			<td>
				<input type="date" name="mmf_tax_exemption_expiry" id="mmf_tax_exemption_expiry" value="<?php echo esc_attr( (string) $expiry ); ?>" class="regular-text" />
			</td>
		</tr>
		<tr>
			<th><?php esc_html_e( 'Certificate File', 'midwest-military' ); ?></th>
			<td>
				<?php if ( $cert_url ) : ?>
					<a href="<?php echo esc_url( $cert_url ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'View uploaded certificate', 'midwest-military' ); ?></a>
				<?php else : ?>
					<span><?php esc_html_e( 'No certificate uploaded.', 'midwest-military' ); ?></span>
				<?php endif; ?>
			</td>
		</tr>
	</table>
	<?php
}

/**
 * Save admin user profile fields.
 *
 * @param int $user_id User ID.
 */
function mmf_save_tax_exemption_user_fields( int $user_id ): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}

	$status = sanitize_key( (string) ( $_POST['mmf_tax_exemption_status'] ?? '' ) );
	if ( in_array( $status, array( '', MMF_TAX_STATUS_PENDING, MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true ) ) {
		if ( $status === '' ) {
			delete_user_meta( $user_id, 'mmf_tax_exemption_status' );
		} else {
			update_user_meta( $user_id, 'mmf_tax_exemption_status', $status );
		}
	}

	$expiry = mmf_normalize_tax_exemption_expiry( sanitize_text_field( (string) ( $_POST['mmf_tax_exemption_expiry'] ?? '' ) ) );
	if ( $expiry ) {
		update_user_meta( $user_id, 'mmf_tax_exemption_expiry', $expiry );
	}

	mmf_sync_customer_tax_exempt_flag_on_id( $user_id );
}

// ============================================================
// AUTOMATED EXPIRATION REMINDER EMAILS (daily cron)
// ============================================================

add_action( 'init', 'mmf_schedule_tax_exemption_reminders' );
add_action( 'mmf_tax_exemption_daily_reminders', 'mmf_send_tax_exemption_reminders' );

function mmf_schedule_tax_exemption_reminders(): void {
	if ( ! wp_next_scheduled( 'mmf_tax_exemption_daily_reminders' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'mmf_tax_exemption_daily_reminders' );
	}
}

/**
 * Email approved customers whose certificate is expiring (≤30 days) or has
 * expired. Each reminder type is sent once per certificate — the flag stores
 * the expiry date it was sent for, so a renewed certificate re-arms it.
 */
function mmf_send_tax_exemption_reminders(): void {
	$users = get_users(
		array(
			'number'     => 500,
			'fields'     => array( 'ID', 'user_email', 'display_name' ),
			'meta_query' => array(
				array(
					'key'   => 'mmf_tax_exemption_status',
					'value' => MMF_TAX_STATUS_APPROVED,
				),
			),
		)
	);

	foreach ( $users as $user ) {
		$user_id = (int) $user->ID;
		$expiry  = mmf_normalize_tax_exemption_expiry( (string) get_user_meta( $user_id, 'mmf_tax_exemption_expiry', true ) );

		if ( $expiry === '' ) {
			continue;
		}

		$days_left = (int) floor( ( strtotime( $expiry . ' 23:59:59' ) - time() ) / DAY_IN_SECONDS );

		if ( $days_left < 0 ) {
			$flag = 'mmf_tax_reminder_expired';
			$subject = __( 'Your sales tax exemption certificate has expired', 'midwest-military' );
			$body = sprintf(
				/* translators: 1: customer name, 2: expiry date */
				__( "Hi %1\$s,\n\nYour sales tax exemption certificate on file expired on %2\$s. Sales tax now applies to your orders.\n\nPlease log in to your account and upload a current certificate to restore tax-exempt purchasing.\n\n%3\$s", 'midwest-military' ),
				$user->display_name,
				$expiry,
				home_url( '/my-account' )
			);
		} elseif ( $days_left <= 30 ) {
			$flag = 'mmf_tax_reminder_expiring';
			$subject = __( 'Your sales tax exemption certificate expires soon', 'midwest-military' );
			$body = sprintf(
				/* translators: 1: customer name, 2: days, 3: expiry date */
				__( "Hi %1\$s,\n\nYour sales tax exemption certificate expires in %2\$d day(s) on %3\$s. To keep tax-free ordering without interruption, please upload a renewed certificate in your account.\n\n%4\$s", 'midwest-military' ),
				$user->display_name,
				$days_left,
				$expiry,
				home_url( '/my-account' )
			);
		} else {
			continue;
		}

		// One email per reminder type per certificate expiry date.
		if ( get_user_meta( $user_id, $flag, true ) === $expiry ) {
			continue;
		}

		if ( wp_mail( $user->user_email, $subject, $body ) ) {
			update_user_meta( $user_id, $flag, $expiry );
		}
	}
}

// ============================================================
// ADMIN REVIEW EMAIL — one-click Approve / Reject buttons
// ============================================================

add_action( 'admin_post_mmf_tax_cert_action', 'mmf_handle_tax_cert_email_action' );
add_action( 'mmf_tax_cert_admin_email_async', 'mmf_send_tax_cert_admin_email' );

/**
 * Queue the admin review email in the background.
 *
 * SMTP on this host can hang ~30s per message — sending inline would block
 * the registration/upload API response. wp-cron sends it moments later.
 *
 * @param int $user_id User ID.
 */
function mmf_queue_tax_cert_admin_email( int $user_id ): void {
	wp_schedule_single_event( time() + 10, 'mmf_tax_cert_admin_email_async', array( $user_id ) );
}

/**
 * Signed one-click action URL for the admin review email.
 *
 * @param int    $user_id User ID.
 * @param string $action  approve|reject.
 * @return string
 */
function mmf_build_tax_cert_action_url( int $user_id, string $action ): string {
	$token = hash_hmac( 'sha256', "mmf-tax-cert|{$user_id}|{$action}", wp_salt( 'auth' ) );

	return add_query_arg(
		array(
			'action'  => 'mmf_tax_cert_action',
			'user_id' => $user_id,
			'do'      => $action,
			'token'   => $token,
		),
		admin_url( 'admin-post.php' )
	);
}

/**
 * Handle Approve/Reject clicks from the admin email.
 * Requires an admin login (WP redirects to login first) + a valid signed token.
 */
function mmf_handle_tax_cert_email_action(): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You do not have permission to manage tax certificates.', 'midwest-military' ) );
	}

	$user_id = absint( $_GET['user_id'] ?? 0 );
	$action  = sanitize_key( (string) ( $_GET['do'] ?? '' ) );
	$token   = sanitize_text_field( (string) ( $_GET['token'] ?? '' ) );

	$expected = hash_hmac( 'sha256', "mmf-tax-cert|{$user_id}|{$action}", wp_salt( 'auth' ) );

	if ( ! $user_id || ! in_array( $action, array( 'approve', 'reject' ), true ) || ! hash_equals( $expected, $token ) ) {
		wp_die( esc_html__( 'Invalid or expired action link.', 'midwest-military' ) );
	}

	$status = 'approve' === $action ? MMF_TAX_STATUS_APPROVED : MMF_TAX_STATUS_REJECTED;

	update_user_meta( $user_id, 'mmf_tax_exemption_status', $status );
	mmf_sync_customer_tax_exempt_flag_on_id( $user_id );
	mmf_send_tax_cert_customer_email( $user_id, $status );

	wp_safe_redirect(
		add_query_arg(
			array(
				'page'         => 'mmf-tax-certificates',
				'mmf_notice'   => $status,
				'mmf_customer' => $user_id,
			),
			admin_url( 'admin.php' )
		)
	);
	exit;
}

/**
 * Notify the admin that a certificate needs review — includes one-click buttons.
 *
 * @param int $user_id User ID.
 */
function mmf_send_tax_cert_admin_email( int $user_id ): void {
	$user = get_userdata( $user_id );

	if ( ! $user instanceof WP_User ) {
		return;
	}

	$cert_url    = esc_url( (string) get_user_meta( $user_id, 'mmf_tax_exemption_cert', true ) );
	$expiry      = mmf_normalize_tax_exemption_expiry( (string) get_user_meta( $user_id, 'mmf_tax_exemption_expiry', true ) );
	$company     = (string) get_user_meta( $user_id, 'billing_company', true );
	$approve_url = esc_url( mmf_build_tax_cert_action_url( $user_id, 'approve' ) );
	$reject_url  = esc_url( mmf_build_tax_cert_action_url( $user_id, 'reject' ) );
	$admin_list  = esc_url( admin_url( 'admin.php?page=mmf-tax-certificates' ) );

	$subject = sprintf(
		/* translators: %s: customer name */
		__( 'Tax exemption certificate needs review — %s', 'midwest-military' ),
		$user->display_name
	);

	$body = '
	<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;border:1px solid #dcdcde;background:#ffffff">
		<div style="background:#1a3659;padding:20px 28px">
			<p style="margin:0;color:#f6c90e;font-size:18px;font-weight:bold">MIDWEST MILITARY FASTENERS</p>
			<p style="margin:4px 0 0;color:#a8bdd4;font-size:13px">Tax Exemption Review Required</p>
		</div>
		<div style="padding:28px">
			<table style="width:100%;border-collapse:collapse;font-size:14px;color:#1d2327">
				<tr><td style="padding:6px 0;color:#50575e;width:130px">Customer</td><td style="padding:6px 0;font-weight:bold">' . esc_html( $user->display_name ) . '</td></tr>
				<tr><td style="padding:6px 0;color:#50575e">Email</td><td style="padding:6px 0">' . esc_html( $user->user_email ) . '</td></tr>
				' . ( $company ? '<tr><td style="padding:6px 0;color:#50575e">Company</td><td style="padding:6px 0">' . esc_html( $company ) . '</td></tr>' : '' ) . '
				<tr><td style="padding:6px 0;color:#50575e">Cert. expiry</td><td style="padding:6px 0">' . esc_html( $expiry ? $expiry : '—' ) . '</td></tr>
				<tr><td style="padding:6px 0;color:#50575e">Certificate</td><td style="padding:6px 0"><a href="' . $cert_url . '" style="color:#1a56db">View certificate file</a></td></tr>
			</table>
			<div style="margin:26px 0 8px">
				<a href="' . $approve_url . '" style="display:inline-block;background:#3a7d44;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 28px;margin-right:10px">APPROVE</a>
				<a href="' . $reject_url . '" style="display:inline-block;background:#b81c23;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 28px">REJECT</a>
			</div>
			<p style="font-size:12px;color:#8c8f94;margin-top:18px">Buttons require a WordPress admin login. You can also review from the <a href="' . $admin_list . '" style="color:#1a56db">Tax Certificates dashboard</a>.</p>
		</div>
	</div>';

	wp_mail(
		get_option( 'admin_email' ),
		$subject,
		$body,
		array( 'Content-Type: text/html; charset=UTF-8' )
	);
}

/**
 * Notify the customer their certificate was approved or rejected.
 *
 * @param int    $user_id User ID.
 * @param string $status  approved|rejected.
 */
function mmf_send_tax_cert_customer_email( int $user_id, string $status ): void {
	$user = get_userdata( $user_id );

	if ( ! $user instanceof WP_User ) {
		return;
	}

	if ( MMF_TAX_STATUS_APPROVED === $status ) {
		$subject = __( 'Your tax exemption has been approved', 'midwest-military' );
		$body    = sprintf(
			/* translators: 1: name, 2: account URL */
			__( "Hi %1\$s,\n\nGood news — your sales tax exemption certificate has been approved. Sales tax will no longer be applied to your orders while the certificate remains valid.\n\nManage your certificate: %2\$s", 'midwest-military' ),
			$user->display_name,
			home_url( '/my-account' )
		);
	} else {
		$subject = __( 'Your tax exemption could not be approved', 'midwest-military' );
		$body    = sprintf(
			/* translators: 1: name, 2: account URL */
			__( "Hi %1\$s,\n\nYour sales tax exemption certificate could not be approved. Applicable sales tax will be charged on your orders.\n\nPlease upload a valid, current certificate from your account: %2\$s", 'midwest-military' ),
			$user->display_name,
			home_url( '/my-account' )
		);
	}

	wp_mail( $user->user_email, $subject, $body );
}

/**
 * Set pending status when a customer registers with a certificate.
 *
 * @param int $user_id User ID.
 */
function mmf_mark_tax_exemption_pending( int $user_id ): void {
	$cert_url = get_user_meta( $user_id, 'mmf_tax_exemption_cert', true );
	if ( ! $cert_url ) {
		return;
	}

	update_user_meta( $user_id, 'mmf_tax_exemption_status', MMF_TAX_STATUS_PENDING );
	update_user_meta( $user_id, 'mmf_tax_exemption_submitted_at', current_time( 'mysql' ) );
}
