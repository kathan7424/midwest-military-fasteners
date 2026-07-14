<?php
/**
 * Theme-based CSV Importer — Industrial Spec Parts
 *
 * Architecture:
 *   WC Native     : SKU, title, short_description, price, weight, stock,
 *                   categories (product_cat), attributes (pa_manufacturer,
 *                   pa_country, pa_specs_standard), featured + gallery images
 *   Custom Tax    : product_series
 *   ACF ONLY      : package_pricing_tiers repeater (qty + price per tier)
 *   Post Meta     : _package_pricing (qty + price tiers for cart/API),
 *                   _backorder_leadtime, _reorder_limit, _mfr_coc,
 *                   _material_certs, _process_certs, _test_reports,
 *                   _lot_in_use, _cert_location (internal note),
 *                   _spec_file_url, _certificate_file_url
 *                   _cost_per_ea, _piece_weight, _pkg_qty
 *
 * FILE FOLDERS (configure in Settings tab):
 *   product-images/   → product photos  → named {SKU}.jpg  → col 28 PRODUCT IMAGE
 *   product-specs/    → spec sheet PDFs → named {SKU}-spec.pdf → col 29 SPEC SHEET
 *   product-certs/    → certificate PDFs → named {SKU}-cert.pdf → col 30 CERTIFICATE
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Assign a WooCommerce product_cat thumbnail from a CSV image value.
 *
 * @param int    $term_id Term ID.
 * @param string $value   URL or filename from product-images folder.
 */
function specparts_assign_category_thumbnail_from_csv( $term_id, $value ) {
    $term_id = (int) $term_id;
    $value   = trim( (string) $value );

    if ( $term_id <= 0 || $value === '' ) {
        return;
    }

    if ( filter_var( $value, FILTER_VALIDATE_URL ) ) {
        $attachment_id = attachment_url_to_postid( $value );
        if ( $attachment_id ) {
            update_term_meta( $term_id, 'thumbnail_id', (int) $attachment_id );
        }
        return;
    }

    $image_ids = specparts_resolve_product_images( $value, '' );
    if ( ! empty( $image_ids[0] ) ) {
        update_term_meta( $term_id, 'thumbnail_id', (int) $image_ids[0] );
    }
}

// ============================================================
// SHIPPING HELPERS — WC native fields for Shippo
// ============================================================

function specparts_apply_wc_shipping_dims( $product, $dims_raw ) {
    $dims_raw = trim( (string) $dims_raw );
    if ( $dims_raw === '' || ! is_object( $product ) ) {
        return;
    }

    $normalized = preg_replace( '/[×xX\*]/u', 'x', $dims_raw );
    $parts      = array_map( 'trim', explode( 'x', $normalized ) );
    if ( count( $parts ) !== 3 ) {
        return;
    }

    $height = floatval( $parts[0] );
    $width  = floatval( $parts[1] );
    $length = floatval( $parts[2] );

    if ( $height > 0 ) {
        $product->set_height( (string) $height );
    }
    if ( $width > 0 ) {
        $product->set_width( (string) $width );
    }
    if ( $length > 0 ) {
        $product->set_length( (string) $length );
    }
}

// ============================================================
// IMAGE HELPERS
// ============================================================

function specparts_get_images_dir() {
    $folder = specparts_validate_import_folder( get_option( 'specparts_images_folder', '' ) );
    if ( $folder ) {
        return $folder;
    }
    return rtrim( wp_upload_dir()['basedir'], '/\\' ) . '/product-images';
}

/**
 * Find an existing WP attachment by its base filename.
 */
function specparts_get_attachment_by_filename( $filename ) {
    global $wpdb;
    $basename = sanitize_file_name( $filename );
    // Try subfolder match first, then bare filename
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT post_id FROM {$wpdb->postmeta}
         WHERE meta_key = '_wp_attached_file'
           AND meta_value LIKE %s LIMIT 1",
        '%/' . $wpdb->esc_like( $basename )
    ) );
    if ( ! $row ) {
        $row = $wpdb->get_row( $wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta}
             WHERE meta_key = '_wp_attached_file'
               AND meta_value = %s LIMIT 1",
            $basename
        ) );
    }
    return $row ? intval( $row->post_id ) : 0;
}

/**
 * Copy a local file into WP uploads and create an attachment.
 */
function specparts_sideload_local_image( $filepath ) {
    if ( ! file_exists( $filepath ) ) return 0;

    $filename  = basename( $filepath );
    $file_type = wp_check_filetype( $filename, null );
    if ( empty( $file_type['type'] ) ) return 0;

    $upload_dir = wp_upload_dir();
    $dest       = $upload_dir['path'] . '/' . wp_unique_filename( $upload_dir['path'], $filename );

    if ( ! @copy( $filepath, $dest ) ) return 0;

    $attachment_id = wp_insert_attachment( [
        'post_mime_type' => $file_type['type'],
        'post_title'     => pathinfo( $filename, PATHINFO_FILENAME ),
        'post_content'   => '',
        'post_status'    => 'inherit',
    ], $dest );

    if ( is_wp_error( $attachment_id ) ) {
        @unlink( $dest );
        return 0;
    }

    require_once ABSPATH . 'wp-admin/includes/image.php';
    wp_update_attachment_metadata( $attachment_id, wp_generate_attachment_metadata( $attachment_id, $dest ) );

    return $attachment_id;
}

/**
 * Resolve a CSV image column value + SKU fallback -> array of attachment IDs.
 * First ID = featured image; rest = gallery.
 */
function specparts_resolve_product_images( $csv_value, $sku ) {
    $dir       = specparts_get_images_dir();
    $filenames = array_filter( array_map( 'trim', explode( ',', $csv_value ) ) );

    if ( empty( $filenames ) && ! empty( $sku ) ) {
        foreach ( [ '.jpg', '.jpeg', '.png', '.webp', '.gif' ] as $ext ) {
            if ( file_exists( $dir . '/' . $sku . $ext ) ) {
                $filenames = [ $sku . $ext ];
                break;
            }
        }
    }

    $ids = [];
    foreach ( $filenames as $fname ) {
        $existing = specparts_get_attachment_by_filename( $fname );
        if ( $existing ) {
            $ids[] = $existing;
        } else {
            $id = specparts_sideload_local_image( $dir . '/' . sanitize_file_name( basename( $fname ) ) );
            if ( $id ) $ids[] = $id;
        }
    }

    return array_unique( $ids );
}

// ============================================================
// CERT / SPEC FILE HELPERS
// ============================================================

/**
 * A configured import folder is only honored when it resolves inside the
 * uploads directory — anything else could read arbitrary server paths.
 */
function specparts_validate_import_folder( $folder ) {
    if ( ! $folder || ! is_dir( $folder ) ) {
        return '';
    }

    $real    = realpath( $folder );
    $basedir = realpath( wp_upload_dir()['basedir'] );

    if ( ! $real || ! $basedir || 0 !== strpos( $real, $basedir ) ) {
        return '';
    }

    return rtrim( $real, '/\\' );
}

function specparts_get_certs_dir() {
    $folder = specparts_validate_import_folder( get_option( 'specparts_certs_folder', '' ) );
    if ( $folder ) {
        return $folder;
    }
    return rtrim( wp_upload_dir()['basedir'], '/\\' ) . '/product-certs';
}

function specparts_get_specs_dir() {
    $folder = specparts_validate_import_folder( get_option( 'specparts_specs_folder', '' ) );
    if ( $folder ) {
        return $folder;
    }
    return rtrim( wp_upload_dir()['basedir'], '/\\' ) . '/product-specs';
}

/**
 * Resolve a product document from CSV value or local import folder.
 *
 * @param string   $value               Filename, relative path, or full URL.
 * @param string   $sku                 Product SKU for fallback filenames.
 * @param string   $directory           Local folder to sideload from.
 * @param string[] $fallback_filenames  Tried in order when $value is blank.
 * @return string Public URL or empty string.
 */
function specparts_resolve_product_document_file( $value, $sku, $directory, $fallback_filenames = [] ) {
    $value = trim( (string) $value );

    if ( filter_var( $value, FILTER_VALIDATE_URL ) ) {
        return $value;
    }

    $filename = $value;

    if ( $filename === '' && ! empty( $sku ) ) {
        foreach ( $fallback_filenames as $candidate ) {
            $candidate = str_replace( '{SKU}', $sku, $candidate );
            foreach ( [ $candidate, strtoupper( $candidate ) ] as $name ) {
                if ( file_exists( rtrim( $directory, '/\\' ) . '/' . $name ) ) {
                    $filename = $name;
                    break 2;
                }
            }
        }
    }

    if ( $filename === '' ) {
        return '';
    }

    $existing_id = specparts_get_attachment_by_filename( $filename );
    if ( $existing_id ) {
        return wp_get_attachment_url( $existing_id ) ?: '';
    }

    $filename = sanitize_file_name( basename( $filename ) );
    $filepath = rtrim( $directory, '/\\' ) . '/' . $filename;
    if ( ! file_exists( $filepath ) ) {
        return '';
    }

    $file_type = wp_check_filetype( $filename, null );
    if ( empty( $file_type['type'] ) ) {
        return '';
    }

    $upload_dir = wp_upload_dir();
    $dest       = $upload_dir['path'] . '/' . wp_unique_filename( $upload_dir['path'], $filename );
    if ( ! @copy( $filepath, $dest ) ) {
        return '';
    }

    $att_id = wp_insert_attachment(
        [
            'post_mime_type' => $file_type['type'],
            'post_title'     => pathinfo( $filename, PATHINFO_FILENAME ),
            'post_content'   => '',
            'post_status'    => 'inherit',
        ],
        $dest
    );

    if ( is_wp_error( $att_id ) ) {
        @unlink( $dest );
        return '';
    }

    require_once ABSPATH . 'wp-admin/includes/image.php';
    wp_update_attachment_metadata( $att_id, wp_generate_attachment_metadata( $att_id, $dest ) );

    return wp_get_attachment_url( $att_id ) ?: '';
}

/**
 * @deprecated Use specparts_resolve_product_document_file().
 */
function specparts_resolve_cert_file( $cert_loc, $sku ) {
    return specparts_resolve_product_document_file(
        $cert_loc,
        $sku,
        specparts_get_certs_dir(),
        [ '{SKU}.pdf', '{SKU}-cert.pdf' ]
    );
}

/**
 * Resolve spec sheet + certificate URLs for a product row.
 *
 * @return array{spec_url:string,cert_url:string,cert_location:string}
 */
function specparts_resolve_product_documents( $row, $sku, $col_map, $idx ) {
    $cert_loc = trim( $idx( $row, 25 ) );

    $spec_sheet = trim( $idx( $row, 28 ) );
    if ( $spec_sheet === '' && isset( $col_map['SPEC SHEET'] ) ) {
        $spec_sheet = trim( $row[ $col_map['SPEC SHEET'] ] ?? '' );
    }

    $certificate = trim( $idx( $row, 29 ) );
    if ( $certificate === '' && isset( $col_map['CERTIFICATE'] ) ) {
        $certificate = trim( $row[ $col_map['CERTIFICATE'] ] ?? '' );
    }

    $internal_cert_loc = $cert_loc;
    if (
        $certificate === ''
        && $cert_loc !== ''
        && ( filter_var( $cert_loc, FILTER_VALIDATE_URL ) || preg_match( '/\.pdf$/i', $cert_loc ) )
    ) {
        $certificate       = $cert_loc;
        $internal_cert_loc = '';
    }

    $spec_url = specparts_resolve_product_document_file(
        $spec_sheet,
        $sku,
        specparts_get_specs_dir(),
        [ '{SKU}-spec.pdf', '{SKU}.pdf' ]
    );

    $cert_url = specparts_resolve_product_document_file(
        $certificate,
        $sku,
        specparts_get_certs_dir(),
        [ '{SKU}-cert.pdf', '{SKU}.pdf' ]
    );

    return [
        'spec_url'      => $spec_url,
        'cert_url'      => $cert_url,
        'cert_location' => $internal_cert_loc,
    ];
}

// ============================================================
// TAXONOMY / CATEGORY / ATTRIBUTE HELPERS
// ============================================================

function specparts_ensure_product_category( $name, $parent_id = 0 ) {
    if ( empty( $name ) ) {
        return 0;
    }

    $slug = sanitize_title( $name );

    $existing = term_exists( $slug, 'product_cat', $parent_id );
    if ( $existing ) {
        return intval( $existing['term_id'] );
    }

    $by_name = get_term_by( 'name', $name, 'product_cat' );
    if ( ! $by_name ) {
        $by_name = get_term_by( 'slug', $slug, 'product_cat' );
    }

    if ( $by_name ) {
        if ( intval( $by_name->parent ) !== intval( $parent_id ) ) {
            wp_update_term(
                (int) $by_name->term_id,
                'product_cat',
                [
                    'parent' => (int) $parent_id,
                ]
            );
        }

        return intval( $by_name->term_id );
    }

    $result = wp_insert_term( $name, 'product_cat', [ 'slug' => $slug, 'parent' => $parent_id ] );
    if ( is_wp_error( $result ) ) {
        return 0;
    }

    return intval( $result['term_id'] );
}

function specparts_ensure_series_term( $name ) {
    if ( empty( $name ) ) return 0;
    $taxonomy = specparts_get_series_taxonomy();
    $slug     = sanitize_title( $name );
    $existing = term_exists( $slug, $taxonomy );
    if ( $existing ) return intval( $existing['term_id'] );
    $result = wp_insert_term( $name, $taxonomy, [ 'slug' => $slug ] );
    return is_wp_error( $result ) ? 0 : intval( $result['term_id'] );
}

/**
 * Sync category + series taxonomies for an existing product during import.
 *
 * @param int    $product_id Product post ID.
 * @param int    $sub_cat_id Child product_cat term ID.
 * @param string $series_name Product series label from import context.
 */
function specparts_sync_product_taxonomies( $product_id, $sub_cat_id, $series_name = '' ) {
    if ( $sub_cat_id ) {
        wp_set_object_terms( (int) $product_id, [ (int) $sub_cat_id ], 'product_cat', false );
    }

    if ( $series_name ) {
        $series_id = specparts_ensure_series_term( $series_name );
        if ( $series_id ) {
            wp_set_object_terms( (int) $product_id, [ (int) $series_id ], specparts_get_series_taxonomy(), false );
        }
        return;
    }

    specparts_assign_inferred_series_to_product( (int) $product_id );
}

/**
 * Write pricing tiers to the ACF repeater using field KEYS.
 *
 * Field keys resolve even when writing by name fails (e.g. rows imported
 * before the field group existed). Keys match acf-export-package-pricing.json.
 *
 * @param int   $product_id Product post ID.
 * @param array $tiers      Array of ['qty' => int, 'price' => float] rows.
 * @return bool True when ACF rows were written.
 */
function specparts_write_acf_pricing_tiers( $product_id, $tiers ) {
    if ( ! function_exists( 'update_field' ) || empty( $tiers ) || ! is_array( $tiers ) ) {
        return false;
    }

    $acf_rows = array_map(
        static function ( $tier ) {
            return [
                'field_spp_tier_qty'   => $tier['qty'] ?? $tier['package_quantity'] ?? 0,
                'field_spp_tier_price' => $tier['price'] ?? 0,
            ];
        },
        array_values( $tiers )
    );

    return false !== update_field( 'field_spp_pricing_tiers', $acf_rows, $product_id );
}

/**
 * Backfill the ACF pricing repeater from _package_pricing meta for all products.
 *
 * Fixes products imported before the ACF field group existed: the raw meta is
 * there (cart/API work) but the repeater shows empty on the product edit screen.
 *
 * @return array{success:bool,message:string}
 */
function specparts_backfill_acf_pricing() {
    if ( ! function_exists( 'update_field' ) ) {
        return [
            'success' => false,
            'message' => '<p class="notice notice-error" style="padding:8px 12px">ACF is not active — cannot write repeater fields.</p>',
        ];
    }

    $product_ids = get_posts(
        [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'fields'         => 'ids',
            'posts_per_page' => -1,
        ]
    );

    $synced  = 0;
    $skipped = 0;

    foreach ( $product_ids as $product_id ) {
        $pricing = get_post_meta( (int) $product_id, '_package_pricing', true );

        if ( empty( $pricing ) || ! is_array( $pricing ) ) {
            $skipped++;
            continue;
        }

        if ( specparts_write_acf_pricing_tiers( (int) $product_id, $pricing ) ) {
            $synced++;
        } else {
            $skipped++;
        }
    }

    return [
        'success' => true,
        'message' => sprintf(
            '<p class="notice notice-success" style="padding:8px 12px">ACF pricing backfill complete. Synced: %d. Skipped (no pricing meta): %d.</p>',
            $synced,
            $skipped
        ),
    ];
}

/**
 * Backfill product-series taxonomy for published products missing a series term.
 *
 * @return array{success:bool,message:string}
 */
function specparts_backfill_product_series() {
    if ( ! function_exists( 'specparts_assign_inferred_series_to_product' ) ) {
        return [
            'success' => false,
            'message' => '<p class="notice notice-error" style="padding:8px 12px">Catalog API helpers are unavailable.</p>',
        ];
    }

    $product_ids = get_posts(
        [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'fields'         => 'ids',
            'posts_per_page' => -1,
        ]
    );

    $assigned = 0;
    $skipped  = 0;

    foreach ( $product_ids as $product_id ) {
        if ( specparts_assign_inferred_series_to_product( (int) $product_id ) ) {
            $assigned++;
        } else {
            $skipped++;
        }
    }

    return [
        'success' => true,
        'message' => sprintf(
            '<p class="notice notice-success" style="padding:8px 12px">Product series backfill complete. Assigned: %d. Skipped: %d.</p>',
            $assigned,
            $skipped
        ),
    ];
}

/**
 * Register a WC global attribute if it doesn't exist and ensure taxonomy is live.
 *
 * @param string $slug  slug WITHOUT pa_ prefix
 * @param string $label Human label
 */
function specparts_ensure_wc_attribute( $slug, $label ) {
    if ( strpos( $slug, 'pa_' ) === 0 ) $slug = substr( $slug, 3 );
    if ( ! wc_attribute_taxonomy_id_by_name( $slug ) ) {
        wc_create_attribute( [
            'name'         => $label,
            'slug'         => $slug,
            'type'         => 'select',
            'order_by'     => 'menu_order',
            'has_archives' => false,
        ] );
    }
    $taxonomy = 'pa_' . $slug;
    if ( ! taxonomy_exists( $taxonomy ) ) {
        register_taxonomy( $taxonomy, [ 'product' ], [
            'hierarchical' => false,
            'show_ui'      => false,
            'rewrite'      => false,
        ] );
    }
}

/**
 * Get or create a term in a WC attribute taxonomy.
 */
function specparts_ensure_attribute_term( $taxonomy, $value ) {
    if ( empty( $value ) ) return 0;
    $term = get_term_by( 'name', $value, $taxonomy );
    if ( $term ) return intval( $term->term_id );
    $result = wp_insert_term( $value, $taxonomy );
    return is_wp_error( $result ) ? 0 : intval( $result['term_id'] );
}

function specparts_parse_price( $val ) {
    $clean = preg_replace( '/[^0-9.]/', '', trim( $val ) );
    return $clean !== '' ? floatval( $clean ) : 0.0;
}

function specparts_bool_meta( $val ) {
    return in_array( strtolower( trim( $val ) ), [ 'y', 'yes', '1', 'true' ], true ) ? '1' : '';
}

// ============================================================
// ADMIN MENU
// ============================================================

add_action( 'admin_menu', function () {
    add_submenu_page(
        'woocommerce',
        'Parts Catalog Import',
        'Parts Import',
        'manage_woocommerce',
        'specparts-import',
        'specparts_import_page'
    );
} );

/**
 * Serve the sample import CSV through WP admin (reliable download headers).
 */
add_action( 'admin_init', 'specparts_handle_template_csv_download' );

function specparts_handle_template_csv_download() {
    if ( ! isset( $_GET['page'], $_GET['specparts_download'] ) ) {
        return;
    }

    if ( 'specparts-import' !== sanitize_key( wp_unslash( $_GET['page'] ) ) ) {
        return;
    }

    if ( 'template' !== sanitize_key( wp_unslash( $_GET['specparts_download'] ) ) ) {
        return;
    }

    if ( ! current_user_can( 'manage_woocommerce' ) ) {
        wp_die( esc_html__( 'You do not have permission to download this file.', 'midwest-military' ), 403 );
    }

    check_admin_referer( 'specparts_download_template' );

    $filepath = get_template_directory() . '/import-template.csv';

    if ( ! is_readable( $filepath ) ) {
        wp_die( esc_html__( 'Import template CSV was not found in the theme folder.', 'midwest-military' ), 404 );
    }

    nocache_headers();
    header( 'Content-Type: text/csv; charset=utf-8' );
    header( 'Content-Disposition: attachment; filename="import-template.csv"' );
    header( 'Content-Length: ' . (string) filesize( $filepath ) );

    // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
    readfile( $filepath );
    exit;
}

/**
 * Admin URL for downloading the sample import CSV.
 *
 * @return string
 */
function specparts_get_template_csv_download_url() {
    return wp_nonce_url(
        admin_url( 'admin.php?page=specparts-import&specparts_download=template' ),
        'specparts_download_template'
    );
}

// ============================================================
// ADMIN PAGE ROUTER
// ============================================================

function specparts_import_page() {
    $tab      = isset( $_GET['tab'] ) ? sanitize_key( $_GET['tab'] ) : 'import';
    $base_url = admin_url( 'admin.php?page=specparts-import' );
    ?>
    <div class="wrap">
        <h1>Parts Catalog Import</h1>
        <nav class="nav-tab-wrapper" style="margin-bottom:20px">
            <a href="<?php echo esc_url( $base_url . '&tab=import' ); ?>"
               class="nav-tab <?php echo $tab === 'import'   ? 'nav-tab-active' : ''; ?>">Import</a>
            <a href="<?php echo esc_url( $base_url . '&tab=settings' ); ?>"
               class="nav-tab <?php echo $tab === 'settings' ? 'nav-tab-active' : ''; ?>">Settings</a>
            <a href="<?php echo esc_url( $base_url . '&tab=guide' ); ?>"
               class="nav-tab <?php echo $tab === 'guide'    ? 'nav-tab-active' : ''; ?>">CSV Guide</a>
        </nav>
    <?php
    if ( $tab === 'settings' )  specparts_render_settings_tab();
    elseif ( $tab === 'guide' ) specparts_render_guide_tab();
    else                        specparts_render_import_tab();
    echo '</div>';
}

// ============================================================
// TAB: IMPORT
// ============================================================

function specparts_render_import_tab() {
    $msg = '';

    if ( ( isset( $_POST['specparts_import_csv'] ) || isset( $_POST['specparts_preview_csv'] ) ) && check_admin_referer( 'specparts_import_action' ) ) {
        if ( ! empty( $_FILES['import_file']['tmp_name'] ) ) {
            $result = isset( $_POST['specparts_preview_csv'] )
                ? specparts_preview_csv(
                    $_FILES['import_file']['tmp_name'],
                    ! empty( $_POST['update_existing'] )
                )
                : specparts_import_csv(
                    $_FILES['import_file']['tmp_name'],
                    ! empty( $_POST['update_existing'] )
                );
            $msg = $result['message'];
        } else {
            $msg = '<p class="notice notice-error" style="padding:8px 12px">No file selected.</p>';
        }
    } elseif ( isset( $_POST['specparts_import_demo'] ) && check_admin_referer( 'specparts_import_action' ) ) {
        $result = specparts_import_demo();
        $msg    = $result['message'];
    } elseif ( isset( $_POST['specparts_cleanup'] ) && check_admin_referer( 'specparts_import_action' ) ) {
        $result = specparts_clean_demo_data();
        $msg    = $result['message'];
    } elseif ( isset( $_POST['specparts_backfill_series'] ) && check_admin_referer( 'specparts_import_action' ) ) {
        $result = specparts_backfill_product_series();
        $msg    = $result['message'];
    } elseif ( isset( $_POST['specparts_backfill_acf_pricing'] ) && check_admin_referer( 'specparts_import_action' ) ) {
        $result = specparts_backfill_acf_pricing();
        $msg    = $result['message'];
    } elseif ( isset( $_POST['specparts_repair_categories'] ) && check_admin_referer( 'specparts_import_action' ) ) {
        $result = specparts_repair_category_hierarchy();
        $msg    = $result['message'];
    }

    if ( $msg ) echo '<div style="margin:12px 0">' . $msg . '</div>';
    ?>
    <div style="max-width:720px">

        <h2 style="font-size:1.1em;margin:0 0 6px">Import from CSV</h2>
        <p style="color:#666;margin:0 0 16px">
            Upload the client catalog CSV (30-column format, positional).
            Category and series context is inherited from header rows.
            <br><a href="<?php echo esc_url( specparts_get_template_csv_download_url() ); ?>" class="button button-secondary" style="margin-top:8px">Download sample CSV</a>
        </p>
        <form method="post" enctype="multipart/form-data" style="margin-bottom:32px">
            <?php wp_nonce_field( 'specparts_import_action' ); ?>
            <input type="file" name="import_file" accept=".csv" required style="display:block;margin-bottom:10px">
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:.9em">
                <input type="checkbox" name="update_existing" value="1">
                Update existing products (match by SKU — unchecked = skip duplicates)
            </label>
            <button type="submit" name="specparts_preview_csv" class="button button-secondary">
                Preview (no changes)
            </button>
            <button type="submit" name="specparts_import_csv" class="button button-primary">
                Import CSV
            </button>
            <p style="color:#666;font-size:.85em;margin-top:8px">
                Tip: run <strong>Preview</strong> first — it checks every row and reports missing prices, images, and documents without importing anything.
            </p>
        </form>

        <form method="post" style="margin-bottom:16px">
            <?php wp_nonce_field( 'specparts_import_action' ); ?>
            <button type="submit" name="specparts_repair_categories" class="button">
                Repair Category Parents (Screws / Nuts / Washers)
            </button>
        </form>

        <form method="post" style="margin-bottom:16px">
            <?php wp_nonce_field( 'specparts_import_action' ); ?>
            <button type="submit" name="specparts_backfill_series" class="button">
                Backfill Product Series from SKU
            </button>
        </form>

        <form method="post" style="margin-bottom:32px">
            <?php wp_nonce_field( 'specparts_import_action' ); ?>
            <button type="submit" name="specparts_backfill_acf_pricing" class="button">
                Sync Pricing Tiers to ACF (fix empty repeater)
            </button>
            <p style="color:#666;font-size:.85em;margin-top:6px">
                Run once after importing the ACF field group — fills the Package Pricing
                repeater on every product from existing import data.
            </p>
        </form>

        <h2 style="font-size:1.1em;margin:0 0 6px">Demo Data</h2>
        <p style="color:#666;margin:0 0 12px">Load 2 sample products to verify the theme and pricing tiers are working.</p>
        <form method="post" style="display:inline-block;margin-right:10px">
            <?php wp_nonce_field( 'specparts_import_action' ); ?>
            <button type="submit" name="specparts_import_demo" class="button">Load Demo Data</button>
        </form>
        <form method="post" style="display:inline-block">
            <?php wp_nonce_field( 'specparts_import_action' ); ?>
            <button type="submit" name="specparts_cleanup" class="button button-link-delete"
                    onclick="return confirm('Delete all demo products?')">Remove Demo Data</button>
        </form>

    </div>
    <?php
}

// ============================================================
// TAB: SETTINGS
// ============================================================

function specparts_render_settings_tab() {
    $upload_base  = wp_upload_dir()['basedir'];
    $img_folder   = get_option( 'specparts_images_folder', $upload_base . '/product-images' );
    $specs_folder = get_option( 'specparts_specs_folder', $upload_base . '/product-specs' );
    $cert_folder  = get_option( 'specparts_certs_folder',  $upload_base . '/product-certs' );

    if ( isset( $_POST['save_specparts_settings'] ) && check_admin_referer( 'specparts_settings_action' ) ) {
        $img_folder   = sanitize_text_field( $_POST['specparts_images_folder'] ?? '' );
        $specs_folder = sanitize_text_field( $_POST['specparts_specs_folder'] ?? '' );
        $cert_folder  = sanitize_text_field( $_POST['specparts_certs_folder']  ?? '' );
        update_option( 'specparts_images_folder', $img_folder );
        update_option( 'specparts_specs_folder', $specs_folder );
        update_option( 'specparts_certs_folder',  $cert_folder );
        echo '<div class="notice notice-success" style="margin:8px 0;padding:8px 12px"><p>Settings saved.</p></div>';
    }
    ?>
    <div style="max-width:720px">
        <form method="post">
            <?php wp_nonce_field( 'specparts_settings_action' ); ?>
            <table class="form-table">
                <tr>
                    <th style="width:210px"><label for="sp_img_folder">Product Images Folder</label></th>
                    <td>
                        <input type="text" id="sp_img_folder" name="specparts_images_folder"
                               value="<?php echo esc_attr( $img_folder ); ?>" class="regular-text code">
                        <p class="description">
                            Folder with <strong>.jpg / .png / .webp</strong> product photos.<br>
                            Default: <code><?php echo esc_html( $upload_base . '/product-images' ); ?></code>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sp_specs_folder">Spec Sheet Files Folder</label></th>
                    <td>
                        <input type="text" id="sp_specs_folder" name="specparts_specs_folder"
                               value="<?php echo esc_attr( $specs_folder ); ?>" class="regular-text code">
                        <p class="description">
                            Folder with <strong>.pdf</strong> product spec sheets.<br>
                            Default: <code><?php echo esc_html( $upload_base . '/product-specs' ); ?></code>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th><label for="sp_cert_folder">Certificate Files Folder</label></th>
                    <td>
                        <input type="text" id="sp_cert_folder" name="specparts_certs_folder"
                               value="<?php echo esc_attr( $cert_folder ); ?>" class="regular-text code">
                        <p class="description">
                            Folder with <strong>.pdf</strong> product certificates.<br>
                            Default: <code><?php echo esc_html( $upload_base . '/product-certs' ); ?></code>
                        </p>
                    </td>
                </tr>
            </table>
            <p style="color:#666;font-size:.85em;margin:0 0 12px 210px">
                WordPress uploads base on this server: <code><?php echo esc_html( $upload_base ); ?></code>
            </p>
            <p class="submit" style="padding-top:0">
                <button type="submit" name="save_specparts_settings" class="button button-primary">Save Settings</button>
            </p>
        </form>

        <table class="widefat striped" style="margin-top:16px;font-size:.875em">
            <thead>
                <tr><th style="width:160px">File Type</th><th style="width:220px">Upload Folder</th><th>Filename Convention</th><th>CSV Column</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Product Images</strong><br><small>.jpg .png .webp</small></td>
                    <td><code>product-images/</code></td>
                    <td>
                        <strong>Option A (auto):</strong> Name file same as SKU<br>
                        <code>MS35307-303.jpg</code><br><br>
                        <strong>Option B (manual):</strong> Any name, put in CSV col 34<br>
                        <code>hex-cap-screw-14.jpg</code>
                    </td>
                    <td>Col 28<br><code>PRODUCT IMAGE</code><br><small>(optional — blank = SKU fallback)</small></td>
                </tr>
                <tr>
                    <td><strong>Spec Sheets</strong><br><small>.pdf</small></td>
                    <td><code>product-specs/</code></td>
                    <td>
                        <strong>Option A (auto):</strong> <code>{SKU}-spec.pdf</code><br>
                        <strong>Option B (manual):</strong> filename in CSV col 29<br>
                        <code>MS35307-303-spec.pdf</code>
                    </td>
                    <td>Col 29<br><code>SPEC SHEET</code></td>
                </tr>
                <tr>
                    <td><strong>Certificates</strong><br><small>.pdf</small></td>
                    <td><code>product-certs/</code></td>
                    <td>
                        <strong>Option A (auto):</strong> <code>{SKU}-cert.pdf</code> or <code>{SKU}.pdf</code><br>
                        <strong>Option B (manual):</strong> filename in CSV col 30<br>
                        <code>MS35307-303-cert.pdf</code>
                    </td>
                    <td>Col 30<br><code>CERTIFICATE</code></td>
                </tr>
            </tbody>
        </table>

        <div style="background:#fff8e1;border:1px solid #ffe082;padding:12px 16px;border-radius:4px;margin-top:12px;font-size:.875em">
            <strong>How spec sheets &amp; certificates become download links</strong><br>
            Import reads <code>SPEC SHEET</code> and <code>CERTIFICATE</code> columns. PDF filenames are copied from the configured folders into the WP media library and saved as <code>_spec_file_url</code> and <code>_certificate_file_url</code>.<br>
            Blank columns auto-try <code>{SKU}-spec.pdf</code> and <code>{SKU}-cert.pdf</code>. Legacy CSV files may still use col 26 <code>CERT LOCATION</code> with a <code>.pdf</code> filename for certificates.
        </div>
    </div>
    <?php
}

// ============================================================
// TAB: CSV GUIDE
// ============================================================

function specparts_render_guide_tab() {
    ?>
    <div style="max-width:960px;font-size:.875em">
        <h2 style="font-size:1.3em;margin-bottom:4px">CSV Column Reference</h2>
        <p style="color:#666;margin-bottom:16px">
            Columns are read <strong>positionally</strong> (by index, not by header name).
            The format has <strong>30 columns</strong> — tier-1 shipping dims/weight only; tier-3/5/10 dims and weight columns from the original INFO MOCKUP have been removed since Shippo uses the tier-1 values for all quantities.
            The optional <strong>PRODUCT IMAGE</strong> column can be at index 27 or named.
            Category, sub-category, and series values <strong>cascade</strong> from header rows to all following product rows until changed.
        </p>
        <p style="margin-bottom:16px">
            <a href="<?php echo esc_url( specparts_get_template_csv_download_url() ); ?>" class="button button-primary">Download sample CSV</a>
        </p>

        <table class="widefat striped fixed" style="margin-bottom:32px">
            <colgroup>
                <col style="width:44px">
                <col style="width:220px">
                <col style="width:220px">
                <col>
            </colgroup>
            <thead>
                <tr><th>#</th><th>Column Name</th><th>Stored As</th><th>Notes</th></tr>
            </thead>
            <tbody>
                <tr><td>1</td><td>CATEGORY IMAGE LOCATION</td><td>WC category <code>thumbnail_id</code></td>
                    <td>Image URL or filename from <code>product-images/</code>. Applied to the current parent/sub-category context row.</td></tr>
                <tr><td>2</td><td>PRODCUT CATEGORY <small>(typo in client file)</small></td><td>WC <code>product_cat</code> — parent</td>
                    <td>Sets parent category context. Cascades. When it changes, sub-category resets.</td></tr>
                <tr><td>3</td><td>PRODUCT SUB CATEGORY</td><td>WC <code>product_cat</code> — child</td>
                    <td>Child of current parent category. Cascades. Products assigned to deepest level.</td></tr>
                <tr><td>4</td><td>PART SERIES</td><td>Taxonomy <code>product_series</code></td>
                    <td>E.g. MS35307, NAS1149. Cascades to following rows.</td></tr>
                <tr><td>5</td><td>P/N</td><td>WC SKU + product title</td>
                    <td><strong>Required.</strong> Becomes the WC product title <em>and</em> SKU. Rows with blank P/N are treated as context/header rows and skipped.</td></tr>
                <tr><td>6</td><td>DESCRIPTION</td><td>WC product description + short description</td>
                    <td>Part description paragraph. Saved as both WC full description (shown on product page below the title) and short description (shown in the catalog table Description column).</td></tr>
                <tr><td>7</td><td>PACKAGE QTY</td><td>Meta <code>_pkg_qty</code></td>
                    <td>Pieces per package. Read by cart logic and the REST API.</td></tr>

                <tr style="background:#eef3ff"><td colspan="4"><strong>Tier 1 — single-package order</strong></td></tr>
                <tr><td>8</td><td>SHIPPING DIMENSIONS H&times;W&times;L</td>
                    <td>WC product dimensions (L/W/H)</td><td>Tier-1 box size for Shippo. Format: HxWxL inches. Not stored in ACF.</td></tr>
                <tr><td>9</td><td>SHIPPING WEIGHT</td>
                    <td>WC product weight</td>
                    <td>Tier-1 ship weight in lbs. Sets WC weight for Shippo rate quotes.</td></tr>
                <tr><td>10</td><td>1 PKG COST</td>
                    <td>WC <code>_regular_price</code> + <code>_package_pricing</code> tier[0]</td>
                    <td>Price per package at qty 1. Sets WC regular and current price.</td></tr>

                <tr style="background:#eef3ff"><td colspan="4"><strong>Tier 3 — 3+ packages</strong></td></tr>
                <tr><td>11</td><td>3 PKG COST</td><td><code>_package_pricing</code> tier[1]</td><td>Cart tier price only.</td></tr>

                <tr style="background:#eef3ff"><td colspan="4"><strong>Tier 5 — 5+ packages</strong></td></tr>
                <tr><td>12</td><td>5 PKG COST</td><td><code>_package_pricing</code> tier[2]</td><td>Cart tier price only.</td></tr>

                <tr style="background:#eef3ff"><td colspan="4"><strong>Tier 10 — 10+ packages</strong></td></tr>
                <tr><td>13</td><td>10 PKG COST</td><td><code>_package_pricing</code> tier[3]</td><td>Cart tier price only. Shippo uses tier-1 dims/weight for all quantities.</td></tr>

                <tr><td>14</td><td>QUANTITY IN STOCK</td>
                    <td>WC <code>_stock</code>, <code>_stock_status</code>, <code>manage_stock=yes</code></td>
                    <td>Integer. 0 = out of stock. Enables WC stock management automatically.</td></tr>
                <tr><td>15</td><td>BACKORDER LEADTIME</td><td>Post meta <code>_backorder_leadtime</code></td>
                    <td>E.g. "2-3 DAYS". Displayed on product page.</td></tr>
                <tr><td>16</td><td>REORDER LIMIT</td><td>Post meta <code>_reorder_limit</code></td>
                    <td>Internal minimum reorder quantity.</td></tr>
                <tr><td>17</td><td>COUNTRY OF ORIGIN</td><td>WC attribute <code>pa_country</code></td>
                    <td>"USA", "Germany", etc. Shown in Additional Information tab. Powers "Made in X" badge.</td></tr>
                <tr><td>18</td><td>DFAR?</td><td>WC attribute <code>pa_specs_standard</code></td>
                    <td>"Y" = attribute set to "DFAR". "N"/blank = not set. Powers DFAR compliance badge.</td></tr>
                <tr><td>19</td><td>MFR C OF C</td><td>Post meta <code>_mfr_coc</code></td>
                    <td>"Y"/"N" — manufacturer certificate of conformance available.</td></tr>
                <tr><td>20</td><td>MATERIAL CERTS</td><td>Post meta <code>_material_certs</code></td><td>"Y"/"N"</td></tr>
                <tr><td>21</td><td>PROCESS CERTS</td><td>Post meta <code>_process_certs</code></td><td>"Y"/"N"</td></tr>
                <tr><td>22</td><td>TEST REPORTS</td><td>Post meta <code>_test_reports</code></td><td>"Y"/"N"</td></tr>
                <tr><td>23</td><td>MFR</td><td>WC attribute <code>pa_manufacturer</code></td>
                    <td>Manufacturer name. Shown in Additional Information tab.</td></tr>
                <tr><td>24</td><td>LOT IN USE</td><td>Post meta <code>_lot_in_use</code></td>
                    <td>Internal lot/batch reference. Not shown to customers.</td></tr>
                <tr><td>25</td><td>COST PER EA</td><td>Post meta <code>_cost_per_ea</code></td>
                    <td>Internal cost per piece. Not shown to customers.</td></tr>
                <tr><td>26</td><td>CERT LOCATION</td><td>Post meta <code>_cert_location</code></td>
                    <td>Internal note for where physical certificates are stored. Use <code>CERTIFICATE</code> column for the public PDF.</td></tr>
                <tr><td>27</td><td>PER PIECE WEIGHT</td>
                    <td>WC weight fallback + meta <code>_piece_weight</code></td>
                    <td>Individual piece weight in lbs. Used when tier-1 ship weight is blank.</td></tr>
                <tr style="background:#fffde7">
                    <td>28</td>
                    <td><strong>PRODUCT IMAGE</strong> <small>(optional)</small></td>
                    <td>WC featured image + product gallery</td>
                    <td>Comma-separated filenames from the configured images folder.</td></tr>
                <tr style="background:#fffde7">
                    <td>29</td>
                    <td><strong>SPEC SHEET</strong> <small>(optional)</small></td>
                    <td>Post meta <code>_spec_file_url</code></td>
                    <td>PDF filename from <code>product-specs/</code> or full URL. Blank = auto <code>{SKU}-spec.pdf</code>.</td></tr>
                <tr style="background:#fffde7">
                    <td>30</td>
                    <td><strong>CERTIFICATE</strong> <small>(optional)</small></td>
                    <td>Post meta <code>_certificate_file_url</code></td>
                    <td>PDF filename from <code>product-certs/</code> or full URL. Blank = auto <code>{SKU}-cert.pdf</code> / <code>{SKU}.pdf</code>.</td></tr>
            </tbody>
        </table>

        <h3 style="margin-bottom:6px">Category / Series Context Inheritance</h3>
        <table class="widefat striped" style="margin-bottom:32px">
            <thead><tr><th>Row type</th><th>P/N (col 5)</th><th>What happens</th></tr></thead>
            <tbody>
                <tr><td>Parent Category Header</td><td>Blank</td>
                    <td>Sets parent category context. Sub-category and series reset to empty. All following product rows inherit this parent.</td></tr>
                <tr><td>Sub-Category/Series Header</td><td>Blank</td>
                    <td>Updates sub-category and/or series within the current parent. Following rows inherit.</td></tr>
                <tr><td>Product Row</td><td>Has a value</td>
                    <td>Uses current inherited context. Inline values in cols 2-4 override context for that row AND update inherited state for following rows.</td></tr>
            </tbody>
        </table>

        <h3 style="margin-bottom:6px">WooCommerce Architecture Summary</h3>
        <table class="widefat striped">
            <thead><tr><th>Data</th><th>Stored In</th><th>Why</th></tr></thead>
            <tbody>
                <tr><td>SKU, Title, Price, Stock, Weight</td><td>WooCommerce native fields</td>
                    <td>Standard WC — works with all plugins, REST API, WC exports out of the box.</td></tr>
                <tr><td>Categories</td><td>WC <code>product_cat</code> taxonomy</td>
                    <td>Hierarchical parent/sub-category tree. Drives WC shop filtering and breadcrumbs.</td></tr>
                <tr><td>Manufacturer, Country, DFAR</td>
                    <td>WC product attributes (<code>pa_manufacturer</code>, <code>pa_country</code>, <code>pa_specs_standard</code>)</td>
                    <td>Filterable and searchable. Shown in Additional Information tab. Drive compliance badges without ACF.</td></tr>
                <tr><td>Product Series</td><td>Custom taxonomy <code>product_series</code></td>
                    <td>Groups MS/NAS/AN series. Enables archive pages and series filtering.</td></tr>
                <tr><td>Package Pricing Tiers</td>
                    <td>ACF repeater <code>package_pricing_tiers</code> + raw meta <code>_package_pricing</code></td>
                    <td>ACF for admin UI editing. Raw meta mirror so cart pricing hook and REST API work without ACF active at runtime.</td></tr>
                <tr><td>pkg_qty</td><td>Meta <code>_pkg_qty</code></td>
                    <td>Same dual-storage pattern as pricing tiers.</td></tr>
                <tr><td>Compliance flags, internal fields</td>
                    <td>Post meta (<code>_mfr_coc</code>, <code>_material_certs</code>, etc.)</td>
                    <td>Simple boolean key-value. No taxonomy overhead needed.</td></tr>
                <tr><td>Images</td>
                    <td>WP media library &rarr; <code>_thumbnail_id</code> + <code>_product_image_gallery</code></td>
                    <td>WC-standard image handling. Fully integrated with WP media library and WC gallery.</td></tr>
            </tbody>
        </table>
    </div>
    <?php
}

// ============================================================
// MAIN CSV IMPORT
// ============================================================

function specparts_import_csv( $filepath, $update_existing = false ) {
    if ( ! is_file( $filepath ) || ! is_readable( $filepath ) ) {
        return [ 'success' => false, 'message' => '<p class="notice notice-error" style="padding:8px 12px">Cannot read uploaded file.</p>' ];
    }

    $handle = @fopen( $filepath, 'r' );
    if ( ! $handle ) {
        return [ 'success' => false, 'message' => '<p class="notice notice-error" style="padding:8px 12px">Cannot open file.</p>' ];
    }

    // Header row — build name->index map (first-occurrence wins for duplicates)
    $headers = fgetcsv( $handle );
    if ( empty( $headers ) ) {
        fclose( $handle );
        return [ 'success' => false, 'message' => '<p class="notice notice-error" style="padding:8px 12px">Empty CSV.</p>' ];
    }
    $col_map = [];
    foreach ( $headers as $i => $h ) {
        $key = strtoupper( trim( $h ) );
        if ( ! isset( $col_map[ $key ] ) ) $col_map[ $key ] = $i;
    }

    // Positional getter — primary access method (avoids duplicate-column collisions)
    $idx = function ( $row, $i ) {
        return isset( $row[ $i ] ) ? trim( $row[ $i ] ) : '';
    };

    // Register WC attributes once before the loop
    specparts_ensure_wc_attribute( 'manufacturer',   'Manufacturer' );
    specparts_ensure_wc_attribute( 'country',        'Country of Origin' );
    specparts_ensure_wc_attribute( 'specs_standard', 'Specifications Standard' );

    // Context state — inherited across rows
    $ctx_parent    = '';
    $ctx_parent_id = 0;
    $ctx_sub       = '';
    $ctx_sub_id    = 0;
    $ctx_series    = '';

    $created = $updated = $skipped = 0;
    $errors  = [];
    $row_num = 1;

    while ( ( $row = fgetcsv( $handle ) ) !== false ) {
        $row_num++;

        // Skip fully blank rows
        if ( empty( array_filter( $row, function ( $v ) { return trim( $v ) !== ''; } ) ) ) {
            continue;
        }

        // ── Extract context fields BEFORE skip check so header rows update state ──
        // col[1] = PRODCUT CATEGORY (client typo), col[2] = SUB CATEGORY, col[3] = PART SERIES
        $row_parent = strtoupper( trim( $idx( $row, 1 ) ) );
        $row_sub    = trim( $idx( $row, 2 ) );
        $row_series = trim( $idx( $row, 3 ) );

        if ( $row_parent && $row_parent !== $ctx_parent ) {
            $ctx_parent    = $row_parent;
            $ctx_parent_id = specparts_ensure_product_category( $row_parent, 0 );
            $ctx_sub       = '';
            $ctx_sub_id    = 0;
        }
        if ( $row_sub && $row_sub !== $ctx_sub ) {
            $ctx_sub    = $row_sub;
            $ctx_sub_id = specparts_ensure_product_category( $row_sub, $ctx_parent_id );
        }
        if ( $row_series ) {
            $ctx_series = $row_series;
        }

        $row_cat_image = trim( $idx( $row, 0 ) );
        if ( $row_cat_image !== '' ) {
            $target_term_id = $ctx_sub_id ?: $ctx_parent_id;
            if ( $target_term_id ) {
                specparts_assign_category_thumbnail_from_csv( $target_term_id, $row_cat_image );
            }
        }

        // Skip header rows (no SKU = no product)
        $sku = strtoupper( trim( $idx( $row, 4 ) ) );
        if ( $sku === '' ) {
            $skipped++;
            continue;
        }

        // Check existing product
        $existing_id = wc_get_product_id_by_sku( $sku );
        if ( $existing_id && ! $update_existing ) {
            specparts_sync_product_taxonomies( $existing_id, $ctx_sub_id, $ctx_series );
            $skipped++;
            continue;
        }

        // ── Pricing tiers (positional — fixed in INFO MOCKUP format) ──
        // Tier costs: 1=[9], 3=[10], 5=[11], 10=[12]
        // Tier-1 shipping: dims=[7], weight=[8] → WC native fields for Shippo
        $ship_dims_tier1   = trim( $idx( $row, 7 ) );
        $ship_weight_tier1 = floatval( $idx( $row, 8 ) );
        $tier_defs = [
            [ 'qty' => 1,  'ci' => 9  ],
            [ 'qty' => 3,  'ci' => 10 ],
            [ 'qty' => 5,  'ci' => 11 ],
            [ 'qty' => 10, 'ci' => 12 ],
        ];
        $tiers = [];
        foreach ( $tier_defs as $td ) {
            $cost = specparts_parse_price( $idx( $row, $td['ci'] ) );
            if ( $cost <= 0 ) continue;
            $tiers[] = [
                'qty'   => $td['qty'],
                'price' => $cost,
            ];
        }

        $regular_price = ! empty( $tiers ) ? $tiers[0]['price'] : 0.0;

        if ( empty( $tiers ) ) {
            $errors[] = "Row {$row_num}: {$sku} imported without any prices — check the PKG COST columns.";
        }

        // Other columns
        $description  = trim( $idx( $row, 5 ) );
        $pkg_qty      = intval( $idx( $row, 6 ) );
        $qty_raw      = trim( $idx( $row, 13 ) );
        $qty_stock    = $qty_raw !== '' ? intval( $qty_raw ) : null;
        $leadtime     = trim( $idx( $row, 14 ) );
        $reorder_lim  = trim( $idx( $row, 15 ) );
        $country      = strtoupper( trim( $idx( $row, 16 ) ) );
        $dfar_raw     = strtoupper( trim( $idx( $row, 17 ) ) );
        $mfr_coc      = trim( $idx( $row, 18 ) );
        $mat_certs    = trim( $idx( $row, 19 ) );
        $proc_certs   = trim( $idx( $row, 20 ) );
        $test_rpts    = trim( $idx( $row, 21 ) );
        $manufacturer = trim( $idx( $row, 22 ) );
        $lot_in_use   = trim( $idx( $row, 23 ) );
        $cost_per_ea  = specparts_parse_price( $idx( $row, 24 ) );
        $piece_wt     = trim( $idx( $row, 26 ) );

        // Optional PRODUCT IMAGE column — index 27, or by header name
        $img_col = '';
        if ( isset( $row[27] ) && trim( $row[27] ) !== '' ) {
            $img_col = trim( $row[27] );
        } elseif ( isset( $col_map['PRODUCT IMAGE'] ) && isset( $row[ $col_map['PRODUCT IMAGE'] ] ) ) {
            $img_col = trim( $row[ $col_map['PRODUCT IMAGE'] ] );
        }

        // ── Build / load product object ──
        $product = $existing_id ? wc_get_product( $existing_id ) : new WC_Product_Simple();

        $product->set_name( $sku );
        $product->set_sku( $sku );
        $product->set_description( $description );
        $product->set_short_description( $description );
        $product->set_regular_price( $regular_price > 0 ? (string) $regular_price : '' );
        $product->set_price( $regular_price > 0 ? (string) $regular_price : '' );
        if ( $qty_stock !== null ) {
            $product->set_manage_stock( true );
            $product->set_stock_quantity( $qty_stock );
            $product->set_stock_status( $qty_stock > 0 ? 'instock' : 'outofstock' );
            $product->set_backorders( 'no' );
        } else {
            // Stock column blank in CSV — assume in stock, no WC stock management
            $product->set_manage_stock( false );
            $product->set_stock_status( 'instock' );
        }

        // Weight + dimensions: tier-1 CSV shipping data → WC native for Shippo.
        // WC weight is PER PACKAGE (cart quantity = number of packages), so the
        // per-piece fallback must be multiplied by the package quantity — a raw
        // piece weight would under-weigh the parcel by the pkg_qty factor.
        if ( $ship_weight_tier1 > 0 ) {
            $product->set_weight( $ship_weight_tier1 );
        } elseif ( $piece_wt !== '' && floatval( $piece_wt ) > 0 ) {
            $pieces_per_pkg = $pkg_qty > 0 ? $pkg_qty : 1;
            $product->set_weight( floatval( $piece_wt ) * $pieces_per_pkg );
        }
        specparts_apply_wc_shipping_dims( $product, $ship_dims_tier1 );

        // Categories — assign to deepest available level
        if ( $ctx_sub_id ) {
            $product->set_category_ids( [ $ctx_sub_id ] );
        } elseif ( $ctx_parent_id ) {
            $product->set_category_ids( [ $ctx_parent_id ] );
        }

        // ── WC Product Attributes ──
        $wc_attrs    = $product->get_attributes();
        $mfr_term_id = 0;
        $cty_term_id = 0;
        $dfar_term_id = 0;

        if ( $manufacturer ) {
            $mfr_term_id = specparts_ensure_attribute_term( 'pa_manufacturer', $manufacturer );
            if ( $mfr_term_id ) {
                $a = new WC_Product_Attribute();
                $a->set_id( wc_attribute_taxonomy_id_by_name( 'manufacturer' ) );
                $a->set_name( 'pa_manufacturer' );
                $a->set_options( [ $mfr_term_id ] );
                $a->set_visible( true );
                $a->set_variation( false );
                $wc_attrs['pa_manufacturer'] = $a;
            }
        }
        if ( $country ) {
            $cty_term_id = specparts_ensure_attribute_term( 'pa_country', $country );
            if ( $cty_term_id ) {
                $a = new WC_Product_Attribute();
                $a->set_id( wc_attribute_taxonomy_id_by_name( 'country' ) );
                $a->set_name( 'pa_country' );
                $a->set_options( [ $cty_term_id ] );
                $a->set_visible( true );
                $a->set_variation( false );
                $wc_attrs['pa_country'] = $a;
            }
        }
        if ( in_array( $dfar_raw, [ 'Y', 'YES', '1' ], true ) ) {
            $dfar_term_id = specparts_ensure_attribute_term( 'pa_specs_standard', 'DFAR' );
            if ( $dfar_term_id ) {
                $a = new WC_Product_Attribute();
                $a->set_id( wc_attribute_taxonomy_id_by_name( 'specs_standard' ) );
                $a->set_name( 'pa_specs_standard' );
                $a->set_options( [ $dfar_term_id ] );
                $a->set_visible( true );
                $a->set_variation( false );
                $wc_attrs['pa_specs_standard'] = $a;
            }
        }
        $product->set_attributes( $wc_attrs );

        // ── Save product (creates post ID) ──
        $pid = $product->save();
        if ( is_wp_error( $pid ) || ! $pid ) {
            $errors[] = "Row {$row_num}: could not save product {$sku}.";
            continue;
        }

        // ── Sync WP taxonomy terms (needed for get_attribute() and layered nav) ──
        if ( $mfr_term_id )  wp_set_object_terms( $pid, $mfr_term_id,  'pa_manufacturer' );
        if ( $cty_term_id )  wp_set_object_terms( $pid, $cty_term_id,  'pa_country' );
        if ( $dfar_term_id ) wp_set_object_terms( $pid, $dfar_term_id, 'pa_specs_standard' );

        // Product Series
        if ( $ctx_series ) {
            $series_id = specparts_ensure_series_term( $ctx_series );
            if ( $series_id ) {
                wp_set_object_terms( $pid, $series_id, specparts_get_series_taxonomy() );
            }
        } else {
            specparts_assign_inferred_series_to_product( $pid );
        }

        // Post meta
        update_post_meta( $pid, '_backorder_leadtime', $leadtime );
        update_post_meta( $pid, '_reorder_limit',      $reorder_lim );
        update_post_meta( $pid, '_mfr_coc',            specparts_bool_meta( $mfr_coc ) );
        update_post_meta( $pid, '_material_certs',     specparts_bool_meta( $mat_certs ) );
        update_post_meta( $pid, '_process_certs',      specparts_bool_meta( $proc_certs ) );
        update_post_meta( $pid, '_test_reports',       specparts_bool_meta( $test_rpts ) );
        update_post_meta( $pid, '_lot_in_use',    $lot_in_use );
        $documents = specparts_resolve_product_documents( $row, $sku, $col_map, $idx );
        update_post_meta( $pid, '_cert_location', $documents['cert_location'] );

        if ( $documents['spec_url'] ) {
            update_post_meta( $pid, '_spec_file_url', $documents['spec_url'] );
            // WC-native: spec sheets live in the Downloadable files list.
            if ( function_exists( 'specparts_set_product_spec_download' ) ) {
                specparts_set_product_spec_download( $pid, $documents['spec_url'] );
            }
        } else {
            delete_post_meta( $pid, '_spec_file_url' );
        }

        if ( $documents['cert_url'] ) {
            update_post_meta( $pid, '_certificate_file_url', $documents['cert_url'] );
        } else {
            delete_post_meta( $pid, '_certificate_file_url' );
        }

        if ( $cost_per_ea > 0 )  update_post_meta( $pid, '_cost_per_ea',  $cost_per_ea );
        if ( $piece_wt !== '' )  update_post_meta( $pid, '_piece_weight', floatval( $piece_wt ) );
        if ( $pkg_qty > 0 )      update_post_meta( $pid, '_pkg_qty',      $pkg_qty );

        // _package_pricing mirror — cart hook and REST API read this (no ACF needed at runtime)
        if ( ! empty( $tiers ) ) {
            update_post_meta( $pid, '_package_pricing', $tiers );
        }

        // ACF repeater: package_pricing_tiers + pkg_qty (only if ACF active)
        if ( ! empty( $tiers ) ) {
            specparts_write_acf_pricing_tiers( $pid, $tiers );
        }

        // Images (WC standard: featured + gallery)
        $image_ids = specparts_resolve_product_images( $img_col, $sku );
        if ( ! empty( $image_ids ) ) {
            $p2 = wc_get_product( $pid );
            $p2->set_image_id( array_shift( $image_ids ) );
            if ( ! empty( $image_ids ) ) {
                $p2->set_gallery_image_ids( $image_ids );
            }
            $p2->save();
        }

        update_post_meta( $pid, '_specparts_import_source', 'csv_import' );

        if ( $existing_id ) $updated++; else $created++;
    }

    fclose( $handle );

    $cls = empty( $errors ) ? 'success' : 'warning';
    $msg = sprintf(
        '<p class="notice notice-%s" style="padding:8px 12px"><strong>Import complete.</strong> &nbsp; Created: %d &nbsp; Updated: %d &nbsp; Skipped: %d.</p>',
        $cls, $created, $updated, $skipped
    );
    if ( $errors ) {
        $msg .= '<ul class="notice notice-warning" style="margin-top:0;padding:8px 12px 8px 28px">';
        foreach ( array_slice( $errors, 0, 25 ) as $e ) {
            $msg .= '<li>' . esc_html( $e ) . '</li>';
        }
        if ( count( $errors ) > 25 ) {
            $msg .= '<li>&hellip; and ' . ( count( $errors ) - 25 ) . ' more errors.</li>';
        }
        $msg .= '</ul>';
    }

    return [ 'success' => empty( $errors ), 'message' => $msg, 'created' => $created, 'updated' => $updated, 'skipped' => $skipped ];
}

// ============================================================
// PREVIEW (DRY RUN) — validates the CSV without changing anything
// ============================================================

/**
 * Parse the CSV exactly like the importer but write NOTHING.
 * Returns a per-row report so the client can verify before importing.
 *
 * @param string $filepath        Uploaded CSV temp path.
 * @param bool   $update_existing Whether existing SKUs would be updated.
 * @return array{success:bool,message:string}
 */
function specparts_preview_csv( $filepath, $update_existing = false ) {
    if ( ! is_file( $filepath ) || ! is_readable( $filepath ) ) {
        return [ 'success' => false, 'message' => '<p class="notice notice-error" style="padding:8px 12px">Cannot read uploaded file.</p>' ];
    }

    $handle = @fopen( $filepath, 'r' );
    if ( ! $handle ) {
        return [ 'success' => false, 'message' => '<p class="notice notice-error" style="padding:8px 12px">Cannot open file.</p>' ];
    }

    $headers = fgetcsv( $handle );
    if ( empty( $headers ) ) {
        fclose( $handle );
        return [ 'success' => false, 'message' => '<p class="notice notice-error" style="padding:8px 12px">Empty CSV.</p>' ];
    }

    if ( count( $headers ) < 30 ) {
        fclose( $handle );
        return [
            'success' => false,
            'message' => '<p class="notice notice-error" style="padding:8px 12px">This file has only ' . count( $headers ) . ' columns — the catalog format needs 30. Are you uploading the right file? Download the sample CSV to compare.</p>',
        ];
    }

    $idx = function ( $row, $i ) {
        return isset( $row[ $i ] ) ? trim( $row[ $i ] ) : '';
    };

    $images_dir = specparts_get_images_dir();
    $specs_dir  = specparts_get_specs_dir();
    $certs_dir  = specparts_get_certs_dir();

    $ctx_parent = '';
    $ctx_sub    = '';
    $ctx_series = '';

    $rows      = [];
    $counts    = [ 'create' => 0, 'update' => 0, 'skip' => 0, 'context' => 0 ];
    $row_num   = 1;
    $max_rows  = 500; // keep the report readable

    while ( ( $row = fgetcsv( $handle ) ) !== false ) {
        $row_num++;

        if ( empty( array_filter( $row, function ( $v ) { return trim( $v ) !== ''; } ) ) ) {
            continue;
        }

        $row_parent = strtoupper( trim( $idx( $row, 1 ) ) );
        $row_sub    = trim( $idx( $row, 2 ) );
        $row_series = trim( $idx( $row, 3 ) );

        if ( $row_parent && $row_parent !== $ctx_parent ) {
            $ctx_parent = $row_parent;
            $ctx_sub    = '';
        }
        if ( $row_sub && $row_sub !== $ctx_sub ) {
            $ctx_sub = $row_sub;
        }
        if ( $row_series ) {
            $ctx_series = $row_series;
        }

        $sku = strtoupper( trim( $idx( $row, 4 ) ) );

        if ( $sku === '' ) {
            $counts['context']++;
            continue;
        }

        $warnings = [];

        // Pricing tiers
        $tier_count = 0;
        foreach ( [ 9, 10, 11, 12 ] as $ci ) {
            if ( specparts_parse_price( $idx( $row, $ci ) ) > 0 ) {
                $tier_count++;
            }
        }
        if ( 0 === $tier_count ) {
            $warnings[] = 'No prices — product would have no price';
        }

        if ( '' === $ctx_parent ) {
            $warnings[] = 'No category context above this row';
        }
        if ( '' === $ctx_series ) {
            $warnings[] = 'No series — will be inferred from SKU';
        }

        // Shipping data (WC native fields — Shippo needs both to quote rates)
        $ship_dims   = trim( $idx( $row, 7 ) );
        $ship_weight = floatval( $idx( $row, 8 ) );
        $piece_wt    = floatval( $idx( $row, 26 ) );

        if ( '' === $ship_dims ) {
            $warnings[] = 'No shipping dimensions — Shippo cannot quote without box size';
        } elseif ( count( array_filter( array_map( 'trim', explode( 'x', preg_replace( '/[×xX\*]/u', 'x', $ship_dims ) ) ) ) ) !== 3 ) {
            $warnings[] = "Invalid dimensions \"{$ship_dims}\" — use HxWxL (e.g. 2x4x6)";
        }

        if ( $ship_weight <= 0 && $piece_wt <= 0 ) {
            $warnings[] = 'No shipping weight (col 9) or piece weight (col 27) — Shippo cannot quote';
        }

        // Media files (first image only, spec, cert) — existence check
        $img_first = trim( explode( ',', $idx( $row, 27 ) )[0] ?? '' );
        if ( $img_first !== '' && ! filter_var( $img_first, FILTER_VALIDATE_URL )
            && ! file_exists( $images_dir . '/' . sanitize_file_name( basename( $img_first ) ) )
            && ! specparts_get_attachment_by_filename( $img_first ) ) {
            $warnings[] = "Image not found: {$img_first}";
        }

        $spec_file = trim( $idx( $row, 28 ) );
        if ( $spec_file !== '' && ! filter_var( $spec_file, FILTER_VALIDATE_URL )
            && ! file_exists( $specs_dir . '/' . sanitize_file_name( basename( $spec_file ) ) )
            && ! specparts_get_attachment_by_filename( $spec_file ) ) {
            $warnings[] = "Spec sheet not found: {$spec_file}";
        }

        $cert_file = trim( $idx( $row, 29 ) );
        if ( $cert_file !== '' && ! filter_var( $cert_file, FILTER_VALIDATE_URL )
            && ! file_exists( $certs_dir . '/' . sanitize_file_name( basename( $cert_file ) ) )
            && ! specparts_get_attachment_by_filename( $cert_file ) ) {
            $warnings[] = "Certificate not found: {$cert_file}";
        }

        $existing_id = wc_get_product_id_by_sku( $sku );

        if ( $existing_id && ! $update_existing ) {
            $action = 'skip';
        } elseif ( $existing_id ) {
            $action = 'update';
        } else {
            $action = 'create';
        }
        $counts[ $action ]++;

        if ( count( $rows ) < $max_rows ) {
            $rows[] = [
                'row'      => $row_num,
                'sku'      => $sku,
                'action'   => $action,
                'path'     => trim( $ctx_parent . ' › ' . $ctx_sub . ' › ' . $ctx_series, ' ›' ),
                'tiers'    => $tier_count,
                'warnings' => $warnings,
            ];
        }
    }

    fclose( $handle );

    $badge = [
        'create' => '<span style="background:#e6f4ea;color:#1e7e34;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700">CREATE</span>',
        'update' => '<span style="background:#e8f0fe;color:#1a56db;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700">UPDATE</span>',
        'skip'   => '<span style="background:#f1f3f4;color:#5f6368;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700">SKIP</span>',
    ];

    $msg = sprintf(
        '<div class="notice notice-info" style="padding:10px 14px"><strong>Preview — nothing was imported.</strong><br>Would create: <b>%d</b> &nbsp;·&nbsp; Would update: <b>%d</b> &nbsp;·&nbsp; Would skip (already exist): <b>%d</b> &nbsp;·&nbsp; Category rows: %d</div>',
        $counts['create'], $counts['update'], $counts['skip'], $counts['context']
    );

    $msg .= '<table class="widefat striped" style="max-width:900px;margin-top:10px"><thead><tr>'
        . '<th style="width:50px">Row</th><th>Part #</th><th style="width:80px">Action</th><th>Category › Series</th><th style="width:50px">Tiers</th><th>Warnings</th>'
        . '</tr></thead><tbody>';

    foreach ( $rows as $r ) {
        $warn_html = $r['warnings']
            ? '<span style="color:#b45309">' . esc_html( implode( ' · ', $r['warnings'] ) ) . '</span>'
            : '<span style="color:#1e7e34">✓ OK</span>';

        $msg .= '<tr>'
            . '<td>' . (int) $r['row'] . '</td>'
            . '<td><code>' . esc_html( $r['sku'] ) . '</code></td>'
            . '<td>' . $badge[ $r['action'] ] . '</td>'
            . '<td>' . esc_html( $r['path'] ) . '</td>'
            . '<td>' . (int) $r['tiers'] . '</td>'
            . '<td>' . $warn_html . '</td>'
            . '</tr>';
    }

    $msg .= '</tbody></table>';

    if ( ( $counts['create'] + $counts['update'] + $counts['skip'] ) > $max_rows ) {
        $msg .= '<p style="color:#666">Showing the first ' . $max_rows . ' product rows.</p>';
    }

    return [ 'success' => true, 'message' => $msg ];
}

// ============================================================
// DEMO DATA
// ============================================================

function specparts_import_demo() {
    specparts_ensure_wc_attribute( 'manufacturer',   'Manufacturer' );
    specparts_ensure_wc_attribute( 'country',        'Country of Origin' );
    specparts_ensure_wc_attribute( 'specs_standard', 'Specifications Standard' );

    $demo = [
        [
            'sku'       => 'DEMO-MS35307-303',
            'name'      => 'DEMO-MS35307-303',
            'desc'      => '1/4-20 X 1/2 HEX CAP SCREW STAINLESS STEEL DFAR',
            'price'     => 57.78,
            'stock'     => 100,
            'country'   => 'USA',
            'dfar'      => true,
            'mfr'       => 'STILLWATER',
            'category'  => 'SCREWS',
            'sub'       => 'HEX CAP SCREWS',
            'series'    => 'MS35307',
            'pkg_qty'   => 50,
            'ship_weight' => 0.65,
            'spec_sheet' => 'DEMO-MS35307-303-spec.pdf',
            'certificate' => 'DEMO-MS35307-303-cert.pdf',
            'mfr_coc'   => '1', 'mat_certs' => '1', 'proc_certs' => '1', 'test_rpts' => '1',
            'tiers' => [
                [ 'qty' => 1,  'price' => 57.78 ],
                [ 'qty' => 3,  'price' => 48.25 ],
                [ 'qty' => 5,  'price' => 42.15 ],
                [ 'qty' => 10, 'price' => 39.90 ],
            ],
        ],
        [
            'sku'       => 'DEMO-MS21045-04',
            'name'      => 'DEMO-MS21045-04',
            'desc'      => '1/4-28 HEX NUT STAINLESS STEEL',
            'price'     => 18.50,
            'stock'     => 500,
            'country'   => 'USA',
            'dfar'      => false,
            'mfr'       => 'LAKEWOOD',
            'category'  => 'NUTS',
            'sub'       => 'HEX NUTS',
            'series'    => 'MS21045',
            'pkg_qty'   => 100,
            'ship_weight' => 0.30,
            'spec_sheet' => 'DEMO-MS21045-04-spec.pdf',
            'certificate' => 'DEMO-MS21045-04-cert.pdf',
            'mfr_coc'   => '1', 'mat_certs' => '1', 'proc_certs' => '', 'test_rpts' => '',
            'tiers' => [
                [ 'qty' => 1,  'price' => 18.50 ],
                [ 'qty' => 3,  'price' => 16.20 ],
                [ 'qty' => 5,  'price' => 14.80 ],
                [ 'qty' => 10, 'price' => 13.90 ],
            ],
        ],
    ];

    $created = 0;
    foreach ( $demo as $d ) {
        if ( wc_get_product_id_by_sku( $d['sku'] ) ) continue;

        $product = new WC_Product_Simple();
        $product->set_name( $d['name'] );
        $product->set_sku( $d['sku'] );
        if ( ! empty( $d['desc'] ) ) $product->set_short_description( $d['desc'] );
        $product->set_regular_price( (string) $d['price'] );
        $product->set_price( (string) $d['price'] );
        $product->set_manage_stock( true );
        $product->set_stock_quantity( $d['stock'] );
        $product->set_stock_status( 'instock' );
        if ( ! empty( $d['ship_weight'] ) ) {
            $product->set_weight( (string) $d['ship_weight'] );
        }

        $parent_id = specparts_ensure_product_category( $d['category'], 0 );
        $sub_id    = specparts_ensure_product_category( $d['sub'], $parent_id );
        $product->set_category_ids( [ $sub_id ] );

        $wc_attrs     = [];
        $mfr_term_id  = specparts_ensure_attribute_term( 'pa_manufacturer', $d['mfr'] );
        $cty_term_id  = specparts_ensure_attribute_term( 'pa_country', $d['country'] );
        $dfar_term_id = $d['dfar'] ? specparts_ensure_attribute_term( 'pa_specs_standard', 'DFAR' ) : 0;

        if ( $mfr_term_id ) {
            $a = new WC_Product_Attribute();
            $a->set_id( wc_attribute_taxonomy_id_by_name( 'manufacturer' ) );
            $a->set_name( 'pa_manufacturer' );
            $a->set_options( [ $mfr_term_id ] );
            $a->set_visible( true );
            $wc_attrs['pa_manufacturer'] = $a;
        }
        if ( $cty_term_id ) {
            $a = new WC_Product_Attribute();
            $a->set_id( wc_attribute_taxonomy_id_by_name( 'country' ) );
            $a->set_name( 'pa_country' );
            $a->set_options( [ $cty_term_id ] );
            $a->set_visible( true );
            $wc_attrs['pa_country'] = $a;
        }
        if ( $dfar_term_id ) {
            $a = new WC_Product_Attribute();
            $a->set_id( wc_attribute_taxonomy_id_by_name( 'specs_standard' ) );
            $a->set_name( 'pa_specs_standard' );
            $a->set_options( [ $dfar_term_id ] );
            $a->set_visible( true );
            $wc_attrs['pa_specs_standard'] = $a;
        }
        $product->set_attributes( $wc_attrs );
        $pid = $product->save();
        if ( ! $pid ) continue;

        if ( $mfr_term_id )  wp_set_object_terms( $pid, $mfr_term_id,  'pa_manufacturer' );
        if ( $cty_term_id )  wp_set_object_terms( $pid, $cty_term_id,  'pa_country' );
        if ( $dfar_term_id ) wp_set_object_terms( $pid, $dfar_term_id, 'pa_specs_standard' );

        $series_id = specparts_ensure_series_term( $d['series'] );
        if ( $series_id ) wp_set_object_terms( $pid, $series_id, specparts_get_series_taxonomy() );

        update_post_meta( $pid, '_mfr_coc',          $d['mfr_coc'] );
        update_post_meta( $pid, '_material_certs',   $d['mat_certs'] );
        update_post_meta( $pid, '_process_certs',    $d['proc_certs'] );
        update_post_meta( $pid, '_test_reports',     $d['test_rpts'] );
        update_post_meta( $pid, '_pkg_qty',          $d['pkg_qty'] );
        update_post_meta( $pid, '_package_pricing',  $d['tiers'] );

        $spec_url = specparts_resolve_product_document_file(
            $d['spec_sheet'] ?? '',
            $d['sku'],
            specparts_get_specs_dir(),
            [ '{SKU}-spec.pdf', '{SKU}.pdf' ]
        );
        $cert_url = specparts_resolve_product_document_file(
            $d['certificate'] ?? '',
            $d['sku'],
            specparts_get_certs_dir(),
            [ '{SKU}-cert.pdf', '{SKU}.pdf' ]
        );
        if ( $spec_url ) {
            update_post_meta( $pid, '_spec_file_url', $spec_url );
        }
        if ( $cert_url ) {
            update_post_meta( $pid, '_certificate_file_url', $cert_url );
        }

        specparts_write_acf_pricing_tiers( $pid, $d['tiers'] );

        update_post_meta( $pid, '_specparts_import_source', 'demo' );
        $created++;
    }

    return [
        'success' => true,
        'message' => "<p class=\"notice notice-success\" style=\"padding:8px 12px\">Demo import complete — {$created} product(s) created.</p>",
    ];
}

// ============================================================
// WC BUILT-IN IMPORTER AUTO-MAPPING
// Maps client CSV headers → WC import fields so the built-in
// WooCommerce Products → Import screen auto-maps without manual setup.
// ============================================================

add_filter( 'woocommerce_product_import_mapping_default_columns', function ( $columns ) {
    // P/N = product title (and SKU); DESCRIPTION = short description
    $columns['P/N']                             = 'name';
    $columns['DESCRIPTION']                     = 'short_description';

    // Pricing
    $columns['1 PKG COST']                      = 'regular_price';
    $columns['COST PER EA']                     = 'sale_price';

    // Stock
    $columns['QUANTITY IN STOCK']               = 'stock_quantity';
    $columns['QTY IN STOCK']                    = 'stock_quantity';

    // Weight (piece weight = WC product weight)
    $columns['PER PIECE WEIGHT (INTERNAL USE)'] = 'weight';
    $columns['PER PIECE WEIGHT']                = 'weight';

    // Categories (header typo in client file + normalised form)
    $columns['PRODCUT CATEGORY']                = 'category_ids';
    $columns['PRODUCT CATEGORY']                = 'category_ids';

    // Attributes
    $columns['MFR ']                            = 'attribute:pa_manufacturer';
    $columns['MFR']                             = 'attribute:pa_manufacturer';
    $columns['MANUFACTURER']                    = 'attribute:pa_manufacturer';
    $columns['COUNTRY OF ORIGIN']               = 'attribute:pa_country';
    $columns['DFAR?']                           = 'attribute:pa_specs_standard';

    // Images
    $columns['PRODUCT IMAGE']                   = 'images';

    return $columns;
} );

// ============================================================
// CLEANUP DEMO DATA
// ============================================================

function specparts_clean_demo_data() {
    global $wpdb;
    $ids = $wpdb->get_col(
        "SELECT post_id FROM {$wpdb->postmeta}
         WHERE meta_key = '_specparts_import_source' AND meta_value = 'demo'"
    );
    $deleted = 0;
    foreach ( $ids as $id ) {
        if ( wp_delete_post( intval( $id ), true ) ) $deleted++;
    }
    return [
        'success' => true,
        'message' => "<p class=\"notice notice-success\" style=\"padding:8px 12px\">Removed {$deleted} demo product(s).</p>",
    ];
}
