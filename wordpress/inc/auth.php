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
 * CSRF-safe: only applies when the X-MMF-Proxy header carries the shared
 * secret — browsers cannot send custom headers cross-origin without a CORS
 * preflight, so forged cross-site requests never carry it. The header is
 * added exclusively by the Next.js server-side proxy.
 *
 * Admins: define MMF_PROXY_SECRET in wp-config.php with a long random value
 * and set the same value in the Next.js environment (sent as the X-MMF-Proxy
 * header). Until the constant is defined, the legacy value "1" is accepted
 * for back-compat.
 *
 * @param WP_Error|true|null $result Current authentication result.
 * @return WP_Error|true|null
 */
function mmf_headless_cookie_auth( $result ) {
	// Check the proxy secret FIRST, before inspecting $result.
	// rest_cookie_check_errors (priority 10) sets a WP_Error when a WP login
	// cookie is present but X-WP-Nonce is absent — which is always true for our
	// server-side proxy (it can't obtain a WP nonce). The old early-return on
	// is_wp_error() meant we passed that error through unchanged, causing every
	// logged-in user with a stale WC Store API nonce to get a 401.
	if ( empty( $_SERVER['HTTP_X_MMF_PROXY'] ) ) {
		return $result;
	}

	$secret = defined( 'MMF_PROXY_SECRET' ) ? (string) MMF_PROXY_SECRET : '1';

	if ( ! hash_equals( $secret, (string) wp_unslash( $_SERVER['HTTP_X_MMF_PROXY'] ) ) ) {
		return $result;
	}

	// Valid proxy request — restore the logged-in user from the cookie without
	// requiring X-WP-Nonce. CSRF-safe: the proxy secret is a long random value
	// only our Next.js server sends; browsers cannot forge custom headers
	// cross-origin. We validate the cookie with wp_validate_auth_cookie so we
	// never accept a tampered value.
	if ( get_current_user_id() === 0 ) {
		$user_id = (int) wp_validate_auth_cookie( '', 'logged_in' );
		if ( $user_id > 0 ) {
			wp_set_current_user( $user_id );
		}
	}

	// Return null ("no authentication error") so WP's REST API proceeds with
	// whichever user is now current. This overrides any WP_Error that
	// rest_cookie_check_errors set — intentionally, because the proxy secret
	// is our CSRF protection, making the X-WP-Nonce requirement redundant here.
	return null;
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

	register_rest_route(
		'custom/v1',
		'/auth/reset-password',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mmf_auth_reset_password',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		'custom/v1',
		'/account/details',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mmf_account_update_details',
			'permission_callback' => 'is_user_logged_in',
		)
	);

	register_rest_route(
		'custom/v1',
		'/account/addresses',
		array(
			array(
				'methods'             => 'GET',
				'callback'            => 'mmf_account_addresses',
				'permission_callback' => 'is_user_logged_in',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'mmf_account_update_addresses',
				'permission_callback' => 'is_user_logged_in',
			),
		)
	);

	register_rest_route(
		'custom/v1',
		'/account/password',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mmf_account_change_password',
			'permission_callback' => 'is_user_logged_in',
		)
	);

	register_rest_route(
		'custom/v1',
		'/account/payment-methods',
		array(
			array(
				'methods'             => 'GET',
				'callback'            => 'mmf_get_payment_methods',
				'permission_callback' => 'is_user_logged_in',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'mmf_create_setup_intent',
				'permission_callback' => 'is_user_logged_in',
			),
		)
	);

	register_rest_route(
		'custom/v1',
		'/account/payment-methods/(?P<pm_id>pm_[a-zA-Z0-9]+)',
		array(
			'methods'             => 'DELETE',
			'callback'            => 'mmf_delete_payment_method',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'pm_id' => array(
					'validate_callback' => function ( $param ) {
						return (bool) preg_match( '/^pm_[a-zA-Z0-9]+$/', $param );
					},
				),
			),
		)
	);

	// After the browser confirms the SetupIntent, register the card as a WC
	// payment token — the same thing WC Stripe's add_payment_method() does.
	// Without this the card exists at Stripe but never appears in the WC
	// token list (which checkout and the account panel read).
	register_rest_route(
		'custom/v1',
		'/account/payment-methods/finalize',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mmf_finalize_payment_method',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'pm_id' => array(
					'required'          => true,
					'validate_callback' => function ( $param ) {
						return (bool) preg_match( '/^pm_[a-zA-Z0-9]+$/', (string) $param );
					},
				),
			),
		)
	);

	// WC-standard "Make default" (same behaviour as My Account → Payment
	// methods in core WooCommerce): the default token is preselected at checkout.
	register_rest_route(
		'custom/v1',
		'/account/payment-methods/(?P<token_id>\d+)/default',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mmf_set_default_payment_method',
			'permission_callback' => 'is_user_logged_in',
			'args'                => array(
				'token_id' => array(
					'validate_callback' => function ( $param ) {
						return is_numeric( $param ) && (int) $param > 0;
					},
				),
			),
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
 * GET /custom/v1/account/addresses — the customer's saved WooCommerce
 * billing + shipping addresses (same data classic My Account shows).
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_account_addresses() {
	if ( ! class_exists( 'WC_Customer' ) ) {
		return new WP_Error( 'woocommerce_missing', 'WooCommerce is not active.', array( 'status' => 500 ) );
	}

	$customer = new WC_Customer( get_current_user_id() );

	return rest_ensure_response(
		array(
			'billing'  => array(
				'first_name' => $customer->get_billing_first_name(),
				'last_name'  => $customer->get_billing_last_name(),
				'company'    => $customer->get_billing_company(),
				'address_1'  => $customer->get_billing_address_1(),
				'address_2'  => $customer->get_billing_address_2(),
				'city'       => $customer->get_billing_city(),
				'state'      => $customer->get_billing_state(),
				'postcode'   => $customer->get_billing_postcode(),
				'country'    => $customer->get_billing_country(),
				'email'      => $customer->get_billing_email(),
				'phone'      => $customer->get_billing_phone(),
			),
			'shipping' => array(
				'first_name' => $customer->get_shipping_first_name(),
				'last_name'  => $customer->get_shipping_last_name(),
				'company'    => $customer->get_shipping_company(),
				'address_1'  => $customer->get_shipping_address_1(),
				'address_2'  => $customer->get_shipping_address_2(),
				'city'       => $customer->get_shipping_city(),
				'state'      => $customer->get_shipping_state(),
				'postcode'   => $customer->get_shipping_postcode(),
				'country'    => $customer->get_shipping_country(),
			),
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
/**
 * Build a branded HTML email using the site header/footer design.
 *
 * @param string $heading    Email heading shown inside the white card.
 * @param string $body_html  Inner HTML body (already escaped).
 * @return string
 */
function mmf_branded_email_html( string $heading, string $body_html ): string {
	$site_name = esc_html( get_bloginfo( 'name' ) );
	$home_url  = esc_url( home_url( '/' ) );
	$logo_url  = esc_url( get_option( 'mmf_email_logo', 'https://dev-mmf-wp.pantheonsite.io/wp-content/uploads/2026/07/logo-email.png' ) );
	$year      = esc_html( gmdate( 'Y' ) );

	$footer_text = wp_kses_post(
		wpautop( wptexturize( apply_filters( 'woocommerce_email_footer_text', get_option( 'woocommerce_email_footer_text', '' ) ) ) )
	);

	return '<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>' . esc_html( $heading ) . '</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:sans-serif;">
&nbsp;
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody><tr><td style="padding:20px 0 30px 0;">
<table style="border-collapse:collapse;border:1px solid rgba(0,25,19,0.1);" border="0" width="600" cellspacing="0" cellpadding="0" align="center">
<tbody>
<tr align="center">
<td style="padding:20px 15px;" bgcolor="#ffffff">
	<a href="' . $home_url . '" target="_blank" rel="noopener">
		<img style="width:284px;height:auto;display:block;margin:0 auto;" src="' . $logo_url . '" alt="' . $site_name . '" width="284" />
	</a>
</td>
</tr>
<tr>
<td style="padding:20px 15px;" bgcolor="#F9F9F9">
<table style="border-collapse:collapse;" border="0" width="560" cellspacing="0" cellpadding="0" align="center">
<tbody><tr>
<td style="text-align:left;background-color:#ffffff;padding:30px 25px;border-radius:5px;">
<h2 style="font-size:20px;color:#000000;font-family:sans-serif;margin:0 0 18px 0;">' . esc_html( $heading ) . '</h2>
' . $body_html . '
</td>
</tr></tbody>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 30px;text-align:center;" bgcolor="#CC9900">
	' . ( $footer_text ? '<p style="font-size:14px;margin:0 0 6px 0;color:#ffffff;font-family:sans-serif;">' . $footer_text . '</p>' : '' ) . '
	<p style="font-size:13px;margin:0;color:#ffffff;font-family:sans-serif;opacity:0.85;">&copy; ' . $year . ' ' . $site_name . '</p>
</td>
</tr>
</tbody>
</table>
</td></tr></tbody>
</table>
</body>
</html>';
}

function mmf_auth_forgot_password( WP_REST_Request $request ) {
	$email_or_login = sanitize_text_field( (string) $request->get_param( 'email' ) );

	if ( empty( $email_or_login ) ) {
		return new WP_Error(
			'missing_email',
			'Email is required.',
			array( 'status' => 400 )
		);
	}

	// Never reveal whether an email exists — always return the same message.
	$success_response = array(
		'success' => true,
		'message' => 'If that email address is in our system, you will receive password reset instructions shortly.',
	);

	$user = is_email( $email_or_login )
		? get_user_by( 'email', $email_or_login )
		: get_user_by( 'login', $email_or_login );

	if ( ! $user instanceof WP_User ) {
		return rest_ensure_response( $success_response );
	}

	$key = get_password_reset_key( $user );
	if ( is_wp_error( $key ) ) {
		return new WP_Error(
			'reset_key_failed',
			'Unable to process your request. Please try again.',
			array( 'status' => 500 )
		);
	}

	// Build reset URL pointing at the headless Next.js frontend.
	$frontend_url = apply_filters(
		'mmf_frontend_url',
		defined( 'MMF_FRONTEND_URL' ) ? MMF_FRONTEND_URL : home_url()
	);
	$reset_url = rtrim( $frontend_url, '/' )
		. '/reset-password?key=' . rawurlencode( $key )
		. '&login=' . rawurlencode( $user->user_login );

	$site_name    = get_bloginfo( 'name' );
	$display_name = esc_html( $user->display_name );
	$reset_url_e  = esc_url( $reset_url );

	$body_html =
		'<p style="font-size:16px;color:#333333;font-family:sans-serif;margin:0 0 14px 0;">Hi ' . $display_name . ',</p>'
		. '<p style="font-size:16px;color:#333333;font-family:sans-serif;margin:0 0 14px 0;">Someone requested a password reset for your ' . esc_html( $site_name ) . ' account. If this was you, click the button below to set a new password.</p>'
		. '<p style="font-size:16px;color:#333333;font-family:sans-serif;margin:0 0 28px 0;">This link expires in <strong>24 hours</strong>. If you did not request this, you can safely ignore this email — your account remains secure.</p>'
		. '<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 28px 0;"><tbody><tr><td>'
		. '<a href="' . $reset_url_e . '" target="_blank" rel="noopener" style="display:inline-block;background-color:#CC9900;color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;text-transform:uppercase;letter-spacing:0.05em;">Reset Your Password</a>'
		. '</td></tr></tbody></table>'
		. '<p style="font-size:13px;color:#888888;font-family:sans-serif;margin:0;word-break:break-all;">If the button does not work, copy and paste this URL into your browser:<br />'
		. '<a href="' . $reset_url_e . '" style="color:#CC9900;font-size:13px;word-break:break-all;">' . esc_html( $reset_url ) . '</a></p>';

	$subject = sprintf( '[%s] Password Reset Request', $site_name );
	$html    = mmf_branded_email_html( 'Password Reset Request', $body_html );

	$set_html_content_type = static fn() => 'text/html';
	add_filter( 'wp_mail_content_type', $set_html_content_type );
	wp_mail( $user->user_email, $subject, $html );
	remove_filter( 'wp_mail_content_type', $set_html_content_type );

	return rest_ensure_response( $success_response );
}

/**
 * Validate a password reset key and set a new password.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_auth_reset_password( WP_REST_Request $request ) {
	$key              = sanitize_text_field( (string) $request->get_param( 'key' ) );
	$login            = sanitize_text_field( (string) $request->get_param( 'login' ) );
	$new_password     = (string) $request->get_param( 'password' );
	$confirm_password = (string) $request->get_param( 'confirm_password' );

	if ( empty( $key ) || empty( $login ) ) {
		return new WP_Error(
			'missing_params',
			'Reset key and login are required.',
			array( 'status' => 400 )
		);
	}

	if ( empty( $new_password ) ) {
		return new WP_Error(
			'missing_password',
			'Password is required.',
			array( 'status' => 400 )
		);
	}

	if ( strlen( $new_password ) < 8 ) {
		return new WP_Error(
			'weak_password',
			'Password must be at least 8 characters.',
			array( 'status' => 400 )
		);
	}

	if ( $new_password !== $confirm_password ) {
		return new WP_Error(
			'password_mismatch',
			'Passwords do not match.',
			array( 'status' => 400 )
		);
	}

	$user = check_password_reset_key( $key, $login );

	if ( is_wp_error( $user ) ) {
		return new WP_Error(
			'invalid_key',
			'This password reset link is invalid or has expired. Please request a new one.',
			array( 'status' => 400 )
		);
	}

	reset_password( $user, $new_password );

	return rest_ensure_response(
		array(
			'success' => true,
			'message' => 'Your password has been reset. You can now log in with your new password.',
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
		$validation = mmf_validate_tax_cert_upload( $_FILES['certificate'] );

		if ( is_wp_error( $validation ) ) {
			return $validation;
		}

		// A certificate without an expiry date can never be validated for
		// tax-free checkout — require it whenever a certificate is uploaded.
		$normalized_expiry = mmf_normalize_tax_exemption_expiry( $expiry );

		if ( '' === $normalized_expiry ) {
			return new WP_Error(
				'missing_expiry',
				'Expiration date is required when uploading a certificate.',
				array( 'status' => 400 )
			);
		}

		if ( strtotime( $normalized_expiry . ' 23:59:59' ) < time() ) {
			return new WP_Error(
				'expiry_in_past',
				'Certificate expiration date must be a future date.',
				array( 'status' => 400 )
			);
		}

		$files['input_6'] = $_FILES['certificate'];
	}

	$result = GFAPI::submit_form( MMF_REGISTRATION_FORM_ID, $field_values, null, $files );

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
				// Keep certificates out of the public media library and
				// REST /wp/v2/media enumeration.
				wp_update_post(
					array(
						'ID'          => $attachment_id,
						'post_status' => 'private',
					)
				);

				$cert_url = wp_get_attachment_url( $attachment_id );
				update_user_meta( $uid, 'mmf_tax_exemption_cert', esc_url_raw( (string) $cert_url ) );
				update_user_meta( $uid, 'mmf_tax_exemption_cert_id', (int) $attachment_id );
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

	// GF notification handles the welcome email — suppress WC's duplicate.
	add_filter( 'woocommerce_email_enabled_customer_new_account', '__return_false' );
	$user_id = wc_create_new_customer( $email, '', $password );
	remove_filter( 'woocommerce_email_enabled_customer_new_account', '__return_false' );

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
	// wc_create_new_customer() already fires woocommerce_created_customer
	// internally (which sends the WC "new account" email). Do NOT fire it
	// again here — doing so sends a second identical email.
}

/**
 * POST /custom/v1/account/details — WooCommerce My Account → Account Details.
 *
 * Updates first name, last name, display name, email, and company.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_account_update_details( WP_REST_Request $request ) {
	$user_id = get_current_user_id();
	$user    = get_user_by( 'id', $user_id );

	if ( ! $user ) {
		return new WP_Error( 'not_authenticated', 'Not logged in.', array( 'status' => 401 ) );
	}

	$first_name   = sanitize_text_field( (string) $request->get_param( 'first_name' ) );
	$last_name    = sanitize_text_field( (string) $request->get_param( 'last_name' ) );
	$display_name = sanitize_text_field( (string) $request->get_param( 'display_name' ) );
	$email        = sanitize_email( (string) $request->get_param( 'email' ) );
	$company      = sanitize_text_field( (string) $request->get_param( 'company' ) );

	if ( empty( $first_name ) || empty( $last_name ) || empty( $email ) ) {
		return new WP_Error( 'missing_fields', 'First name, last name, and email are required.', array( 'status' => 400 ) );
	}

	if ( ! is_email( $email ) ) {
		return new WP_Error( 'invalid_email', 'Please enter a valid email address.', array( 'status' => 400 ) );
	}

	if ( strtolower( $email ) !== strtolower( $user->user_email ) ) {
		$existing = email_exists( $email );
		if ( $existing && (int) $existing !== $user_id ) {
			return new WP_Error( 'email_exists', 'This email address is already in use.', array( 'status' => 409 ) );
		}
	}

	$update_data = array(
		'ID'           => $user_id,
		'first_name'   => $first_name,
		'last_name'    => $last_name,
		'display_name' => $display_name ?: trim( "$first_name $last_name" ),
		'user_email'   => $email,
	);

	$result = wp_update_user( $update_data );

	if ( is_wp_error( $result ) ) {
		return new WP_Error( 'update_failed', $result->get_error_message(), array( 'status' => 500 ) );
	}

	// Use WC_Customer->save() so WooCommerce address-change hooks fire
	// (e.g. TaxJar cache invalidation on billing address change).
	if ( function_exists( 'WC' ) && WC()->customer ) {
		$customer = new WC_Customer( $user_id );
		$customer->set_first_name( $first_name );
		$customer->set_last_name( $last_name );
		$customer->set_billing_first_name( $first_name );
		$customer->set_billing_last_name( $last_name );
		$customer->set_billing_email( $email );
		$customer->set_billing_company( $company );
		$customer->save();
	} else {
		update_user_meta( $user_id, 'first_name', $first_name );
		update_user_meta( $user_id, 'last_name', $last_name );
		update_user_meta( $user_id, 'billing_first_name', $first_name );
		update_user_meta( $user_id, 'billing_last_name', $last_name );
		update_user_meta( $user_id, 'billing_email', $email );
		update_user_meta( $user_id, 'billing_company', $company );
	}

	return rest_ensure_response(
		array(
			'success' => true,
			'user'    => mmf_format_auth_user( get_user_by( 'id', $user_id ) ),
		)
	);
}

/**
 * POST /custom/v1/account/addresses — update billing and/or shipping address.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_account_update_addresses( WP_REST_Request $request ) {
	if ( ! class_exists( 'WC_Customer' ) ) {
		return new WP_Error( 'woocommerce_missing', 'WooCommerce is not active.', array( 'status' => 500 ) );
	}

	$user_id  = get_current_user_id();
	$customer = new WC_Customer( $user_id );
	$type     = sanitize_text_field( (string) $request->get_param( 'type' ) );

	if ( ! in_array( $type, array( 'billing', 'shipping' ), true ) ) {
		return new WP_Error( 'invalid_type', 'Address type must be "billing" or "shipping".', array( 'status' => 400 ) );
	}

	$address_fields = array( 'first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country' );

	if ( $type === 'billing' ) {
		$address_fields[] = 'email';
		$address_fields[] = 'phone';
	}

	foreach ( $address_fields as $field ) {
		$value = sanitize_text_field( (string) $request->get_param( $field ) );
		$setter = "set_{$type}_{$field}";
		if ( method_exists( $customer, $setter ) ) {
			$customer->$setter( $value );
		}
	}

	if ( $type === 'billing' ) {
		$first = sanitize_text_field( (string) $request->get_param( 'first_name' ) );
		$last  = sanitize_text_field( (string) $request->get_param( 'last_name' ) );
		if ( empty( $first ) || empty( $last ) ) {
			return new WP_Error( 'missing_fields', 'First name and last name are required.', array( 'status' => 400 ) );
		}
	}

	$customer->save();

	return rest_ensure_response( array( 'success' => true ) );
}

/**
 * POST /custom/v1/account/password — WooCommerce-standard password change.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_account_change_password( WP_REST_Request $request ) {
	$user_id          = get_current_user_id();
	$user             = get_user_by( 'id', $user_id );
	$current_password = (string) $request->get_param( 'current_password' );
	$new_password     = (string) $request->get_param( 'new_password' );
	$confirm_password = (string) $request->get_param( 'confirm_password' );

	if ( ! $user ) {
		return new WP_Error( 'not_authenticated', 'Not logged in.', array( 'status' => 401 ) );
	}

	if ( empty( $current_password ) || empty( $new_password ) || empty( $confirm_password ) ) {
		return new WP_Error( 'missing_fields', 'All password fields are required.', array( 'status' => 400 ) );
	}

	if ( ! wp_check_password( $current_password, $user->user_pass, $user_id ) ) {
		return new WP_Error( 'wrong_password', 'Your current password is incorrect.', array( 'status' => 403 ) );
	}

	if ( $new_password !== $confirm_password ) {
		return new WP_Error( 'password_mismatch', 'New passwords do not match.', array( 'status' => 400 ) );
	}

	if ( strlen( $new_password ) < 8 ) {
		return new WP_Error( 'weak_password', 'Password must be at least 8 characters.', array( 'status' => 400 ) );
	}

	wp_set_password( $new_password, $user_id );
	wp_set_current_user( $user_id );
	wp_set_auth_cookie( $user_id, true, is_ssl() );

	return rest_ensure_response(
		array(
			'success' => true,
			'message' => 'Password changed successfully.',
		)
	);
}

/* ===================================================================
   Payment Methods — Stripe saved cards
   =================================================================== */

/**
 * Get Stripe secret key from WooCommerce Stripe plugin settings.
 */
function mmf_stripe_secret_key(): string {
	$settings = get_option( 'woocommerce_stripe_settings', array() );
	$is_test  = isset( $settings['testmode'] ) && 'yes' === $settings['testmode'];
	return $is_test
		? ( $settings['test_secret_key'] ?? '' )
		: ( $settings['secret_key'] ?? '' );
}

/**
 * Look up the user's Stripe customer ID through WC Stripe itself.
 *
 * MUST go through WC_Stripe_Customer (user option `_stripe_customer_id`) —
 * the same identity WC Stripe uses at checkout and in its payment-token sync.
 * Reading/writing our own user-meta key created a SECOND Stripe customer:
 * cards added via SetupIntent attached to it, and WC Stripe's token filter
 * (which lists PMs from ITS customer) silently removed those tokens from
 * every list — "card added successfully" but never visible, and saved-card
 * payments would fail with a customer/PM mismatch.
 *
 * @param int $user_id WordPress user ID.
 * @return string Stripe customer ID ('' when none exists yet).
 */
function mmf_stripe_customer_id( int $user_id ): string {
	if ( ! class_exists( 'WC_Stripe_Customer' ) ) {
		return '';
	}
	$customer = new WC_Stripe_Customer( $user_id );
	return (string) $customer->get_id();
}

/**
 * Get or create a Stripe customer ID for a given WP user (WC Stripe standard).
 *
 * @param int $user_id WordPress user ID.
 * @return string|WP_Error Stripe customer ID or WP_Error on failure.
 */
function mmf_get_or_create_stripe_customer( int $user_id ) {
	if ( ! class_exists( 'WC_Stripe_Customer' ) ) {
		return new WP_Error( 'stripe_not_configured', 'Stripe is not configured.', array( 'status' => 500 ) );
	}

	$customer    = new WC_Stripe_Customer( $user_id );
	$customer_id = (string) $customer->get_id();

	if ( $customer_id ) {
		return $customer_id;
	}

	// create_customer() builds the payload from the WP user (email, name,
	// metadata) and persists the ID in WC Stripe's own user option, so the
	// checkout gateway and this account flow share ONE Stripe customer.
	//
	// WC Stripe throws WC_Stripe_Exception on validation failures — e.g.
	// Stripe accounts in some regions (India among them) REQUIRE a full
	// billing address (address->line1) to create a customer. A brand-new
	// user has no address yet; surface an actionable message instead of
	// letting the exception fatal the whole REST request.
	try {
		$created = $customer->create_customer();
	} catch ( Exception $e ) {
		if ( false !== strpos( $e->getMessage(), 'missing_required_customer_field' ) ) {
			return new WP_Error(
				'billing_address_required',
				'Please add your billing address first (My Account → Addresses), then try saving the card again.',
				array( 'status' => 400 )
			);
		}
		return new WP_Error( 'stripe_api_error', 'Failed to create Stripe customer.', array( 'status' => 502 ) );
	}

	if ( is_wp_error( $created ) ) {
		return new WP_Error( 'stripe_api_error', 'Failed to create Stripe customer.', array( 'status' => 502 ) );
	}

	$customer_id = (string) $customer->get_id();

	if ( ! $customer_id ) {
		return new WP_Error( 'stripe_customer_failed', 'Failed to create Stripe customer.', array( 'status' => 500 ) );
	}

	return $customer_id;
}

/**
 * GET /account/payment-methods — list saved Stripe cards for the current user.
 *
 * Uses WC payment tokens (the WC source of truth) so that the integer token ID
 * is returned as `id`. WC Stripe reads `wc-stripe-payment-method` from checkout
 * payment_data as a WC token integer ID — passing a raw Stripe PM ID there fails.
 * `stripe_pm_id` is returned separately so the frontend can construct the delete URL.
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_payment_methods() {
	$user_id = get_current_user_id();

	// WC_Payment_Tokens::get_customer_tokens returns all tokens saved by WC Stripe
	// for this user. Each token's integer ID is what WC Stripe reads at checkout;
	// get_token() returns the underlying Stripe PM ID used for the delete route.
	$tokens  = WC_Payment_Tokens::get_customer_tokens( $user_id, 'stripe' );
	$methods = array();

	foreach ( $tokens as $token ) {
		if ( ! ( $token instanceof WC_Payment_Token_CC ) ) {
			continue;
		}
		$methods[] = array(
			'id'           => (string) $token->get_id(),
			'stripe_pm_id' => $token->get_token(),
			'brand'        => $token->get_card_type() ?: 'card',
			'last4'        => $token->get_last4(),
			'exp_month'    => (int) $token->get_expiry_month(),
			'exp_year'     => (int) $token->get_expiry_year(),
			'is_default'   => $token->is_default(),
		);
	}

	return rest_ensure_response( array( 'payment_methods' => $methods ) );
}

/**
 * POST /account/payment-methods/{token_id}/default — WC-standard default card.
 *
 * Ownership-checked (no IDOR): the token must belong to the current user and
 * the stripe gateway before WC_Payment_Tokens::set_users_default runs.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function mmf_set_default_payment_method( WP_REST_Request $request ) {
	$user_id  = get_current_user_id();
	$token_id = absint( $request->get_param( 'token_id' ) );

	$token = WC_Payment_Tokens::get( $token_id );

	if ( ! $token || (int) $token->get_user_id() !== $user_id || 'stripe' !== $token->get_gateway_id() ) {
		return new WP_Error( 'invalid_token', 'Payment method not found.', array( 'status' => 404 ) );
	}

	WC_Payment_Tokens::set_users_default( $user_id, $token_id );

	return rest_ensure_response( array( 'success' => true ) );
}

/**
 * POST /account/payment-methods — create a Stripe SetupIntent.
 * Returns client_secret so the frontend can call confirmCardSetup.
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_create_setup_intent() {
	$user_id     = get_current_user_id();
	$customer_id = mmf_get_or_create_stripe_customer( $user_id );

	if ( is_wp_error( $customer_id ) ) {
		return $customer_id;
	}

	$secret   = mmf_stripe_secret_key();
	$response = wp_remote_post(
		'https://api.stripe.com/v1/setup_intents',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $secret,
				'Content-Type'  => 'application/x-www-form-urlencoded',
			),
			'body'    => array(
				'customer'                 => $customer_id,
				'payment_method_types[]'   => 'card',
				'usage'                    => 'off_session',
			),
		)
	);

	if ( is_wp_error( $response ) ) {
		return new WP_Error( 'stripe_api_error', 'Failed to create setup intent.', array( 'status' => 502 ) );
	}

	$body = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( empty( $body['client_secret'] ) ) {
		return new WP_Error( 'setup_intent_failed', 'Failed to create setup intent.', array( 'status' => 500 ) );
	}

	return rest_ensure_response( array( 'client_secret' => $body['client_secret'] ) );
}

/**
 * POST /account/payment-methods/finalize — register a confirmed SetupIntent
 * card as a WC payment token (mirrors WC Stripe's add_payment_method()).
 *
 * Ownership-checked: the Stripe PM must be attached to this user's Stripe
 * customer. Idempotent: re-finalizing an already-saved PM returns success.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_finalize_payment_method( WP_REST_Request $request ) {
	$pm_id   = sanitize_text_field( (string) $request->get_param( 'pm_id' ) );
	$user_id = get_current_user_id();
	$secret  = mmf_stripe_secret_key();

	if ( ! $secret ) {
		return new WP_Error( 'stripe_not_configured', 'Stripe is not configured — check WooCommerce → Stripe settings.', array( 'status' => 500 ) );
	}

	// WC Stripe's customer identity — the SAME one the checkout gateway and
	// token sync use. Any other lookup here re-creates the split-customer bug.
	$customer_id = mmf_stripe_customer_id( $user_id );

	if ( '' === $customer_id ) {
		return new WP_Error(
			'no_stripe_customer',
			'No Stripe customer record for this account. Add an address or place an order first.',
			array( 'status' => 500 )
		);
	}

	$pm_response = wp_remote_get(
		'https://api.stripe.com/v1/payment_methods/' . rawurlencode( $pm_id ),
		array(
			'headers' => array( 'Authorization' => 'Bearer ' . $secret ),
		)
	);

	if ( is_wp_error( $pm_response ) ) {
		return new WP_Error( 'stripe_api_error', 'Could not reach Stripe API. Please try again.', array( 'status' => 502 ) );
	}

	$http_code = (int) wp_remote_retrieve_response_code( $pm_response );
	$pm_data   = json_decode( wp_remote_retrieve_body( $pm_response ), true );

	// Stripe returned an error — most common cause: publishable key (Next.js
	// .env) and secret key (WC Stripe settings) are from different accounts.
	if ( 200 !== $http_code || isset( $pm_data['error'] ) ) {
		$stripe_msg = $pm_data['error']['message'] ?? 'Stripe could not find the payment method.';
		return new WP_Error( 'stripe_pm_error', $stripe_msg, array( 'status' => 502 ) );
	}

	// PM belongs to a different Stripe customer — key mismatch or wrong account.
	if ( ( $pm_data['customer'] ?? '' ) !== $customer_id ) {
		return new WP_Error(
			'customer_mismatch',
			'Card ownership check failed. Verify that the Stripe publishable key (Next.js .env) and secret key (WooCommerce settings) are from the same Stripe account and mode (test/live).',
			array( 'status' => 403 )
		);
	}

	if ( empty( $pm_data['card'] ) ) {
		return new WP_Error( 'not_a_card', 'Payment method is not a card.', array( 'status' => 400 ) );
	}

	// Idempotent: already registered as a WC token → success.
	foreach ( WC_Payment_Tokens::get_customer_tokens( $user_id, 'stripe' ) as $existing ) {
		if ( $existing->get_token() === $pm_id ) {
			return rest_ensure_response( array( 'success' => true, 'token_id' => $existing->get_id() ) );
		}
	}

	$card = $pm_data['card'];

	$token = new WC_Payment_Token_CC();
	$token->set_token( $pm_id );
	$token->set_gateway_id( 'stripe' );
	$token->set_user_id( $user_id );
	$token->set_card_type( sanitize_text_field( (string) ( $card['brand'] ?? 'card' ) ) );
	$token->set_last4( sanitize_text_field( (string) ( $card['last4'] ?? '' ) ) );
	$token->set_expiry_month( str_pad( (string) absint( $card['exp_month'] ?? 0 ), 2, '0', STR_PAD_LEFT ) );
	$token->set_expiry_year( (string) absint( $card['exp_year'] ?? 0 ) );

	if ( ! $token->save() ) {
		return new WP_Error( 'token_save_failed', 'Card details could not be saved. Please try again.', array( 'status' => 500 ) );
	}

	// Bust the WC payment-token object cache (Redis/Memcached) so the
	// immediate GET /payment-methods request returns fresh data. Without this
	// a persistent cache returns the pre-save token list and the new card
	// appears to be missing even though it was saved successfully.
	if ( class_exists( 'WC_Cache_Helper' ) ) {
		WC_Cache_Helper::invalidate_cache_group( 'payment_tokens' );
	}

	return rest_ensure_response( array( 'success' => true, 'token_id' => $token->get_id() ) );
}

/**
 * DELETE /account/payment-methods/{pm_id} — detach a card.
 * Verifies ownership: the PM must belong to this user's Stripe customer.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error
 */
function mmf_delete_payment_method( WP_REST_Request $request ) {
	$pm_id   = sanitize_text_field( (string) $request->get_param( 'pm_id' ) );
	$user_id = get_current_user_id();
	$secret  = mmf_stripe_secret_key();

	if ( ! $secret ) {
		return new WP_Error( 'stripe_not_configured', 'Stripe is not configured.', array( 'status' => 500 ) );
	}

	// WC Stripe's customer identity — same as checkout/token sync.
	$customer_id = mmf_stripe_customer_id( $user_id );

	// Retrieve PM and verify it belongs to this customer before detaching.
	$pm_response = wp_remote_get(
		'https://api.stripe.com/v1/payment_methods/' . rawurlencode( $pm_id ),
		array(
			'headers' => array( 'Authorization' => 'Bearer ' . $secret ),
		)
	);

	if ( is_wp_error( $pm_response ) ) {
		return new WP_Error( 'stripe_api_error', 'Failed to verify payment method.', array( 'status' => 502 ) );
	}

	$pm_data = json_decode( wp_remote_retrieve_body( $pm_response ), true );
	if ( '' === $customer_id || ( $pm_data['customer'] ?? '' ) !== $customer_id ) {
		return new WP_Error(
			'unauthorized',
			'Payment method does not belong to this account.',
			array( 'status' => 403 )
		);
	}

	$detach_response = wp_remote_post(
		'https://api.stripe.com/v1/payment_methods/' . rawurlencode( $pm_id ) . '/detach',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $secret,
				'Content-Type'  => 'application/x-www-form-urlencoded',
			),
			'body'    => array(),
		)
	);

	if ( is_wp_error( $detach_response ) ) {
		return new WP_Error( 'stripe_api_error', 'Failed to remove payment method.', array( 'status' => 502 ) );
	}

	$detach_body = json_decode( wp_remote_retrieve_body( $detach_response ), true );
	if ( empty( $detach_body['id'] ) ) {
		$stripe_message = $detach_body['error']['message'] ?? 'Payment method could not be removed.';
		return new WP_Error( 'stripe_detach_failed', $stripe_message, array( 'status' => 400 ) );
	}

	// Also remove the WC payment token — the account list and checkout read
	// WC tokens, so a lingering token would show a card Stripe can't charge.
	foreach ( WC_Payment_Tokens::get_customer_tokens( $user_id, 'stripe' ) as $token ) {
		if ( $token->get_token() === $pm_id ) {
			WC_Payment_Tokens::delete( $token->get_id() );
		}
	}

	return rest_ensure_response( array( 'success' => true ) );
}
