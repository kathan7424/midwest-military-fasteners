<?php
/**
 * SEO & Analytics settings — GTM container, GA4 measurement ID, and a
 * site-wide default social share image (Yoast fallback when a specific
 * page has none of its own).
 *
 * Exposed to the headless frontend via the existing /custom/v1/site-settings
 * endpoint (see mmf_get_site_settings() in api.php) — no separate route,
 * one less round trip since site-settings is already fetched on every page.
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', 'mmf_register_seo_settings_page' );
add_action( 'admin_init', 'mmf_register_seo_settings_fields' );

/**
 * Dedicated "SEO & Analytics" settings page under Settings.
 */
function mmf_register_seo_settings_page(): void {
	add_options_page(
		__( 'SEO & Analytics', 'midwest-military' ),
		__( 'SEO & Analytics', 'midwest-military' ),
		'manage_options',
		'mmf-seo-analytics',
		'mmf_render_seo_settings_page'
	);
}

/**
 * Register the three settings + their fields.
 */
function mmf_register_seo_settings_fields(): void {
	register_setting(
		'mmf_seo_analytics',
		'mmf_gtm_container_id',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'mmf_sanitize_gtm_container_id',
			'default'           => '',
		)
	);

	register_setting(
		'mmf_seo_analytics',
		'mmf_ga4_measurement_id',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'mmf_sanitize_ga4_measurement_id',
			'default'           => '',
		)
	);

	register_setting(
		'mmf_seo_analytics',
		'mmf_default_og_image',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => '',
		)
	);

	add_settings_section(
		'mmf_seo_analytics_main',
		__( 'Tracking', 'midwest-military' ),
		function () {
			esc_html_e( 'These render as script tags on every storefront page via Next.js — no theme edits needed on either side.', 'midwest-military' );
		},
		'mmf-seo-analytics'
	);

	add_settings_field(
		'mmf_gtm_container_id',
		__( 'GTM Container ID', 'midwest-military' ),
		'mmf_render_gtm_field',
		'mmf-seo-analytics',
		'mmf_seo_analytics_main',
		array( 'label_for' => 'mmf_gtm_container_id' )
	);

	add_settings_field(
		'mmf_ga4_measurement_id',
		__( 'GA4 Measurement ID', 'midwest-military' ),
		'mmf_render_ga4_field',
		'mmf-seo-analytics',
		'mmf_seo_analytics_main',
		array( 'label_for' => 'mmf_ga4_measurement_id' )
	);

	add_settings_section(
		'mmf_seo_analytics_social',
		__( 'Social Sharing', 'midwest-military' ),
		function () {
			esc_html_e( 'Yoast SEO controls the title/description/og:image for every individual page. This image is only the fallback used when a page has no image of its own (Yoast has nothing set, or the page has no featured image).', 'midwest-military' );
		},
		'mmf-seo-analytics'
	);

	add_settings_field(
		'mmf_default_og_image',
		__( 'Default Social Share Image', 'midwest-military' ),
		'mmf_render_og_image_field',
		'mmf-seo-analytics',
		'mmf_seo_analytics_social',
		array( 'label_for' => 'mmf_default_og_image' )
	);
}

/**
 * GTM-XXXXXXX only — anything else is dropped, never emitted into a script tag.
 */
function mmf_sanitize_gtm_container_id( string $value ): string {
	$trimmed = trim( $value );

	return preg_match( '/^GTM-[A-Z0-9]+$/', $trimmed ) ? $trimmed : '';
}

/**
 * G-XXXXXXXXXX (GA4) only.
 */
function mmf_sanitize_ga4_measurement_id( string $value ): string {
	$trimmed = trim( $value );

	return preg_match( '/^G-[A-Z0-9]+$/', $trimmed ) ? $trimmed : '';
}

function mmf_render_gtm_field(): void {
	$value = (string) get_option( 'mmf_gtm_container_id', '' );
	?>
	<input
		type="text"
		id="mmf_gtm_container_id"
		name="mmf_gtm_container_id"
		class="regular-text code"
		placeholder="GTM-XXXXXXX"
		value="<?php echo esc_attr( $value ); ?>"
	/>
	<p class="description"><?php esc_html_e( 'From Google Tag Manager → Admin → Install GTM. Leave blank to skip GTM entirely.', 'midwest-military' ); ?></p>
	<?php
}

function mmf_render_ga4_field(): void {
	$value = (string) get_option( 'mmf_ga4_measurement_id', '' );
	?>
	<input
		type="text"
		id="mmf_ga4_measurement_id"
		name="mmf_ga4_measurement_id"
		class="regular-text code"
		placeholder="G-XXXXXXXXXX"
		value="<?php echo esc_attr( $value ); ?>"
	/>
	<p class="description"><?php esc_html_e( 'Only needed if you want GA4 loaded directly. If GA4 is already configured as a tag inside your GTM container above, leave this blank — otherwise it double-fires GA4.', 'midwest-military' ); ?></p>
	<?php
}

function mmf_render_og_image_field(): void {
	$value = (string) get_option( 'mmf_default_og_image', '' );
	?>
	<input
		type="url"
		id="mmf_default_og_image"
		name="mmf_default_og_image"
		class="regular-text code"
		placeholder="https://.../default-social-image.jpg"
		value="<?php echo esc_attr( $value ); ?>"
	/>
	<p class="description"><?php esc_html_e( 'Paste a Media Library file URL. Recommended 1200×630.', 'midwest-military' ); ?></p>
	<?php
}

/**
 * Render the settings page.
 */
function mmf_render_seo_settings_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to access this page.', 'midwest-military' ) );
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'SEO & Analytics', 'midwest-military' ); ?></h1>
		<p><?php esc_html_e( 'Per-page SEO (title, meta description, canonical, social preview) is handled by Yoast SEO — edit those on each page/post/product as usual. This screen is only for site-wide tracking and the social-image fallback.', 'midwest-military' ); ?></p>
		<form action="options.php" method="post">
			<?php
			settings_fields( 'mmf_seo_analytics' );
			do_settings_sections( 'mmf-seo-analytics' );
			submit_button();
			?>
		</form>
	</div>
	<?php
}

/**
 * Analytics + SEO fallback block for /custom/v1/site-settings.
 *
 * @return array{gtm_id:string, ga4_id:string, default_og_image:string}
 */
function mmf_get_seo_analytics_settings(): array {
	return array(
		'gtm_id'           => (string) get_option( 'mmf_gtm_container_id', '' ),
		'ga4_id'           => (string) get_option( 'mmf_ga4_measurement_id', '' ),
		'default_og_image' => (string) get_option( 'mmf_default_og_image', '' ),
	);
}
