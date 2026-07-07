<?php
/**
 * Shortcode: [parts_catalog]
 *
 * Parameters:
 *   series   - pre-select a series slug (e.g. series="ms35307")
 *   per_page - products per page (default 20)
 *   search   - 1|0 enable live search filter (default 1)
 */

if (!defined('ABSPATH')) exit;

add_shortcode('parts_catalog', 'specparts_render_catalog');

function specparts_render_catalog($atts) {
    $atts = shortcode_atts([
        'series'   => '',
        'per_page' => 20,
        'search'   => 1,
    ], $atts, 'parts_catalog');

    $series_taxonomy = specparts_get_series_taxonomy();

    // ── Build sidebar tree: parent → children → series ──
    $get_series_by_category = function ( $cat_term_taxonomy_id ) use ( $series_taxonomy ) {
        global $wpdb;
        return $wpdb->get_results( $wpdb->prepare(
            "
            SELECT DISTINCT t.name, t.slug
            FROM {$wpdb->terms} t
            INNER JOIN {$wpdb->term_taxonomy} tt   ON t.term_id = tt.term_id
            INNER JOIN {$wpdb->term_relationships} tr     ON tt.term_taxonomy_id = tr.term_taxonomy_id
            INNER JOIN {$wpdb->term_relationships} tr_cat ON tr.object_id = tr_cat.object_id
            WHERE tt.taxonomy = %s
              AND tr_cat.term_taxonomy_id = %d
            ORDER BY t.name ASC
        ",
            $series_taxonomy,
            $cat_term_taxonomy_id
        ) );
    };

    $parents = get_terms(['taxonomy' => 'product_cat', 'parent' => 0, 'hide_empty' => false, 'orderby' => 'name']);
    $sidebar_groups = [];

    foreach ($parents as $parent) {
        if ($parent->slug === 'uncategorized') continue;
        $children = get_terms(['taxonomy' => 'product_cat', 'parent' => $parent->term_id, 'hide_empty' => false, 'orderby' => 'name']);
        foreach ($children as $child) {
            $child->series = $get_series_by_category($child->term_taxonomy_id);
        }
        $parent->children = $children;
        $sidebar_groups[] = $parent;
    }

    // ── Active series & category ──
    $active_series = isset($_GET['series']) ? sanitize_text_field($_GET['series']) : $atts['series'];
    if (empty($active_series)) {
        $first = get_terms( [ 'taxonomy' => $series_taxonomy, 'hide_empty' => true, 'number' => 1 ] );
        if (!empty($first) && !is_wp_error($first)) $active_series = $first[0]->slug;
    }

    $active_cat_id = 0;
    if (!empty($active_series)) {
        $sample = get_posts([
            'post_type'      => 'product',
            'posts_per_page' => 1,
            'tax_query'      => [ [ 'taxonomy' => $series_taxonomy, 'field' => 'slug', 'terms' => $active_series ] ],
            'fields'         => 'ids',
        ]);
        if (!empty($sample)) {
            foreach (wp_get_post_terms($sample[0], 'product_cat') as $cat) {
                if ($cat->parent !== 0) { $active_cat_id = $cat->term_id; break; }
            }
        }
    }

    // ── Query products ──
    $query_args = [
        'post_type'      => 'product',
        'posts_per_page' => intval($atts['per_page']),
        'post_status'    => 'publish',
        'orderby'        => 'title',
        'order'          => 'ASC',
    ];
    if ($active_series) {
        $query_args['tax_query'] = [ [ 'taxonomy' => $series_taxonomy, 'field' => 'slug', 'terms' => $active_series ] ];
    }
    $query = new WP_Query($query_args);

    ob_start();
    ?>
    <style>
    .psc-catalog-container{display:flex;gap:25px;margin:20px 0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
    .psc-sidebar{width:240px;flex-shrink:0;border-right:1px solid #e0e0e0;padding-right:20px}
    .psc-content-area{flex:1;min-width:0}
    .psc-parent-group{margin-bottom:20px}
    .psc-parent-header{font-size:14px;font-weight:700;color:#333;text-transform:uppercase;border-bottom:2px solid #ddd;padding-bottom:6px;margin-bottom:10px;letter-spacing:.5px}
    .psc-child-header{font-size:13px;font-weight:600;color:#4f5b66;padding:6px 8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-radius:4px;transition:background .15s,color .15s}
    .psc-child-header:hover{background:#f0f4f8;color:#0f355c}
    .psc-child-item.active>.psc-child-header{color:#0f355c;font-weight:700;background:#e1ecf4}
    .psc-arrow{font-size:9px;color:#888;transition:transform .2s}
    .psc-child-item.active .psc-arrow{transform:rotate(90deg)}
    .psc-series-list{padding-left:15px;margin:4px 0 0 8px;border-left:1px solid #e0e0e0}
    .psc-series-link{display:block;padding:5px 8px;font-size:12px;color:#0056b3;text-decoration:none;border-radius:4px;transition:background .15s}
    .psc-series-link:hover{background:#f0f4f8}
    .psc-series-link.active{color:#c8960c;font-weight:700;background:#fffdf5}
    .psc-series-title{font-size:16px;font-weight:700;color:#0f355c;margin-bottom:15px;border-bottom:2px solid #0f355c;padding-bottom:6px;letter-spacing:.5px;text-transform:uppercase}
    .psc-search-container{margin-bottom:15px}
    .psc-search{width:100%;max-width:380px;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:13px;outline:none;transition:border-color .2s}
    .psc-search:focus{border-color:#0f355c}
    .psc-table{width:100%;border-collapse:collapse;margin-bottom:10px}
    .psc-table thead tr{background:#0f355c;color:#fff}
    .psc-table thead th{padding:10px 12px;font-weight:600;font-size:12px;text-transform:uppercase;text-align:left;white-space:nowrap}
    .psc-table thead th.center{text-align:center}
    .psc-table tbody tr{border-bottom:1px solid #e0e0e0;transition:background .15s}
    .psc-table tbody tr:hover{background:#f4f7fa}
    .psc-table td{padding:10px 12px;vertical-align:middle}
    .psc-table td.center{text-align:center}
    .psc-pn a{color:#0056b3;text-decoration:none;font-weight:600;white-space:nowrap}
    .psc-pn a:hover{text-decoration:underline}
    .psc-price{white-space:nowrap}
    .psc-badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;background:#e1f5e1;color:#2e7d32;letter-spacing:.5px}
    .psc-download a{color:#c8960c;text-decoration:none;font-weight:600;font-size:12px;display:inline-flex;align-items:center;gap:4px}
    .psc-download a:hover{color:#a07604;text-decoration:underline}
    .psc-order-cell{display:flex;align-items:center;gap:6px;white-space:nowrap}
    .psc-qty-input{width:55px;height:30px;padding:4px;border:1px solid #bbb;border-radius:4px;text-align:center;font-size:13px}
    .psc-add-btn{background:#c8960c;color:#fff;border:none;padding:6px 14px;height:30px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;transition:background .2s}
    .psc-add-btn:hover{background:#a07604}
    .psc-notice{font-size:11px;color:#666;margin-top:10px;font-style:italic}
    .psc-stock-label{font-size:11px;color:#2e7d32;font-weight:600}
    .psc-stock-low{color:#c62828}
    @media(max-width:768px){
        .psc-catalog-container{flex-direction:column}
        .psc-sidebar{width:100%;border-right:none;border-bottom:1px solid #e0e0e0;padding-right:0;padding-bottom:20px;margin-bottom:20px}
        .psc-table thead{display:none}
        .psc-table td{display:block;padding:8px;text-align:left!important}
        .psc-table td::before{content:attr(data-label)": ";font-weight:700;display:inline-block;width:130px}
        .psc-order-cell{display:inline-flex}
    }
    </style>

    <div class="psc-catalog-container">

        <!-- ── Sidebar ── -->
        <div class="psc-sidebar">
            <?php foreach ($sidebar_groups as $parent): ?>
            <div class="psc-parent-group">
                <div class="psc-parent-header"><?php echo esc_html(strtoupper($parent->name)); ?></div>
                <?php foreach ($parent->children as $child):
                    $is_active = ($active_cat_id === $child->term_id);
                ?>
                <div class="psc-child-item <?php echo $is_active ? 'active' : ''; ?>">
                    <div class="psc-child-header" onclick="pscToggleAccordion(this)">
                        <?php echo esc_html($child->name); ?>
                        <?php if (!empty($child->series)): ?>
                            <span class="psc-arrow" style="<?php echo $is_active ? 'transform:rotate(90deg)' : ''; ?>">&#9658;</span>
                        <?php endif; ?>
                    </div>
                    <?php if (!empty($child->series)): ?>
                    <div class="psc-series-list" style="<?php echo $is_active ? '' : 'display:none'; ?>">
                        <?php foreach ($child->series as $s): ?>
                        <a href="<?php echo esc_url(add_query_arg('series', $s->slug)); ?>"
                           class="psc-series-link <?php echo ($active_series === $s->slug) ? 'active' : ''; ?>">
                            <?php echo esc_html($s->name); ?>
                        </a>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- ── Product Table ── -->
        <div class="psc-content-area" id="psc-<?php echo esc_attr($active_series); ?>">
            <?php if (!$query->have_posts()): ?>
                <p>No products found for series: <strong><?php echo esc_html(strtoupper($active_series)); ?></strong></p>
            <?php else:
                $all_tiers     = [];
                $products_data = [];

                while ($query->have_posts()):
                    $query->the_post();
                    $pid     = get_the_ID();
                    $pricing = parts_catalog_get_product_package_pricing($pid);
                    foreach ($pricing as $tier) $all_tiers[] = intval($tier['qty']);

                    $wc_prod  = wc_get_product($pid);
                    $pkg_qty  = get_post_meta($pid, '_pkg_qty', true) ?: '—';
                    $spec_url = get_post_meta($pid, '_spec_file_url', true);

                    $mfr      = $wc_prod ? ($wc_prod->get_attribute('pa_manufacturer') ?: '—') : '—';
                    $country  = $wc_prod ? ($wc_prod->get_attribute('pa_country') ?: '—') : '—';
                    $dfar     = $wc_prod && !empty($wc_prod->get_attribute('pa_specs_standard'));
                    $qty_stk  = $wc_prod ? $wc_prod->get_stock_quantity() : null;
                    $leadtime = get_post_meta($pid, '_backorder_leadtime', true);

                    $products_data[] = [
                        'id'          => $pid,
                        'sku'         => $wc_prod ? $wc_prod->get_sku() : '',
                        'name'        => get_the_title(),
                        'description' => $wc_prod ? $wc_prod->get_short_description() : '',
                        'pkg_qty'     => $pkg_qty,
                        'mfr'         => $mfr,
                        'country'     => $country,
                        'spec_url'    => $spec_url,
                        'product_url' => get_permalink($pid),
                        'pricing'     => $pricing,
                        'qty_stk'     => $qty_stk,
                        'leadtime'    => $leadtime,
                        'dfar'        => $dfar,
                        'instock'     => $wc_prod ? ($wc_prod->is_in_stock()) : false,
                    ];
                endwhile;
                wp_reset_postdata();

                $all_tiers = array_values(array_unique($all_tiers));
                sort($all_tiers);
                if (empty($all_tiers)) $all_tiers = [1];
            ?>

            <p class="psc-series-title">PART SERIES &nbsp; <?php echo esc_html(strtoupper($active_series)); ?></p>

            <?php if ($atts['search']): ?>
            <div class="psc-search-container">
                <input type="text" class="psc-search" placeholder="Start typing to filter products…"
                       onkeyup="pscFilter(this,'psc-<?php echo esc_attr($active_series); ?>')" />
            </div>
            <?php endif; ?>

            <table class="psc-table">
                <thead>
                    <tr>
                        <th>P/N</th>
                        <th>Description</th>
                        <th class="center">PKG QTY</th>
                        <?php foreach ($all_tiers as $tier): ?>
                            <th><?php echo intval($tier); ?> PKG</th>
                        <?php endforeach; ?>
                        <th>MFR</th>
                        <th>Country</th>
                        <th class="center">DFAR</th>
                        <th>Stock</th>
                        <th>Specs</th>
                        <th>Cart</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($products_data as $p): ?>
                <tr class="psc-row">
                    <td class="psc-pn" data-label="P/N">
                        <a href="<?php echo esc_url($p['product_url']); ?>"><?php echo esc_html($p['sku'] ?: $p['name']); ?></a>
                    </td>
                    <td data-label="Description"><?php echo esc_html($p['description'] ?: $p['name']); ?></td>
                    <td class="center" data-label="PKG QTY"><?php echo esc_html($p['pkg_qty']); ?></td>

                    <?php foreach ($all_tiers as $tier):
                        $price_val = '—';
                        foreach ($p['pricing'] as $t) {
                            if (intval($t['qty']) === $tier) {
                                $price_val = '$' . number_format(floatval($t['price']), 2);
                                break;
                            }
                        }
                    ?>
                        <td class="psc-price" data-label="<?php echo intval($tier); ?> PKG"><?php echo esc_html($price_val); ?></td>
                    <?php endforeach; ?>

                    <td data-label="MFR"><?php echo esc_html($p['mfr']); ?></td>
                    <td data-label="Country"><?php echo esc_html($p['country']); ?></td>
                    <td class="center" data-label="DFAR">
                        <?php echo $p['dfar'] ? '<span class="psc-badge">DFAR</span>' : '—'; ?>
                    </td>
                    <td data-label="Stock"><?php
                        if ($p['qty_stk'] !== null && $p['qty_stk'] !== '') {
                            $low = intval($p['qty_stk']) < 20;
                            echo '<span class="psc-stock-label ' . ($low ? 'psc-stock-low' : '') . '">' . esc_html($p['qty_stk']) . '</span>';
                            if (!empty($p['leadtime'])) echo '<br/><small style="color:#888">' . esc_html($p['leadtime']) . '</small>';
                        } elseif ($p['instock']) {
                            echo '<span class="psc-stock-label">In Stock</span>';
                            if (!empty($p['leadtime'])) echo '<br/><small style="color:#888">' . esc_html($p['leadtime']) . '</small>';
                        } else {
                            echo '&mdash;';
                        }
                    ?></td>
                    <td class="psc-download" data-label="Specs">
                        <?php if ($p['spec_url']): ?>
                        <a href="<?php echo esc_url($p['spec_url']); ?>" target="_blank">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            PDF
                        </a>
                        <?php else: ?>—<?php endif; ?>
                    </td>
                    <td data-label="Cart">
                        <div class="psc-order-cell">
                            <input type="number" class="psc-qty-input" value="1" min="1" id="qty-<?php echo $p['id']; ?>" />
                            <?php $add_url = wc_get_cart_url() . '?add-to-cart=' . $p['id'] . '&quantity='; ?>
                            <button class="psc-add-btn"
                                    onclick="pscAddToCart(<?php echo $p['id']; ?>,'<?php echo esc_js($add_url); ?>',this)">
                                ADD
                            </button>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <p class="psc-notice">* Qty = number of packages. Volume tier pricing applies automatically at checkout.</p>
            <?php endif; ?>
        </div>
    </div>

    <script>
    function pscFilter(input, wrapId) {
        var filter = input.value.toLowerCase();
        document.querySelectorAll('#' + wrapId + ' .psc-row').forEach(function(row) {
            row.style.display = row.innerText.toLowerCase().includes(filter) ? '' : 'none';
        });
    }

    function pscToggleAccordion(header) {
        var parent     = header.parentElement;
        var seriesList = parent.querySelector('.psc-series-list');
        var arrow      = header.querySelector('.psc-arrow');
        if (!seriesList) return;
        var open = seriesList.style.display !== 'none';
        seriesList.style.display = open ? 'none' : '';
        if (arrow) arrow.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
    }

    function pscAddToCart(productId, baseUrl, btn) {
        var qty = parseInt(document.getElementById('qty-' + productId).value) || 1;
        btn.textContent = 'Adding…';
        btn.disabled = true;

        var ajaxUrl = (typeof wc_add_to_cart_params !== 'undefined' && wc_add_to_cart_params.wc_ajax_url)
            ? wc_add_to_cart_params.wc_ajax_url.toString().replace('%%endpoint%%', 'add_to_cart')
            : window.location.pathname + '?wc-ajax=add_to_cart';

        jQuery.ajax({
            type: 'POST',
            url: ajaxUrl,
            data: { product_id: productId, quantity: qty },
            dataType: 'json',
            success: function(response) {
                if (response && response.error && response.product_url) {
                    window.location.href = response.product_url;
                    return;
                }
                btn.textContent = '✓ Added!';
                btn.style.background = '#2e7d32';
                if (response && response.fragments) {
                    jQuery(document.body).trigger('added_to_cart', [response.fragments, response.cart_hash, jQuery(btn)]);
                }
                setTimeout(function() {
                    btn.textContent = 'ADD';
                    btn.style.background = '';
                    btn.disabled = false;
                }, 2000);
            },
            error: function() {
                window.location.href = baseUrl + qty;
            }
        });
    }
    </script>
    <?php

    return ob_get_clean();
}
