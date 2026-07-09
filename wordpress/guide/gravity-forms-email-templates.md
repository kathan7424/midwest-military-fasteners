# Gravity Forms Notification Templates — Registration Form

Paste these into **Forms → Registration Form → Settings → Notifications**.
Message format must be **HTML** (disable auto-formatting if the option shows).

## Available custom merge tags (registered in `inc/tax-exemption.php`)

| Tag | Resolves to |
|---|---|
| `{mmf_approve_url}` | HMAC-signed one-click APPROVE link (14-day expiry, no WP login needed) |
| `{mmf_reject_url}` | HMAC-signed one-click REJECT link |
| `{mmf_site_url}` | `home_url('/')` of the sending site — dev/live safe |
| `{mmf_logo_url}` | Email logo URL from the current site's uploads dir |
| `[current_year]` | Current year (shortcode) — used in the footer |

If the WP user can't be resolved when the notification is sent (e.g. pending
activation), approve/reject tags fall back to the Tax Certificates dashboard
URL — never a broken link. If you use pending activation, set the Admin
Notification **Event** to "User is activated" so the user exists.

Form field IDs assumed (current form): Name = 1, Company = 4, Email = 5,
Certificate = 6, Expiry Date = 7. If fields are re-created, re-insert the
merge tags from the GF merge tag picker.

---

## 1. Admin Notification

**Subject:** `Tax exemption certificate needs review — {Name (First):1.3} {Name (Last):1.6}`

```html
&nbsp;
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td style="padding: 20px 0 30px 0;">
<table style="border-collapse: collapse; border: 1px solid rgba(0,25,19,0.1);" border="0" width="600" cellspacing="0" cellpadding="0" align="center">
<tbody>
<tr align="center">
<td style="padding: 20px 15px;" bgcolor="#ffffff"><a href="{mmf_site_url}" target="_blank" rel="noopener"><img style="width: 284px; height: auto;" src="{mmf_logo_url}" alt="Midwest Military Fasteners" width="284" height="71" /></a></td>
</tr>
<tr>
<td style="padding: 20px 15px;" bgcolor="#F9F9F9">
<table style="border-collapse: collapse;" border="0" width="560" cellspacing="0" cellpadding="0" align="center">
<tbody>
<tr>
<td style="text-align: left; width: inherit; background-color: #fff; padding: 20px 15px; border-radius: 5px;">
<p style="font-size: 16px; color: #000000; font-family: sans-serif;">Dear Admin,</p>
<p style="font-size: 16px; color: #000000; font-family: sans-serif;">A new Registration Form has been submitted and requires a Tax Exemption review.</p>
<table style="border-collapse: collapse;" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>Customer:</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">{Name (First):1.3} {Name (Last):1.6}</td>
</tr>
<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>Company:</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">{Company:4}</td>
</tr>
<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>Email:</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">{Email:5}</td>
</tr>
<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>Certificate:</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">{Certificate:6}</td>
</tr>
<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>Certificate Expiry:</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">{Expiry Date:7}</td>
</tr>
</tbody>
</table>
<div style="padding-top: 20px;"><a style="display: inline-block; background: #3a7d44; font-size: 16px; font-family: sans-serif; color: #fff; text-decoration: none; font-weight: bold; padding: 12px 28px; margin-right: 10px;" href="{mmf_approve_url}">APPROVE</a>
<a style="display: inline-block; background: #b81c23; font-size: 16px; font-family: sans-serif; color: #fff; text-decoration: none; font-weight: bold; padding: 12px 28px;" href="{mmf_reject_url}">REJECT</a></div>
<p style="font-size: 12px; color: #8c8f94; font-family: sans-serif; margin-top: 18px;">Buttons work without logging in — the links are cryptographically signed and expire in 14 days.</p>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td style="padding: 20px 30px 20px; text-align: center;" bgcolor="#CC9900">
<p style="font-size: 16px; margin: 0; color: #fff; font-family: sans-serif;">Copyright [current_year] Midwest Military Fasteners LLC</p>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
```

---

## 2. User Notification

**Subject:** `Welcome to Midwest Military Fasteners — registration received`

```html
&nbsp;
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td style="padding: 20px 0 30px 0;">
<table style="border-collapse: collapse; border: 1px solid rgba(0,25,19,0.1);" border="0" width="600" cellspacing="0" cellpadding="0" align="center">
<tbody>
<tr align="center">
<td style="padding: 20px 15px;" bgcolor="#ffffff"><a href="{mmf_site_url}" target="_blank" rel="noopener"><img style="width: 284px; height: auto;" src="{mmf_logo_url}" alt="Midwest Military Fasteners" width="284" height="71" /></a></td>
</tr>
<tr>
<td style="padding: 20px 15px;" bgcolor="#F9F9F9">
<table style="border-collapse: collapse;" border="0" width="560" cellspacing="0" cellpadding="0" align="center">
<tbody>
<tr>
<td style="text-align: left; width: inherit; background-color: #fff; padding: 20px 15px; border-radius: 5px;">
<p style="font-size: 16px; color: #000000; font-family: sans-serif;">Dear {Name (First):1.3},</p>
<p style="font-size: 16px; color: #000000; font-family: sans-serif;">Thank you for registering with Midwest Military Fasteners. Your account has been created and is ready to use.</p>
<p style="font-size: 16px; color: #000000; font-family: sans-serif;">If you submitted a sales tax exemption certificate, our team will review it shortly. You will receive a separate email once it has been approved — until then, applicable sales tax is charged on orders.</p>
<table style="border-collapse: collapse;" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>Name:</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">{Name (First):1.3} {Name (Last):1.6}</td>
</tr>
<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>Company:</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">{Company:4}</td>
</tr>
<tr>
<td style="padding: 8px; font-size: 16px; color: #000000; font-family: sans-serif; border: 1px solid #a4a4a4; width: 35%; vertical-align: top;"><strong>Email:</strong></td>
<td style="padding: 8px 8px 8px 10px; font-size: 16px; color: #555555; font-family: sans-serif; border: 1px solid #a4a4a4; vertical-align: top;">{Email:5}</td>
</tr>
</tbody>
</table>
<div style="padding-top: 20px;"><a style="display: inline-block; background: #CC9900; font-size: 16px; font-family: sans-serif; color: #fff; text-decoration: none; font-weight: bold; padding: 12px 28px;" href="{mmf_site_url}my-account">GO TO MY ACCOUNT</a></div>
<p style="font-size: 12px; color: #8c8f94; font-family: sans-serif; margin-top: 24px;">If you did not create this account, please contact us immediately.</p>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td style="padding: 20px 30px 20px; text-align: center;" bgcolor="#CC9900">
<p style="font-size: 16px; margin: 0; color: #fff; font-family: sans-serif;">Copyright [current_year] Midwest Military Fasteners LLC</p>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
```
