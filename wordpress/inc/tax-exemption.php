<?php
/**
 * Sales tax exemption certificates — user meta, admin approval, WC/TaxJar exempt.
 *
 * User meta:
 *   mmf_tax_exemption_cert     — URL to uploaded PDF (kept for back-compat; do not link directly)
 *   mmf_tax_exemption_cert_id  — attachment ID of the uploaded certificate (private post status)
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
add_filter( 'woocommerce_customer_is_vat_exempt', 'mmf_filter_customer_tax_exempt', 20, 2 );
add_action( 'woocommerce_before_calculate_totals', 'mmf_refresh_session_tax_exempt_flag', 5 );
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
		'certificate_url' => $cert_url ? mmf_get_tax_cert_download_url( $user_id ) : '',
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

	$validation = mmf_validate_tax_cert_upload( $_FILES['certificate'] );

	if ( is_wp_error( $validation ) ) {
		return $validation;
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

	// Certificates contain sensitive business data — keep them out of the
	// public media library, REST /wp/v2/media enumeration, and attachment pages.
	wp_update_post(
		array(
			'ID'          => $attachment_id,
			'post_status' => 'private',
		)
	);

	$cert_url = wp_get_attachment_url( $attachment_id );

	update_user_meta( $user_id, 'mmf_tax_exemption_cert', esc_url_raw( (string) $cert_url ) );
	update_user_meta( $user_id, 'mmf_tax_exemption_cert_id', (int) $attachment_id );
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
 * Validate an uploaded certificate file before it reaches the media library.
 *
 * Allow-list of document/image types, max 5MB.
 *
 * @param array $file One $_FILES entry (name, size, ...).
 * @return true|WP_Error
 */
function mmf_validate_tax_cert_upload( array $file ) {
	$max_bytes = 5 * MB_IN_BYTES;

	if ( ! empty( $file['size'] ) && (int) $file['size'] > $max_bytes ) {
		return new WP_Error(
			'certificate_too_large',
			__( 'Certificate file must be 5MB or smaller.', 'midwest-military' ),
			array( 'status' => 400 )
		);
	}

	$allowed = array(
		'application/pdf',
		'image/jpeg',
		'image/png',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	);

	$filetype = wp_check_filetype( (string) ( $file['name'] ?? '' ) );

	if ( empty( $filetype['type'] ) || ! in_array( $filetype['type'], $allowed, true ) ) {
		return new WP_Error(
			'certificate_invalid_type',
			__( 'Certificate must be a PDF, JPG, PNG, or Word document.', 'midwest-military' ),
			array( 'status' => 400 )
		);
	}

	return true;
}

// ============================================================
// GATED CERTIFICATE DOWNLOAD — certificates are private attachments
// ============================================================

add_action( 'admin_post_mmf_tax_cert_download', 'mmf_handle_tax_cert_download' );
add_action( 'admin_post_nopriv_mmf_tax_cert_download', 'mmf_handle_tax_cert_download_nopriv' );

/**
 * Resolve a user's certificate attachment ID.
 *
 * Prefers the mmf_tax_exemption_cert_id meta; falls back to resolving the
 * legacy mmf_tax_exemption_cert URL meta for certificates uploaded before
 * the ID meta existed.
 *
 * @param int $user_id User ID.
 * @return int Attachment ID, 0 when none.
 */
function mmf_get_tax_cert_attachment_id( int $user_id ): int {
	$attachment_id = (int) get_user_meta( $user_id, 'mmf_tax_exemption_cert_id', true );

	if ( $attachment_id > 0 ) {
		return $attachment_id;
	}

	$cert_url = (string) get_user_meta( $user_id, 'mmf_tax_exemption_cert', true );

	return $cert_url ? (int) attachment_url_to_postid( $cert_url ) : 0;
}

/**
 * Signed download URL for a user's certificate (admin-post handler).
 *
 * Valid for 14 days; access is additionally restricted to the certificate
 * owner or shop managers at download time.
 *
 * @param int $user_id User ID.
 * @return string
 */
function mmf_get_tax_cert_download_url( int $user_id ): string {
	$expires = time() + 14 * DAY_IN_SECONDS;
	$token   = hash_hmac( 'sha256', "mmf-tax-cert-download|{$user_id}|{$expires}", wp_salt( 'auth' ) );

	return add_query_arg(
		array(
			'action'  => 'mmf_tax_cert_download',
			'user_id' => $user_id,
			'expires' => $expires,
			'token'   => $token,
		),
		admin_url( 'admin-post.php' )
	);
}

/**
 * Logged-out requests never get certificate files.
 */
function mmf_handle_tax_cert_download_nopriv(): void {
	wp_die(
		esc_html__( 'You must be logged in to download this file.', 'midwest-military' ),
		'',
		array( 'response' => 403 )
	);
}

/**
 * Stream a certificate to the owner or a shop manager.
 *
 * Requires a login, a valid non-expired HMAC token, and either the requesting
 * user owning the certificate or the manage_woocommerce capability.
 */
function mmf_handle_tax_cert_download(): void {
	if ( ! is_user_logged_in() ) {
		mmf_handle_tax_cert_download_nopriv();
	}

	$user_id = absint( $_GET['user_id'] ?? 0 );
	$expires = absint( $_GET['expires'] ?? 0 );
	$token   = sanitize_text_field( (string) ( $_GET['token'] ?? '' ) );

	$expected = hash_hmac( 'sha256', "mmf-tax-cert-download|{$user_id}|{$expires}", wp_salt( 'auth' ) );

	if ( ! $user_id || ! $expires || ! hash_equals( $expected, $token ) || $expires < time() ) {
		wp_die(
			esc_html__( 'Invalid or expired download link.', 'midwest-military' ),
			'',
			array( 'response' => 403 )
		);
	}

	if ( get_current_user_id() !== $user_id && ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die(
			esc_html__( 'You do not have permission to download this file.', 'midwest-military' ),
			'',
			array( 'response' => 403 )
		);
	}

	$attachment_id = mmf_get_tax_cert_attachment_id( $user_id );
	$file          = $attachment_id ? get_attached_file( $attachment_id ) : '';

	if ( ! $file || ! file_exists( $file ) ) {
		wp_die(
			esc_html__( 'Certificate file not found.', 'midwest-military' ),
			'',
			array( 'response' => 404 )
		);
	}

	$mime = get_post_mime_type( $attachment_id );

	nocache_headers();
	header( 'Content-Type: ' . ( $mime ? $mime : 'application/octet-stream' ) );
	header( 'Content-Disposition: inline; filename="' . basename( $file ) . '"' );
	header( 'Content-Length: ' . (string) filesize( $file ) );
	header( 'X-Content-Type-Options: nosniff' );

	readfile( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
	exit;
}

/**
 * WooCommerce `woocommerce_customer_is_vat_exempt` filter (WC_Customer::is_vat_exempt()).
 *
 * @param bool             $is_exempt Current value.
 * @param WC_Customer|null $customer  Customer (passed by WC core when available).
 * @return bool
 */
function mmf_filter_customer_tax_exempt( bool $is_exempt, $customer = null ): bool {
	$user_id = $customer instanceof WC_Customer ? (int) $customer->get_id() : get_current_user_id();

	// Always re-check live cert status for known WC customers — the stored
	// is_vat_exempt flag may be stale if the certificate expired after login.
	if ( $user_id > 0 ) {
		return mmf_is_tax_exempt_customer( $user_id );
	}

	return $is_exempt;
}

/**
 * Re-sync the session customer's exempt flag before every totals calculation.
 *
 * WC_Cart_Totals reads the RAW stored flag (get_is_vat_exempt()), not the
 * filtered is_vat_exempt() — so the filter alone cannot un-exempt a customer
 * whose certificate expired mid-session. Setting the flag here makes every
 * cart/checkout/Store API calculation use the live certificate status.
 */
function mmf_refresh_session_tax_exempt_flag(): void {
	if ( ! function_exists( 'WC' ) || null === WC()->customer ) {
		return;
	}

	$user_id = get_current_user_id();
	WC()->customer->set_is_vat_exempt( $user_id > 0 && mmf_is_tax_exempt_customer( $user_id ) );
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
					<a href="<?php echo esc_url( mmf_get_tax_cert_download_url( (int) $user->ID ) ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'View uploaded certificate', 'midwest-military' ); ?></a>
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
 * Sends a customer notification when status changes to approved or rejected.
 *
 * @param int $user_id User ID.
 */
function mmf_save_tax_exemption_user_fields( int $user_id ): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}

	$old_status = mmf_get_tax_exemption_status( $user_id );
	$new_status = sanitize_key( (string) ( $_POST['mmf_tax_exemption_status'] ?? '' ) );

	if ( in_array( $new_status, array( '', MMF_TAX_STATUS_PENDING, MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true ) ) {
		if ( $new_status === '' ) {
			delete_user_meta( $user_id, 'mmf_tax_exemption_status' );
		} else {
			update_user_meta( $user_id, 'mmf_tax_exemption_status', $new_status );
		}
	}

	$expiry = mmf_normalize_tax_exemption_expiry( sanitize_text_field( (string) ( $_POST['mmf_tax_exemption_expiry'] ?? '' ) ) );
	if ( $expiry ) {
		update_user_meta( $user_id, 'mmf_tax_exemption_expiry', $expiry );
	}

	mmf_sync_customer_tax_exempt_flag_on_id( $user_id );

	// Email the customer whenever status transitions to approved or rejected.
	$notify_statuses = array( MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED );
	if ( in_array( $new_status, $notify_statuses, true ) && $new_status !== $old_status ) {
		mmf_send_tax_cert_customer_email( $user_id, $new_status );
	}
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

		$account_url = esc_url( home_url( '/my-account' ) );
		$name        = esc_html( $user->display_name );

		if ( $days_left < 0 ) {
			$flag        = 'mmf_tax_reminder_expired';
			$subject     = __( 'Your sales tax exemption certificate has expired — Midwest Military Fasteners', 'midwest-military' );
			$accent      = '#b81c23';
			$heading     = __( 'Certificate Expired', 'midwest-military' );
			$msg         = sprintf(
				/* translators: 1: expiry date */
				__( 'Your sales tax exemption certificate expired on <strong>%1$s</strong>. Sales tax is now being applied to your orders.', 'midwest-military' ),
				esc_html( $expiry )
			);
			$cta         = __( 'Upload New Certificate', 'midwest-military' );
		} elseif ( $days_left <= 30 ) {
			$flag        = 'mmf_tax_reminder_expiring';
			$subject     = sprintf(
				/* translators: %d: days remaining */
				__( 'Your sales tax exemption expires in %d day(s) — Midwest Military Fasteners', 'midwest-military' ),
				$days_left
			);
			$accent      = '#996800';
			$heading     = __( 'Certificate Expiring Soon', 'midwest-military' );
			$msg         = sprintf(
				/* translators: 1: days left, 2: expiry date */
				__( 'Your sales tax exemption certificate expires in <strong>%1$d day(s)</strong> on %2$s. Upload a renewed certificate to keep tax-free purchasing without interruption.', 'midwest-military' ),
				$days_left,
				esc_html( $expiry )
			);
			$cta         = __( 'Renew Certificate', 'midwest-military' );
		} else {
			continue;
		}

		// One email per reminder type per certificate expiry date.
		if ( get_user_meta( $user_id, $flag, true ) === $expiry ) {
			continue;
		}

		$inner =
			'<h2 style="margin: 0 0 12px; font-size: 20px; font-family: sans-serif; color: ' . esc_attr( $accent ) . ';">' . esc_html( $heading ) . '</h2>' .
			mmf_email_p( sprintf( /* translators: %s: customer name */ esc_html__( 'Dear %s,', 'midwest-military' ), $name ) ) .
			mmf_email_p( wp_kses( $msg, array( 'strong' => array() ) ) ) .
			'<div style="padding-top: 20px;">' . mmf_email_button( $account_url, $cta ) . '</div>' .
			'<p style="font-size: 12px; color: #8c8f94; font-family: sans-serif; margin-top: 24px;">' . esc_html__( 'Questions? Reply to this email or contact us at', 'midwest-military' ) . ' <a href="mailto:' . esc_attr( get_option( 'admin_email' ) ) . '" style="color: #1a56db;">' . esc_html( get_option( 'admin_email' ) ) . '</a>.</p>';

		$body = mmf_email_template( $inner );

		if ( wp_mail( $user->user_email, $subject, $body, array( 'Content-Type: text/html; charset=UTF-8' ) ) ) {
			update_user_meta( $user_id, $flag, $expiry );
		}
	}
}

// ============================================================
// SHARED EMAIL TEMPLATE — matches the Gravity Forms notification
// design (logo header / white card on #F9F9F9 / #CC9900 footer).
// All URLs are built at send time — nothing is hardcoded to a domain.
// ============================================================

/**
 * Email logo URL — resolved from the current site's uploads dir so the
 * same code works on dev/test/live Pantheon environments.
 */
function mmf_email_logo_url(): string {
	$uploads = wp_get_upload_dir();

	return (string) apply_filters( 'mmf_email_logo_url', $uploads['baseurl'] . '/2026/07/logo-email.png' );
}

/**
 * Wrap inner HTML in the standard MMF email shell.
 *
 * @param string $inner_html Pre-escaped content for the white card.
 */
function mmf_email_template( string $inner_html ): string {
	$logo = esc_url( mmf_email_logo_url() );
	$home = esc_url( home_url( '/' ) );
	$year = esc_html( gmdate( 'Y' ) );

	return '&nbsp;
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0"><tbody><tr>
<td style="padding: 20px 0 30px 0;">
<table style="border-collapse: collapse; border: 1px solid rgba(0,25,19,0.1);" border="0" width="600" cellspacing="0" cellpadding="0" align="center"><tbody>
<tr align="center"><td style="padding: 20px 15px;" bgcolor="#ffffff"><a href="' . $home . '" target="_blank" rel="noopener"><img style="width: 284px; height: auto;" src="' . $logo . '" alt="Midwest Military Fasteners" width="284" height="71" /></a></td></tr>
<tr><td style="padding: 20px 15px;" bgcolor="#F9F9F9">
<table style="border-collapse: collapse;" border="0" width="560" cellspacing="0" cellpadding="0" align="center"><tbody><tr>
<td style="text-align: left; width: inherit; background-color: #fff; padding: 20px 15px; border-radius: 5px;">' . $inner_html . '</td>
</tr></tbody></table>
</td></tr>
<tr><td style="padding: 20px 30px 20px; text-align: center;" bgcolor="#CC9900"><p style="font-size: 16px; margin: 0; color: #fff; font-family: sans-serif;">Copyright ' . $year . ' Midwest Military Fasteners LLC</p></td></tr>
</tbody></table>
</td></tr></tbody></table>';
}

/**
 * One bordered label/value row for the details table inside emails.
 *
 * @param string $label      Row label (plain text).
 * @param string $value_html Pre-escaped value HTML.
 */
function mmf_email_row( string $label, string $value_html ): string {
	return '<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>' . esc_html( $label ) . '</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">' . $value_html . '</td>
</tr>';
}

/**
 * Solid CTA button for emails.
 *
 * @param string $url   Target URL.
 * @param string $label Button text.
 * @param string $bg    Background color hex.
 */
function mmf_email_button( string $url, string $label, string $bg = '#CC9900' ): string {
	return '<a style="display: inline-block; background: ' . esc_attr( $bg ) . '; font-size: 16px; font-family: sans-serif; color: #fff; text-decoration: none; font-weight: bold; padding: 12px 28px; margin-right: 10px;" href="' . esc_url( $url ) . '">' . esc_html( $label ) . '</a>';
}

/**
 * Standard paragraph for emails.
 *
 * @param string $html Pre-escaped paragraph HTML.
 */
function mmf_email_p( string $html ): string {
	return '<p style="font-size: 16px; color: #000000; font-family: sans-serif;">' . $html . '</p>';
}

// ============================================================
// GRAVITY FORMS INTEGRATION — merge tags + shortcode
// {mmf_approve_url} / {mmf_reject_url} resolve to fresh HMAC-signed
// one-click action links for the user created by the entry.
// ============================================================

add_filter( 'gform_replace_merge_tags', 'mmf_gf_tax_cert_merge_tags', 10, 3 );
add_shortcode( 'current_year', 'mmf_current_year_shortcode' );

function mmf_current_year_shortcode(): string {
	return gmdate( 'Y' );
}

/**
 * Resolve {mmf_approve_url} / {mmf_reject_url} in GF notifications.
 *
 * Falls back to the Tax Certificates dashboard when the WP user cannot be
 * resolved yet (e.g. pending-activation registrations).
 *
 * @param string $text  Notification text being processed.
 * @param mixed  $form  GF form array.
 * @param mixed  $entry GF entry array.
 */
function mmf_gf_tax_cert_merge_tags( $text, $form, $entry ) {
	if ( ! is_string( $text ) || false === strpos( $text, '{mmf_' ) ) {
		return $text;
	}

	$user_id  = mmf_gf_entry_user_id( is_array( $entry ) ? $entry : array(), is_array( $form ) ? $form : array() );
	$fallback = admin_url( 'admin.php?page=mmf-tax-certificates' );

	$approve = $user_id ? mmf_build_tax_cert_action_url( $user_id, 'approve' ) : $fallback;
	$reject  = $user_id ? mmf_build_tax_cert_action_url( $user_id, 'reject' ) : $fallback;

	return str_replace(
		array( '{mmf_approve_url}', '{mmf_reject_url}', '{mmf_site_url}', '{mmf_logo_url}' ),
		array( esc_url( $approve ), esc_url( $reject ), esc_url( home_url( '/' ) ), esc_url( mmf_email_logo_url() ) ),
		$text
	);
}

/**
 * Find the WP user a GF entry belongs to.
 *
 * Order: GF User Registration link meta → entry creator → email field match.
 *
 * @param array $entry GF entry.
 * @param array $form  GF form.
 */
function mmf_gf_entry_user_id( array $entry, array $form ): int {
	$entry_id = absint( $entry['id'] ?? 0 );

	// GF User Registration stamps the created user with the entry id.
	if ( $entry_id ) {
		$linked = get_users(
			array(
				'meta_key'   => '_gform-entry-id',
				'meta_value' => $entry_id,
				'number'     => 1,
				'fields'     => 'ID',
			)
		);

		if ( $linked ) {
			return (int) $linked[0];
		}
	}

	if ( ! empty( $entry['created_by'] ) ) {
		return absint( $entry['created_by'] );
	}

	// Fall back to matching the form's email field against WP users.
	foreach ( (array) ( $form['fields'] ?? array() ) as $field ) {
		if ( ! is_object( $field ) || 'email' !== $field->type ) {
			continue;
		}

		$value = sanitize_email( (string) ( $entry[ (string) $field->id ] ?? '' ) );

		if ( $value && is_email( $value ) ) {
			$user = get_user_by( 'email', $value );

			if ( $user instanceof WP_User ) {
				return (int) $user->ID;
			}
		}
	}

	return 0;
}

// ============================================================
// ADMIN REVIEW EMAIL — one-click Approve / Reject buttons
// ============================================================

// Fired for both logged-in and logged-out visitors — the HMAC token is the
// sole authentication mechanism; no WP session is required.
add_action( 'admin_post_mmf_tax_cert_action', 'mmf_handle_tax_cert_email_action' );
add_action( 'admin_post_nopriv_mmf_tax_cert_action', 'mmf_handle_tax_cert_email_action' );
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
 * Links expire after 14 days; the expiry timestamp is covered by the HMAC so
 * it cannot be extended by tampering with the URL.
 *
 * @param int    $user_id User ID.
 * @param string $action  approve|reject.
 * @return string
 */
function mmf_build_tax_cert_action_url( int $user_id, string $action ): string {
	$expires = time() + 14 * DAY_IN_SECONDS;
	$token   = hash_hmac( 'sha256', "mmf-tax-cert|{$user_id}|{$action}|{$expires}", wp_salt( 'auth' ) );

	return add_query_arg(
		array(
			'action'  => 'mmf_tax_cert_action',
			'user_id' => $user_id,
			'do'      => $action,
			'expires' => $expires,
			'token'   => $token,
		),
		admin_url( 'admin-post.php' )
	);
}

/**
 * Handle Approve/Reject clicks from the admin email.
 *
 * Security model: the HMAC token is the sole authentication mechanism.
 * No WP session is required — the signed URL proves the request was
 * generated by this server and has not been tampered with.
 *
 * Token covers: user_id + action + expiry  →  cannot be replayed for
 * a different user, a different action, or after 14 days.
 * Action is idempotent: clicking twice shows a "already set" notice.
 */
function mmf_handle_tax_cert_email_action(): void {
	$user_id = absint( $_GET['user_id'] ?? 0 );
	$action  = sanitize_key( (string) ( $_GET['do'] ?? '' ) );
	$expires = absint( $_GET['expires'] ?? 0 );
	$token   = sanitize_text_field( (string) ( $_GET['token'] ?? '' ) );

	// Validate token before touching any data.
	$expected = hash_hmac( 'sha256', "mmf-tax-cert|{$user_id}|{$action}|{$expires}", wp_salt( 'auth' ) );

	if (
		! $user_id
		|| ! $expires
		|| ! in_array( $action, array( 'approve', 'reject' ), true )
		|| ! hash_equals( $expected, $token )
		|| $expires < time()
	) {
		wp_die(
			'<p style="font-family:sans-serif">' . esc_html__( 'Invalid or expired action link. Please ask the customer to re-submit their certificate to generate fresh links.', 'midwest-military' ) . '</p>',
			esc_html__( 'Invalid Link', 'midwest-military' ),
			array( 'response' => 403 )
		);
	}

	$status     = 'approve' === $action ? MMF_TAX_STATUS_APPROVED : MMF_TAX_STATUS_REJECTED;
	$old_status = mmf_get_tax_exemption_status( $user_id );
	$already    = $old_status === $status;

	if ( ! $already ) {
		update_user_meta( $user_id, 'mmf_tax_exemption_status', $status );
		mmf_sync_customer_tax_exempt_flag_on_id( $user_id );
		mmf_send_tax_cert_customer_email( $user_id, $status );
	}

	$user          = get_userdata( $user_id );
	$customer_name = $user instanceof WP_User ? $user->display_name : __( 'Customer', 'midwest-military' );
	$is_approved   = MMF_TAX_STATUS_APPROVED === $status;
	$accent        = $is_approved ? '#3a7d44' : '#b81c23';
	$heading       = $is_approved
		? __( 'Certificate Approved', 'midwest-military' )
		: __( 'Certificate Rejected', 'midwest-military' );
	$body_msg      = $is_approved
		? sprintf(
			/* translators: %s: customer name */
			__( '%s\'s tax exemption certificate has been <strong>approved</strong>. They have been sent a confirmation email and will pay $0 in sales tax until the certificate expires.', 'midwest-military' ),
			esc_html( $customer_name )
		)
		: sprintf(
			/* translators: %s: customer name */
			__( '%s\'s tax exemption certificate has been <strong>rejected</strong>. They have been notified and will be prompted to upload a new document.', 'midwest-military' ),
			esc_html( $customer_name )
		);

	$already_note  = $already
		? ' <span style="font-size:13px;color:#8c8f94">(' . esc_html__( 'status was already set — no change made', 'midwest-military' ) . ')</span>'
		: '';

	$admin_url = is_user_logged_in()
		? add_query_arg( array( 'page' => 'mmf-tax-certificates', 'mmf_notice' => $status, 'mmf_customer' => $user_id ), admin_url( 'admin.php' ) )
		: '';

	$admin_link = $admin_url
		? '<p style="margin-top:20px"><a href="' . esc_url( $admin_url ) . '" style="color:#1a56db;font-size:14px">' . esc_html__( 'View all pending certificates →', 'midwest-military' ) . '</a></p>'
		: '<p style="margin-top:20px;font-size:13px;color:#8c8f94">' . esc_html__( 'Log in to WordPress admin to manage certificates.', 'midwest-military' ) . '</p>';

	wp_die(
		'<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:60px auto;border:1px solid #dcdcde;background:#fff">
			<div style="background:#1a3659;padding:20px 28px">
				<p style="margin:0;color:#f6c90e;font-size:18px;font-weight:bold">MIDWEST MILITARY FASTENERS</p>
				<p style="margin:4px 0 0;color:#a8bdd4;font-size:13px">Tax Exemption Review</p>
			</div>
			<div style="padding:28px">
				<div style="display:inline-block;background:' . $accent . ';color:#fff;border-radius:50%;width:36px;height:36px;line-height:36px;text-align:center;font-size:20px;font-weight:bold;margin-bottom:16px">&#10003;</div>
				<h2 style="margin:0 0 8px;color:#1a3659;font-size:20px">' . esc_html( $heading ) . $already_note . '</h2>
				<p style="color:#1d2327;font-size:14px;line-height:1.6">' . wp_kses( $body_msg, array( 'strong' => array() ) ) . '</p>
				' . $admin_link . '
			</div>
		</div>',
		esc_html( $heading ),
		array( 'response' => 200 )
	);
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

	$cert_url    = esc_url( mmf_get_tax_cert_download_url( $user_id ) );
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

	$inner =
		mmf_email_p( esc_html__( 'Dear Admin,', 'midwest-military' ) ) .
		mmf_email_p( esc_html__( 'A new tax exemption certificate has been submitted and requires review.', 'midwest-military' ) ) .
		'<table style="border-collapse: collapse;" width="100%" cellspacing="0" cellpadding="0"><tbody>' .
		mmf_email_row( __( 'Customer:', 'midwest-military' ), esc_html( $user->display_name ) ) .
		( $company ? mmf_email_row( __( 'Company:', 'midwest-military' ), esc_html( $company ) ) : '' ) .
		mmf_email_row( __( 'Email:', 'midwest-military' ), esc_html( $user->user_email ) ) .
		mmf_email_row( __( 'Certificate:', 'midwest-military' ), '<a href="' . $cert_url . '" style="color: #1a56db;">' . esc_html__( 'View certificate file', 'midwest-military' ) . '</a>' ) .
		mmf_email_row( __( 'Certificate Expiry:', 'midwest-military' ), esc_html( $expiry ? $expiry : '—' ) ) .
		'</tbody></table>' .
		'<div style="padding-top: 20px;">' .
		mmf_email_button( $approve_url, __( 'APPROVE', 'midwest-military' ), '#3a7d44' ) .
		mmf_email_button( $reject_url, __( 'REJECT', 'midwest-military' ), '#b81c23' ) .
		'</div>' .
		'<p style="font-size: 12px; color: #8c8f94; font-family: sans-serif; margin-top: 18px;">' . esc_html__( 'Buttons work without logging in — the link is cryptographically signed and expires in 14 days. You can also review from the', 'midwest-military' ) . ' <a href="' . $admin_list . '" style="color: #1a56db;">' . esc_html__( 'Tax Certificates dashboard', 'midwest-military' ) . '</a>.</p>';

	$body = mmf_email_template( $inner );

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

	$account_url = esc_url( home_url( '/my-account' ) );
	$name        = esc_html( $user->display_name );

	if ( MMF_TAX_STATUS_APPROVED === $status ) {
		$subject    = __( 'Your tax exemption has been approved — Midwest Military Fasteners', 'midwest-military' );
		$heading    = 'Tax Exemption Approved';
		$color      = '#3a7d44';
		$icon       = '&#10003;';
		$message    = 'Great news — your sales tax exemption certificate has been reviewed and <strong>approved</strong>. Sales tax will no longer be applied to your orders while the certificate remains valid.';
		$cta_label  = 'View My Account';
	} else {
		$subject    = __( 'Your tax exemption could not be approved — Midwest Military Fasteners', 'midwest-military' );
		$heading    = 'Tax Exemption Not Approved';
		$color      = '#b81c23';
		$icon       = '&#10005;';
		$message    = 'Unfortunately your sales tax exemption certificate could not be approved. Applicable sales tax will be charged on your orders. Please upload a valid, current certificate from your account.';
		$cta_label  = 'Upload a New Certificate';
	}

	$inner =
		'<h2 style="margin: 0 0 12px; font-size: 20px; font-family: sans-serif; color: ' . esc_attr( $color ) . ';">' . esc_html( $heading ) . '</h2>' .
		mmf_email_p( sprintf( /* translators: %s: customer name */ esc_html__( 'Dear %s,', 'midwest-military' ), $name ) ) .
		mmf_email_p( wp_kses( $message, array( 'strong' => array() ) ) ) .
		'<div style="padding-top: 20px;">' . mmf_email_button( $account_url, $cta_label ) . '</div>' .
		'<p style="font-size: 12px; color: #8c8f94; font-family: sans-serif; margin-top: 24px;">' . esc_html__( 'If you have questions, reply to this email or contact us at', 'midwest-military' ) . ' <a href="mailto:' . esc_attr( get_option( 'admin_email' ) ) . '" style="color: #1a56db;">' . esc_html( get_option( 'admin_email' ) ) . '</a>.</p>';

	$body = mmf_email_template( $inner );

	wp_mail(
		$user->user_email,
		$subject,
		$body,
		array( 'Content-Type: text/html; charset=UTF-8' )
	);
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
