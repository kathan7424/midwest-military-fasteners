<?php
/**
 * Authentication — WooCommerce customer registration via Gravity Forms
 * and WordPress native login (wp_signon). No WooCommerce REST API for auth.
 *
 * Registration Form ID: 1 (Gravity Forms export)
 * Fields: 1.3 First, 1.6 Last, 4 Company, 5 Email, 8 Password, 6 Certificate, 7 Expiry
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

define( 'MMF_REGISTRATION_FORM_ID', 1 );

define( 'MMF_GF_FIELD_FIRST_NAME', '1.3' );
define( 'MMF_GF_FIELD_LAST_NAME', '1.6' );
define( 'MMF_GF_FIELD_COMPANY', '4' );
define( 'MMF_GF_FIELD_EMAIL', '5' );
define( 'MMF_GF_FIELD_PASSWORD', '8' );
define( 'MMF_GF_FIELD_PASSWORD_CONFIRM', '8.2' );
define( 'MMF_GF_FIELD_CERTIFICATE', '6' );
define( 'MMF_GF_FIELD_EXPIRY', '7' );

add_action( 'rest_api_init', 'mmf_register_auth_routes' );
add_filter( 'rest_authentication_errors', 'mmf_headless_cookie_auth', 200 );

/**
 * Restore cookie-authenticated users for headless proxy REST requests.
 *
 * WP core zeroes the current user on cookie-auth REST calls without an
 * X-WP-Nonce (rest_cookie_check_errors). The Next.js server proxy can't get
 * a nonce (it's rendered into wp-admin pages), so logged-in endpoints like
 * /custom/v1/tax-exemption always returned 401 and Store API orders were
 * created as guests.
 *
 * CSRF-safe: only applies when the X-MMF-Proxy header is present — browsers
 * cannot send custom headers cross-origin without a CORS preflight, so forged
 * cross-site requests never carry it. The header is added exclusively by the
 * Next.js server-side proxy.
 *
 * @param WP_Error|true|null $result Current authentication result.
 * @return WP_Error|true|null
 */
function mmf_headless_cookie_auth( $result ) {
	if ( is_wp_error( $result ) ) {
		return $result;
	}

	if ( empty( $_SERVER['HTTP_X_MMF_PROXY'] ) ) {
		return $result;
	}

	if ( get_current_user_id() > 0 ) {
		return $result;
	}

	$user_id = (int) wp_validate_auth_cookie( '', 'logged_in' );

	if ( $user_id > 0 ) {
		wp_set_current_user( $user_id );
	}

	return $result;
}
add_action( 'gform_after_submission_' . MMF_REGISTRATION_FORM_ID, 'mmf_create_customer_from_gravity_entry', 10, 2 );

/**
 * Register custom auth REST routes.
 */
function mmf_register_auth_routes(): void {
	register_rest_route(
		'custom/v1',
		'/auth/login',
		array(
			'methods'             => 'POST',
			'callback'            => 'mmf_auth_login',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'custom/v1',
		'/auth/logout',
		array(
			'methods'             => 'POST',
			'callback'            => 'mmf_auth_logout',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'custom/v1',
		'/auth/me',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_auth_me',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'custom/v1',
		'/auth/register',
		array(
			'methods'             => WP_REST_Server::READABLE . ',' . WP_REST_Server::CREATABLE,
			'callback'            => 'mmf_auth_register_route',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'custom/v1',
		'/auth/register/meta',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_auth_register_meta',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'custom/v1',
		'/auth/register/check-email',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'mmf_auth_register_check_email',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'custom/v1',
		'/auth/forgot-password',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mmf_auth_forgot_password',
			'permission_callback' => '__return_true',
		)
	);
}

/**
 * Format user data for API responses.
 *
 * @param WP_User $user WordPress user.
 * @return array
 */
function mmf_format_auth_user( WP_User $user ): array {
	$customer_id = $user->ID;

	return array(
		'id'         => $customer_id,
		'email'      => $user->user_email,
		'first_name' => get_user_meta( $customer_id, 'first_name', true ),
		'last_name'  => get_user_meta( $customer_id, 'last_name', true ),
		'company'    => get_user_meta( $customer_id, 'billing_company', true ),
		'display_name' => $user->display_name,
	);
}

/**
 * Login with email/username and password using wp_signon.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_auth_login( WP_REST_Request $request ) {
	$email    = sanitize_text_field( (string) $request->get_param( 'email' ) );
	$password = (string) $request->get_param( 'password' );
	$remember = (bool) $request->get_param( 'remember' );

	if ( empty( $email ) || empty( $password ) ) {
		return new WP_Error(
			'missing_credentials',
			'Email and password are required.',
			array( 'status' => 400 )
		);
	}

	$user = get_user_by( 'email', $email );

	if ( ! $user ) {
		$user = get_user_by( 'login', $email );
	}

	if ( ! $user ) {
		return new WP_Error(
			'invalid_credentials',
			'Invalid email or password.',
			array( 'status' => 401 )
		);
	}

	$signon = wp_signon(
		array(
			'user_login'    => $user->user_login,
			'user_password' => $password,
			'remember'      => $remember,
		),
		is_ssl()
	);

	if ( is_wp_error( $signon ) ) {
		return new WP_Error(
			'invalid_credentials',
			'Invalid email or password.',
			array( 'status' => 401 )
		);
	}

	wp_set_current_user( $signon->ID );

	if ( function_exists( 'wc_set_customer_auth_cookie' ) ) {
		wc_set_customer_auth_cookie( $signon->ID );
	} else {
		wp_set_auth_cookie( $signon->ID, $remember, is_ssl() );
	}

	return rest_ensure_response(
		array(
			'success' => true,
			'user'    => mmf_format_auth_user( $signon ),
		)
	);
}

/**
 * Log out the current user.
 *
 * @return WP_REST_Response
 */
function mmf_auth_logout(): WP_REST_Response {
	wp_logout();

	return rest_ensure_response(
		array(
			'success' => true,
		)
	);
}

// ── Gravity Forms merge tags for the tax-cert review email ────────────────
// {mmf_approve_url} / {mmf_reject_url} — one-click action links. Resolves the
// WP user by the entry's email; falls back to the Tax Certificates dashboard
// when the user doesn't exist yet.
add_filter( 'gform_replace_merge_tags', 'mmf_gf_tax_cert_merge_tags', 10, 3 );

/**
 * @param string $text  Notification text.
 * @param array  $form  Form.
 * @param array  $entry Entry.
 * @return string
 */
function mmf_gf_tax_cert_merge_tags( $text, $form, $entry ) {
	if ( ! is_string( $text ) || strpos( $text, '{mmf_' ) === false ) {
		return $text;
	}

	$dashboard = admin_url( 'admin.php?page=mmf-tax-certificates' );
	$approve   = $dashboard;
	$reject    = $dashboard;

	if ( is_array( $entry ) && function_exists( 'mmf_build_tax_cert_action_url' ) ) {
		$email = sanitize_email( (string) rgar( $entry, MMF_GF_FIELD_EMAIL ) );
		$user  = $email ? get_user_by( 'email', $email ) : false;

		if ( $user instanceof WP_User ) {
			$approve = mmf_build_tax_cert_action_url( (int) $user->ID, 'approve' );
			$reject  = mmf_build_tax_cert_action_url( (int) $user->ID, 'reject' );
		}
	}

	return str_replace(
		array( '{mmf_approve_url}', '{mmf_reject_url}' ),
		array( esc_url( $approve ), esc_url( $reject ) ),
		$text
	);
}

/**
 * Return the currently logged-in user.
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_auth_me() {
	$user_id = get_current_user_id();

	if ( $user_id <= 0 ) {
		return new WP_Error(
			'not_authenticated',
			'Not logged in.',
			array( 'status' => 401 )
		);
	}

	$user = get_user_by( 'id', $user_id );

	if ( ! $user ) {
		return new WP_Error(
			'not_authenticated',
			'Not logged in.',
			array( 'status' => 401 )
		);
	}

	return rest_ensure_response(
		array(
			'user' => mmf_format_auth_user( $user ),
		)
	);
}

/**
 * Read password value from a Gravity Forms entry.
 *
 * @param array $entry Form entry.
 * @return string
 */
function mmf_get_entry_password( array $entry ): string {
	$password = (string) rgar( $entry, MMF_GF_FIELD_PASSWORD );

	if ( empty( $password ) ) {
		$password = (string) rgar( $entry, '8.1' );
	}

	return $password;
}

/**
 * Get the configured Gravity Forms registration form.
 *
 * @return array|WP_Error
 */
function mmf_get_registration_form() {
	if ( ! class_exists( 'GFAPI' ) ) {
		return new WP_Error(
			'gravity_forms_missing',
			'Gravity Forms is not active.',
			array( 'status' => 500 )
		);
	}

	$form = GFAPI::get_form( MMF_REGISTRATION_FORM_ID );

	if ( empty( $form ) || is_wp_error( $form ) ) {
		return new WP_Error(
			'registration_form_missing',
			'Registration form was not found.',
			array( 'status' => 404 )
		);
	}

	return $form;
}

/**
 * Return registration form metadata used by the headless frontend.
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_auth_register_meta() {
	$form = mmf_get_registration_form();

	if ( is_wp_error( $form ) ) {
		return $form;
	}

	return rest_ensure_response(
		array(
			'form_id'     => MMF_REGISTRATION_FORM_ID,
			'title'       => isset( $form['title'] ) ? sanitize_text_field( (string) $form['title'] ) : '',
			'description' => isset( $form['description'] ) ? wp_kses_post( (string) $form['description'] ) : '',
		)
	);
}

/**
 * Dispatch registration route by request method.
 *
 * GET  => form meta
 * POST => form submission
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_auth_register_route( WP_REST_Request $request ) {
	if ( 'GET' === strtoupper( $request->get_method() ) ) {
		return mmf_auth_register_meta();
	}

	return mmf_auth_register( $request );
}

/**
 * Check whether an email is already registered.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_auth_register_check_email( WP_REST_Request $request ) {
	$email = sanitize_email( (string) $request->get_param( 'email' ) );

	if ( empty( $email ) ) {
		return new WP_Error(
			'missing_email',
			'Email is required.',
			array( 'status' => 400 )
		);
	}

	if ( ! is_email( $email ) ) {
		return new WP_Error(
			'invalid_email',
			'Please enter a valid email address.',
			array( 'status' => 400 )
		);
	}

	return rest_ensure_response(
		array(
			'exists'  => (bool) email_exists( $email ),
			'message' => email_exists( $email )
				? 'An account with this email already exists.'
				: '',
		)
	);
}

/**
 * Send a password reset email using WordPress core recovery flow.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_auth_forgot_password( WP_REST_Request $request ) {
	$email_or_login = sanitize_text_field( (string) $request->get_param( 'email' ) );

	if ( empty( $email_or_login ) ) {
		return new WP_Error(
			'missing_email',
			'Email is required.',
			array( 'status' => 400 )
		);
	}

	$user = is_email( $email_or_login )
		? get_user_by( 'email', $email_or_login )
		: get_user_by( 'login', $email_or_login );

	// Always return the same response so the endpoint can't be used to
	// enumerate which email addresses have accounts.
	if ( $user instanceof WP_User ) {
		retrieve_password( $user->user_login );
	}

	return rest_ensure_response(
		array(
			'success' => true,
			'message' => 'If an account exists for that email address, password reset instructions have been sent.',
		)
	);
}

/**
 * Submit registration via Gravity Forms API.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_auth_register( WP_REST_Request $request ) {
	if ( ! class_exists( 'GFAPI' ) ) {
		return new WP_Error(
			'gravity_forms_missing',
			'Gravity Forms is not active.',
			array( 'status' => 500 )
		);
	}

	if ( ! function_exists( 'wc_create_new_customer' ) ) {
		return new WP_Error(
			'woocommerce_missing',
			'WooCommerce is not active.',
			array( 'status' => 500 )
		);
	}

	$first_name = sanitize_text_field( (string) $request->get_param( 'first_name' ) );
	$last_name  = sanitize_text_field( (string) $request->get_param( 'last_name' ) );
	$company    = sanitize_text_field( (string) $request->get_param( 'company' ) );
	$email      = sanitize_email( (string) $request->get_param( 'email' ) );
	$password   = (string) $request->get_param( 'password' );
	$confirm_pw = (string) $request->get_param( 'confirm_password' );
	$expiry     = sanitize_text_field( (string) $request->get_param( 'expiry_date' ) );

	if ( empty( $first_name ) || empty( $last_name ) || empty( $email ) || empty( $password ) ) {
		return new WP_Error(
			'missing_fields',
			'First name, last name, email, and password are required.',
			array( 'status' => 400 )
		);
	}

	if ( strlen( $password ) < 8 ) {
		return new WP_Error(
			'weak_password',
			'Password must be at least 8 characters.',
			array( 'status' => 400 )
		);
	}

	if ( $password !== $confirm_pw ) {
		return new WP_Error(
			'password_mismatch',
			'Passwords do not match.',
			array( 'status' => 400 )
		);
	}

	if ( ! is_email( $email ) ) {
		return new WP_Error(
			'invalid_email',
			'Please enter a valid email address.',
			array( 'status' => 400 )
		);
	}

	if ( email_exists( $email ) ) {
		return new WP_Error(
			'email_exists',
			'An account with this email already exists.',
			array( 'status' => 409 )
		);
	}

	$field_values = array(
		'input_1_3' => $first_name,
		'input_1_6' => $last_name,
		'input_4'   => $company,
		'input_5'   => $email,
		'input_8'   => $password,
		'input_8_2' => $confirm_pw,
		'input_7'   => $expiry,
	);

	$files = array();

	if ( ! empty( $_FILES['certificate'] ) && ! empty( $_FILES['certificate']['name'] ) ) {
		$files['input_6'] = $_FILES['certificate'];
	}

	// Suppress GF notification emails during the headless API call.
	// Emails would block the HTTP response while waiting for SMTP — skip them.
	$disable_notifications = static function (): bool { return true; };
	add_filter( 'gform_disable_notification', $disable_notifications );

	$result = GFAPI::submit_form( MMF_REGISTRATION_FORM_ID, $field_values, null, $files );

	remove_filter( 'gform_disable_notification', $disable_notifications );

	if ( is_wp_error( $result ) ) {
		return new WP_Error(
			'registration_failed',
			$result->get_error_message(),
			array( 'status' => 400 )
		);
	}

	if ( ! is_array( $result ) || empty( $result['is_valid'] ) ) {
		$message = 'Registration could not be completed.';

		if ( is_array( $result ) && ! empty( $result['validation_messages'] ) ) {
			$messages = array_values( $result['validation_messages'] );
			$message  = (string) reset( $messages );
		}

		return new WP_Error(
			'registration_invalid',
			$message,
			array( 'status' => 400 )
		);
	}

	// GF's programmatic file handling (via $files) is unreliable in headless REST
	// context. After GF creates the entry + WC user, we handle the certificate
	// upload directly so user meta is always populated.
	$new_user = get_user_by( 'email', $email );

	if ( $new_user instanceof WP_User ) {
		$uid = (int) $new_user->ID;

		if ( $expiry ) {
			update_user_meta( $uid, 'mmf_tax_exemption_expiry', mmf_normalize_tax_exemption_expiry( $expiry ) );
		}

		if ( ! empty( $_FILES['certificate'] ) && ! empty( $_FILES['certificate']['name'] ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/media.php';
			require_once ABSPATH . 'wp-admin/includes/image.php';

			$attachment_id = media_handle_upload( 'certificate', 0 );

			if ( ! is_wp_error( $attachment_id ) ) {
				$cert_url = wp_get_attachment_url( $attachment_id );
				update_user_meta( $uid, 'mmf_tax_exemption_cert', esc_url_raw( (string) $cert_url ) );
				update_user_meta( $uid, 'mmf_tax_exemption_status', MMF_TAX_STATUS_PENDING );
				update_user_meta( $uid, 'mmf_tax_exemption_submitted_at', current_time( 'mysql' ) );

				// Admin review email with one-click Approve / Reject buttons
				// (queued — inline SMTP would slow the registration response).
				if ( function_exists( 'mmf_queue_tax_cert_admin_email' ) ) {
					mmf_queue_tax_cert_admin_email( $uid );
				}
			}
		}
	}

	return rest_ensure_response(
		array(
			'success'  => true,
			'entry_id' => $result['entry_id'] ?? null,
			'message'  => 'Registration successful. You can now log in.',
		)
	);
}

/**
 * Extract a file URL from a Gravity Forms upload field value.
 * Multi-file upload fields store a JSON array of URLs; single-file
 * fields store the URL directly. Returns the first URL either way.
 *
 * @param string $raw Raw entry value.
 * @return string
 */
function mmf_extract_gf_file_url( string $raw ): string {
	$raw = trim( $raw );

	if ( $raw === '' ) {
		return '';
	}

	if ( str_starts_with( $raw, '[' ) ) {
		$decoded = json_decode( $raw, true );

		if ( is_array( $decoded ) && ! empty( $decoded[0] ) ) {
			$raw = (string) $decoded[0];
		}
	}

	return esc_url_raw( $raw );
}

/**
 * Create a WooCommerce customer after Gravity Forms submission.
 *
 * @param array $entry Form entry.
 * @param array $form  Form object.
 */
function mmf_create_customer_from_gravity_entry( array $entry, array $form ): void {
	if ( ! function_exists( 'wc_create_new_customer' ) ) {
		return;
	}

	$email = sanitize_email( (string) rgar( $entry, MMF_GF_FIELD_EMAIL ) );

	if ( empty( $email ) || ! is_email( $email ) ) {
		return;
	}

	if ( email_exists( $email ) ) {
		return;
	}

	$first_name = sanitize_text_field( (string) rgar( $entry, MMF_GF_FIELD_FIRST_NAME ) );
	$last_name  = sanitize_text_field( (string) rgar( $entry, MMF_GF_FIELD_LAST_NAME ) );
	$company    = sanitize_text_field( (string) rgar( $entry, MMF_GF_FIELD_COMPANY ) );
	$expiry     = sanitize_text_field( (string) rgar( $entry, MMF_GF_FIELD_EXPIRY ) );
	$cert_url   = mmf_extract_gf_file_url( (string) rgar( $entry, MMF_GF_FIELD_CERTIFICATE ) );
	$password   = mmf_get_entry_password( $entry );

	if ( empty( $password ) ) {
		$password = wp_generate_password( 20, true, true );
	}

	$user_id = wc_create_new_customer( $email, '', $password );

	if ( is_wp_error( $user_id ) ) {
		return;
	}

	update_user_meta( $user_id, 'first_name', $first_name );
	update_user_meta( $user_id, 'last_name', $last_name );
	update_user_meta( $user_id, 'billing_first_name', $first_name );
	update_user_meta( $user_id, 'billing_last_name', $last_name );
	update_user_meta( $user_id, 'billing_email', $email );

	if ( $company ) {
		update_user_meta( $user_id, 'billing_company', $company );
	}

	if ( $expiry ) {
		update_user_meta( $user_id, 'mmf_tax_exemption_expiry', mmf_normalize_tax_exemption_expiry( $expiry ) );
	}

	if ( $cert_url ) {
		update_user_meta( $user_id, 'mmf_tax_exemption_cert', $cert_url );
	}

	if ( function_exists( 'mmf_mark_tax_exemption_pending' ) ) {
		mmf_mark_tax_exemption_pending( (int) $user_id );
	} elseif ( $cert_url ) {
		update_user_meta( $user_id, 'mmf_tax_exemption_status', 'pending' );
		update_user_meta( $user_id, 'mmf_tax_exemption_submitted_at', current_time( 'mysql' ) );
	}

	if ( $first_name || $last_name ) {
		wp_update_user(
			array(
				'ID'           => $user_id,
				'display_name' => trim( $first_name . ' ' . $last_name ),
			)
		);
	}

	do_action( 'woocommerce_created_customer', $user_id, array(), true );
}
