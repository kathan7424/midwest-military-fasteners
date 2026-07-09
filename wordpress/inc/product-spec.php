<?php
/**
 * Product documents.
 *
 * Spec sheets  — WooCommerce native Downloadable files (multiple supported,
 *                managed in Product data → General → Downloadable files).
 *                Legacy `_spec_file_url` meta remains a read fallback.
 * Certificate  — custom `_certificate_file_url` meta (PDF, image, or doc),
 *                edited via a media-picker field on the General tab.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ============================================================
// SPEC FILE HELPERS (single source of truth for all readers)
// ============================================================

/**
 * All spec files for a product: WC downloads first, legacy meta fallback.
 *
 * @param int $product_id Product ID.
 * @return array<int, array{name:string,url:string}>
 */
function specparts_get_product_spec_files( $product_id ) {
    $product_id = (int) $product_id;
    $files      = [];

    $product = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;

    if ( $product ) {
        foreach ( $product->get_downloads() as $download ) {
            $url = (string) $download->get_file();

            if ( $url === '' ) {
                continue;
            }

            $files[] = [
                'name' => (string) $download->get_name() ?: __( 'Spec Sheet', 'midwest-military' ),
                'url'  => $url,
            ];
        }
    }

    if ( empty( $files ) ) {
        $legacy_url = (string) get_post_meta( $product_id, '_spec_file_url', true );

        if ( $legacy_url !== '' ) {
            $files[] = [
                'name' => __( 'Spec Sheet', 'midwest-military' ),
                'url'  => $legacy_url,
            ];
        }
    }

    return $files;
}

/**
 * Primary spec file URL (first WC download, else legacy meta).
 *
 * @param int $product_id Product ID.
 * @return string
 */
function specparts_get_product_spec_url( $product_id ) {
    $files = specparts_get_product_spec_files( $product_id );

    return $files[0]['url'] ?? '';
}

/**
 * Register/replace the "Spec Sheet" entry in the product's WC downloads.
 * Used by the CSV importer so spec sheets land in the WooCommerce-native
 * Downloadable files list (other manually added downloads are preserved).
 *
 * @param int    $product_id Product ID.
 * @param string $url        Public file URL.
 * @param string $name       Download label.
 */
function specparts_set_product_spec_download( $product_id, $url, $name = 'Spec Sheet' ) {
    if ( ! function_exists( 'wc_get_product' ) ) {
        return;
    }

    $product = wc_get_product( (int) $product_id );
    $url     = esc_url_raw( (string) $url );

    if ( ! $product || $url === '' ) {
        return;
    }

    $downloads = [];

    foreach ( $product->get_downloads() as $download ) {
        if ( (string) $download->get_name() === $name ) {
            continue; // replaced below
        }
        $downloads[] = $download;
    }

    $spec = new WC_Product_Download();
    $spec->set_id( md5( $url ) );
    $spec->set_name( $name );
    $spec->set_file( $url );
    $downloads[] = $spec;

    $product->set_downloadable( true );
    $product->set_downloads( $downloads );
    $product->save();
}

// ============================================================
// ADMIN — Certificate field (General tab)
// ============================================================

add_action(
    'woocommerce_product_options_general_product_data',
    static function () {
        global $post;

        $cert_url = $post ? get_post_meta( $post->ID, '_certificate_file_url', true ) : '';
        ?>
        <div class="options_group specparts-product-documents">
            <p class="form-field">
                <label><?php esc_html_e( 'Spec Sheets', 'midwest-military' ); ?></label>
                <span class="description">
                    <?php esc_html_e( 'Managed in the WooCommerce "Downloadable files" list above (check "Downloadable"). Multiple files supported.', 'midwest-military' ); ?>
                </span>
            </p>

            <p class="form-field _certificate_file_url_field specparts-doc-field">
                <label for="_certificate_file_url"><?php esc_html_e( 'Certificate (PDF / image / doc)', 'midwest-military' ); ?></label>
                <input
                    type="text"
                    class="short"
                    style="width:50%"
                    id="_certificate_file_url"
                    name="_certificate_file_url"
                    value="<?php echo esc_url( $cert_url ); ?>"
                    placeholder="https://example.com/certificate.pdf"
                />
                <button
                    type="button"
                    class="button specparts-upload-doc"
                    data-target="_certificate_file_url"
                ><?php esc_html_e( 'Upload / Select', 'midwest-military' ); ?></button>
                <?php if ( $cert_url ) : ?>
                    <a
                        href="<?php echo esc_url( $cert_url ); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="button"
                    ><?php esc_html_e( 'View', 'midwest-military' ); ?></a>
                <?php endif; ?>
                <?php echo wc_help_tip( __( 'Product certificate download shown on the frontend. Accepts PDF, image, or document files.', 'midwest-military' ) ); ?>
            </p>
        </div>
        <?php
    }
);

add_action(
    'woocommerce_process_product_meta',
    static function ( $product_id ) {
        $url = isset( $_POST['_certificate_file_url'] )
            ? esc_url_raw( wp_unslash( $_POST['_certificate_file_url'] ) )
            : '';

        if ( $url ) {
            update_post_meta( $product_id, '_certificate_file_url', $url );
        } else {
            delete_post_meta( $product_id, '_certificate_file_url' );
        }
    }
);

/**
 * WP Media Library picker for the certificate field (product edit screen only).
 * Accepts PDFs, images, and Word documents.
 */
add_action(
    'admin_enqueue_scripts',
    static function ( $hook ) {
        if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) {
            return;
        }

        if ( 'product' !== get_post_type() && 'product' !== ( $_GET['post_type'] ?? '' ) ) {
            return;
        }

        wp_enqueue_media();

        $script = <<<'JS'
jQuery(function ($) {
    $(document).on('click', '.specparts-upload-doc', function (e) {
        e.preventDefault();

        var targetId = $(this).data('target');
        var frame = wp.media({
            title: 'Select or upload certificate',
            library: {
                type: [
                    'application/pdf',
                    'image',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ]
            },
            button: { text: 'Use this file' },
            multiple: false
        });

        frame.on('select', function () {
            var attachment = frame.state().get('selection').first().toJSON();
            $('#' + targetId).val(attachment.url).trigger('change');
        });

        frame.open();
    });
});
JS;

        wp_add_inline_script( 'media-editor', $script );
    }
);
