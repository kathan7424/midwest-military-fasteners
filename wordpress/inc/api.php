<?php
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
			wp_remote_post(
				add_query_arg(
					array( 'secret' => $secret, 'tag' => $tag ),
					trailingslashit( $nextjs_url ) . 'api/revalidate'
				),
				array( 'timeout' => 2, 'blocking' => false )
			);
		}
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

/**
 * Allowed countries + states for checkout dropdowns.
 *
 * Sourced from WooCommerce settings (selling locations) — same data the
 * classic WC checkout renders. Endpoint: GET /custom/v1/checkout/locations
 *
 * @return WP_REST_Response|WP_Error
 */
function mmf_get_checkout_locations() {
	if ( ! function_exists( 'WC' ) || ! WC()->countries ) {
		return new WP_Error( 'wc_unavailable', 'WooCommerce unavailable', array( 'status' => 500 ) );
	}

	$countries_obj = WC()->countries;
	$allowed       = $countries_obj->get_allowed_countries();
	$all_states    = $countries_obj->get_allowed_country_states();

	$countries = array();

	foreach ( $allowed as $code => $name ) {
		$countries[] = array(
			'code' => (string) $code,
			'name' => html_entity_decode( (string) $name ),
		);
	}

	$states = array();

	foreach ( $all_states as $country_code => $country_states ) {
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

		$states[ (string) $country_code ] = $state_list;
	}

	return rest_ensure_response(
		array(
			'default_country' => (string) $countries_obj->get_base_country(),
			'countries'       => $countries,
			'states'          => $states,
		)
	);
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