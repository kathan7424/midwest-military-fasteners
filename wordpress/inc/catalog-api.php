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
 *       Parent product_cat → children → product_series
 *   GET /wp-json/spec-parts/v1/series
 *
 * All standard WC REST product responses are also extended with
 * package_pricing, compliance fields, and spec_file_url.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! function_exists( 'specparts_get_series_taxonomy' ) ) {
    function specparts_get_series_taxonomy() {
        static $taxonomy = null;

        if ( null !== $taxonomy ) {
            return $taxonomy;
        }

        foreach ( [ 'product-series', 'product_series' ] as $candidate ) {
            if ( taxonomy_exists( $candidate ) ) {
                $taxonomy = $candidate;
                return $taxonomy;
            }
        }

        $taxonomy = 'product-series';
        return $taxonomy;
    }
}

if ( ! function_exists( 'specparts_get_all_series_taxonomies' ) ) {
    /**
     * All registered product series taxonomies (import vs live naming).
     *
     * @return string[]
     */
    function specparts_get_all_series_taxonomies() {
        static $taxonomies = null;

        if ( null !== $taxonomies ) {
            return $taxonomies;
        }

        $taxonomies = [];

        foreach ( [ 'product-series', 'product_series' ] as $candidate ) {
            if ( taxonomy_exists( $candidate ) ) {
                $taxonomies[] = $candidate;
            }
        }

        if ( empty( $taxonomies ) ) {
            $taxonomies[] = 'product-series';
        }

        return $taxonomies;
    }
}

if ( ! function_exists( 'specparts_get_post_series_terms' ) ) {
    /**
     * Read product series terms from every registered series taxonomy.
     *
     * @param int $product_id Product post ID.
     * @return WP_Term[]
     */
    function specparts_get_post_series_terms( $product_id ) {
        $product_id = (int) $product_id;
        $terms_map    = [];

        foreach ( specparts_get_all_series_taxonomies() as $taxonomy ) {
            $terms = wp_get_post_terms( $product_id, $taxonomy, [ 'fields' => 'all' ] );

            if ( is_wp_error( $terms ) || empty( $terms ) ) {
                continue;
            }

            foreach ( $terms as $term ) {
                $terms_map[ $term->slug ] = $term;
            }
        }

        return array_values( $terms_map );
    }
}

if ( ! function_exists( 'specparts_get_category_duplicate_term_ids' ) ) {
    /**
     * Imported catalogs may create multiple product_cat terms with the same label.
     *
     * @param WP_Term $term Category term.
     * @return int[]
     */
    function specparts_get_category_duplicate_term_ids( WP_Term $term ) {
        $duplicates = get_terms(
            [
                'taxonomy'   => 'product_cat',
                'hide_empty' => false,
                'name'       => $term->name,
            ]
        );

        if ( is_wp_error( $duplicates ) || empty( $duplicates ) ) {
            return [ (int) $term->term_id ];
        }

        $ids = array_map(
            static function ( $duplicate ) {
                return (int) $duplicate->term_id;
            },
            $duplicates
        );

        return array_values( array_unique( $ids ) );
    }
}

if ( ! function_exists( 'specparts_merge_series_lists' ) ) {
    /**
     * Merge series rows keyed by slug.
     *
     * @param array<int, array{id:int,name:string,slug:string,count:int}> ...$lists Series lists.
     * @return array<int, array{id:int,name:string,slug:string,count:int}>
     */
    function specparts_merge_series_lists( ...$lists ) {
        $merged = [];

        foreach ( $lists as $list ) {
            if ( ! is_array( $list ) ) {
                continue;
            }

            foreach ( $list as $series ) {
                if ( empty( $series['slug'] ) ) {
                    continue;
                }

                $merged[ $series['slug'] ] = $series;
            }
        }

        $series = array_values( $merged );
        usort(
            $series,
            static function ( $a, $b ) {
                return strcasecmp( $a['name'], $b['name'] );
            }
        );

        return $series;
    }
}

// ============================================================
// REGISTER ROUTES
// ============================================================

/**
 * Cap edge/CDN caching for catalog API responses. Without this Pantheon's
 * Varnish caches anonymous REST responses for a week (max-age=604800), so
 * catalog changes never reach the headless frontend.
 */
add_filter( 'rest_post_dispatch', function ( $response, $server, $request ) {
    if ( $response instanceof WP_REST_Response
        && 0 === strpos( (string) $request->get_route(), '/spec-parts/v1/' ) ) {
        $response->header( 'Cache-Control', 'public, max-age=300, s-maxage=300' );
    }

    return $response;
}, 10, 3 );

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
            'slug'         => [ 'sanitize_callback' => 'sanitize_title',      'default' => '' ],
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

    // Single product by WooCommerce post slug (post_name)
    register_rest_route( $ns, '/products/slug/(?P<slug>[a-zA-Z0-9][a-zA-Z0-9\-_.]*)', [
        'methods'             => 'GET',
        'callback'            => 'specparts_api_product_by_slug',
        'permission_callback' => '__return_true',
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

    // Single category by slug (hero image + description)
    register_rest_route( $ns, '/categories/slug/(?P<slug>[a-zA-Z0-9][a-zA-Z0-9\-_]*)', [
        'methods'             => 'GET',
        'callback'            => 'specparts_api_category_by_slug',
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
    $data['spec_file_url']         = specparts_get_product_spec_url( $pid );
    $data['spec_files']            = specparts_get_product_spec_files( $pid );
    $data['certificate_file_url']  = get_post_meta( $pid, '_certificate_file_url', true ) ?: '';
    $data['manufacturer']       = $product->get_attribute( 'pa_manufacturer' ) ?: '';
    $data['country']            = $product->get_attribute( 'pa_country' ) ?: '';
    $data['dfar']               = ! empty( $product->get_attribute( 'pa_specs_standard' ) );
    $data['backorder_leadtime'] = get_post_meta( $pid, '_backorder_leadtime', true ) ?: '';
    $data['mfr_coc']            = (bool) get_post_meta( $pid, '_mfr_coc', true );
    $data['material_certs']     = (bool) get_post_meta( $pid, '_material_certs', true );
    $data['process_certs']      = (bool) get_post_meta( $pid, '_process_certs', true );
    $data['test_reports']       = (bool) get_post_meta( $pid, '_test_reports', true );
    $data['product_series']     = wp_get_post_terms( $pid, specparts_get_series_taxonomy(), [ 'fields' => 'names' ] );

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
 * Cached list of all product series terms.
 *
 * @return WP_Term[]
 */
function specparts_get_all_series_terms() {
    static $terms = null;

    if ( null !== $terms ) {
        return $terms;
    }

    $terms_map = [];

    foreach ( specparts_get_all_series_taxonomies() as $taxonomy ) {
        $taxonomy_terms = get_terms(
            [
                'taxonomy'   => $taxonomy,
                'hide_empty' => false,
                'orderby'    => 'name',
                'order'      => 'ASC',
            ]
        );

        if ( is_wp_error( $taxonomy_terms ) || empty( $taxonomy_terms ) ) {
            continue;
        }

        foreach ( $taxonomy_terms as $term ) {
            $terms_map[ $term->slug ] = $term;
        }
    }

    $terms = array_values( $terms_map );
    usort(
        $terms,
        static function ( $a, $b ) {
            return strcasecmp( $a->name, $b->name );
        }
    );

    return $terms;
}

/**
 * Infer a product series term from SKU / name when taxonomy is not assigned.
 *
 * @param int        $product_id   Product post ID.
 * @param WP_Term[]|null $series_terms Optional preloaded series terms.
 * @return WP_Term|null
 */
function specparts_infer_series_term_for_product( $product_id, $series_terms = null ) {
    $assigned_terms = specparts_get_post_series_terms( $product_id );

    if ( ! empty( $assigned_terms ) ) {
        return $assigned_terms[0];
    }

    $product = wc_get_product( $product_id );
    if ( ! $product ) {
        return null;
    }

    $haystack = strtoupper(
        preg_replace(
            '/\s+/',
            '',
            $product->get_sku() . ' ' . $product->get_name()
        )
    );

    if ( '' === $haystack ) {
        return null;
    }

    if ( null === $series_terms ) {
        $series_terms = specparts_get_all_series_terms();
    }

    $best_term = null;
    $best_len  = 0;

    foreach ( $series_terms as $term ) {
        $candidates = array_unique(
            array_filter(
                [
                    strtoupper( preg_replace( '/[\s\-]+/', '', $term->name ) ),
                    strtoupper( str_replace( '-', '', $term->slug ) ),
                ]
            )
        );

        $name_parts = preg_split( '/[\s\-]+/', strtoupper( $term->name ) );
        if ( ! empty( $name_parts[0] ) ) {
            $candidates[] = $name_parts[0];
        }

        foreach ( $candidates as $needle ) {
            if ( strlen( $needle ) < 3 ) {
                continue;
            }

            if ( 0 === strpos( $haystack, $needle ) && strlen( $needle ) > $best_len ) {
                $best_term = $term;
                $best_len  = strlen( $needle );
            }
        }
    }

    return $best_term;
}

/**
 * Assign inferred product series taxonomy to a product when missing.
 *
 * @param int $product_id Product post ID.
 * @return bool True when a series term was assigned.
 */
function specparts_assign_inferred_series_to_product( $product_id ) {
    $term = specparts_infer_series_term_for_product( $product_id );
    if ( ! $term ) {
        return false;
    }

    $assigned = wp_get_post_terms( $product_id, specparts_get_series_taxonomy(), [ 'fields' => 'ids' ] );
    if ( ! is_wp_error( $assigned ) && ! empty( $assigned ) ) {
        return false;
    }

    wp_set_object_terms( $product_id, (int) $term->term_id, specparts_get_series_taxonomy() );
    return true;
}

/**
 * Infer series terms used by products in a child category.
 *
 * @param WP_Term $category_term Child product category term.
 * @return array<int, array{id:int,name:string,slug:string,count:int}>
 */
function specparts_infer_series_for_category_term( $category_term ) {
    // Published only — the sidebar must match what product listings can show.
    $product_ids = specparts_get_product_ids_for_category_term( (int) $category_term->term_id );

    if ( empty( $product_ids ) ) {
        return [];
    }

    $series_terms = specparts_get_all_series_terms();
    $series_map   = [];

    foreach ( $product_ids as $product_id ) {
        $term = specparts_infer_series_term_for_product( (int) $product_id, $series_terms );
        if ( ! $term ) {
            continue;
        }

        if ( ! isset( $series_map[ $term->slug ] ) ) {
            $series_map[ $term->slug ] = [
                'id'    => (int) $term->term_id,
                'name'  => $term->name,
                'slug'  => $term->slug,
                'count' => 0,
            ];
        }

        $series_map[ $term->slug ]['count']++;
    }

    if ( empty( $series_map ) ) {
        return [];
    }

    $series = array_values( $series_map );
    usort(
        $series,
        static function ( $a, $b ) {
            return strcasecmp( $a['name'], $b['name'] );
        }
    );

    return $series;
}

/**
 * Fetch published product IDs assigned to a product_cat term.
 *
 * @param int $term_id Product category term ID.
 * @return int[]
 */
function specparts_get_product_ids_for_category_term( $term_id, $post_status = 'publish' ) {
    $term_id = (int) $term_id;

    if ( $term_id <= 0 ) {
        return [];
    }

    $term = get_term( $term_id, 'product_cat' );

    if ( ! $term || is_wp_error( $term ) ) {
        return [];
    }

    $term_ids = specparts_get_category_duplicate_term_ids( $term );

    $query = new WP_Query(
        [
            'post_type'              => 'product',
            'post_status'            => $post_status,
            'posts_per_page'         => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
            'tax_query'              => [
                [
                    'taxonomy' => 'product_cat',
                    'field'    => 'term_id',
                    'terms'    => $term_ids,
                    'operator' => 'IN',
                ],
            ],
        ]
    );

    if ( ! is_array( $query->posts ) ) {
        return [];
    }

    return array_values( array_map( 'intval', $query->posts ) );
}

/**
 * Resolve which canonical sidebar parent a child category belongs under.
 *
 * @param WP_Term           $term            Child product category term.
 * @param array<int,string> $parent_term_map WP parent term ID => canonical key.
 * @return string Canonical key: screws|nuts|washers.
 */
function specparts_resolve_canonical_parent_key_for_child( WP_Term $term, array $parent_term_map ) {
    $inferred_key  = specparts_infer_canonical_parent_key_from_child( $term->name );
    $wp_parent_key = $parent_term_map[ (int) $term->parent ] ?? '';

    // Imported data often hangs washers/nuts child terms under Screws.
    if ( in_array( $inferred_key, [ 'nuts', 'washers' ], true ) ) {
        return $inferred_key;
    }

    if ( $wp_parent_key !== '' ) {
        return $wp_parent_key;
    }

    return $inferred_key;
}

/**
 * Build the full product data array used by all endpoints.
 */
function specparts_api_format_product( $pid ) {
    $pid = (int) $pid;
    if ( $pid <= 0 ) {
        return null;
    }

    $product = wc_get_product( $pid );
    if ( ! $product || ! $product->exists() ) {
        return null;
    }

    $image_id  = $product->get_image_id();
    $image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';

    if ( ! $image_url && function_exists( 'wc_placeholder_img_src' ) ) {
        $image_url = wc_placeholder_img_src();
    }

    $gallery_ids  = $product->get_gallery_image_ids();
    $gallery_urls = array_values( array_filter( array_map( function ( $gid ) {
        return wp_get_attachment_image_url( $gid, 'medium' ) ?: '';
    }, $gallery_ids ) ) );

    $categories = wp_get_post_terms( $pid, 'product_cat', [ 'fields' => 'all' ] );
    if ( is_wp_error( $categories ) || ! is_array( $categories ) ) {
        $categories = [];
    }

    $cat_list = array_map( function ( $t ) {
        $parent_slug = '';

        if ( $t->parent ) {
            $parent_term = get_term( (int) $t->parent, 'product_cat' );

            if ( $parent_term && ! is_wp_error( $parent_term ) ) {
                $parent_slug = $parent_term->slug;
            }
        }

        return [
            'id'          => $t->term_id,
            'name'        => $t->name,
            'slug'        => $t->slug,
            'parent_id'   => $t->parent,
            'parent_slug' => $parent_slug,
        ];
    }, $categories );

    $series_terms = specparts_get_post_series_terms( $pid );

    $series_list = array_map( function ( $t ) {
        return [ 'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug ];
    }, $series_terms );

    $slug = '';
    if ( is_callable( [ $product, 'get_slug' ] ) ) {
        $slug = (string) $product->get_slug();
    }
    if ( $slug === '' ) {
        $slug = (string) get_post_field( 'post_name', $pid );
    }

    $package_pricing = [];
    if ( function_exists( 'parts_catalog_get_product_package_pricing' ) ) {
        $package_pricing = parts_catalog_get_product_package_pricing( $pid );
    }
    if ( ! is_array( $package_pricing ) ) {
        $package_pricing = [];
    }

    return [
        // WooCommerce standard
        'id'                 => $pid,
        'slug'               => sanitize_title( $slug ),
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

        // ACF repeater mirror — qty + price tiers
        'package_pricing'    => $package_pricing,
        'pkg_qty'            => specparts_api_pkg_qty( $pid ),

        // Product documents
        'spec_file_url'        => specparts_get_product_spec_url( $pid ),
        'spec_files'           => specparts_get_product_spec_files( $pid ),
        'certificate_file_url' => get_post_meta( $pid, '_certificate_file_url', true ) ?: '',

        // Compliance flags
        'mfr_coc'            => (bool) get_post_meta( $pid, '_mfr_coc', true ),
        'material_certs'     => (bool) get_post_meta( $pid, '_material_certs', true ),
        'process_certs'      => (bool) get_post_meta( $pid, '_process_certs', true ),
        'test_reports'       => (bool) get_post_meta( $pid, '_test_reports', true ),

        // Operational (internal-only meta such as _lot_in_use, _cert_location,
        // and _reorder_limit is deliberately excluded from this public payload).
        'backorder_leadtime' => get_post_meta( $pid, '_backorder_leadtime', true ) ?: '',
        'piece_weight'       => (float) get_post_meta( $pid, '_piece_weight', true ),
    ];
}

// ============================================================
// GET /products
// ============================================================

/**
 * Search products by title, excerpt, content, or SKU substring.
 *
 * @param string   $where   SQL WHERE clause.
 * @param WP_Query $query   Current query.
 * @return string
 */
function specparts_products_search_where( $where, $query ) {
    if ( ! $query instanceof WP_Query ) {
        return $where;
    }

    $search = $query->get( '_specparts_product_search' );

    if ( ! is_string( $search ) ) {
        return $where;
    }

    $search = trim( $search );

    if ( '' === $search ) {
        return $where;
    }

    remove_filter( 'posts_where', 'specparts_products_search_where', 10 );

    global $wpdb;

    $like = '%' . $wpdb->esc_like( $search ) . '%';

    $where .= $wpdb->prepare(
        " AND (
            {$wpdb->posts}.post_title LIKE %s
            OR {$wpdb->posts}.post_excerpt LIKE %s
            OR {$wpdb->posts}.post_content LIKE %s
            OR EXISTS (
                SELECT 1 FROM {$wpdb->postmeta} pm
                WHERE pm.post_id = {$wpdb->posts}.ID
                  AND pm.meta_key = '_sku'
                  AND pm.meta_value LIKE %s
            )
        )",
        $like,
        $like,
        $like,
        $like
    );

    return $where;
}

/**
 * Query published product IDs via WP_Query (reliable with custom taxonomies).
 *
 * @param array<string, mixed> $filters Query filters.
 * @return array{ids:int[],total:int,pages:int}
 */
function specparts_query_product_ids( array $filters ) {
    $per_page = min( max( 1, (int) ( $filters['per_page'] ?? 50 ) ), 200 );
    $page     = max( 1, (int) ( $filters['page'] ?? 1 ) );

    $query_args = [
        'post_type'              => 'product',
        'post_status'            => 'publish',
        'posts_per_page'         => $per_page,
        'paged'                  => $page,
        'orderby'                => 'title',
        'order'                  => 'ASC',
        'fields'                 => 'ids',
        'no_found_rows'          => false,
        'update_post_meta_cache' => false,
        'update_post_term_cache' => false,
    ];

    if ( ! empty( $filters['slug'] ) ) {
        $query_args['name'] = sanitize_title( (string) $filters['slug'] );
    }

    if ( ! empty( $filters['sku'] ) ) {
        $query_args['meta_query'] = [
            [
                'key'     => '_sku',
                'value'   => strtoupper( trim( (string) $filters['sku'] ) ),
                'compare' => '=',
            ],
        ];
    }

    $tax_query = [];

    if ( ! empty( $filters['category'] ) ) {
        $category_slug = sanitize_title( (string) $filters['category'] );
        $category_term = get_term_by( 'slug', $category_slug, 'product_cat' );

        // Imported catalogs create duplicate same-name terms (e.g. two "FLAT
        // WASHERS"); match them all so listings agree with sidebar counts.
        if ( $category_term && ! is_wp_error( $category_term ) ) {
            $tax_query[] = [
                'taxonomy' => 'product_cat',
                'field'    => 'term_id',
                'terms'    => specparts_get_category_duplicate_term_ids( $category_term ),
            ];
        } else {
            $tax_query[] = [
                'taxonomy' => 'product_cat',
                'field'    => 'slug',
                'terms'    => [ $category_slug ],
            ];
        }
    }

    if ( ! empty( $filters['series'] ) ) {
        $series_slug      = sanitize_title( (string) $filters['series'] );
        $series_taxonomies = specparts_get_all_series_taxonomies();
        $series_clauses    = [];

        foreach ( $series_taxonomies as $series_taxonomy ) {
            $series_clauses[] = [
                'taxonomy' => $series_taxonomy,
                'field'    => 'slug',
                'terms'    => [ $series_slug ],
            ];
        }

        if ( count( $series_clauses ) > 1 ) {
            $series_clauses['relation'] = 'OR';
        }

        if ( ! empty( $series_clauses ) ) {
            $tax_query[] = $series_clauses;
        }
    }

    if ( ! empty( $filters['manufacturer'] ) ) {
        $tax_query[] = [
            'taxonomy' => 'pa_manufacturer',
            'field'    => 'name',
            'terms'    => [ sanitize_text_field( (string) $filters['manufacturer'] ) ],
        ];
    }

    if ( ! empty( $filters['country'] ) ) {
        $tax_query[] = [
            'taxonomy' => 'pa_country',
            'field'    => 'name',
            'terms'    => [ strtoupper( sanitize_text_field( (string) $filters['country'] ) ) ],
        ];
    }

    if ( ! empty( $filters['dfar'] ) ) {
        $tax_query[] = [
            'taxonomy' => 'pa_specs_standard',
            'field'    => 'name',
            'terms'    => [ 'DFAR' ],
        ];
    }

    if ( count( $tax_query ) > 1 ) {
        $tax_query['relation'] = 'AND';
    }

    if ( ! empty( $tax_query ) ) {
        $query_args['tax_query'] = $tax_query;
    }

    $search = trim( (string) ( $filters['search'] ?? '' ) );

    if ( $search !== '' ) {
        $query_args['_specparts_product_search'] = $search;
        add_filter( 'posts_where', 'specparts_products_search_where', 10, 2 );
    }

    try {
        $query = new WP_Query( $query_args );
    } finally {
        remove_filter( 'posts_where', 'specparts_products_search_where', 10 );
    }

    $ids = is_array( $query->posts ) ? array_map( 'intval', $query->posts ) : [];

    return [
        'ids'    => $ids,
        'total'  => (int) $query->found_posts,
        'pages'  => max( 1, (int) $query->max_num_pages ),
    ];
}

function specparts_api_products( WP_REST_Request $request ) {
    try {
        return specparts_api_products_query( $request );
    } catch ( Throwable $e ) {
        return new WP_REST_Response(
            [
                'error'   => 'Product query failed.',
                'message' => $e->getMessage(),
            ],
            500
        );
    }
}

function specparts_api_products_query( WP_REST_Request $request ) {
    if ( ! function_exists( 'wc_get_product' ) ) {
        return new WP_REST_Response( [ 'error' => 'WooCommerce is not available.' ], 500 );
    }

    $search       = trim( (string) $request->get_param( 'search' ) );
    $sku_filter   = strtoupper( trim( (string) $request->get_param( 'sku' ) ) );
    $slug_filter  = sanitize_title( trim( (string) $request->get_param( 'slug' ) ) );
    $category     = sanitize_title( trim( (string) $request->get_param( 'category' ) ) );
    $series       = sanitize_title( trim( (string) $request->get_param( 'series' ) ) );
    $manufacturer = sanitize_text_field( (string) $request->get_param( 'manufacturer' ) );
    $country      = sanitize_text_field( (string) $request->get_param( 'country' ) );
    $dfar         = (bool) absint( $request->get_param( 'dfar' ) );
    $per_page     = min( absint( $request->get_param( 'per_page' ) ) ?: 50, 200 );
    $page         = max( 1, absint( $request->get_param( 'page' ) ) ?: 1 );

    $filters = [
        'search'       => $search,
        'sku'          => $sku_filter,
        'slug'         => $slug_filter,
        'category'     => $category,
        'series'       => $series,
        'manufacturer' => $manufacturer,
        'country'      => $country,
        'dfar'         => $dfar,
        'per_page'     => $per_page,
        'page'         => $page,
    ];

    $query_result = specparts_query_product_ids( $filters );

    // Imported data sometimes files a series' products under a different
    // category than the sidebar suggests. If the strict category+series
    // intersection is empty, fall back to the series alone so the shopper
    // still sees the parts they clicked.
    if ( empty( $query_result['ids'] ) && $category !== '' && $series !== '' ) {
        $filters['category'] = '';
        $query_result        = specparts_query_product_ids( $filters );
    }

    $product_ids = $query_result['ids'];
    $total         = $query_result['total'];
    $pages         = $query_result['pages'];

    $products = [];

    foreach ( $product_ids as $product_id ) {
        $item = specparts_api_format_product( (int) $product_id );

        if ( $item ) {
            $products[] = $item;
        }
    }

    return new WP_REST_Response(
        [
            'total'    => $total,
            'pages'    => $pages,
            'page'     => $page,
            'per_page' => $per_page,
            'products' => $products,
        ],
        200
    );
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
// GET /products/slug/{slug}
// ============================================================

function specparts_api_product_by_slug( WP_REST_Request $request ) {
    $slug = sanitize_title( (string) $request->get_param( 'slug' ) );

    if ( $slug === '' ) {
        return new WP_REST_Response( [ 'error' => 'Invalid product slug.' ], 400 );
    }

    $posts = get_posts(
        [
            'post_type'      => 'product',
            'name'           => $slug,
            'posts_per_page' => 1,
            'post_status'    => 'publish',
            'fields'         => 'ids',
        ]
    );

    if ( empty( $posts ) ) {
        return new WP_REST_Response( [ 'error' => 'Product not found.' ], 404 );
    }

    $data = specparts_api_format_product( (int) $posts[0] );

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

/**
 * Get product series directly assigned to products in a child product_cat term.
 *
 * Uses WordPress taxonomy functions rather than raw SQL so the result is always
 * correct regardless of whether the series taxonomy is registered as
 * 'product-series' or 'product_series'.
 *
 * @param WP_Term $category_term Child product category term.
 * @return array<int, array{id:int,name:string,slug:string,count:int}>
 */
function specparts_get_direct_series_for_category_term( $category_term ) {
    // Published only — the sidebar must match what product listings can show.
    $product_ids = specparts_get_product_ids_for_category_term( (int) $category_term->term_id );

    if ( empty( $product_ids ) ) {
        return [];
    }

    $series_map = [];

    foreach ( $product_ids as $product_id ) {
        foreach ( specparts_get_post_series_terms( (int) $product_id ) as $term ) {
            if ( ! isset( $series_map[ $term->slug ] ) ) {
                $series_map[ $term->slug ] = [
                    'id'    => (int) $term->term_id,
                    'name'  => $term->name,
                    'slug'  => $term->slug,
                    'count' => (int) $term->count,
                ];
            }
        }
    }

    if ( empty( $series_map ) ) {
        return [];
    }

    return specparts_merge_series_lists( array_values( $series_map ) );
}

/**
 * Get product series assigned to products in a child product_cat term.
 *
 * @param WP_Term $category_term Child product category term.
 * @return array<int, array{id:int,name:string,slug:string,count:int}>
 */
function specparts_get_series_for_category_term( $category_term ) {
    if ( empty( $category_term->parent ) ) {
        return [];
    }

    // Prefer direct taxonomy reads — most reliable for manually assigned series.
    $direct = specparts_get_direct_series_for_category_term( $category_term );
    if ( ! empty( $direct ) ) {
        return $direct;
    }

    global $wpdb;

    $taxonomy = specparts_get_series_taxonomy();
    $rows     = [];

    foreach ( specparts_get_category_duplicate_term_ids( $category_term ) as $term_id ) {
        $duplicate_term = get_term( (int) $term_id, 'product_cat' );

        if ( ! $duplicate_term || is_wp_error( $duplicate_term ) ) {
            continue;
        }

        $term_rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT DISTINCT t.term_id, t.name, t.slug, tt.count
                FROM {$wpdb->terms} t
                INNER JOIN {$wpdb->term_taxonomy} tt ON t.term_id = tt.term_id
                INNER JOIN {$wpdb->term_relationships} tr_series ON tt.term_taxonomy_id = tr_series.term_taxonomy_id
                INNER JOIN {$wpdb->term_relationships} tr_cat ON tr_series.object_id = tr_cat.object_id
                INNER JOIN {$wpdb->posts} p ON tr_series.object_id = p.ID
                WHERE tt.taxonomy = %s
                  AND tr_cat.term_taxonomy_id = %d
                  AND p.post_type = 'product'
                  AND p.post_status = 'publish'
                ORDER BY t.name ASC",
                $taxonomy,
                (int) $duplicate_term->term_taxonomy_id
            )
        );

        if ( ! empty( $term_rows ) ) {
            $rows = array_merge( $rows, $term_rows );
        }
    }

    if ( ! empty( $rows ) ) {
        $series = [];
        foreach ( $rows as $row ) {
            $series[] = [
                'id'    => (int) $row->term_id,
                'name'  => $row->name,
                'slug'  => $row->slug,
                'count' => (int) $row->count,
            ];
        }
        return specparts_merge_series_lists( $series );
    }

    // Last resort: infer series from SKU / product name prefix matching.
    return specparts_infer_series_for_category_term( $category_term );
}

/**
 * Build a map of child product_cat term_id => unique product series terms.
 *
 * @return array<int, array<string, array{id:int,name:string,slug:string,count:int}>>
 */
function specparts_get_child_category_series_map() {
    static $cache = null;

    if ( null !== $cache ) {
        return $cache;
    }

    $cache = [];
    $terms = get_terms(
        [
            'taxonomy'   => 'product_cat',
            'hide_empty' => false,
            'orderby'    => 'name',
            'order'      => 'ASC',
        ]
    );

    if ( is_wp_error( $terms ) ) {
        return $cache;
    }

    foreach ( $terms as $term ) {
        if ( empty( $term->parent ) ) {
            continue;
        }

        $series_list = specparts_get_series_for_category_term( $term );
        if ( empty( $series_list ) ) {
            continue;
        }

        $cache[ $term->term_id ] = [];
        foreach ( $series_list as $series ) {
            $cache[ $term->term_id ][ $series['slug'] ] = $series;
        }
    }

    foreach ( $cache as &$series_list ) {
        $series_list = array_values( $series_list );
    }
    unset( $series_list );

    return $cache;
}

function specparts_get_product_cat_image_url( $term_id ) {
    $thumbnail_id = (int) get_term_meta( (int) $term_id, 'thumbnail_id', true );
    if ( $thumbnail_id <= 0 ) {
        return '';
    }

    $url = wp_get_attachment_image_url( $thumbnail_id, 'full' );
    if ( ! $url ) {
        $url = wp_get_attachment_url( $thumbnail_id );
    }

    return specparts_normalize_media_url( $url );
}

/**
 * Ensure media URLs are absolute for the headless frontend.
 *
 * @param string $url Media URL.
 * @return string
 */
function specparts_normalize_media_url( $url ) {
    $url = trim( (string) $url );

    if ( $url === '' ) {
        return '';
    }

    if ( preg_match( '#^https?://#i', $url ) ) {
        return esc_url_raw( $url );
    }

    if ( strpos( $url, '//' ) === 0 ) {
        return esc_url_raw( 'https:' . $url );
    }

    if ( strpos( $url, '/' ) === 0 ) {
        return esc_url_raw( home_url( $url ) );
    }

    return esc_url_raw( $url );
}

/**
 * Sanitize WooCommerce category description HTML for API output.
 *
 * @param string $description Raw term description.
 * @return string
 */
function specparts_format_category_description( $description ) {
    return wp_kses_post( (string) $description );
}

/**
 * Resolve category hero description/image, including duplicate-name siblings.
 *
 * Imported catalogs sometimes create multiple product_cat terms with the same
 * label (e.g. flat-washers-screws vs flat-washers-screws-2). Editors may update
 * description/thumbnail on one slug while the storefront links to another.
 *
 * @param WP_Term $term Category term.
 * @return array{description:string,image:string}
 */
function specparts_get_category_hero_meta( WP_Term $term ) {
    $description = specparts_format_category_description( $term->description );
    $image       = specparts_get_product_cat_image_url( (int) $term->term_id );

    if ( $description !== '' && $image !== '' ) {
        return [
            'description' => $description,
            'image'       => $image,
        ];
    }

    $duplicates = get_terms(
        [
            'taxonomy'   => 'product_cat',
            'hide_empty' => false,
            'name'       => $term->name,
        ]
    );

    if ( is_wp_error( $duplicates ) || empty( $duplicates ) ) {
        return [
            'description' => $description,
            'image'       => $image,
        ];
    }

    foreach ( $duplicates as $duplicate ) {
        if ( (int) $duplicate->term_id === (int) $term->term_id ) {
            continue;
        }

        if ( $description === '' ) {
            $description = specparts_format_category_description( $duplicate->description );
        }

        if ( $image === '' ) {
            $image = specparts_get_product_cat_image_url( (int) $duplicate->term_id );
        }

        if ( $description !== '' && $image !== '' ) {
            break;
        }
    }

    return [
        'description' => $description,
        'image'       => $image,
    ];
}

/**
 * Format a product_cat term for REST output.
 *
 * @param WP_Term $term Category term.
 * @return array<string, mixed>
 */
function specparts_format_category_term( WP_Term $term ) {
    $hero = specparts_get_category_hero_meta( $term );

    return [
        'id'          => (int) $term->term_id,
        'name'        => $term->name,
        'slug'        => $term->slug,
        'count'       => (int) $term->count,
        'parent_id'   => (int) $term->parent,
        'description' => $hero['description'],
        'image'       => $hero['image'],
        'children'    => [],
        'series'      => specparts_get_series_for_category_term( $term ),
    ];
}

function specparts_prepare_sidebar_category_node( $node ) {
    if ( ! empty( $node['children'] ) ) {
        $node['children'] = array_values(
            array_map( 'specparts_prepare_sidebar_category_node', $node['children'] )
        );
    }

    return $node;
}

/**
 * @deprecated Sidebar uses specparts_prepare_sidebar_category_node to keep empty categories.
 */
function specparts_prune_category_tree( $node ) {
    return specparts_prepare_sidebar_category_node( $node );
}

/**
 * Map top-level product_cat term IDs to canonical sidebar parent keys.
 *
 * @param WP_Term[] $terms Product category terms.
 * @return array<int, string>
 */
function specparts_get_canonical_parent_term_map( $terms ) {
    $map = [];

    foreach ( $terms as $term ) {
        if ( 0 !== (int) $term->parent || 'uncategorized' === $term->slug ) {
            continue;
        }

        $parent_key = specparts_match_canonical_parent_key( $term->name, $term->slug );
        if ( $parent_key ) {
            $map[ (int) $term->term_id ] = $parent_key;
        }
    }

    return $map;
}

/**
 * Canonical sidebar parent groups.
 *
 * @return array<string, array{name:string,slug:string}>
 */
function specparts_get_canonical_parent_blueprint() {
    return [
        'screws'  => [
            'name' => 'Screws',
            'slug' => 'screws',
        ],
        'nuts'    => [
            'name' => 'Nuts',
            'slug' => 'nuts',
        ],
        'washers' => [
            'name' => 'Washers',
            'slug' => 'washers',
        ],
    ];
}

/**
 * Infer which canonical parent a child category belongs to.
 *
 * @param string $child_name Child category label.
 * @return string Canonical key: screws|nuts|washers.
 */
function specparts_infer_canonical_parent_key_from_child( $child_name ) {
    $name = strtoupper( trim( (string) $child_name ) );

    if ( false !== strpos( $name, 'WASHER' ) ) {
        return 'washers';
    }

    if ( false !== strpos( $name, 'NUT' ) ) {
        return 'nuts';
    }

    return 'screws';
}

/**
 * Match a top-level WP category term to a canonical parent key.
 *
 * @param string $name Category name.
 * @param string $slug Category slug.
 * @return string Canonical key or empty string.
 */
function specparts_match_canonical_parent_key( $name, $slug = '' ) {
    $name = strtoupper( trim( (string) $name ) );
    $slug = strtolower( trim( (string) $slug ) );

    if ( 'washers' === $slug || false !== strpos( $name, 'WASHER' ) ) {
        return 'washers';
    }

    if ( 'nuts' === $slug || false !== strpos( $name, 'NUT' ) ) {
        return 'nuts';
    }

    if ( 'screws' === $slug || false !== strpos( $name, 'SCREW' ) ) {
        return 'screws';
    }

    return '';
}

/**
 * Rebuild parent → child tree under Screws / Nuts / Washers even when
 * WooCommerce terms were imported under the wrong parent.
 *
 * @param WP_Term[] $terms All product_cat terms.
 * @return array<int, array<string, mixed>>
 */
function specparts_build_normalized_category_tree( $terms ) {
    $blueprint         = specparts_get_canonical_parent_blueprint();
    $parent_term_map   = specparts_get_canonical_parent_term_map( $terms );
    $series_map        = specparts_get_child_category_series_map();
    $tree              = [];

    foreach ( $blueprint as $key => $meta ) {
        $tree[ $key ] = [
            'id'          => 0,
            'name'        => $meta['name'],
            'slug'        => $meta['slug'],
            'count'       => 0,
            'parent_id'   => 0,
            'description' => '',
            'image'       => '',
            'children'    => [],
            'series'      => [],
        ];
    }

    foreach ( $terms as $term ) {
        if ( 'uncategorized' === $term->slug ) {
            continue;
        }

        if ( 0 === (int) $term->parent ) {
            $parent_key = specparts_match_canonical_parent_key( $term->name, $term->slug );
            if ( $parent_key && isset( $tree[ $parent_key ] ) ) {
                $hero                               = specparts_get_category_hero_meta( $term );
                $tree[ $parent_key ]['id']          = (int) $term->term_id;
                $tree[ $parent_key ]['name']        = $term->name;
                $tree[ $parent_key ]['slug']        = $term->slug;
                $tree[ $parent_key ]['count']       = (int) $term->count;
                $tree[ $parent_key ]['description'] = $hero['description'];
                $tree[ $parent_key ]['image']       = $hero['image'];
            }
            continue;
        }

        $parent_key = specparts_resolve_canonical_parent_key_for_child( $term, $parent_term_map );

        if ( ! isset( $tree[ $parent_key ] ) ) {
            continue;
        }

        $hero   = specparts_get_category_hero_meta( $term );
        $series = $series_map[ (int) $term->term_id ] ?? specparts_get_series_for_category_term( $term );
        $key    = strtolower( trim( (string) $term->name ) );

        if ( isset( $tree[ $parent_key ]['children'][ $key ] ) ) {
            $existing = $tree[ $parent_key ]['children'][ $key ];

            $tree[ $parent_key ]['children'][ $key ] = [
                'id'          => $existing['count'] >= (int) $term->count ? $existing['id'] : (int) $term->term_id,
                'name'        => $term->name,
                'slug'        => $existing['count'] >= (int) $term->count ? $existing['slug'] : $term->slug,
                'count'       => max( (int) $existing['count'], (int) $term->count ),
                'parent_id'   => (int) $term->parent,
                'description' => $hero['description'] !== '' ? $hero['description'] : $existing['description'],
                'image'       => $hero['image'] !== '' ? $hero['image'] : $existing['image'],
                'children'    => [],
                'series'      => specparts_merge_series_lists( $existing['series'] ?? [], $series ),
            ];
            continue;
        }

        $tree[ $parent_key ]['children'][ $key ] = [
            'id'          => (int) $term->term_id,
            'name'        => $term->name,
            'slug'        => $term->slug,
            'count'       => (int) $term->count,
            'parent_id'   => (int) $term->parent,
            'description' => $hero['description'],
            'image'       => $hero['image'],
            'children'    => [],
            'series'      => $series,
        ];
    }

    $parents = [];
    foreach ( array_keys( $blueprint ) as $key ) {
        if ( ! isset( $tree[ $key ] ) ) {
            continue;
        }

        $children = array_values( $tree[ $key ]['children'] ?? [] );
        usort(
            $children,
            static function ( $a, $b ) {
                return strcasecmp( $a['name'], $b['name'] );
            }
        );

        $tree[ $key ]['children'] = $children;
        $tree[ $key ]['count']    = array_sum(
            array_map(
                static function ( $child ) {
                    return (int) $child['count'];
                },
                $children
            )
        );

        $parent = specparts_prepare_sidebar_category_node( $tree[ $key ] );

        // Always expose Screws / Nuts / Washers sections for the sidebar.
        $parents[] = $parent;
    }

    return $parents;
}

/**
 * Move child product categories under the correct Screws / Nuts / Washers parent.
 *
 * @return array{success:bool,message:string}
 */
function specparts_repair_category_hierarchy() {
    $blueprint  = specparts_get_canonical_parent_blueprint();
    $parent_ids = [];

    foreach ( $blueprint as $key => $meta ) {
        $parent_ids[ $key ] = specparts_ensure_product_category( $meta['name'], 0 );
    }

    $terms = get_terms(
        [
            'taxonomy'   => 'product_cat',
            'hide_empty' => false,
            'orderby'    => 'name',
            'order'      => 'ASC',
        ]
    );

    if ( is_wp_error( $terms ) ) {
        return [
            'success' => false,
            'message' => '<p class="notice notice-error" style="padding:8px 12px">' . esc_html( $terms->get_error_message() ) . '</p>',
        ];
    }

    $moved = 0;

    foreach ( $terms as $term ) {
        if ( 0 === (int) $term->parent || 'uncategorized' === $term->slug ) {
            continue;
        }

        $target_key    = specparts_infer_canonical_parent_key_from_child( $term->name );
        $target_parent = (int) ( $parent_ids[ $target_key ] ?? 0 );

        if ( $target_parent > 0 && (int) $term->parent !== $target_parent ) {
            $updated = wp_update_term(
                (int) $term->term_id,
                'product_cat',
                [
                    'parent' => $target_parent,
                ]
            );

            if ( ! is_wp_error( $updated ) ) {
                $moved++;
            }
        }
    }

    return [
        'success' => true,
        'message' => sprintf(
            '<p class="notice notice-success" style="padding:8px 12px">Category hierarchy repair complete. Moved %d child categories under the correct parent.</p>',
            $moved
        ),
    ];
}

// The category tree is expensive (per-term series + hero meta lookups) —
// cache it in a transient and bust on any category/product change.
define( 'SPECPARTS_CATEGORIES_CACHE_KEY', 'specparts_categories_tree_v1' );

function specparts_clear_categories_cache(): void {
    delete_transient( SPECPARTS_CATEGORIES_CACHE_KEY );
}
add_action( 'created_product_cat', 'specparts_clear_categories_cache' );
add_action( 'edited_product_cat', 'specparts_clear_categories_cache' );
add_action( 'delete_product_cat', 'specparts_clear_categories_cache' );
add_action( 'save_post_product', 'specparts_clear_categories_cache' );
add_action( 'woocommerce_update_product', 'specparts_clear_categories_cache' );

function specparts_api_categories( WP_REST_Request $request ) {
    $cached = get_transient( SPECPARTS_CATEGORIES_CACHE_KEY );
    if ( false !== $cached && is_array( $cached ) ) {
        return new WP_REST_Response( $cached, 200 );
    }

    $terms = get_terms( [
        'taxonomy'   => 'product_cat',
        'hide_empty' => false,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ] );
    if ( is_wp_error( $terms ) ) {
        return new WP_REST_Response( [ 'error' => $terms->get_error_message() ], 500 );
    }

    $parents = array_values( specparts_build_normalized_category_tree( $terms ) );

    set_transient( SPECPARTS_CATEGORIES_CACHE_KEY, $parents, 10 * MINUTE_IN_SECONDS );

    return new WP_REST_Response( $parents, 200 );
}

/**
 * GET /categories/slug/{slug}
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function specparts_api_category_by_slug( WP_REST_Request $request ) {
    $slug = sanitize_title( (string) $request->get_param( 'slug' ) );
    $term = get_term_by( 'slug', $slug, 'product_cat' );

    if ( ! $term || is_wp_error( $term ) ) {
        return new WP_REST_Response( [ 'error' => 'Category not found.' ], 404 );
    }

    return new WP_REST_Response( specparts_format_category_term( $term ), 200 );
}

// ============================================================
// GET /series
// ============================================================

function specparts_api_series( WP_REST_Request $request ) {
    $terms = get_terms( [
        'taxonomy'   => specparts_get_series_taxonomy(),
        'hide_empty' => true,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ] );
    if ( is_wp_error( $terms ) ) {
        return new WP_REST_Response( [ 'error' => $terms->get_error_message() ], 500 );
    }
    $data = array_values(
        array_map(
            static function ( $t ) {
                return [
                    'id'    => $t->term_id,
                    'name'  => $t->name,
                    'slug'  => $t->slug,
                    'count' => $t->count,
                ];
            },
            $terms
        )
    );
    return new WP_REST_Response( $data, 200 );
}
