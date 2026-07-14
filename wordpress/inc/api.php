<?php
/**
 * Custom REST API cache headers and Next.js on-demand revalidation.
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

define( 'MMF_HOME_PAGE_SLUG', 'home-page' );

// ── Cache-Control for all custom/v1 endpoints ─────────────────────────────
// Prevents Pantheon Varnish from caching ACF/WP managed content indefinitely.
// On-demand revalidation (save_post hook below) keeps Next.js ISR pages fresh.
add_filter( 'rest_post_dispatch', 'mmf_set_custom_api_cache_headers', 10, 3 );

function mmf_set_custom_api_cache_headers( $response, $server, $request ) {
	$route = (string) $request->get_route();

	if ( strpos( $route, '/custom/v1/' ) !== 0 ) {
		return $response;
	}

	// Auth + tax-exemption are user-specific — must never hit shared cache.
	if ( strpos( $route, '/custom/v1/auth' ) === 0
		|| strpos( $route, '/custom/v1/tax-exemption' ) === 0 ) {
		$response->header( 'Cache-Control', 'no-store, private' );
		return $response;
	}

	// Search results are query-specific — skip Varnish.
	if ( strpos( $route, '/custom/v1/search' ) === 0 ) {
		$response->header( 'Cache-Control', 'no-store, no-cache' );
		return $response;
	}

	// ACF home-page content — always fresh from WP. Next.js ISR (60s + webhook)
	// is the caching layer; Varnish must never serve a stale admin edit.
	if ( strpos( $route, '/custom/v1/home-page' ) === 0
		|| strpos( $route, '/custom/v1/product-catalog' ) === 0 ) {
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate' );
		return $response;
	}

	// Checkout settings (coupons, guest checkout, fields) must reflect WC admin
	// changes immediately. WP-side transient handles performance; Varnish must not
	// serve stale values that affect checkout behaviour.
	if ( strpos( $route, '/custom/v1/checkout/locations' ) === 0 ) {
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate' );
		return $response;
	}

	// Contact page ACF content — admin-editable; Next.js ISR + save_post webhook
	// is the caching layer. Varnish must not serve stale heading/image.
	if ( strpos( $route, '/custom/v1/contact-page' ) === 0 ) {
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate' );
		return $response;
	}

	// About page ACF content — admin-editable; Next.js ISR + save_post webhook
	// is the caching layer. Varnish must not serve stale banner/FAQ content.
	if ( strpos( $route, '/custom/v1/about-page' ) === 0 ) {
		$response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate' );
		return $response;
	}

	// Contact form submissions are user-specific — never cache.
	if ( strpos( $route, '/custom/v1/contact' ) === 0 ) {
		$response->header( 'Cache-Control', 'no-store, private' );
		return $response;
	}

	// Menu + site-settings change rarely — cache for 5 min.
	$response->header( 'Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600' );

	return $response;
}

// ── Next.js on-demand revalidation ────────────────────────────────────────
// When the home-page is saved in WP Admin, fire a non-blocking request to the
// Next.js revalidation endpoint so the ISR cache refreshes within a second.
//
// Configuration (add to wp-config.php):
//   define( 'MMF_NEXTJS_URL', 'https://your-nextjs-site.com' );
//   define( 'MMF_NEXTJS_REVALIDATION_SECRET', 'a-long-random-secret' );
//
// The same secret must be set as the REVALIDATION_SECRET env var in Next.js.

// Priority 999: run AFTER ACF has written field meta (ACF saves at priority 10),
// otherwise Next.js revalidates and refetches the OLD data — a race condition.
add_action( 'save_post', 'mmf_notify_nextjs_revalidate', 999, 2 );

// ACF quick edits (acf/save_post fires after ACF meta is committed).
add_action( 'acf/save_post', 'mmf_notify_nextjs_revalidate_acf', 99 );

function mmf_notify_nextjs_revalidate_acf( $post_id ): void {
	$post = get_post( (int) $post_id );

	if ( $post instanceof WP_Post ) {
		mmf_notify_nextjs_revalidate( (int) $post_id, $post );
	}
}

function mmf_notify_nextjs_revalidate( int $post_id, WP_Post $post ): void {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( wp_is_post_revision( $post_id ) ) {
		return;
	}

	if ( 'publish' !== $post->post_status ) {
		return;
	}

	$nextjs_url = defined( 'MMF_NEXTJS_URL' ) ? (string) MMF_NEXTJS_URL : '';
	$secret     = defined( 'MMF_NEXTJS_REVALIDATION_SECRET' ) ? (string) MMF_NEXTJS_REVALIDATION_SECRET : '';

	if ( empty( $nextjs_url ) || empty( $secret ) ) {
		return;
	}

	// Home page ACF content changed — revalidate the "/" route and "home-page" tag.
	if ( MMF_HOME_PAGE_SLUG === $post->post_name ) {
		foreach ( array( 'home-page' ) as $tag ) {
			// Secret travels in a header (preferred) and the query param (back-compat).
			wp_remote_post(
				add_query_arg(
					array( 'secret' => $secret, 'tag' => $tag ),
					trailingslashit( $nextjs_url ) . 'api/revalidate'
				),
				array(
					'timeout'  => 2,
					'blocking' => false,
					'headers'  => array( 'x-revalidate-secret' => $secret ),
				)
			);
		}
	}

	// Contact page ACF content changed — revalidate the "/contact" route.
	if ( (int) $post->ID === 131 ) {
		wp_remote_post(
			add_query_arg(
				array( 'secret' => $secret, 'path' => '/contact' ),
				trailingslashit( $nextjs_url ) . 'api/revalidate'
			),
			array(
				'timeout'  => 2,
				'blocking' => false,
				'headers'  => array( 'x-revalidate-secret' => $secret ),
			)
		);
	}

	// About page ACF content changed — revalidate the "/about" route.
	if ( (int) $post->ID === 29 ) {
		wp_remote_post(
			add_query_arg(
				array( 'secret' => $secret, 'path' => '/about' ),
				trailingslashit( $nextjs_url ) . 'api/revalidate'
			),
			array(
				'timeout'  => 2,
				'blocking' => false,
				'headers'  => array( 'x-revalidate-secret' => $secret ),
			)
		);
	}
}

add_action( 'rest_api_init', function () {

	register_rest_route(
		'custom/v1',
		'/menu/(?P<location>[a-zA-Z0-9_-]+)',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_menu_by_location',
			'permission_callback' => '__return_true',
		)
	);
    register_rest_route(
		'custom/v1',
		'/site-settings',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_site_settings',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		'custom/v1',
		'/home-page',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_home_page',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		'custom/v1',
		'/product-catalog',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_product_catalog',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		'custom/v1',
		'/contact-page',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_contact_page',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		'custom/v1',
		'/about-page',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_about_page',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		'custom/v1',
		'/contact',
		array(
			'methods'             => 'POST',
			'callback'            => 'mmf_submit_contact_form',
			'permission_callback' => '__return_true',
			'args'                => array(
				'first_name' => array(
					'required'          => true,
					'sanitize_callback' => 'sanitize_text_field',
					'validate_callback' => function ( $v ) { return is_string( $v ) && strlen( trim( $v ) ) > 0; },
				),
				'last_name'  => array(
					'required'          => true,
					'sanitize_callback' => 'sanitize_text_field',
					'validate_callback' => function ( $v ) { return is_string( $v ) && strlen( trim( $v ) ) > 0; },
				),
				'email'      => array(
					'required'          => true,
					'sanitize_callback' => 'sanitize_email',
					'validate_callback' => 'is_email',
				),
				'company'    => array(
					'required'          => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'message'    => array(
					'required'          => true,
					'sanitize_callback' => 'sanitize_textarea_field',
					'validate_callback' => function ( $v ) { return is_string( $v ) && strlen( trim( $v ) ) > 0; },
				),
			),
		)
	);
    register_rest_route(
		'custom/v1',
		'/search',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_global_search',
			'permission_callback' => '__return_true',
			'args'                => array(
				'q' => array(
					'required'          => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'limit' => array(
					'required'          => false,
					'default'           => 10,
					'sanitize_callback' => 'absint',
				),
				'post_type' => array(
					'required'          => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
				'scope' => array(
					'required'          => false,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		)
	);

	register_rest_route(
		'custom/v1',
		'/checkout/locations',
		array(
			'methods'             => 'GET',
			'callback'            => 'mmf_get_checkout_locations',
			'permission_callback' => '__return_true',
		)
	);

} );

// Cache key for checkout locations — bump suffix when response shape changes.
define( 'MMF_LOCATIONS_CACHE_KEY', 'mmf_checkout_locations_v3' );
define( 'MMF_LOCATIONS_CACHE_TTL', 5 * MINUTE_IN_SECONDS );

// Clear cached locations whenever any WooCommerce settings tab is saved.
add_action( 'woocommerce_settings_saved', 'mmf_clear_checkout_locations_cache' );
function mmf_clear_checkout_locations_cache(): void {
	delete_transient( MMF_LOCATIONS_CACHE_KEY );
	mmf_revalidate_nextjs_checkout();
}

function mmf_revalidate_nextjs_checkout(): void {
	$nextjs_url = defined( 'MMF_NEXTJS_URL' ) ? (string) MMF_NEXTJS_URL : '';
	$secret     = defined( 'MMF_NEXTJS_REVALIDATION_SECRET' ) ? (string) MMF_NEXTJS_REVALIDATION_SECRET : '';

	if ( empty( $nextjs_url ) || empty( $secret ) ) {
		return;
	}

	wp_remote_post(
		add_query_arg(
			array( 'secret' => $secret, 'path' => '/checkout' ),
			trailingslashit( $nextjs_url ) . 'api/revalidate'
		),
		array(
			'timeout'  => 2,
			'blocking' => false,
			'headers'  => array( 'x-revalidate-secret' => $secret ),
		)
	);
}

/**
 * Allowed countries + states for checkout dropdowns.
 *
 * WP-side 5-minute transient cache so ISR misses on the Next.js side still
 * return quickly. Cache is busted automatically on every WC settings save.
 *
 * Endpoint: GET /custom/v1/checkout/locations
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_checkout_locations() {
	if ( ! function_exists( 'WC' ) || ! WC()->countries ) {
		return new WP_Error( 'wc_unavailable', 'WooCommerce unavailable', array( 'status' => 500 ) );
	}

	$cached = get_transient( MMF_LOCATIONS_CACHE_KEY );
	if ( false !== $cached && is_array( $cached ) ) {
		return rest_ensure_response( $cached );
	}

	$countries_obj = WC()->countries;
	$allowed       = $countries_obj->get_allowed_countries();
	$all_states    = $countries_obj->get_allowed_country_states();

	// WC → General → "Shipping location(s)" — may differ from selling locations.
	$shipping_allowed    = $countries_obj->get_shipping_countries();
	$shipping_states_raw = $countries_obj->get_shipping_country_states();

	$format_countries = static function ( array $list ): array {
		$out = array();
		foreach ( $list as $code => $name ) {
			$out[] = array(
				'code' => (string) $code,
				'name' => html_entity_decode( (string) $name ),
			);
		}
		return $out;
	};

	$format_states = static function ( array $map ): array {
		$out = array();
		foreach ( $map as $country_code => $country_states ) {
			if ( empty( $country_states ) || ! is_array( $country_states ) ) {
				continue;
			}
			$state_list = array();
			foreach ( $country_states as $state_code => $state_name ) {
				$state_list[] = array(
					'code' => (string) $state_code,
					'name' => html_entity_decode( (string) $state_name ),
				);
			}
			$out[ (string) $country_code ] = $state_list;
		}
		return $out;
	};

	$countries          = $format_countries( $allowed );
	$states             = $format_states( $all_states );
	$shipping_countries = $format_countries( $shipping_allowed );
	$shipping_states    = $format_states( $shipping_states_raw );

	$data = array(
		'default_country'    => (string) $countries_obj->get_base_country(),
		'countries'          => $countries,
		'states'             => $states,
		// WC → General → Shipping location(s) — used by the
		// "Ship to a different address?" form.
		'shipping_countries' => $shipping_countries,
		'shipping_states'    => $shipping_states,
		// WC → Settings → General → Currency options (source of truth).
		'currency'           => array(
			'code'               => get_woocommerce_currency(),
			'symbol'             => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ),
			'position'           => get_option( 'woocommerce_currency_pos', 'left' ),
			'decimal_separator'  => wc_get_price_decimal_separator(),
			'thousand_separator' => wc_get_price_thousand_separator(),
			'decimals'           => wc_get_price_decimals(),
		),
		// WC checkout + account settings — mirrors WP admin changes.
		'checkout'           => array(
			// Accounts & Privacy → "Allow customers to place orders without an account".
			'guest_checkout'       => 'yes' === get_option( 'woocommerce_enable_guest_checkout', 'yes' ),
			// Accounts & Privacy → "Allow customers to log into an existing account during checkout".
			'login_reminder'       => 'yes' === get_option( 'woocommerce_enable_checkout_login_reminder', 'yes' ),
			// Accounts & Privacy → "Allow customers to create an account during checkout".
			'signup_enabled'       => 'yes' === get_option( 'woocommerce_enable_signup_and_login_from_checkout', 'no' ),
			// Accounts & Privacy → Account creation → "On My account page".
			// Controls whether a Register link / form is shown at the login page.
			'registration_enabled' => 'yes' === get_option( 'woocommerce_enable_myaccount_registration', 'yes' ),
			// General → "Enable the use of coupon codes".
			'coupons_enabled'      => wc_coupons_enabled(),
			// General → "Enable the use of order notes".
			'order_notes_enabled'  => 'yes' === get_option( 'woocommerce_enable_order_comments', 'yes' ),
			// WC → Payments → Stripe → "Enable saved payment methods" (saved_cards).
			// Returning customers can pay with a card stored at Stripe and save
			// new cards during checkout. No card data touches the store.
			'saved_cards'          => ( function() {
				$stripe = get_option( 'woocommerce_stripe_settings', array() );
				return isset( $stripe['saved_cards'] ) && 'yes' === $stripe['saved_cards'];
			} )(),
			// Appearance → Customize → WooCommerce → Checkout field visibility.
			'fields'               => array(
				'company'   => get_option( 'woocommerce_checkout_company_field', 'optional' ),
				'address_2' => get_option( 'woocommerce_checkout_address_2_field', 'optional' ),
				'phone'     => get_option( 'woocommerce_checkout_phone_field', 'required' ),
			),
			// WC → Advanced → Page setup → Terms and conditions page.
			'terms_page_path'      => ( function() {
				$id = (int) wc_terms_and_conditions_page_id();
				return $id > 0 ? '/' . get_page_uri( $id ) : null;
			} )(),
			// WP → Settings → Privacy → Privacy Policy page.
			'privacy_page_path'    => ( function() {
				$id = (int) get_option( 'wp_page_for_privacy_policy', 0 );
				return $id > 0 ? '/' . get_page_uri( $id ) : null;
			} )(),
		),
	);

	set_transient( MMF_LOCATIONS_CACHE_KEY, $data, MMF_LOCATIONS_CACHE_TTL );

	return rest_ensure_response( $data );
}

require_once get_template_directory() . '/inc/cart.php';

/**
 * Get home page data for frontend.
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_home_page() {
    $page = get_page_by_path( MMF_HOME_PAGE_SLUG );

    if ( ! $page || 'publish' !== $page->post_status ) {
        return new WP_Error(
            'no_page',
            'Home page not found',
            array( 'status' => 404 )
        );
    }

    $page_id = (int) $page->ID;

    $response = array(
        'page'    => array(
            'id'    => $page_id,
            'slug'  => $page->post_name,
            'title' => get_the_title( $page_id ),
        ),
        'banner'  => array(
            'banner_title' => sanitize_text_field( (string) get_field( 'banner_title', $page_id ) ),
            'banner_image' => mmf_format_acf_image( get_field( 'banner_image', $page_id ) ),
        ),
        'catalog' => mmf_build_product_catalog( $page_id ),
    );

    return rest_ensure_response( $response );
}

/**
 * Endpoint: GET /custom/v1/contact-page
 *
 * Returns ACF fields for the Contact Us page (page ID 131).
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_contact_page() {
	$page_id = 131;
	$page    = get_post( $page_id );

	if ( ! $page || 'publish' !== $page->post_status ) {
		return new WP_Error( 'no_page', 'Contact page not found', array( 'status' => 404 ) );
	}

	return rest_ensure_response( array(
		'heading'      => sanitize_text_field( (string) get_field( 'heading', $page_id ) ),
		'sub_heading'  => sanitize_text_field( (string) get_field( 'sub_heading', $page_id ) ),
		'banner_image' => mmf_format_acf_image( get_field( 'banner_image', $page_id ) ),
	) );
}

/**
 * Endpoint: GET /custom/v1/about-page
 *
 * Returns ACF fields for the About Us page (page ID 29).
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_about_page() {
	$page_id = 29;
	$page    = get_post( $page_id );

	if ( ! $page || 'publish' !== $page->post_status ) {
		return new WP_Error( 'no_page', 'About page not found', array( 'status' => 404 ) );
	}

	$faq_rows  = get_field( 'faq_list', $page_id );
	$faq_items = array();

	if ( is_array( $faq_rows ) ) {
		foreach ( $faq_rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$question = sanitize_text_field( (string) ( $row['faq_question'] ?? '' ) );
			$answer   = wp_kses_post( (string) ( $row['faq_answer'] ?? '' ) );

			if ( '' === $question ) {
				continue;
			}

			$faq_items[] = array(
				'question' => $question,
				'answer'   => $answer,
			);
		}
	}

	return rest_ensure_response( array(
		'heading'         => sanitize_text_field( (string) get_field( 'field_6a3d2e26dca98', $page_id ) ),
		'sub_heading'     => sanitize_text_field( (string) get_field( 'sub_heading', $page_id ) ),
		'banner_image'    => mmf_format_acf_image( get_field( 'banner_image', $page_id ) ),
		'image'           => mmf_format_acf_image( get_field( 'image', $page_id ) ),
		'content_heading' => sanitize_text_field( (string) get_field( 'field_6a3d2fc81b6f1', $page_id ) ),
		'content'         => wp_kses_post( (string) get_field( 'content', $page_id ) ),
		'logo_image'      => mmf_format_acf_image( get_field( 'logo_image', $page_id ) ),
		'button'          => mmf_format_acf_link( get_field( 'button', $page_id ) ),
		'faq_heading'     => sanitize_text_field( (string) get_field( 'field_6a3e273def148', $page_id ) ),
		'faq_description' => wp_kses_post( (string) get_field( 'description', $page_id ) ),
		'faq_list'        => $faq_items,
	) );
}

/**
 * Endpoint: POST /custom/v1/contact
 *
 * Submits the contact form via Gravity Forms (form ID 3).
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function mmf_submit_contact_form( WP_REST_Request $request ) {
	if ( ! class_exists( 'GFAPI' ) ) {
		return new WP_Error( 'gf_unavailable', 'Form service unavailable.', array( 'status' => 503 ) );
	}

	// GFAPI::submit_form() expects HTML POST key format:
	// compound fields use input_{field_id}_{input_id} (underscore, not dot).
	$input_values = array(
		'input_1_3' => (string) $request->get_param( 'first_name' ),
		'input_1_6' => (string) $request->get_param( 'last_name' ),
		'input_3'   => (string) ( $request->get_param( 'company' ) ?? '' ),
		'input_4'   => (string) $request->get_param( 'email' ),
		'input_5'   => (string) $request->get_param( 'message' ),
	);

	$result = GFAPI::submit_form( 3, $input_values );

	if ( is_wp_error( $result ) ) {
		return new WP_Error( 'form_error', $result->get_error_message(), array( 'status' => 422 ) );
	}

	if ( isset( $result['is_valid'] ) && ! $result['is_valid'] ) {
		$validation_messages = array();
		if ( ! empty( $result['validation_messages'] ) ) {
			foreach ( $result['validation_messages'] as $field_id => $msg ) {
				$validation_messages[] = sanitize_text_field( (string) $msg );
			}
		}
		return new WP_Error(
			'validation_failed',
			! empty( $validation_messages ) ? implode( ' ', $validation_messages ) : 'Form validation failed.',
			array( 'status' => 422 )
		);
	}

	// Return GF's configured confirmation message so the frontend can display it
	// without hardcoding strings — admin can change it in GF → Forms → Settings.
	$confirmation_message = '';
	if ( ! empty( $result['confirmation_message'] ) ) {
		$confirmation_message = wp_strip_all_tags( (string) $result['confirmation_message'] );
	}

	return rest_ensure_response( array(
		'success'      => true,
		'confirmation' => $confirmation_message,
	) );
}

/**
 * Resolve an ACF taxonomy field value to a term ID.
 *
 * @param mixed $value ACF taxonomy field value.
 * @return int
 */
function mmf_resolve_term_id( $value ): int {
	if ( is_numeric( $value ) ) {
		return absint( $value );
	}

	if ( is_object( $value ) && isset( $value->term_id ) ) {
		return absint( $value->term_id );
	}

	if ( is_array( $value ) && isset( $value['term_id'] ) ) {
		return absint( $value['term_id'] );
	}

	return 0;
}

/**
 * Resolve an ACF relationship field value to a post ID.
 *
 * @param mixed $value ACF relationship field value.
 * @return int
 */
function mmf_resolve_post_id( $value ): int {
	if ( is_numeric( $value ) ) {
		return absint( $value );
	}

	if ( is_object( $value ) && isset( $value->ID ) ) {
		return absint( $value->ID );
	}

	if ( is_array( $value ) && isset( $value['ID'] ) ) {
		return absint( $value['ID'] );
	}

	return 0;
}

/**
 * Format a single product for the home page catalog.
 *
 * @param int $post_id Product post ID.
 * @return array|null
 */
function mmf_format_catalog_product( int $post_id ): ?array {
	if ( $post_id <= 0 || 'product' !== get_post_type( $post_id ) ) {
		return null;
	}

	$sku = '';
	if ( function_exists( 'wc_get_product' ) ) {
		$wc_product = wc_get_product( $post_id );
		$sku        = $wc_product ? sanitize_text_field( (string) $wc_product->get_sku() ) : '';
	}

	if ( empty( $sku ) ) {
		$sku = sanitize_text_field( (string) get_post_meta( $post_id, '_sku', true ) );
	}

	return array(
		'id'        => $post_id,
		'slug'      => sanitize_title( (string) get_post_field( 'post_name', $post_id ) ),
		'sku'       => $sku,
		'name'      => sanitize_text_field( get_the_title( $post_id ) ),
		'permalink' => esc_url_raw( (string) get_permalink( $post_id ) ),
	);
}

/**
 * Build the ACF product catalog tree for a page.
 *
 * @param int $page_id Home page ID.
 * @return array
 */
function mmf_build_product_catalog( int $page_id ): array {
	$rows = get_field( 'product_catalog', $page_id );

	// Fallback: read ACF's raw meta directly. get_field() returns empty when
	// the field group was re-created (new field keys orphan the saved rows) —
	// the values are still in post meta and this parser doesn't need keys.
	if ( empty( $rows ) || ! is_array( $rows ) ) {
		$rows = mmf_read_product_catalog_raw_meta( $page_id );
	}

	if ( empty( $rows ) || ! is_array( $rows ) ) {
		return array();
	}

	$catalog = array();

	foreach ( $rows as $row ) {
		$parent_term_id = mmf_resolve_term_id( $row['parent_category'] ?? 0 );
		$parent_term    = $parent_term_id ? get_term( $parent_term_id, 'product_cat' ) : null;

		if ( ! $parent_term || is_wp_error( $parent_term ) ) {
			continue;
		}

		$child_rows       = $row['child_category'] ?? array();
		$child_categories = array();

		if ( ! is_array( $child_rows ) ) {
			continue;
		}

		foreach ( $child_rows as $child_row ) {
			$child_term_id = mmf_resolve_term_id( $child_row['child_category'] ?? 0 );
			$child_term    = $child_term_id ? get_term( $child_term_id, 'product_cat' ) : null;

			if ( ! $child_term || is_wp_error( $child_term ) ) {
				continue;
			}

			$product_objects = $child_row['product'] ?? array();
			$products        = array();

			if ( ! is_array( $product_objects ) ) {
				$product_objects = array( $product_objects );
			}

			foreach ( $product_objects as $product_post ) {
				if ( empty( $product_post ) ) {
					continue;
				}

				$post_id = mmf_resolve_post_id( $product_post );
				$product = mmf_format_catalog_product( $post_id );

				if ( $product ) {
					$products[] = $product;
				}
			}

			$child_categories[] = array(
				'category' => array(
					'id'   => $child_term->term_id,
					'name' => $child_term->name,
					'slug' => $child_term->slug,
				),
				'products' => $products,
			);
		}

		if ( empty( $child_categories ) ) {
			continue;
		}

		$catalog[] = array(
			'parent_category' => array(
				'id'   => $parent_term->term_id,
				'name' => $parent_term->name,
				'slug' => $parent_term->slug,
			),
			'child_categories' => $child_categories,
		);
	}

	return $catalog;
}

/**
 * Read the product_catalog repeater from raw post meta (no ACF key lookups).
 *
 * ACF stores repeaters as flat meta:
 *   product_catalog                                   = row count
 *   product_catalog_{i}_parent_category               = term ID
 *   product_catalog_{i}_child_category                = child row count
 *   product_catalog_{i}_child_category_{j}_child_category = term ID
 *   product_catalog_{i}_child_category_{j}_product    = array of post IDs
 *
 * @param int $page_id Home page ID.
 * @return array Same row shape get_field() returns.
 */
function mmf_read_product_catalog_raw_meta( int $page_id ): array {
	$row_count = (int) get_post_meta( $page_id, 'product_catalog', true );

	if ( $row_count <= 0 ) {
		return array();
	}

	$rows = array();

	for ( $i = 0; $i < $row_count; $i++ ) {
		$parent      = get_post_meta( $page_id, "product_catalog_{$i}_parent_category", true );
		$child_count = (int) get_post_meta( $page_id, "product_catalog_{$i}_child_category", true );
		$child_rows  = array();

		for ( $j = 0; $j < $child_count; $j++ ) {
			$child_term = get_post_meta(
				$page_id,
				"product_catalog_{$i}_child_category_{$j}_child_category",
				true
			);
			$products   = get_post_meta(
				$page_id,
				"product_catalog_{$i}_child_category_{$j}_product",
				true
			);

			$child_rows[] = array(
				'child_category' => $child_term,
				'product'        => is_array( $products ) ? $products : array( $products ),
			);
		}

		$rows[] = array(
			'parent_category' => $parent,
			'child_category'  => $child_rows,
		);
	}

	return $rows;
}

/**
 * Get the ACF product catalog for the home page.
 *
 * Endpoint: GET /wp-json/custom/v1/product-catalog
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_product_catalog() {
	$page = get_page_by_path( MMF_HOME_PAGE_SLUG );

	if ( ! $page || 'publish' !== $page->post_status ) {
		return new WP_Error(
			'no_page',
			'Home page not found',
			array( 'status' => 404 )
		);
	}

	return rest_ensure_response(
		array(
			'catalog' => mmf_build_product_catalog( (int) $page->ID ),
		)
	);
}

function mmf_get_menu_by_location( WP_REST_Request $request ) {

	$location  = sanitize_key( $request['location'] );
	$locations = get_nav_menu_locations();

	if ( empty( $locations[ $location ] ) ) {
		return new WP_Error(
			'no_menu',
			'Menu location not found',
			array( 'status' => 404 )
		);
	}

	$items = wp_get_nav_menu_items( $locations[ $location ] );

	if ( empty( $items ) ) {
		return rest_ensure_response( array() );
	}

	$map  = array();
	$tree = array();

	foreach ( $items as $item ) {
		$map[ $item->ID ] = array(
			'id'       => $item->ID,
			'title'    => $item->title,
			'url'      => $item->url,
			'parent'   => (int) $item->menu_item_parent,
			'children' => array(),
		);
	}

	foreach ( $map as $id => &$item ) {
		if ( $item['parent'] && isset( $map[ $item['parent'] ] ) ) {
			$map[ $item['parent'] ]['children'][] = &$item;
		} else {
			$tree[] = &$item;
		}
	}

	return rest_ensure_response( $tree );
}


/**
 * Get site-wide settings.
 *
 * @return WP_REST_Response
 */
function mmf_get_site_settings() {
	$custom_logo_id = (int) get_theme_mod( 'custom_logo' );
	$site_icon_id   = (int) get_option( 'site_icon' );

	$register_button = get_field( 'register_button', 'option' );
	$login_button    = get_field( 'login_button', 'option' );
	$copy_right_text = get_field( 'copy_right_text', 'option' );
	$build_by_link   = get_field( 'build_by_link', 'option' );

	$response = array(
		'branding'    => array(
			'site_title'   => get_bloginfo( 'name' ),
			'tagline'      => get_bloginfo( 'description' ),
			'display_text' => (bool) get_theme_mod( 'header_text', true ),
			'logo'         => mmf_get_attachment_data( $custom_logo_id ),
			'favicon'      => mmf_get_attachment_data( $site_icon_id ),
		),
		'header'      => array(
			'email'           => sanitize_email( (string) get_field( 'email', 'option' ) ),
			'phone'           => sanitize_text_field( (string) get_field( 'phone', 'option' ) ),
			'register_button' => mmf_format_acf_link( $register_button ),
			'login_button'    => mmf_format_acf_link( $login_button ),
		),
		'footer'      => array(
			'iso_logo'        => mmf_format_acf_image( get_field( 'iso_logo', 'option' ) ),
			'iso_title'        => sanitize_text_field( get_field( 'iso_title', 'option' ) ),
			'content_area'    => wp_kses_post( (string) get_field( 'content_area', 'option' ) ),
			'copy_right_text' => mmf_format_acf_link( $copy_right_text ),
			'build_by_text'   => sanitize_text_field( (string) get_field( 'build_by_text', 'option' ) ),
			'build_by_link'   => mmf_format_acf_link( $build_by_link ),
		),
		'woocommerce' => mmf_get_woocommerce_settings(),
	);

	return rest_ensure_response( $response );
}

/**
 * Relative frontend path for a WooCommerce system page.
 *
 * @param int $page_id WooCommerce page ID.
 * @return string
 */
function mmf_get_wc_page_path( int $page_id ): string {
	if ( $page_id <= 0 ) {
		return '';
	}

	$permalink = get_permalink( $page_id );

	if ( ! $permalink ) {
		return '';
	}

	$path = wp_parse_url( $permalink, PHP_URL_PATH );

	return $path ? untrailingslashit( (string) $path ) : '';
}

/**
 * Post slug for a WooCommerce system page.
 *
 * @param int $page_id WooCommerce page ID.
 * @return string
 */
function mmf_get_wc_page_slug( int $page_id ): string {
	if ( $page_id <= 0 ) {
		return '';
	}

	return sanitize_title( (string) get_post_field( 'post_name', $page_id ) );
}

/**
 * WooCommerce page slugs/paths for the headless frontend.
 *
 * @return array<string, mixed>
 */
function mmf_get_woocommerce_settings(): array {
	$defaults = array(
		'shop_page_id'        => 0,
		'shop_page_slug'      => 'product',
		'shop_page_path'      => '/product',
		'cart_page_slug'      => 'cart',
		'cart_page_path'      => '/cart',
		'checkout_page_slug'  => 'checkout',
		'checkout_page_path'    => '/checkout',
		'myaccount_page_slug' => 'my-account',
		'myaccount_page_path'   => '/my-account',
	);

	if ( ! function_exists( 'wc_get_page_id' ) ) {
		return $defaults;
	}

	$shop_id      = (int) wc_get_page_id( 'shop' );
	$cart_id      = (int) wc_get_page_id( 'cart' );
	$checkout_id  = (int) wc_get_page_id( 'checkout' );
	$myaccount_id = (int) wc_get_page_id( 'myaccount' );

	if ( $shop_id > 0 ) {
		$defaults['shop_page_id']   = $shop_id;
		$defaults['shop_page_slug'] = mmf_get_wc_page_slug( $shop_id ) ?: 'product';
		$defaults['shop_page_path'] = mmf_get_wc_page_path( $shop_id ) ?: '/product';
	}

	if ( $cart_id > 0 ) {
		$defaults['cart_page_slug'] = mmf_get_wc_page_slug( $cart_id ) ?: 'cart';
		$defaults['cart_page_path'] = mmf_get_wc_page_path( $cart_id ) ?: '/cart';
	}

	if ( $checkout_id > 0 ) {
		$defaults['checkout_page_slug'] = mmf_get_wc_page_slug( $checkout_id ) ?: 'checkout';
		$defaults['checkout_page_path'] = mmf_get_wc_page_path( $checkout_id ) ?: '/checkout';
	}

	if ( $myaccount_id > 0 ) {
		$defaults['myaccount_page_slug'] = mmf_get_wc_page_slug( $myaccount_id ) ?: 'my-account';
		$defaults['myaccount_page_path'] = mmf_get_wc_page_path( $myaccount_id ) ?: '/my-account';
	}

	return $defaults;
}
/**
 * Build attachment response data.
 *
 * @param int $attachment_id Attachment ID.
 * @return array|null
 */
function mmf_get_attachment_data( int $attachment_id ): ?array {
	if ( $attachment_id <= 0 ) {
		return null;
	}

	$url = wp_get_attachment_image_url( $attachment_id, 'full' );

	if ( ! $url ) {
		return null;
	}

	return array(
		'id'    => $attachment_id,
		'url'   => esc_url_raw( $url ),
		'alt'   => sanitize_text_field(
			(string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true )
		),
		'title' => sanitize_text_field( (string) get_the_title( $attachment_id ) ),
	);
}
function mmf_format_acf_link( $link ): ?array {
	if ( empty( $link ) || ! is_array( $link ) ) {
		return null;
	}

	return array(
		'title'  => isset( $link['title'] ) ? sanitize_text_field( $link['title'] ) : '',
		'url'    => isset( $link['url'] ) ? esc_url_raw( $link['url'] ) : '',
		'target' => isset( $link['target'] ) ? sanitize_text_field( $link['target'] ) : '',
	);
}

function mmf_format_acf_image( $image ): ?array {
	if ( empty( $image ) ) {
		return null;
	}

	if ( is_numeric( $image ) ) {
		return mmf_get_attachment_data( (int) $image );
	}

	if ( is_array( $image ) && ! empty( $image['ID'] ) ) {
		return mmf_get_attachment_data( (int) $image['ID'] );
	}

	return null;
}


/**
 * Global search callback — pages, posts, products, and taxonomy terms.
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response
 */
function mmf_global_search( WP_REST_Request $request ) {
	$search_term    = trim( (string) $request->get_param( 'q' ) );
	$limit          = (int) $request->get_param( 'limit' );
	$requested_type = sanitize_text_field( (string) $request->get_param( 'post_type' ) );
	$scope          = sanitize_text_field( (string) $request->get_param( 'scope' ) );
	$allowed_types  = array( 'post', 'page', 'product' );
	$post_types     = $requested_type && in_array( $requested_type, $allowed_types, true )
		? array( $requested_type )
		: $allowed_types;

	// scope=catalog: products + product categories/series only (home hero search).
	// Default scope: everything (header global search).
	$term_taxonomies = null;

	if ( 'catalog' === $scope ) {
		$post_types      = array( 'product' );
		$series_taxonomy = function_exists( 'specparts_get_series_taxonomy' )
			? specparts_get_series_taxonomy()
			: 'product-series';
		$term_taxonomies = array( 'product_cat', $series_taxonomy );
	}

	if ( empty( $search_term ) ) {
		return rest_ensure_response(
			array(
				'query' => '',
				'posts' => array(),
				'terms' => array(),
				'total' => array(
					'posts' => 0,
					'terms' => 0,
				),
			)
		);
	}

	$limit          = $limit > 0 ? min( $limit, 20 ) : 10;
	$results_by_id  = array();
	$found_posts    = 0;

	$text_query = new WP_Query(
		array(
			'post_type'              => $post_types,
			'post_status'            => 'publish',
			'posts_per_page'         => $limit,
			's'                      => $search_term,
			'ignore_sticky_posts'    => true,
			'no_found_rows'          => false,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => true,
		)
	);

	if ( $text_query->have_posts() ) {
		$found_posts = (int) $text_query->found_posts;

		while ( $text_query->have_posts() ) {
			$text_query->the_post();
			$post_id = get_the_ID();
			$results_by_id[ $post_id ] = mmf_format_search_post( $post_id );
		}

		wp_reset_postdata();
	}

	$slug_post_ids = mmf_search_post_ids_by_slug( $search_term, $post_types, $limit );

	foreach ( $slug_post_ids as $post_id ) {
		if ( isset( $results_by_id[ $post_id ] ) ) {
			continue;
		}

		$results_by_id[ $post_id ] = mmf_format_search_post( (int) $post_id );
		++$found_posts;
	}

	$results      = array_slice( array_values( $results_by_id ), 0, $limit );
	$term_results = mmf_search_terms( $search_term, $limit, $term_taxonomies );

	return rest_ensure_response(
		array(
			'query' => $search_term,
			'posts' => $results,
			'terms' => $term_results,
			'total' => array(
				'posts' => max( $found_posts, count( $results ) ),
				'terms' => count( $term_results ),
			),
		)
	);
}

/**
 * Format a single post for global search results.
 *
 * @param int $post_id Post ID.
 * @return array
 */
function mmf_format_search_post( int $post_id ): array {
	$post_type = get_post_type( $post_id );
	$image_id  = get_post_thumbnail_id( $post_id );
	$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';

	if ( ! $image_url && 'product' === $post_type && function_exists( 'wc_placeholder_img_src' ) ) {
		$image_url = wc_placeholder_img_src();
	}
	$result    = array(
		'id'         => $post_id,
		'type'       => $post_type,
		'title'      => get_the_title( $post_id ),
		'url'        => get_permalink( $post_id ),
		'excerpt'    => mmf_get_search_excerpt( $post_id ),
		'image'      => $image_url ? esc_url_raw( $image_url ) : '',
		'date'       => get_the_date( 'c', $post_id ),
		'categories' => mmf_get_post_terms_for_search( $post_id, 'category' ),
		'tags'       => mmf_get_post_terms_for_search( $post_id, 'post_tag' ),
	);

	if ( 'product' === $post_type && function_exists( 'wc_get_product' ) ) {
		$product = wc_get_product( $post_id );

		if ( $product ) {
			$result['product'] = array(
				'price_html' => wp_kses_post( $product->get_price_html() ),
				'sku'        => sanitize_text_field( (string) $product->get_sku() ),
				'in_stock'   => $product->is_in_stock(),
			);
		}
	}

	return $result;
}

/**
 * Find published posts whose slug matches the search term.
 *
 * @param string $search_term Search string.
 * @param array  $post_types  Allowed post types.
 * @param int    $limit       Max results.
 * @return int[]
 */
function mmf_search_post_ids_by_slug( string $search_term, array $post_types, int $limit ): array {
	global $wpdb;

	$slug = sanitize_title( $search_term );

	if ( empty( $slug ) ) {
		return array();
	}

	$type_placeholders = implode( ', ', array_fill( 0, count( $post_types ), '%s' ) );
	$like_slug         = '%' . $wpdb->esc_like( $slug ) . '%';
	$sql               = "
		SELECT ID
		FROM {$wpdb->posts}
		WHERE post_status = 'publish'
			AND post_type IN ( {$type_placeholders} )
			AND post_name LIKE %s
		ORDER BY
			CASE WHEN post_name = %s THEN 0 ELSE 1 END,
			post_title ASC
		LIMIT %d
	";

	$params   = array_merge( $post_types, array( $like_slug, $slug, $limit ) );
	$prepared = $wpdb->prepare( $sql, $params );

	if ( ! $prepared ) {
		return array();
	}

	$post_ids = $wpdb->get_col( $prepared );

	return array_map( 'intval', $post_ids ?: array() );
}
/**
 * Build excerpt for search result.
 *
 * @param int $post_id Post ID.
 * @return string
 */
function mmf_get_search_excerpt( int $post_id ): string {
	$excerpt = get_the_excerpt( $post_id );
	if ( ! empty( $excerpt ) ) {
		return wp_strip_all_tags( $excerpt );
	}
	$content = get_post_field( 'post_content', $post_id );
	return wp_trim_words(
		wp_strip_all_tags( (string) $content ),
		24,
		'...'
	);
}
/**
 * Get taxonomy term labels for a post.
 *
 * @param int    $post_id  Post ID.
 * @param string $taxonomy Taxonomy key.
 * @return array
 */
function mmf_get_post_terms_for_search( int $post_id, string $taxonomy ): array {
	$terms = get_the_terms( $post_id, $taxonomy );
	if ( empty( $terms ) || is_wp_error( $terms ) ) {
		return array();
	}
	return array_map(
		static function ( WP_Term $term ): array {
			return array(
				'id'   => $term->term_id,
				'name' => $term->name,
				'slug' => $term->slug,
				'url'  => get_term_link( $term ) instanceof WP_Error ? '' : get_term_link( $term ),
			);
		},
		$terms
	);
}
/**
 * Search relevant taxonomy terms.
 *
 * @param string $search_term Search string.
 * @param int    $limit       Max results.
 * @return array
 */
function mmf_search_terms( string $search_term, int $limit, ?array $taxonomies = null ): array {
	if ( null === $taxonomies ) {
		$taxonomies = array( 'category', 'post_tag', 'product_cat', 'product_tag' );
	}
	$results    = array();
	foreach ( $taxonomies as $taxonomy ) {
		$terms = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => true,
				'number'     => $limit,
				'search'     => $search_term,
			)
		);
		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			continue;
		}
		foreach ( $terms as $term ) {
			$term_link = get_term_link( $term );
			$results[] = array(
				'id'       => $term->term_id,
				'taxonomy' => $taxonomy,
				'name'     => $term->name,
				'slug'     => $term->slug,
				'url'      => is_wp_error( $term_link ) ? '' : esc_url_raw( $term_link ),
			);
		}
	}
	return $results;
}