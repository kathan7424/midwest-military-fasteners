<?php
/**
 * Tax exemption certificates — WordPress admin menu and management API.
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', 'mmf_register_tax_certificate_admin_menu' );
add_action( 'admin_init', 'mmf_handle_tax_certificate_admin_actions' );
add_action( 'rest_api_init', 'mmf_register_tax_certificate_admin_routes' );
add_action( 'admin_enqueue_scripts', 'mmf_enqueue_tax_certificate_admin_assets' );

/**
 * Dashboard stylesheet — loaded only on the Tax Certificates screen.
 *
 * @param string $hook Current admin page hook.
 */
function mmf_enqueue_tax_certificate_admin_assets( string $hook ): void {
	if ( false === strpos( $hook, 'mmf-tax-certificates' ) ) {
		return;
	}

	wp_enqueue_style(
		'mmf-tax-admin',
		get_template_directory_uri() . '/assets/css/tax-admin.css',
		array(),
		'2.1.2'
	);

	wp_enqueue_script(
		'mmf-tax-admin',
		get_template_directory_uri() . '/assets/js/tax-admin.js',
		array(),
		'2.1.2',
		true
	);
}

/**
 * WooCommerce submenu for tax certificate management.
 */
function mmf_register_tax_certificate_admin_menu(): void {
	add_submenu_page(
		'woocommerce',
		__( 'Tax Certificates', 'midwest-military' ),
		__( 'Tax Certificates', 'midwest-military' ),
		'manage_woocommerce',
		'mmf-tax-certificates',
		'mmf_render_tax_certificate_admin_page'
	);

	add_submenu_page(
		'woocommerce',
		__( 'Tax Exemption Email Log', 'midwest-military' ),
		__( 'Tax Exemption Emails', 'midwest-military' ),
		'manage_woocommerce',
		'mmf-tax-exemption-email-log',
		'mmf_render_tax_exemption_email_log_page'
	);
}

/**
 * Render the tax exemption reminder email log — every 30-day/3-day/expired
 * reminder actually sent, most recent first. Visibility only, same spirit
 * as the Product Certifications dashboard: answers "did this go out" without
 * digging through server mail logs.
 */
function mmf_render_tax_exemption_email_log_page(): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You do not have permission to access this page.', 'midwest-military' ) );
	}

	$rows = mmf_get_tax_exemption_email_log( 200 );

	$type_labels = array(
		'mmf_tax_reminder_expiring'       => __( '30-Day Notice', 'midwest-military' ),
		'mmf_tax_reminder_expiring_3day'  => __( '3-Day Urgent', 'midwest-military' ),
		'mmf_tax_reminder_expired'        => __( 'Expired', 'midwest-military' ),
	);
	$type_colors = array(
		'mmf_tax_reminder_expiring'      => '#996800',
		'mmf_tax_reminder_expiring_3day' => '#b81c23',
		'mmf_tax_reminder_expired'       => '#b81c23',
	);
	?>
	<div class="wrap">
		<h1>
			<span class="dashicons dashicons-email-alt" style="vertical-align: middle;"></span>
			<?php esc_html_e( 'Tax Exemption Email Log', 'midwest-military' ); ?>
		</h1>
		<p>
			<?php esc_html_e( 'Every 30-day, 3-day, and expired reminder email actually sent by the daily cron (or fired instantly on approval, when the certificate is approved with an expiry already inside the reminder window). Most recent first.', 'midwest-military' ); ?>
		</p>

		<table class="wp-list-table widefat fixed striped">
			<thead>
				<tr>
					<th><?php esc_html_e( 'Sent', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Customer', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Reminder Type', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Days Left at Send', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Certificate Expiry', 'midwest-military' ); ?></th>
					<th><?php esc_html_e( 'Subject', 'midwest-military' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php if ( empty( $rows ) ) : ?>
					<tr>
						<td colspan="6"><?php esc_html_e( 'No reminder emails have been sent yet.', 'midwest-military' ); ?></td>
					</tr>
				<?php else : ?>
					<?php foreach ( $rows as $row ) : ?>
						<?php
						$type  = (string) ( $row['type'] ?? '' );
						$label = $type_labels[ $type ] ?? $type;
						$color = $type_colors[ $type ] ?? '#8c8f94';
						$user  = get_userdata( (int) ( $row['user_id'] ?? 0 ) );
						?>
						<tr>
							<td><?php echo esc_html( $row['sent_at'] ?? '' ); ?></td>
							<td>
								<?php echo esc_html( $user instanceof WP_User ? $user->display_name : __( '(deleted user)', 'midwest-military' ) ); ?><br />
								<span style="color:#8c8f94;font-size:12px;"><?php echo esc_html( (string) ( $row['email'] ?? '' ) ); ?></span>
							</td>
							<td>
								<span style="color: <?php echo esc_attr( $color ); ?>; font-weight: 600;"><?php echo esc_html( $label ); ?></span>
							</td>
							<td><?php echo esc_html( (string) ( $row['days_left'] ?? '' ) ); ?></td>
							<td><?php echo esc_html( (string) ( $row['expiry'] ?? '' ) ); ?></td>
							<td><?php echo esc_html( (string) ( $row['subject'] ?? '' ) ); ?></td>
						</tr>
					<?php endforeach; ?>
				<?php endif; ?>
			</tbody>
		</table>

		<p style="margin-top:16px; color:#8c8f94; font-size:13px;">
			<?php esc_html_e( 'Showing the most recent 200 reminder emails. Each reminder type only sends once per certificate expiry date — a renewed certificate re-arms all three.', 'midwest-military' ); ?>
		</p>
	</div>
	<?php
}

/**
 * Permission check for admin certificate API routes.
 */
function mmf_tax_certificate_admin_permission(): bool {
	return current_user_can( 'manage_woocommerce' );
}

/**
 * Register admin REST routes.
 */
function mmf_register_tax_certificate_admin_routes(): void {
	register_rest_route(
		'custom/v1',
		'/tax-exemption/certificates',
		array(
			array(
				'methods'             => 'GET',
				'callback'            => 'mmf_tax_certificate_admin_list',
				'permission_callback' => 'mmf_tax_certificate_admin_permission',
				'args'                => array(
					'status' => array(
						'type'              => 'string',
						'required'          => false,
						'sanitize_callback' => 'sanitize_key',
					),
					'search' => array(
						'type'              => 'string',
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			),
		)
	);

	register_rest_route(
		'custom/v1',
		'/tax-exemption/certificates/(?P<user_id>\d+)',
		array(
			array(
				'methods'             => 'GET',
				'callback'            => 'mmf_tax_certificate_admin_get',
				'permission_callback' => 'mmf_tax_certificate_admin_permission',
			),
			array(
				'methods'             => 'PATCH',
				'callback'            => 'mmf_tax_certificate_admin_update',
				'permission_callback' => 'mmf_tax_certificate_admin_permission',
				'args'                => array(
					'status'      => array(
						'type'              => 'string',
						'required'          => false,
						'sanitize_callback' => 'sanitize_key',
					),
					'expiry_date' => array(
						'type'              => 'string',
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			),
		)
	);
}

/**
 * Map of registration-form uploads keyed by email — used as a live fallback
 * when the user-meta certificate copy is missing. Built once per request.
 *
 * @return array<string, array{cert:string,expiry:string,date:string}>
 */
function mmf_get_gf_certificate_map(): array {
	static $map = null;

	if ( null !== $map ) {
		return $map;
	}

	$map = array();

	if ( ! class_exists( 'GFAPI' ) || ! defined( 'MMF_REGISTRATION_FORM_ID' ) ) {
		return $map;
	}

	$entries = GFAPI::get_entries(
		MMF_REGISTRATION_FORM_ID,
		array( 'status' => 'active' ),
		array( 'key' => 'date_created', 'direction' => 'ASC' ),
		array( 'offset' => 0, 'page_size' => 500 )
	);

	if ( is_wp_error( $entries ) || empty( $entries ) ) {
		return $map;
	}

	foreach ( $entries as $entry ) {
		$email = strtolower( sanitize_email( (string) rgar( $entry, MMF_GF_FIELD_EMAIL ) ) );

		if ( $email === '' ) {
			continue;
		}

		$cert = function_exists( 'mmf_extract_gf_file_url' )
			? mmf_extract_gf_file_url( (string) rgar( $entry, MMF_GF_FIELD_CERTIFICATE ) )
			: esc_url_raw( (string) rgar( $entry, MMF_GF_FIELD_CERTIFICATE ) );

		if ( $cert === '' ) {
			continue;
		}

		// Later entries win (ASC order) — newest upload per email.
		$map[ $email ] = array(
			'cert'   => $cert,
			'expiry' => mmf_normalize_tax_exemption_expiry( (string) rgar( $entry, MMF_GF_FIELD_EXPIRY ) ),
			'date'   => (string) rgar( $entry, 'date_created' ),
		);
	}

	return $map;
}

/**
 * Build admin list row for a user certificate.
 *
 * @param WP_User $user User object.
 * @return array<string, mixed>
 */
function mmf_format_tax_certificate_admin_row( WP_User $user ): array {
	$user_id = (int) $user->ID;
	$data    = mmf_format_tax_exemption_response( $user_id );

	// Live fallback: registration-form upload not yet copied to user meta.
	if ( empty( $data['certificate_url'] ) ) {
		$gf = mmf_get_gf_certificate_map()[ strtolower( (string) $user->user_email ) ] ?? null;

		if ( $gf ) {
			$data['certificate_url'] = $gf['cert'];
			$data['has_certificate'] = true;

			if ( empty( $data['expiry_date'] ) && $gf['expiry'] !== '' ) {
				$data['expiry_date'] = $gf['expiry'];
			}
			if ( empty( $data['submitted_at'] ) && $gf['date'] !== '' ) {
				$data['submitted_at'] = $gf['date'];
			}
		}
	}

	$display_name = trim( $user->display_name );
	if ( $display_name === '' ) {
		$display_name = $user->user_login;
	}

	$company = sanitize_text_field( (string) get_user_meta( $user_id, 'billing_company', true ) );

	return array_merge(
		$data,
		array(
			'user_id'      => $user_id,
			'username'     => $user->user_login,
			'display_name' => $display_name,
			'email'        => $user->user_email,
			'company'      => $company,
			'edit_url'     => get_edit_user_link( $user_id ),
		)
	);
}

/**
 * Query users with tax certificate data.
 *
 * @param string $status_filter pending|approved|rejected|expired|valid|all.
 * @param string $search        Search term.
 * @return WP_User[]
 */
function mmf_query_tax_certificate_users( string $status_filter = 'all', string $search = '' ): array {
	$args = array(
		'number'     => 200,
		'orderby'    => 'registered',
		'order'      => 'DESC',
		'meta_query' => array(
			'relation' => 'OR',
			array(
				'key'     => 'mmf_tax_exemption_cert',
				'compare' => 'EXISTS',
			),
			array(
				'key'     => 'mmf_tax_exemption_status',
				'compare' => 'EXISTS',
			),
			array(
				'key'     => 'mmf_tax_exemption_expiry',
				'compare' => 'EXISTS',
			),
		),
	);

	if ( $search !== '' ) {
		$args['search']         = '*' . $search . '*';
		$args['search_columns'] = array( 'user_login', 'user_email', 'display_name' );
	}

	$users = get_users( $args );

	if ( $status_filter === 'all' || $status_filter === '' ) {
		return $users;
	}

	return array_values(
		array_filter(
			$users,
			static function ( $user ) use ( $status_filter ) {
				$data = mmf_format_tax_exemption_response( (int) $user->ID );

				switch ( $status_filter ) {
					case 'pending':
						return MMF_TAX_STATUS_PENDING === $data['status'];
					case 'approved':
						return MMF_TAX_STATUS_APPROVED === $data['status'];
					case 'rejected':
						return MMF_TAX_STATUS_REJECTED === $data['status'];
					case 'expired':
						return 'expired' === $data['notice_type'];
					case 'valid':
						return ! empty( $data['is_tax_exempt'] );
					case 'missing':
						return empty( $data['has_certificate'] );
					default:
						return true;
				}
			}
		)
	);
}

/**
 * GET /custom/v1/tax-exemption/certificates
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function mmf_tax_certificate_admin_list( WP_REST_Request $request ): WP_REST_Response {
	$status = sanitize_key( (string) $request->get_param( 'status' ) );
	$search = sanitize_text_field( (string) $request->get_param( 'search' ) );
	$users  = mmf_query_tax_certificate_users( $status, $search );

	$rows = array_map(
		static function ( $user ) {
			return mmf_format_tax_certificate_admin_row( $user );
		},
		$users
	);

	return rest_ensure_response(
		array(
			'certificates' => $rows,
			'total'        => count( $rows ),
		)
	);
}

/**
 * GET /custom/v1/tax-exemption/certificates/{user_id}
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function mmf_tax_certificate_admin_get( WP_REST_Request $request ) {
	$user_id = (int) $request['user_id'];
	$user    = get_user_by( 'id', $user_id );

	if ( ! $user instanceof WP_User ) {
		return new WP_Error( 'user_not_found', 'User not found.', array( 'status' => 404 ) );
	}

	return rest_ensure_response( mmf_format_tax_certificate_admin_row( $user ) );
}

/**
 * PATCH /custom/v1/tax-exemption/certificates/{user_id}
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function mmf_tax_certificate_admin_update( WP_REST_Request $request ) {
	$user_id = (int) $request['user_id'];

	if ( $user_id <= 0 || ! get_user_by( 'id', $user_id ) ) {
		return new WP_Error( 'user_not_found', 'User not found.', array( 'status' => 404 ) );
	}

	$old_status = get_user_meta( $user_id, 'mmf_tax_exemption_status', true );
	$status     = sanitize_key( (string) $request->get_param( 'status' ) );
	if ( in_array( $status, array( MMF_TAX_STATUS_PENDING, MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true ) ) {
		update_user_meta( $user_id, 'mmf_tax_exemption_status', $status );
	}

	$expiry = mmf_normalize_tax_exemption_expiry( sanitize_text_field( (string) $request->get_param( 'expiry_date' ) ) );
	if ( $expiry !== '' ) {
		update_user_meta( $user_id, 'mmf_tax_exemption_expiry', $expiry );
	}

	mmf_sync_customer_tax_exempt_flag_on_id( $user_id );

	if ( $status !== $old_status && in_array( $status, array( MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true )
		&& function_exists( 'mmf_send_tax_cert_customer_email' ) ) {
		mmf_send_tax_cert_customer_email( $user_id, $status );
	}
	if ( MMF_TAX_STATUS_APPROVED === $status ) {
		update_user_meta( $user_id, 'mmf_net30_eligible', 'yes' );
		mmf_maybe_send_tax_exemption_reminder_for_user( $user_id );
	}

	$user = get_user_by( 'id', $user_id );

	return rest_ensure_response( mmf_format_tax_certificate_admin_row( $user ) );
}

/**
 * Handle approve / reject / save from the admin screen.
 */
function mmf_handle_tax_certificate_admin_actions(): void {
	if ( ! isset( $_GET['page'] ) || 'mmf-tax-certificates' !== sanitize_key( wp_unslash( $_GET['page'] ) ) ) {
		return;
	}

	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}

	if ( isset( $_GET['mmf_tax_action'], $_GET['user_id'], $_GET['_wpnonce'] ) ) {
		$action  = sanitize_key( wp_unslash( $_GET['mmf_tax_action'] ) );
		$user_id = (int) $_GET['user_id'];

		if ( $user_id <= 0 ) {
			return;
		}

		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ), 'mmf_tax_cert_' . $action . '_' . $user_id ) ) {
			wp_die( esc_html__( 'Security check failed.', 'midwest-military' ) );
		}

		if ( 'approve' === $action ) {
			$old_status = get_user_meta( $user_id, 'mmf_tax_exemption_status', true );
			update_user_meta( $user_id, 'mmf_tax_exemption_status', MMF_TAX_STATUS_APPROVED );
			mmf_sync_customer_tax_exempt_flag_on_id( $user_id );
			if ( $old_status !== MMF_TAX_STATUS_APPROVED && function_exists( 'mmf_send_tax_cert_customer_email' ) ) {
				mmf_send_tax_cert_customer_email( $user_id, MMF_TAX_STATUS_APPROVED );
			}
			update_user_meta( $user_id, 'mmf_net30_eligible', 'yes' );
			mmf_maybe_send_tax_exemption_reminder_for_user( $user_id );
			add_settings_error( 'mmf_tax_certificates', 'approved', __( 'Certificate approved. Customer notified and Net 30 enabled.', 'midwest-military' ), 'updated' );
		}

		if ( 'reject' === $action ) {
			$old_status = get_user_meta( $user_id, 'mmf_tax_exemption_status', true );
			update_user_meta( $user_id, 'mmf_tax_exemption_status', MMF_TAX_STATUS_REJECTED );
			mmf_sync_customer_tax_exempt_flag_on_id( $user_id );
			if ( $old_status !== MMF_TAX_STATUS_REJECTED && function_exists( 'mmf_send_tax_cert_customer_email' ) ) {
				mmf_send_tax_cert_customer_email( $user_id, MMF_TAX_STATUS_REJECTED );
			}
			add_settings_error( 'mmf_tax_certificates', 'rejected', __( 'Certificate rejected. Customer notified.', 'midwest-military' ), 'updated' );
		}

		wp_safe_redirect( admin_url( 'admin.php?page=mmf-tax-certificates' ) );
		exit;
	}

	if ( isset( $_POST['mmf_tax_cert_save'], $_POST['user_id'], $_POST['_wpnonce'] ) ) {
		$user_id = (int) $_POST['user_id'];

		if ( $user_id <= 0 ) {
			return;
		}

		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ), 'mmf_tax_cert_save_' . $user_id ) ) {
			wp_die( esc_html__( 'Security check failed.', 'midwest-military' ) );
		}

		$old_status = get_user_meta( $user_id, 'mmf_tax_exemption_status', true );
		$status     = sanitize_key( (string) ( $_POST['mmf_tax_exemption_status'] ?? '' ) );
		if ( in_array( $status, array( '', MMF_TAX_STATUS_PENDING, MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true ) ) {
			if ( $status === '' ) {
				delete_user_meta( $user_id, 'mmf_tax_exemption_status' );
			} else {
				update_user_meta( $user_id, 'mmf_tax_exemption_status', $status );
			}
		}

		$expiry = mmf_normalize_tax_exemption_expiry( sanitize_text_field( (string) ( $_POST['mmf_tax_exemption_expiry'] ?? '' ) ) );
		if ( $expiry !== '' ) {
			update_user_meta( $user_id, 'mmf_tax_exemption_expiry', $expiry );
		}

		mmf_sync_customer_tax_exempt_flag_on_id( $user_id );

		if ( $status !== $old_status && in_array( $status, array( MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true )
			&& function_exists( 'mmf_send_tax_cert_customer_email' ) ) {
			mmf_send_tax_cert_customer_email( $user_id, $status );
		}
		if ( MMF_TAX_STATUS_APPROVED === $status ) {
			update_user_meta( $user_id, 'mmf_net30_eligible', 'yes' );
			mmf_maybe_send_tax_exemption_reminder_for_user( $user_id );
		}

		add_settings_error( 'mmf_tax_certificates', 'saved', __( 'Certificate updated.', 'midwest-military' ), 'updated' );

		wp_safe_redirect( admin_url( 'admin.php?page=mmf-tax-certificates&updated=1' ) );
		exit;
	}

	// Quick-edit save from the list table (submits via the bulk-actions form).
	if ( isset( $_POST['mmf_tax_cert_save_row'] ) ) {
		check_admin_referer( 'bulk-certificates' );

		$user_id = (int) $_POST['mmf_tax_cert_save_row'];

		if ( $user_id > 0 && get_user_by( 'id', $user_id ) ) {
			$old_status = get_user_meta( $user_id, 'mmf_tax_exemption_status', true );
			$status     = sanitize_key( (string) ( $_POST['mmf_qe_status'][ $user_id ] ?? '' ) );
			if ( in_array( $status, array( '', MMF_TAX_STATUS_PENDING, MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true ) ) {
				if ( $status === '' ) {
					delete_user_meta( $user_id, 'mmf_tax_exemption_status' );
				} else {
					update_user_meta( $user_id, 'mmf_tax_exemption_status', $status );
				}
			}

			$expiry = mmf_normalize_tax_exemption_expiry( sanitize_text_field( (string) ( $_POST['mmf_qe_expiry'][ $user_id ] ?? '' ) ) );
			if ( $expiry !== '' ) {
				update_user_meta( $user_id, 'mmf_tax_exemption_expiry', $expiry );
			}

			mmf_sync_customer_tax_exempt_flag_on_id( $user_id );

			if ( $status !== $old_status && in_array( $status, array( MMF_TAX_STATUS_APPROVED, MMF_TAX_STATUS_REJECTED ), true )
				&& function_exists( 'mmf_send_tax_cert_customer_email' ) ) {
				mmf_send_tax_cert_customer_email( $user_id, $status );
			}
			if ( MMF_TAX_STATUS_APPROVED === $status ) {
				update_user_meta( $user_id, 'mmf_net30_eligible', 'yes' );
				mmf_maybe_send_tax_exemption_reminder_for_user( $user_id );
			}

			add_settings_error( 'mmf_tax_certificates', 'saved', __( 'Certificate updated.', 'midwest-military' ), 'updated' );
		}
	}

	if ( isset( $_POST['mmf_tax_cert_sync_gf'], $_POST['_wpnonce'] ) ) {
		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ), 'mmf_tax_cert_sync_gf' ) ) {
			wp_die( esc_html__( 'Security check failed.', 'midwest-military' ) );
		}

		$synced = mmf_sync_tax_certificates_from_gravity_forms();
		add_settings_error(
			'mmf_tax_certificates',
			'synced',
			sprintf(
				/* translators: %d: number of synced certificates */
				__( 'Gravity Forms sync complete — %d certificate(s) recovered.', 'midwest-military' ),
				$synced
			),
			'updated'
		);
	}
}

/**
 * Recover certificates from Gravity Forms registration entries when the
 * user-meta copy is missing (e.g. multi-file JSON values from older code).
 *
 * @return int Number of users updated.
 */
function mmf_sync_tax_certificates_from_gravity_forms(): int {
	if ( ! class_exists( 'GFAPI' ) || ! defined( 'MMF_REGISTRATION_FORM_ID' ) ) {
		return 0;
	}

	$entries = GFAPI::get_entries(
		MMF_REGISTRATION_FORM_ID,
		array( 'status' => 'active' ),
		null,
		array( 'offset' => 0, 'page_size' => 500 )
	);

	if ( is_wp_error( $entries ) || empty( $entries ) ) {
		return 0;
	}

	$synced = 0;

	foreach ( $entries as $entry ) {
		$email = sanitize_email( (string) rgar( $entry, MMF_GF_FIELD_EMAIL ) );
		$user  = $email ? get_user_by( 'email', $email ) : false;

		if ( ! $user instanceof WP_User ) {
			continue;
		}

		$existing = (string) get_user_meta( $user->ID, 'mmf_tax_exemption_cert', true );
		if ( $existing !== '' ) {
			continue;
		}

		$cert_url = function_exists( 'mmf_extract_gf_file_url' )
			? mmf_extract_gf_file_url( (string) rgar( $entry, MMF_GF_FIELD_CERTIFICATE ) )
			: esc_url_raw( (string) rgar( $entry, MMF_GF_FIELD_CERTIFICATE ) );

		if ( $cert_url === '' ) {
			continue;
		}

		update_user_meta( $user->ID, 'mmf_tax_exemption_cert', $cert_url );

		$expiry = mmf_normalize_tax_exemption_expiry( (string) rgar( $entry, MMF_GF_FIELD_EXPIRY ) );
		if ( $expiry !== '' && '' === (string) get_user_meta( $user->ID, 'mmf_tax_exemption_expiry', true ) ) {
			update_user_meta( $user->ID, 'mmf_tax_exemption_expiry', $expiry );
		}

		if ( '' === mmf_get_tax_exemption_status( (int) $user->ID ) ) {
			update_user_meta( $user->ID, 'mmf_tax_exemption_status', MMF_TAX_STATUS_PENDING );
			update_user_meta( $user->ID, 'mmf_tax_exemption_submitted_at', current_time( 'mysql' ) );
		}

		$synced++;
	}

	return $synced;
}

/**
 * Human-readable status label for admin table.
 *
 * @param array<string, mixed> $row Certificate row.
 * @return string
 */
function mmf_tax_certificate_status_label( array $row ): string {
	if ( ! empty( $row['is_tax_exempt'] ) ) {
		return __( 'Active (Tax Exempt)', 'midwest-military' );
	}

	if ( 'expired' === ( $row['notice_type'] ?? '' ) ) {
		return __( 'Expired', 'midwest-military' );
	}

	switch ( $row['status'] ?? '' ) {
		case MMF_TAX_STATUS_PENDING:
			return __( 'Pending Approval', 'midwest-military' );
		case MMF_TAX_STATUS_APPROVED:
			return __( 'Approved (Not Active)', 'midwest-military' );
		case MMF_TAX_STATUS_REJECTED:
			return __( 'Rejected', 'midwest-military' );
		default:
			return __( 'No Certificate', 'midwest-military' );
	}
}

/**
 * Render admin management page.
 */
function mmf_render_tax_certificate_admin_page(): void {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You do not have permission to access this page.', 'midwest-military' ) );
	}

	$status_filter = isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : 'all';

	require_once __DIR__ . '/tax-exemption-list-table.php';

	$table = new MMF_Tax_Certificates_List_Table();
	$table->prepare_items();

	settings_errors( 'mmf_tax_certificates' );

	// Stat counts across ALL certificate users (unfiltered).
	$all_rows = array_map(
		static function ( $user ) {
			return mmf_format_tax_certificate_admin_row( $user );
		},
		mmf_query_tax_certificate_users( 'all', '' )
	);

	$stats = array( 'pending' => 0, 'valid' => 0, 'expiring' => 0, 'expired' => 0, 'rejected' => 0 );
	foreach ( $all_rows as $r ) {
		if ( MMF_TAX_STATUS_PENDING === $r['status'] )   { $stats['pending']++; }
		if ( ! empty( $r['is_tax_exempt'] ) )             { $stats['valid']++; }
		if ( 'expiring' === $r['notice_type'] )           { $stats['expiring']++; }
		if ( 'expired' === $r['notice_type'] )            { $stats['expired']++; }
		if ( MMF_TAX_STATUS_REJECTED === $r['status'] )   { $stats['rejected']++; }
	}

	$base_url = admin_url( 'admin.php?page=mmf-tax-certificates' );
	$cards    = array(
		'pending'  => array( __( 'Pending Review', 'midwest-military' ), $stats['pending'],  'dashicons-clock',        'pending' ),
		'valid'    => array( __( 'Active / Tax Exempt', 'midwest-military' ), $stats['valid'],   'dashicons-shield-alt',   'active' ),
		'expired'  => array( __( 'Expired', 'midwest-military' ), $stats['expired'],  'dashicons-calendar-alt', 'expired' ),
		'rejected' => array( __( 'Rejected', 'midwest-military' ), $stats['rejected'], 'dashicons-dismiss',      'rejected' ),
	);
	?>
	<div class="wrap mmf-tax-wrap">

		<div class="mmf-tax-header">
			<div class="mmf-tax-header__title-group">
				<h1>
					<span class="dashicons dashicons-media-spreadsheet"></span>
					<?php esc_html_e( 'Tax Exemption Certificates', 'midwest-military' ); ?>
				</h1>
				<p class="mmf-page-desc">
					<?php esc_html_e( 'Approved certificate + valid expiry date = customer pays no sales tax at checkout (TaxJar). Pending, rejected, or expired customers are taxed normally and see an upload notice in their cart.', 'midwest-military' ); ?>
				</p>
			</div>
			<form method="post" class="mmf-sync-form">
				<?php wp_nonce_field( 'mmf_tax_cert_sync_gf' ); ?>
				<button type="submit" name="mmf_tax_cert_sync_gf" class="mmf-sync-btn">
					<span class="dashicons dashicons-update"></span>
					<?php esc_html_e( 'Sync from Registration Form', 'midwest-military' ); ?>
				</button>
			</form>
		</div>

		<div class="mmf-stat-grid">
			<?php foreach ( $cards as $key => $card ) : ?>
				<a
					class="mmf-stat-card mmf-stat-card--<?php echo esc_attr( $card[3] ); ?> <?php echo $status_filter === $key ? 'is-active' : ''; ?>"
					href="<?php echo esc_url( $base_url . '&status=' . $key ); ?>"
				>
					<div class="mmf-stat-card__icon">
						<span class="dashicons <?php echo esc_attr( $card[2] ); ?>"></span>
					</div>
					<div class="mmf-stat-card__body">
						<span class="mmf-stat-card__num"><?php echo (int) $card[1]; ?></span>
						<span class="mmf-stat-card__label"><?php echo esc_html( $card[0] ); ?></span>
					</div>
				</a>
			<?php endforeach; ?>
		</div>

		<?php $table->views(); ?>

		<form method="get">
			<input type="hidden" name="page" value="mmf-tax-certificates" />
			<?php if ( $status_filter && 'all' !== $status_filter ) : ?>
				<input type="hidden" name="status" value="<?php echo esc_attr( $status_filter ); ?>" />
			<?php endif; ?>
			<?php $table->search_box( __( 'Search Customers', 'midwest-military' ), 'mmf-tax-cert' ); ?>
		</form>

		<form method="post">
			<div class="mmf-table-scroll">
				<?php $table->display(); ?>
			</div>
		</form>
	</div>
	<?php
}
