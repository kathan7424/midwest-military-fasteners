<?php
/**
 * Tax exemption certificates — native WP_List_Table implementation.
 *
 * Standard WordPress admin table: sortable columns, bulk approve/reject,
 * status views, search box, pagination.
 *
 * @package midwest-military
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

class MMF_Tax_Certificates_List_Table extends WP_List_Table {

	private const PER_PAGE = 20;

	/** @var array<int, array<string, mixed>> */
	private array $all_rows = [];

	/** @var array<string, int> */
	private array $view_counts = [];

	public function __construct() {
		parent::__construct(
			array(
				'singular' => 'certificate',
				'plural'   => 'certificates',
				'ajax'     => false,
			)
		);
	}

	// ── Columns ─────────────────────────────────────────────

	public function get_columns(): array {
		return array(
			'cb'          => '<input type="checkbox" />',
			'customer'    => __( 'Customer', 'midwest-military' ),
			'certificate' => __( 'Certificate', 'midwest-military' ),
			'submitted'   => __( 'Submitted', 'midwest-military' ),
			'expiry'      => __( 'Expires', 'midwest-military' ),
			'status'      => __( 'Status', 'midwest-military' ),
			'manage'      => __( 'Quick Edit', 'midwest-military' ),
		);
	}

	protected function get_sortable_columns(): array {
		return array(
			'customer'  => array( 'customer', false ),
			'submitted' => array( 'submitted', true ),
			'expiry'    => array( 'expiry', false ),
			'status'    => array( 'status', false ),
		);
	}

	protected function get_bulk_actions(): array {
		return array(
			'approve' => __( 'Approve', 'midwest-military' ),
			'reject'  => __( 'Reject', 'midwest-military' ),
		);
	}

	// ── Views (status filter links with counts) ─────────────

	protected function get_views(): array {
		$current  = isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : 'all';
		$base_url = admin_url( 'admin.php?page=mmf-tax-certificates' );

		$defs = array(
			'all'      => __( 'All', 'midwest-military' ),
			'pending'  => __( 'Pending', 'midwest-military' ),
			'valid'    => __( 'Active', 'midwest-military' ),
			'expired'  => __( 'Expired', 'midwest-military' ),
			'rejected' => __( 'Rejected', 'midwest-military' ),
		);

		$views = array();

		foreach ( $defs as $key => $label ) {
			$count = $this->view_counts[ $key ] ?? 0;
			$url   = 'all' === $key ? $base_url : $base_url . '&status=' . $key;
			$class = $current === $key ? ' class="current"' : '';

			$views[ $key ] = sprintf(
				'<a href="%s"%s>%s <span class="count">(%d)</span></a>',
				esc_url( $url ),
				$class,
				esc_html( $label ),
				(int) $count
			);
		}

		return $views;
	}

	// ── Data ────────────────────────────────────────────────

	public function prepare_items(): void {
		$this->process_bulk_action();

		$status = isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : 'all';
		$search = isset( $_REQUEST['s'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['s'] ) ) : '';

		$this->all_rows = array_map(
			'mmf_format_tax_certificate_admin_row',
			mmf_query_tax_certificate_users( 'all', $search )
		);

		// View counts from the full (search-scoped) set.
		$this->view_counts = array( 'all' => count( $this->all_rows ), 'pending' => 0, 'valid' => 0, 'expired' => 0, 'rejected' => 0 );
		foreach ( $this->all_rows as $row ) {
			if ( MMF_TAX_STATUS_PENDING === $row['status'] )  { $this->view_counts['pending']++; }
			if ( ! empty( $row['is_tax_exempt'] ) )            { $this->view_counts['valid']++; }
			if ( 'expired' === $row['notice_type'] )           { $this->view_counts['expired']++; }
			if ( MMF_TAX_STATUS_REJECTED === $row['status'] )  { $this->view_counts['rejected']++; }
		}

		$rows = array_values(
			array_filter(
				$this->all_rows,
				static function ( $row ) use ( $status ) {
					switch ( $status ) {
						case 'pending':
							return MMF_TAX_STATUS_PENDING === $row['status'];
						case 'valid':
							return ! empty( $row['is_tax_exempt'] );
						case 'expired':
							return 'expired' === $row['notice_type'];
						case 'rejected':
							return MMF_TAX_STATUS_REJECTED === $row['status'];
						default:
							return true;
					}
				}
			)
		);

		// Sorting.
		$orderby = isset( $_GET['orderby'] ) ? sanitize_key( wp_unslash( $_GET['orderby'] ) ) : 'submitted';
		$order   = ( isset( $_GET['order'] ) && 'asc' === strtolower( sanitize_key( wp_unslash( $_GET['order'] ) ) ) ) ? 'asc' : 'desc';

		usort(
			$rows,
			static function ( $a, $b ) use ( $orderby ) {
				switch ( $orderby ) {
					case 'customer':
						return strcasecmp( (string) $a['display_name'], (string) $b['display_name'] );
					case 'expiry':
						return strcmp( (string) $a['expiry_date'], (string) $b['expiry_date'] );
					case 'status':
						return strcmp( (string) $a['status'], (string) $b['status'] );
					case 'submitted':
					default:
						return strcmp( (string) $a['submitted_at'], (string) $b['submitted_at'] );
				}
			}
		);

		if ( 'desc' === $order ) {
			$rows = array_reverse( $rows );
		}

		// Pagination.
		$total        = count( $rows );
		$current_page = max( 1, $this->get_pagenum() );
		$this->items  = array_slice( $rows, ( $current_page - 1 ) * self::PER_PAGE, self::PER_PAGE );

		$this->set_pagination_args(
			array(
				'total_items' => $total,
				'per_page'    => self::PER_PAGE,
				'total_pages' => (int) ceil( $total / self::PER_PAGE ),
			)
		);

		$this->_column_headers = array( $this->get_columns(), array(), $this->get_sortable_columns() );
	}

	/**
	 * Bulk approve/reject with nonce verification.
	 */
	public function process_bulk_action(): void {
		$action = $this->current_action();

		if ( ! in_array( $action, array( 'approve', 'reject' ), true ) ) {
			return;
		}

		check_admin_referer( 'bulk-' . $this->_args['plural'] );

		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$user_ids = array_map( 'absint', (array) ( $_REQUEST['certificate'] ?? array() ) );
		$user_ids = array_filter( $user_ids );

		if ( empty( $user_ids ) ) {
			return;
		}

		$status = 'approve' === $action ? MMF_TAX_STATUS_APPROVED : MMF_TAX_STATUS_REJECTED;

		foreach ( $user_ids as $user_id ) {
			update_user_meta( $user_id, 'mmf_tax_exemption_status', $status );
			mmf_sync_customer_tax_exempt_flag_on_id( $user_id );
		}

		add_settings_error(
			'mmf_tax_certificates',
			'bulk_' . $action,
			sprintf(
				/* translators: 1: count, 2: action label */
				__( '%1$d certificate(s) %2$s.', 'midwest-military' ),
				count( $user_ids ),
				'approve' === $action ? __( 'approved', 'midwest-military' ) : __( 'rejected', 'midwest-military' )
			),
			'updated'
		);
	}

	// ── Cell renderers ──────────────────────────────────────

	protected function column_cb( $item ): string {
		return sprintf( '<input type="checkbox" name="certificate[]" value="%d" />', (int) $item['user_id'] );
	}

	protected function column_customer( $item ): string {
		$user_id = (int) $item['user_id'];

		$out  = '<strong><a href="' . esc_url( (string) $item['edit_url'] ) . '">' . esc_html( (string) $item['display_name'] ) . '</a></strong>';
		if ( ! empty( $item['company'] ) ) {
			$out .= '<br /><span class="mmf-company">' . esc_html( (string) $item['company'] ) . '</span>';
		}
		$out .= '<br /><span class="mmf-email">' . esc_html( (string) $item['email'] ) . '</span>';

		$actions = array(
			'edit' => '<a href="' . esc_url( (string) $item['edit_url'] ) . '">' . esc_html__( 'Edit User', 'midwest-military' ) . '</a>',
		);

		if ( MMF_TAX_STATUS_PENDING === $item['status'] ) {
			$approve_url = wp_nonce_url(
				admin_url( 'admin.php?page=mmf-tax-certificates&mmf_tax_action=approve&user_id=' . $user_id ),
				'mmf_tax_cert_approve_' . $user_id
			);
			$reject_url  = wp_nonce_url(
				admin_url( 'admin.php?page=mmf-tax-certificates&mmf_tax_action=reject&user_id=' . $user_id ),
				'mmf_tax_cert_reject_' . $user_id
			);

			$actions = array(
				'approve' => '<a href="' . esc_url( $approve_url ) . '" style="color:#00a32a;font-weight:600">' . esc_html__( 'Approve', 'midwest-military' ) . '</a>',
				'reject'  => '<a href="' . esc_url( $reject_url ) . '" style="color:#b32d2e">' . esc_html__( 'Reject', 'midwest-military' ) . '</a>',
			) + $actions;
		}

		return $out . $this->row_actions( $actions );
	}

	protected function column_certificate( $item ): string {
		// certificate_url is the gated admin-post download URL (private
		// attachments are never linked directly).
		$cert_url = (string) $item['certificate_url'];

		if ( $cert_url === '' ) {
			return '<span aria-hidden="true">&mdash;</span>';
		}

		$attachment_id = function_exists( 'mmf_get_tax_cert_attachment_id' )
			? mmf_get_tax_cert_attachment_id( (int) $item['user_id'] )
			: 0;

		$is_image = $attachment_id
			? wp_attachment_is_image( $attachment_id )
			: (bool) preg_match( '/\.(jpe?g|png|gif|webp)(\?|$)/i', $cert_url );
		$preview  = $is_image
			? '<img class="mmf-cert-thumb" src="' . esc_url( $cert_url ) . '" alt="" loading="lazy" />'
			: '<span class="mmf-cert-pdf">PDF</span>';

		return '<a class="mmf-cert-link" href="' . esc_url( $cert_url ) . '" target="_blank" rel="noopener noreferrer">'
			. $preview . esc_html__( 'View', 'midwest-military' ) . '</a>';
	}

	protected function column_submitted( $item ): string {
		return ! empty( $item['submitted_at'] )
			? esc_html( mysql2date( get_option( 'date_format' ), (string) $item['submitted_at'] ) )
			: '<span aria-hidden="true">&mdash;</span>';
	}

	protected function column_expiry( $item ): string {
		if ( empty( $item['expiry_date'] ) ) {
			return '<span aria-hidden="true">&mdash;</span>';
		}

		$out       = esc_html( mysql2date( get_option( 'date_format' ), (string) $item['expiry_date'] ) );
		$days_left = (int) floor( ( strtotime( $item['expiry_date'] . ' 23:59:59' ) - time() ) / DAY_IN_SECONDS );

		if ( $days_left < 0 ) {
			$out .= '<span class="mmf-days-left over">' . esc_html( sprintf( __( '%d days ago', 'midwest-military' ), abs( $days_left ) ) ) . '</span>';
		} elseif ( $days_left <= 30 ) {
			$out .= '<span class="mmf-days-left warn">' . esc_html( sprintf( __( 'in %d days', 'midwest-military' ), $days_left ) ) . '</span>';
		} else {
			$out .= '<span class="mmf-days-left">' . esc_html( sprintf( __( 'in %d days', 'midwest-military' ), $days_left ) ) . '</span>';
		}

		return $out;
	}

	protected function column_status( $item ): string {
		if ( ! empty( $item['is_tax_exempt'] ) ) {
			$pill = array( 'active', __( 'Tax Exempt', 'midwest-military' ) );
		} elseif ( 'expired' === $item['notice_type'] ) {
			$pill = array( 'expired', __( 'Expired', 'midwest-military' ) );
		} elseif ( MMF_TAX_STATUS_PENDING === $item['status'] ) {
			$pill = array( 'pending', __( 'Pending', 'midwest-military' ) );
		} elseif ( MMF_TAX_STATUS_REJECTED === $item['status'] ) {
			$pill = array( 'rejected', __( 'Rejected', 'midwest-military' ) );
		} elseif ( MMF_TAX_STATUS_APPROVED === $item['status'] ) {
			$pill = array( 'expired', __( 'Approved — No Valid Expiry', 'midwest-military' ) );
		} else {
			$pill = array( 'none', __( 'No Certificate', 'midwest-military' ) );
		}

		return '<span class="mmf-pill mmf-pill--' . esc_attr( $pill[0] ) . '">' . esc_html( $pill[1] ) . '</span>';
	}

	/**
	 * Quick edit fields. NOTE: no nested <form> — these fields submit through
	 * the list table's outer bulk form (nonce: bulk-certificates); the Save
	 * button carries the row's user ID.
	 */
	protected function column_manage( $item ): string {
		$user_id = (int) $item['user_id'];

		ob_start();
		?>
		<div class="mmf-quick-edit">
			<input type="date" name="mmf_qe_expiry[<?php echo esc_attr( (string) $user_id ); ?>]" value="<?php echo esc_attr( (string) $item['expiry_date'] ); ?>" />
			<select name="mmf_qe_status[<?php echo esc_attr( (string) $user_id ); ?>]">
				<option value=""><?php esc_html_e( '— None —', 'midwest-military' ); ?></option>
				<option value="pending" <?php selected( $item['status'], MMF_TAX_STATUS_PENDING ); ?>><?php esc_html_e( 'Pending', 'midwest-military' ); ?></option>
				<option value="approved" <?php selected( $item['status'], MMF_TAX_STATUS_APPROVED ); ?>><?php esc_html_e( 'Approved', 'midwest-military' ); ?></option>
				<option value="rejected" <?php selected( $item['status'], MMF_TAX_STATUS_REJECTED ); ?>><?php esc_html_e( 'Rejected', 'midwest-military' ); ?></option>
			</select>
			<button type="submit" name="mmf_tax_cert_save_row" value="<?php echo esc_attr( (string) $user_id ); ?>" class="button button-small"><?php esc_html_e( 'Save', 'midwest-military' ); ?></button>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	protected function column_default( $item, $column_name ): string {
		return '';
	}

	public function no_items(): void {
		echo '<div class="mmf-tax-empty"><span class="dashicons dashicons-media-document"></span><br />';
		esc_html_e( 'No certificates match this filter.', 'midwest-military' );
		echo '<br /><small>';
		esc_html_e( 'If customers uploaded documents at registration but nothing shows here, click "Sync from Registration Form".', 'midwest-military' );
		echo '</small></div>';
	}
}
