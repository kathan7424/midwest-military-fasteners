<?php
/**
 * Plugin Name: Multi-Carrier Shippo Shipping Rates & Address Validation for WooCommerce
 * Plugin URI: https://wordpress.org/plugins/wc-shippo-shipping/
 * Description: Adds Shippo shippping methods to Woocommerce.
 * Version: 1.5.18
 * Tested up to: 6.9.2
 * Requires PHP: 7.3
 * Author: OneTeamSoftware
 * Author URI: http://oneteamsoftware.com/
 * Developer: OneTeamSoftware
 * Developer URI: http://oneteamsoftware.com/
 * Text Domain: wc-shippo-shipping
 * Domain Path: /languages
 *
 * Copyright: © 2025 FlexRC, Canada.
 * License: GNU General Public License v3.0
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 */

namespace OneTeamSoftware\WooCommerce\Shipping;

defined('ABSPATH') || exit;

require_once(__DIR__ . '/includes/autoloader.php');
	
(new Plugin(
		__FILE__, 
		'Shippo', 
		sprintf('<div class="notice notice-info inline"><p>%s<br/><li><a href="%s" target="_blank">%s</a><br/><li><a href="%s" target="_blank">%s</a></p></div>', 
			__('Real-time Shippo live shipping rates', 'wc-shippo-shipping'),
			'https://1teamsoftware.com/contact-us/',
			__('Do you have any questions or requests?', 'wc-shippo-shipping'),
			'https://wordpress.org/plugins/wc-shippo-shipping/', 
			__('Do you like our plugin and can recommend to others?', 'wc-shippo-shipping')),
		'1.5.18'
	)
)->register();
