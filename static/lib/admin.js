define('admin/plugins/sso-twitter', ['settings'], function(Settings) {
	'use strict';
	/* globals $, app, socket, require */

	var ACP = {};

	ACP.init = function() {
		Settings.load('sso-twitter', $('.sso-twitter-settings'));

		$('#save').on('click', function() {
			Settings.save('sso-twitter', $('.sso-twitter-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'sso-twitter-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});