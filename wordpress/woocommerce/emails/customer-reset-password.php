<?php
/**
 * Customer reset password email — Midwest Military Fasteners
 *
 * Overrides WooCommerce default customer-reset-password.php.
 * WooCommerce version: 8.x
 *
 * @package midwest-military
 *
 * @var WC_Email_Customer_Reset_Password $email      Email object.
 * @var WC_Order                         $order      Order object.
 * @var bool                             $sent_to_admin Sent to admin?
 * @var bool                             $plain_text Is plain text?
 * @var array                            $args       Extra arguments.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/*
 * @hooked WC_Emails::email_header() Output the email header
 */
do_action( 'woocommerce_email_header', $email_heading, $email );
?>

<p style="font-size:16px;color:#000000;font-family:sans-serif;margin:0 0 14px 0;">
	<?php
	/* translators: %s: Customer first name or username */
	printf( esc_html__( 'Hi %s,', 'woocommerce' ), esc_html( $user_login ) );
	?>
</p>

<p style="font-size:16px;color:#333333;font-family:sans-serif;margin:0 0 14px 0;">
	<?php esc_html_e( 'Someone requested that the password be reset for the following account:', 'woocommerce' ); ?>
</p>

<p style="font-size:16px;color:#333333;font-family:sans-serif;margin:0 0 20px 0;">
	<strong style="color:#000000;"><?php esc_html_e( 'Username:', 'woocommerce' ); ?></strong>
	<?php echo esc_html( $user_login ); ?>
</p>

<p style="font-size:16px;color:#333333;font-family:sans-serif;margin:0 0 24px 0;">
	<?php esc_html_e( 'If this was a mistake, just ignore this email and nothing will happen.', 'woocommerce' ); ?>
</p>

<p style="font-size:16px;color:#333333;font-family:sans-serif;margin:0 0 28px 0;">
	<?php esc_html_e( 'To reset your password, click the button below. This link will expire in 24 hours.', 'woocommerce' ); ?>
</p>

<!-- CTA button -->
<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 28px 0;">
<tbody>
<tr>
<td>
	<?php
	$_frontend_url  = apply_filters( 'mmf_frontend_url', defined( 'MMF_FRONTEND_URL' ) ? MMF_FRONTEND_URL : home_url() );
	$_wc_reset_url  = esc_url( rtrim( $_frontend_url, '/' ) . '/reset-password?key=' . rawurlencode( $reset_key ) . '&login=' . rawurlencode( $user_login ) );
	?>
	<a
		href="<?php echo $_wc_reset_url; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — already esc_url'd above ?>"
		target="_blank"
		rel="noopener"
		style="display:inline-block;background-color:#CC9900;color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;text-transform:uppercase;letter-spacing:0.05em;"
	>
		<?php esc_html_e( 'Reset Your Password', 'woocommerce' ); ?>
	</a>
</td>
</tr>
</tbody>
</table>

<p style="font-size:13px;color:#888888;font-family:sans-serif;margin:0;word-break:break-all;">
	<?php esc_html_e( 'If the button above does not work, copy and paste this URL into your browser:', 'woocommerce' ); ?><br />
	<a href="<?php echo $_wc_reset_url; // phpcs:ignore ?>" style="color:#CC9900;font-family:sans-serif;font-size:13px;word-break:break-all;">
		<?php echo esc_html( rtrim( $_frontend_url, '/' ) . '/reset-password?key=' . $reset_key . '&login=' . $user_login ); ?>
	</a>
</p>

<?php
/*
 * @hooked WC_Emails::email_footer() Output the email footer
 */
do_action( 'woocommerce_email_footer', $email );
