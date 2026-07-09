<?php
/**
 * Headless frontend guard.
 *
 * WordPress here is a headless commerce/API backend — visitors should never
 * see its theme output. Any frontend request from someone who can't edit
 * content is redirected to the Next.js storefront (same path preserved).
 * wp-admin, wp-login, REST, AJAX, and cron are untouched.
 *
 * The storefront URL is resolved from (first match wins):
 *   1. MMF_HEADLESS_FRONTEND_URL constant (wp-config.php)
 *   2. "Headless Frontend URL" option (Settings → General)
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

add_action( 'template_redirect', 'mmf_headless_frontend_redirect' );
add_action( 'admin_init', 'mmf_register_headless_frontend_setting' );

/**
 * Storefront base URL, without trailing slash. Empty string = not configured.
 */
function mmf_headless_frontend_url(): string {
	if ( defined( 'MMF_HEADLESS_FRONTEND_URL' ) && is_string( MMF_HEADLESS_FRONTEND_URL ) ) {
		return untrailingslashit( esc_url_raw( MMF_HEADLESS_FRONTEND_URL ) );
	}

	$option = (string) get_option( 'mmf_headless_frontend_url', '' );

	return $option !== '' ? untrailingslashit( esc_url_raw( $option ) ) : '';
}

/**
 * Redirect theme-facing requests to the headless storefront.
 */
function mmf_headless_frontend_redirect(): void {
	// Never touch machine or admin traffic.
	if (
		is_admin()
		|| wp_doing_ajax()
		|| wp_doing_cron()
		|| ( defined( 'REST_REQUEST' ) && REST_REQUEST )
		|| ( defined( 'WP_CLI' ) && WP_CLI )
		|| ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST )
	) {
		return;
	}

	// Content editors may need the WP frontend (previews, page builders).
	if ( current_user_can( 'edit_posts' ) ) {
		return;
	}

	$frontend = mmf_headless_frontend_url();

	if ( $frontend !== '' ) {
		// Preserve the requested path so deep links keep working
		// (e.g. /shop → storefront /shop). Query string included.
		$request_uri = isset( $_SERVER['REQUEST_URI'] )
			? wp_sanitize_redirect( wp_unslash( $_SERVER['REQUEST_URI'] ) )
			: '/';

		// Paths only — never forward a full URL someone smuggled in.
		if ( $request_uri === '' || $request_uri[0] !== '/' || str_starts_with( $request_uri, '//' ) ) {
			$request_uri = '/';
		}

		wp_redirect( $frontend . $request_uri, 302 );
		exit;
	}

	// No storefront configured — show a minimal notice instead of the theme.
	status_header( 200 );
	nocache_headers();
	wp_die(
		esc_html__( 'This site is an API backend. The store is served from the storefront application.', 'midwest-military' ),
		esc_html__( 'Midwest Military Fasteners', 'midwest-military' ),
		array( 'response' => 200 )
	);
}

/**
 * Settings → General → "Headless Frontend URL" field.
 */
function mmf_register_headless_frontend_setting(): void {
	register_setting(
		'general',
		'mmf_headless_frontend_url',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => '',
		)
	);

	add_settings_field(
		'mmf_headless_frontend_url',
		__( 'Headless Frontend URL', 'midwest-military' ),
		'mmf_render_headless_frontend_setting_field',
		'general',
		'default',
		array( 'label_for' => 'mmf_headless_frontend_url' )
	);
}

/**
 * Render the settings input.
 */
function mmf_render_headless_frontend_setting_field(): void {
	$value      = (string) get_option( 'mmf_headless_frontend_url', '' );
	$overridden = defined( 'MMF_HEADLESS_FRONTEND_URL' );
	?>
	<input
		type="url"
		id="mmf_headless_frontend_url"
		name="mmf_headless_frontend_url"
		class="regular-text code"
		placeholder="https://www.example.com"
		value="<?php echo esc_attr( $value ); ?>"
		<?php disabled( $overridden ); ?>
	/>
	<p class="description">
		<?php
		if ( $overridden ) {
			esc_html_e( 'Defined by MMF_HEADLESS_FRONTEND_URL in wp-config.php — the field above is ignored.', 'midwest-military' );
		} else {
			esc_html_e( 'Visitors hitting this WordPress site directly are redirected here (path preserved). Leave empty to show a plain "API backend" notice instead.', 'midwest-military' );
		}
		?>
	</p>
	<?php
}
