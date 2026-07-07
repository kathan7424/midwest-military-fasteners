<?php
/**
 * REST API — Industrial Spec Parts
 *
 * Namespace : spec-parts/v1
 *
 * Endpoints:
 *   GET /wp-json/spec-parts/v1/products
 *       ?search=&sku=&category=&series=&manufacturer=&country=&dfar=1
 *       &per_page=50&page=1
 *
 *   GET /wp-json/spec-parts/v1/products/{id}
 *   GET /wp-json/spec-parts/v1/products/sku/{sku}
 *   GET /wp-json/spec-parts/v1/categories
 *   GET /wp-json/spec-parts/v1/series
 *
 * All standard WC REST product responses are also extended with
 * package_pricing, compliance fields, and spec_file_url.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ============================================================
// REGISTER ROUTES
// ============================================================

add_action( 'rest_api_init', function () {

    $ns = 'spec-parts/v1';

    // Product list
    register_rest_route( $ns, '/products', [
        'methods'             => 'GET',
        'callback'            => 'specparts_api_products',
        'permission_callback' => '__return_true',
        'args'                => [
            'search'       => [ 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ],
            'sku'          => [ 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ],
            'category'     => [ 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ],
            'series'       => [ 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ],
            'manufacturer' => [ 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ],
            'country'      => [ 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ],
            'dfar'         => [ 'sanitize_callback' => 'absint',              'default' => 0  ],
            'per_page'     => [ 'sanitize_callback' => 'absint',              'default' => 50 ],
            'page'         => [ 'sanitize_callback' => 'absint',              'default' => 1  ],
        ],
    ] );

    // Single product by WP post ID
    register_rest_route( $ns, '/products/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => 'specparts_api_product_by_id',
        'permission_callback' => '__return_true',
        'args'                => [
            'id' => [ 'validate_callback' => function ( $v ) { return is_numeric( $v ); } ],
        ],
    ] );

    // Single product by SKU
    register_rest_route( $ns, '/products/sku/(?P<sku>[A-Za-z0-9_\-]+)', [
        'methods'             => 'GET',
        'callback'            => 'specparts_api_product_by_sku',
        'permission_callback' => '__return_true',
    ] );

    // Category tree
    register_rest_route( $ns, '/categories', [
        'methods'             => 'GET',
        'callback'            => 'specparts_api_categories',
        'permission_callback' => '__return_true',
    ] );

    // Series list
    register_rest_route( $ns, '/series', [
        'methods'             => 'GET',
        'callback'            => 'specparts_api_series',
        'permission_callback' => '__return_true',
    ] );
} );

// ============================================================
// EXTEND STANDARD WC REST PRODUCT RESPONSE
// Adds our custom fields to /wp-json/wc/v3/products too.
// ============================================================

add_filter( 'woocommerce_rest_prepare_product_object', function ( $response, $product, $request ) {
    $pid  = $product->get_id();
    $data = $response->get_data();

    $data['pkg_qty']            = specparts_api_pkg_qty( $pid );
    $data['package_pricing']    = parts_catalog_get_product_package_pricing( $pid );
    $data['spec_file_url']      = get_post_meta( $pid, '_spec_file_url', true ) ?: '';
    $data['manufacturer']       = $product->get_attribute( 'pa_manufacturer' ) ?: '';
    $data['country']            = $product->get_attribute( 'pa_country' ) ?: '';
    $data['dfar']               = ! empty( $product->get_attribute( 'pa_specs_standard' ) );
    $data['backorder_leadtime'] = get_post_meta( $pid, '_backorder_leadtime', true ) ?: '';
    $data['reorder_limit']      = (int) get_post_meta( $pid, '_reorder_limit', true );
    $data['mfr_coc']            = (bool) get_post_meta( $pid, '_mfr_coc', true );
    $data['material_certs']     = (bool) get_post_meta( $pid, '_material_certs', true );
    $data['process_certs']      = (bool) get_post_meta( $pid, '_process_certs', true );
    $data['test_reports']       = (bool) get_post_meta( $pid, '_test_reports', true );
    $data['lot_in_use']         = get_post_meta( $pid, '_lot_in_use', true ) ?: '';
    $data['product_series']     = wp_get_post_terms( $pid, 'product_series', [ 'fields' => 'names' ] );

    $response->set_data( $data );
    return $response;
}, 10, 3 );

// ============================================================
// INTERNAL HELPERS
// ============================================================

function specparts_api_pkg_qty( $pid ) {
    $v = get_post_meta( $pid, '_pkg_qty', true );
    return $v !== '' ? intval( $v ) : null;
}

/**
 * Build the full product data array used by all endpoints.
 */
function specparts_api_format_product( $pid ) {
    $product = wc_get_product( $pid );
    if ( ! $product ) return null;

    $image_id  = $product->get_image_id();
    $image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';

    $gallery_ids  = $product->get_gallery_image_ids();
    $gallery_urls = array_values( array_filter( array_map( function ( $gid ) {
        return wp_get_attachment_image_url( $gid, 'medium' ) ?: '';
    }, $gallery_ids ) ) );

    $categories = wp_get_post_terms( $pid, 'product_cat', [ 'fields' => 'all' ] );
    $cat_list   = array_map( function ( $t ) {
        return [ 'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug, 'parent_id' => $t->parent ];
    }, is_array( $categories ) ? $categories : [] );

    $series_terms = wp_get_post_terms( $pid, 'product_series', [ 'fields' => 'all' ] );
    $series_list  = array_map( function ( $t ) {
        return [ 'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug ];
    }, is_array( $series_terms ) ? $series_terms : [] );

    return [
        // WooCommerce standard
        'id'                 => $pid,
        'sku'                => $product->get_sku(),
        'name'               => $product->get_name(),
        'description'        => wp_strip_all_tags( $product->get_description() ),
        'short_description'  => wp_strip_all_tags( $product->get_short_description() ),
        'permalink'          => get_permalink( $pid ),
        'price'              => (float) $product->get_price(),
        'regular_price'      => (float) $product->get_regular_price(),
        'stock_quantity'     => (int) $product->get_stock_quantity(),
        'stock_status'       => $product->get_stock_status(),
        'weight'             => $product->get_weight() ?: '',
        'categories'         => $cat_list,
        'image'              => $image_url,
        'gallery'            => $gallery_urls,

        // WC attributes
        'manufacturer'       => $product->get_attribute( 'pa_manufacturer' ) ?: '',
        'country'            => $product->get_attribute( 'pa_country' ) ?: '',
        'dfar'               => ! empty( $product->get_attribute( 'pa_specs_standard' ) ),

        // Custom taxonomy
        'product_series'     => $series_list,

        // ACF repeater mirror — qty + price + dims + weight per tier
        'package_pricing'    => parts_catalog_get_product_package_pricing( $pid ),
        'pkg_qty'            => specparts_api_pkg_qty( $pid ),

        // Cert / spec download
        'spec_file_url'      => get_post_meta( $pid, '_spec_file_url', true ) ?: '',

        // Compliance flags
        'mfr_coc'            => (bool) get_post_meta( $pid, '_mfr_coc', true ),
        'material_certs'     => (bool) get_post_meta( $pid, '_material_certs', true ),
        'process_certs'      => (bool) get_post_meta( $pid, '_process_certs', true ),
        'test_reports'       => (bool) get_post_meta( $pid, '_test_reports', true ),

        // Operational
        'backorder_leadtime' => get_post_meta( $pid, '_backorder_leadtime', true ) ?: '',
        'reorder_limit'      => (int) get_post_meta( $pid, '_reorder_limit', true ),
        'lot_in_use'         => get_post_meta( $pid, '_lot_in_use', true ) ?: '',
        'cert_location'      => get_post_meta( $pid, '_cert_location', true ) ?: '',
        'piece_weight'       => (float) get_post_meta( $pid, '_piece_weight', true ),
    ];
}

// ============================================================
// GET /products
// ============================================================

function specparts_api_products( WP_REST_Request $request ) {
    $search       = $request->get_param( 'search' );
    $sku_filter   = strtoupper( trim( $request->get_param( 'sku' ) ) );
    $category     = $request->get_param( 'category' );
    $series       = $request->get_param( 'series' );
    $manufacturer = $request->get_param( 'manufacturer' );
    $country      = $request->get_param( 'country' );
    $dfar         = $request->get_param( 'dfar' );
    $per_page     = min( absint( $request->get_param( 'per_page' ) ) ?: 50, 200 );
    $page         = absint( $request->get_param( 'page' ) ) ?: 1;

    $args = [
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => $per_page,
        'paged'          => $page,
        'orderby'        => 'title',
        'order'          => 'ASC',
        'tax_query'      => [ 'relation' => 'AND' ],
    ];

    if ( $search )   $args['s'] = $search;

    if ( $category ) {
        $args['tax_query'][] = [
            'taxonomy' => 'product_cat',
            'field'    => 'slug',
            'terms'    => $category,
        ];
    }
    if ( $series ) {
        $args['tax_query'][] = [
            'taxonomy' => 'product_series',
            'field'    => 'slug',
            'terms'    => $series,
        ];
    }
    if ( $manufacturer ) {
        $args['tax_query'][] = [
            'taxonomy' => 'pa_manufacturer',
            'field'    => 'name',
            'terms'    => $manufacturer,
        ];
    }
    if ( $country ) {
        $args['tax_query'][] = [
            'taxonomy' => 'pa_country',
            'field'    => 'name',
            'terms'    => strtoupper( $country ),
        ];
    }
    if ( $dfar ) {
        $args['tax_query'][] = [
            'taxonomy' => 'pa_specs_standard',
            'field'    => 'name',
            'terms'    => 'DFAR',
        ];
    }
    if ( count( $args['tax_query'] ) === 1 ) unset( $args['tax_query'] );

    // SKU filter — exact match via meta_query
    if ( $sku_filter ) {
        $args['meta_query'] = [ [ 'key' => '_sku', 'value' => $sku_filter, 'compare' => '=' ] ];
    }

    $query    = new WP_Query( $args );
    $products = [];

    while ( $query->have_posts() ) {
        $query->the_post();
        $item = specparts_api_format_product( get_the_ID() );
        if ( $item ) $products[] = $item;
    }
    wp_reset_postdata();

    return new WP_REST_Response( [
        'total'    => (int) $query->found_posts,
        'pages'    => (int) $query->max_num_pages,
        'page'     => $page,
        'per_page' => $per_page,
        'products' => $products,
    ], 200 );
}

// ============================================================
// GET /products/{id}
// ============================================================

function specparts_api_product_by_id( WP_REST_Request $request ) {
    $pid  = (int) $request->get_param( 'id' );
    $data = specparts_api_format_product( $pid );
    if ( ! $data ) {
        return new WP_REST_Response( [ 'error' => 'Product not found.' ], 404 );
    }
    return new WP_REST_Response( $data, 200 );
}

// ============================================================
// GET /products/sku/{sku}
// ============================================================

function specparts_api_product_by_sku( WP_REST_Request $request ) {
    $sku = strtoupper( sanitize_text_field( $request->get_param( 'sku' ) ) );
    $pid = wc_get_product_id_by_sku( $sku );
    if ( ! $pid ) {
        return new WP_REST_Response( [ 'error' => 'Product not found.' ], 404 );
    }
    $data = specparts_api_format_product( $pid );
    if ( ! $data ) {
        return new WP_REST_Response( [ 'error' => 'Product not found.' ], 404 );
    }
    return new WP_REST_Response( $data, 200 );
}

// ============================================================
// GET /categories
// ============================================================

function specparts_api_categories( WP_REST_Request $request ) {
    $terms = get_terms( [
        'taxonomy'   => 'product_cat',
        'hide_empty' => true,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ] );
    if ( is_wp_error( $terms ) ) {
        return new WP_REST_Response( [ 'error' => $terms->get_error_message() ], 500 );
    }

    // Build parent → children tree
    $map     = [];
    $parents = [];
    foreach ( $terms as $t ) {
        $map[ $t->term_id ] = [
            'id'          => $t->term_id,
            'name'        => $t->name,
            'slug'        => $t->slug,
            'count'       => $t->count,
            'parent_id'   => $t->parent,
            'description' => wp_strip_all_tags( (string) $t->description ),
            'children'    => [],
        ];
    }
    foreach ( $terms as $t ) {
        if ( $t->parent && isset( $map[ $t->parent ] ) ) {
            $map[ $t->parent ]['children'][] = &$map[ $t->term_id ];
        } else {
            $parents[] = &$map[ $t->term_id ];
        }
    }
    return new WP_REST_Response( array_values( $parents ), 200 );
}

// ============================================================
// GET /series
// ============================================================

function specparts_api_series( WP_REST_Request $request ) {
    $terms = get_terms( [
        'taxonomy'   => 'product_series',
        'hide_empty' => true,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ] );
    if ( is_wp_error( $terms ) ) {
        return new WP_REST_Response( [ 'error' => $terms->get_error_message() ], 500 );
    }
    $data = array_map( function ( $t ) {
        return [ 'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug, 'count' => $t->count ];
    }, $terms );
    return new WP_REST_Response( $data, 200 );
}
