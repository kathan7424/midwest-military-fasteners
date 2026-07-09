/**
 * Tax Certificates admin — keep the quick-edit status select tinted to
 * match its current value (pending amber / approved green / rejected red).
 */
( function () {
	'use strict';

	var CLASSES = [ 'is-pending', 'is-approved', 'is-rejected', 'is-none' ];

	function tint( select ) {
		CLASSES.forEach( function ( cls ) {
			select.classList.remove( cls );
		} );

		var value = select.value;
		select.classList.add(
			value === 'pending' || value === 'approved' || value === 'rejected'
				? 'is-' + value
				: 'is-none'
		);
	}

	document.addEventListener( 'change', function ( event ) {
		if ( event.target && event.target.classList && event.target.classList.contains( 'mmf-qe-status' ) ) {
			tint( event.target );
		}
	} );
} )();
