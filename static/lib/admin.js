'use strict';

define('admin/plugins/sso-twitter', ['settings'], function (Settings) {
	var ACP = {};

	ACP.init = function () {
		Settings.load('sso-twitter', $('.sso-twitter-settings'));

		$('#save').on('click', function () {
			Settings.save('sso-twitter', $('.sso-twitter-settings'));
		});
	};

	return ACP;
});
