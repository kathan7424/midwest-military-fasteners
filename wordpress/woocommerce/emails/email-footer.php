<?php
/**
 * Email Footer — Midwest Military Fasteners
 *
 * Overrides WooCommerce default email-footer.php.
 * WooCommerce version: 8.x
 *
 * @package midwest-military
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>

</td><!-- close mainContentTextCell -->
</tr>
</tbody>
</table>
</td><!-- close contentBodyCell -->
</tr>

<!-- ===== FOOTER ===== -->
<tr>
<td id="footerCell" style="padding:20px 30px;text-align:center;" bgcolor="#CC9900">
	<p id="footerText" style="font-size:14px;margin:0 0 6px 0;color:#ffffff;font-family:sans-serif;">
		<?php echo wp_kses_post( wpautop( wptexturize( apply_filters( 'woocommerce_email_footer_text', get_option( 'woocommerce_email_footer_text' ) ) ) ) ); ?>
	</p>
	<p style="font-size:13px;margin:0;color:#ffffff;font-family:sans-serif;opacity:0.85;">
		&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php echo esc_html( get_bloginfo( 'name' ) ); ?>
	</p>
</td>
</tr>

</tbody>
</table><!-- close emailMainWrapper -->
</td>
</tr>
</tbody>
</table>

</body>
</html>
