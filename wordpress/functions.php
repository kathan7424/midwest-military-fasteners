<?php
/**
 * midwest-military functions and definitions
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package midwest-military
 */

if ( ! defined( '_S_VERSION' ) ) {
	// Replace the version number of the theme on each release.
	define( '_S_VERSION', '1.0.0' );
}

// ============================================================
// DEFER WOOCOMMERCE TRANSACTIONAL EMAILS
// SMTP on this host can hang for ~30s per email. Order emails sent inline
// during Store API checkout blocked the request past Pantheon's 60s limit
// (504). Deferring queues them via wp-cron — checkout responds instantly.
// ============================================================
add_filter( 'woocommerce_defer_transactional_emails', '__return_true' );

/**
 * Sets up theme defaults and registers support for various WordPress features.
 *
 * Note that this function is hooked into the after_setup_theme hook, which
 * runs before the init hook. The init hook is too late for some features, such
 * as indicating support for post thumbnails.
 */
function midwest_military_setup() {
	/*
		* Make theme available for translation.
		* Translations can be filed in the /languages/ directory.
		* If you're building a theme based on midwest-military, use a find and replace
		* to change 'midwest-military' to the name of your theme in all the template files.
		*/
	load_theme_textdomain( 'midwest-military', get_template_directory() . '/languages' );

	// Add default posts and comments RSS feed links to head.
	add_theme_support( 'automatic-feed-links' );

	/*
		* Let WordPress manage the document title.
		* By adding theme support, we declare that this theme does not use a
		* hard-coded <title> tag in the document head, and expect WordPress to
		* provide it for us.
		*/
	add_theme_support( 'title-tag' );

	/*
		* Enable support for Post Thumbnails on posts and pages.
		*
		* @link https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/
		*/
	add_theme_support( 'post-thumbnails' );

	// This theme uses wp_nav_menu() in one location.
	register_nav_menus(
		array(
			'menu-1' => esc_html__( 'Primary', 'midwest-military' ),
		)
	);

	/*
		* Switch default core markup for search form, comment form, and comments
		* to output valid HTML5.
		*/
	add_theme_support(
		'html5',
		array(
			'search-form',
			'comment-form',
			'comment-list',
			'gallery',
			'caption',
			'style',
			'script',
		)
	);

	// Set up the WordPress core custom background feature.
	add_theme_support(
		'custom-background',
		apply_filters(
			'midwest_military_custom_background_args',
			array(
				'default-color' => 'ffffff',
				'default-image' => '',
			)
		)
	);

	// Add theme support for selective refresh for widgets.
	add_theme_support( 'customize-selective-refresh-widgets' );

	/**
	 * Add support for core custom logo.
	 *
	 * @link https://codex.wordpress.org/Theme_Logo
	 */
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 250,
			'width'       => 250,
			'flex-width'  => true,
			'flex-height' => true,
		)
	);
}
add_action( 'after_setup_theme', 'midwest_military_setup' );

/**
 * Set the content width in pixels, based on the theme's design and stylesheet.
 *
 * Priority 0 to make it available to lower priority callbacks.
 *
 * @global int $content_width
 */
function midwest_military_content_width() {
	$GLOBALS['content_width'] = apply_filters( 'midwest_military_content_width', 640 );
}
add_action( 'after_setup_theme', 'midwest_military_content_width', 0 );

/**
 * Register widget area.
 *
 * @link https://developer.wordpress.org/themes/functionality/sidebars/#registering-a-sidebar
 */
function midwest_military_widgets_init() {
	register_sidebar(
		array(
			'name'          => esc_html__( 'Sidebar', 'midwest-military' ),
			'id'            => 'sidebar-1',
			'description'   => esc_html__( 'Add widgets here.', 'midwest-military' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s">',
			'after_widget'  => '</section>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'midwest_military_widgets_init' );

/**
 * Enqueue scripts and styles.
 */
function midwest_military_scripts() {
	wp_enqueue_style( 'midwest-military-style', get_stylesheet_uri(), array(), _S_VERSION );
	wp_style_add_data( 'midwest-military-style', 'rtl', 'replace' );

	wp_enqueue_script( 'midwest-military-navigation', get_template_directory_uri() . '/js/navigation.js', array(), _S_VERSION, true );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'midwest_military_scripts' );

/**
 * Implement the Custom Header feature.
 */
require get_template_directory() . '/inc/custom-header.php';

/**
 * Custom template tags for this theme.
 */
require get_template_directory() . '/inc/template-tags.php';

/**
 * Functions which enhance the theme by hooking into WordPress.
 */
require get_template_directory() . '/inc/template-functions.php';

/**
 * Customizer additions.
 */
require get_template_directory() . '/inc/customizer.php';

/**
 * Load Jetpack compatibility file.
 */
if ( defined( 'JETPACK__VERSION' ) ) {
	require get_template_directory() . '/inc/jetpack.php';
}

/**
 * WooCommerce support.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Add WooCommerce support.
 */
function mmf_woocommerce_setup() {

	add_theme_support( 'woocommerce' );

	add_theme_support(
		'wc-product-gallery-zoom'
	);

	add_theme_support(
		'wc-product-gallery-lightbox'
	);

	add_theme_support(
		'wc-product-gallery-slider'
	);
}
add_action( 'after_setup_theme', 'mmf_woocommerce_setup' );


/**
 * Theme setup.
 */
function mmf_setup() {

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );

	register_nav_menus(
		array(
			'primary' => __( 'Primary Menu', 'mmf' ),
			'footer'  => __( 'Footer Menu', 'mmf' ),		)
	);

}

add_action( 'after_setup_theme', 'mmf_setup' );

require get_template_directory() . '/inc/api.php';



/**
 * Allow SVG uploads.
 */
add_filter( 'upload_mimes', 'theme_allow_svg_uploads' );

function theme_allow_svg_uploads( $mimes ) {
	// SVGs can carry executable script; only trusted admins may upload them.
	if ( current_user_can( 'manage_options' ) ) {
		$mimes['svg'] = 'image/svg+xml';
	}

	return $mimes;
}




/**
 * Theme functions — Industrial Spec Parts
 *
 * Architecture (WooCommerce Standard):
 *   WC Native  : SKU, title, description, price, weight, stock, categories,
 *                attributes (manufacturer, country, specs_standard/DFAR)
 *   Custom Tax : product_series
 *   ACF ONLY   : package_pricing_tiers repeater (qty + price) + pkg_qty
 *   Post Meta  : _package_pricing (qty + price tiers for cart/API),
 *                _backorder_leadtime, _reorder_limit, _mfr_coc,
 *                _material_certs, _process_certs, _test_reports,
 *                _lot_in_use, _cert_location, _cost_per_ea, _spec_file_url,
 *                _certificate_file_url
 */

if (!defined('ABSPATH')) exit;

if ( ! function_exists( 'specparts_get_series_taxonomy' ) ) {
    /**
     * Resolve the registered product series taxonomy slug.
     * Live site uses product-series; legacy/import code used product_series.
     */
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

if ( ! function_exists( 'specparts_register_series_taxonomy' ) ) {
    /**
     * Register the product series taxonomy when it is not already provided by another plugin.
     */
    function specparts_register_series_taxonomy() {
        $taxonomy = specparts_get_series_taxonomy();
        if ( taxonomy_exists( $taxonomy ) ) {
            return;
        }

        register_taxonomy(
            $taxonomy,
            [ 'product' ],
            [
                'labels'            => [
                    'name'          => 'Product Series',
                    'singular_name' => 'Product Series',
                ],
                'hierarchical'      => true,
                'public'            => true,
                'show_ui'           => true,
                'show_admin_column' => true,
                'show_in_rest'      => true,
                'rewrite'           => [ 'slug' => 'product-series' ],
            ]
        );
    }
    add_action( 'init', 'specparts_register_series_taxonomy', 0 );
}

require_once get_template_directory() . '/inc/shortcode.php';
require_once get_template_directory() . '/inc/catalog-api.php';
require_once get_template_directory() . '/inc/product-spec.php';
require_once get_template_directory() . '/inc/import.php';
require_once get_template_directory() . '/inc/auth.php';
require_once get_template_directory() . '/inc/cart.php';
require_once get_template_directory() . '/inc/tax-exemption.php';
require_once get_template_directory() . '/inc/tax-exemption-admin.php';
require_once get_template_directory() . '/inc/order-documents.php';
require_once get_template_directory() . '/inc/net30.php';
require_once get_template_directory() . '/inc/headless-frontend.php';


// ============================================================
// HELPER: Normalize package pricing tiers to qty + price only.
// ============================================================
if (!function_exists('parts_catalog_normalize_pricing_tiers')) {
    function parts_catalog_normalize_pricing_tiers($pricing) {
        if (!is_array($pricing)) {
            return [];
        }

        $normalized = [];
        foreach ($pricing as $tier) {
            if (!is_array($tier)) {
                continue;
            }

            $qty   = intval($tier['qty'] ?? 0);
            $price = floatval($tier['price'] ?? 0);
            if ($qty > 0 && $price > 0) {
                $normalized[] = [
                    'qty'   => $qty,
                    'price' => $price,
                ];
            }
        }

        usort($normalized, function ($a, $b) {
            return $a['qty'] - $b['qty'];
        });

        return $normalized;
    }
}

// ============================================================
// HELPER: Get package pricing — ACF first, raw meta fallback
// Used by single product display and REST API.
// ============================================================
if (!function_exists('parts_catalog_get_product_package_pricing')) {
    function parts_catalog_get_product_package_pricing($product_id) {
        // Try ACF repeater
        if (function_exists('get_field')) {
            $tiers = get_field('package_pricing_tiers', $product_id);
            if (!empty($tiers) && is_array($tiers)) {
                return parts_catalog_normalize_pricing_tiers($tiers);
            }
        }
        // Fallback: raw _package_pricing meta (set by importer)
        $pricing = get_post_meta($product_id, '_package_pricing', true);
        if (empty($pricing)) return [];
        return parts_catalog_normalize_pricing_tiers($pricing);
    }
}

// ============================================================
// ACF SYNC: keep _package_pricing meta in sync after manual ACF save
// so cart pricing and REST API still work without re-import.
// ============================================================
add_action('acf/save_post', function ($post_id) {
    if (get_post_type($post_id) !== 'product') return;

    $tiers = get_field('package_pricing_tiers', $post_id);
    if (empty($tiers) || !is_array($tiers)) return;

    $pricing = parts_catalog_normalize_pricing_tiers($tiers);
    if (empty($pricing)) return;

    update_post_meta($post_id, '_package_pricing', $pricing);

    // Sync WC price = tier-1 price
    if ($pricing[0]['qty'] === 1) {
        update_post_meta($post_id, '_price', $pricing[0]['price']);
        update_post_meta($post_id, '_regular_price', $pricing[0]['price']);
    }
}, 20);

// ============================================================
// DYNAMIC CART PRICING: applies package tier price at checkout
// ============================================================
add_action('woocommerce_before_calculate_totals', function ($cart) {
    if (is_admin() && !defined('DOING_AJAX')) return;

    foreach ($cart->get_cart() as $item) {
        $pricing = parts_catalog_get_product_package_pricing($item['product_id']);
        if (empty($pricing)) continue;

        // Sort descending so first match wins
        usort($pricing, function($a, $b) { return $b['qty'] - $a['qty']; });

        $matched = null;
        foreach ($pricing as $tier) {
            if ($item['quantity'] >= $tier['qty']) {
                $matched = floatval($tier['price']);
                break;
            }
        }

        if ($matched === null) {
            $matched = (float) $item['data']->get_regular_price();
        }
        if ($matched > 0) {
            $item['data']->set_price($matched);
        }
    }
}, 20, 1);

// ============================================================
// THEME SETUP
// ============================================================
add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'script', 'style']);
    add_theme_support('custom-logo');
    add_theme_support('woocommerce', [
        'thumbnail_image_width' => 300,
        'single_image_width'    => 600,
        'product_grid'          => ['default_rows' => 3, 'min_rows' => 1, 'default_columns' => 4, 'min_columns' => 1, 'max_columns' => 6],
    ]);
    add_theme_support('wc-product-gallery-zoom');
    add_theme_support('wc-product-gallery-lightbox');
    add_theme_support('wc-product-gallery-slider');
    register_nav_menus([
        'primary' => 'Primary Navigation',
        'footer'  => 'Footer Links',
    ]);
});

// ============================================================
// ENQUEUE
// ============================================================
add_action('wp_enqueue_scripts', function () {
    $ver = wp_get_theme()->get('Version');
    wp_enqueue_style('spec-parts-theme', get_stylesheet_uri(), [], $ver);

    if (is_page() && has_shortcode(get_post()->post_content ?? '', 'parts_catalog')) {
        wp_enqueue_style('spec-parts-catalog', get_template_directory_uri() . '/assets/css/catalog.css', ['spec-parts-theme'], $ver);
    }
    if (is_product()) {
        wp_enqueue_style('spec-parts-product', get_template_directory_uri() . '/assets/css/product.css', ['spec-parts-theme'], $ver);
    }

    wp_enqueue_script('spec-parts-main', get_template_directory_uri() . '/assets/js/main.js', ['jquery'], $ver, true);
    wp_localize_script('spec-parts-main', 'specPartsTheme', [
        'ajaxUrl'   => admin_url('admin-ajax.php'),
        'restUrl'   => esc_url_raw(rest_url('spec-parts/v1/')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'cartUrl'   => wc_get_cart_url(),
        'isProduct' => is_product() ? 1 : 0,
    ]);
});

add_filter('woocommerce_enqueue_styles', '__return_empty_array');
add_filter('woocommerce_show_page_title', '__return_false');

// ============================================================
// WIDGET AREAS
// ============================================================
add_action('widgets_init', function () {
    register_sidebar([
        'name'          => 'Catalog Sidebar',
        'id'            => 'catalog-sidebar',
        'before_widget' => '<div class="sp-widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="sp-widget-title">',
        'after_title'   => '</h3>',
    ]);
});

// ============================================================
// WC CONTENT WRAPPERS
// ============================================================
add_action('init', function () {
    remove_action('woocommerce_before_main_content', 'woocommerce_breadcrumb', 20);
});
remove_action('woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10);
remove_action('woocommerce_after_main_content',  'woocommerce_output_content_wrapper_end', 10);
add_action('woocommerce_before_main_content', function () { echo '<div class="sp-container"><div class="sp-wc-content">'; }, 10);
add_action('woocommerce_after_main_content',  function () { echo '</div></div>'; }, 10);

// ============================================================
// SINGLE PRODUCT: Package Pricing Tiers table
// ============================================================
add_action('woocommerce_after_single_product_summary', function () {
    global $product;
    if (!$product) return;
    $tiers = parts_catalog_get_product_package_pricing($product->get_id());
    if (empty($tiers)) return;
    ?>
    <div class="sp-product-wrap" style="margin-top:30px">
        <p class="sp-pricing-title">Package Pricing Tiers</p>
        <table class="sp-pricing-table">
            <thead>
                <tr>
                    <th>Min Packages</th>
                    <th>Price / Package</th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($tiers as $tier): ?>
                <tr>
                    <td><?php echo intval($tier['qty']); ?> pkg</td>
                    <td><strong>$<?php echo number_format(floatval($tier['price']), 2); ?></strong></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php
}, 15);

// ============================================================
// SINGLE PRODUCT: Compliance + Country badges
// Reads from WC attributes and post meta — NOT ACF fields
// ============================================================
add_action('woocommerce_single_product_summary', function () {
    global $product;
    if (!$product) return;
    $pid    = $product->get_id();
    $badges = [];

    // DFAR → WC attribute pa_specs_standard
    if ($product->get_attribute('pa_specs_standard')) {
        $badges[] = ['dfar', 'DFAR'];
    }

    // Compliance flags → post meta
    if (get_post_meta($pid, '_mfr_coc', true))       $badges[] = ['certs', 'MFR C of C'];
    if (get_post_meta($pid, '_material_certs', true)) $badges[] = ['certs', 'Material Certs'];
    if (get_post_meta($pid, '_process_certs', true))  $badges[] = ['certs', 'Process Certs'];
    if (get_post_meta($pid, '_test_reports', true))   $badges[] = ['certs', 'Test Reports'];

    // Country → WC attribute pa_country
    $country = $product->get_attribute('pa_country');
    if ($country) $badges[] = ['country', 'Made in ' . $country];

    if (empty($badges)) return;
    echo '<div class="sp-badges">';
    foreach ($badges as $b) {
        echo '<span class="sp-badge sp-badge-' . esc_attr($b[0]) . '">' . esc_html($b[1]) . '</span>';
    }
    echo '</div>';
}, 25);

// ============================================================
// SINGLE PRODUCT: Spec sheet + certificate downloads
// ============================================================
add_action('woocommerce_single_product_summary', function () {
    global $product;
    if (!$product) return;

    $pid      = $product->get_id();
    $spec_url = function_exists('specparts_get_product_spec_url') ? specparts_get_product_spec_url($pid) : get_post_meta($pid, '_spec_file_url', true);
    $cert_url = get_post_meta($pid, '_certificate_file_url', true);

    if (empty($spec_url) && empty($cert_url)) {
        return;
    }

    echo '<div class="sp-product-documents">';

    if (!empty($spec_url)) {
        echo '<a href="' . esc_url($spec_url) . '" class="sp-spec-btn" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Spec Sheet (PDF)
        </a>';
    }

    if (!empty($cert_url)) {
        echo '<a href="' . esc_url($cert_url) . '" class="sp-spec-btn" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Certificate (PDF)
        </a>';
    }

    echo '</div>';
}, 35);

// ============================================================
// MISC
// ============================================================
add_filter('body_class', function ($classes) {
    $classes[] = 'spec-parts-theme';
    if (is_page() && has_shortcode(get_post()->post_content ?? '', 'parts_catalog')) {
        $classes[] = 'catalog-page';
    }
    return $classes;
});

function specparts_nav_fallback() {
    echo '<a href="' . esc_url(home_url('/')) . '" class="sp-nav-link">Home</a>';
    if (function_exists('wc_get_page_id')) {
        echo '<a href="' . esc_url(get_permalink(wc_get_page_id('shop'))) . '" class="sp-nav-link">Shop</a>';
    }
}

function specparts_cart_count() {
    if (!function_exists('WC') || !WC()->cart) return 0;
    return WC()->cart->get_cart_contents_count();
}

add_filter('document_title_separator', function () { return '|'; });


function gf_current_year_shortcode() {
return date('Y');
}
add_shortcode('current_year', 'gf_current_year_shortcode');