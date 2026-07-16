<?php
/**
 * Email Header — Midwest Military Fasteners
 *
 * Overrides WooCommerce default email-header.php.
 * WooCommerce version: 8.x
 *
 * @package midwest-military
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title><?php echo esc_html( $email_heading ); ?></title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:sans-serif;">
&nbsp;
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td style="padding:20px 0 30px 0;">
<table id="emailMainWrapper" style="border-collapse:collapse;border:1px solid rgba(0,25,19,0.1);" border="0" width="600" cellspacing="0" cellpadding="0" align="center">
<tbody>

<!-- ===== LOGO ===== -->
<tr align="center">
<td id="logoContainerCell" style="padding:20px 15px;" bgcolor="#ffffff">
	<a href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank" rel="noopener">
		<img
			id="topLogoImage"
			style="width:284px;height:auto;display:block;margin:0 auto;"
			src="<?php echo esc_url( get_option( 'mmf_email_logo', 'https://dev-mmf-wp.pantheonsite.io/wp-content/uploads/2026/07/logo-email.png' ) ); ?>"
			alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
			width="284"
		/>
	</a>
</td>
</tr>

<!-- ===== BODY START ===== -->
<tr>
<td id="contentBodyCell" style="padding:20px 15px;" bgcolor="#F9F9F9">
<table style="border-collapse:collapse;" border="0" width="560" cellspacing="0" cellpadding="0" align="center">
<tbody>
<tr>
<td id="mainContentTextCell" style="text-align:left;width:inherit;background-color:#ffffff;padding:30px 25px;border-radius:5px;">

<!-- Email heading -->
<h2 style="font-size:20px;color:#000000;font-family:sans-serif;margin:0 0 18px 0;"><?php echo esc_html( $email_heading ); ?></h2>
