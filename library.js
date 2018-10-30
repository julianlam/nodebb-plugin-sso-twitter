(function (module) {
	"use strict";

	var user = require.main.require('./src/user'),
		meta = require.main.require('./src/meta'),
		db = require.main.require('./src/database'),
		passport = require.main.require('passport'),
		passportTwitter = require('passport-twitter').Strategy,
		path = require.main.require('path'),
		nconf = require.main.require('nconf'),
		async = require.main.require('async');

	var authenticationController = require.main.require('./src/controllers/authentication');

	var constants = Object.freeze({
		'name': "Twitter",
		'admin': {
			'route': '/plugins/sso-twitter',
			'icon': 'fa-twitter-square'
		}
	});

	var Twitter = {
		settings: undefined
	};

	Twitter.init = function (data, callback) {
		var hostHelpers = require.main.require('./src/routes/helpers');

		function render(req, res, next) {
			res.render('admin/plugins/sso-twitter', {});
		}

		data.router.get('/admin/plugins/sso-twitter', data.middleware.admin.buildHeader, render);
		data.router.get('/api/admin/plugins/sso-twitter', render);

		hostHelpers.setupPageRoute(data.router, '/deauth/twitter', data.middleware, [data.middleware.requireUser], function (req, res) {
			res.render('plugins/sso-twitter/deauth', {
				service: "Twitter",
			});
		});
		data.router.get('/auth/twitter/callback', function (req, res, next) {
			// passport-twitter checks that the oauth_token
			// parameter is the same as the one it generated.
			//
			// Twitter does not support OAuth2, so the "state"
			// query string argument is not present.
			req.query.state = req.session.ssoState;
			next();
		});
		data.router.post('/deauth/twitter', [data.middleware.requireUser, data.middleware.applyCSRF], function (req, res, next) {
			Twitter.deleteUserData(req.user.uid, function (err) {
				if (err) {
					return next(err);
				}

				res.redirect(nconf.get('relative_path') + '/me/edit');
			});
		});

		callback();
	};


	Twitter.getStrategy = function (strategies, callback) {
		meta.settings.get('sso-twitter', function (err, settings) {
			Twitter.settings = settings;
			if (!err && settings['key'] && settings['secret']) {
				passport.use(new passportTwitter({
					consumerKey: settings['key'],
					consumerSecret: settings['secret'],
					callbackURL: nconf.get('url') + '/auth/twitter/callback',
					passReqToCallback: true
				}, function (req, token, tokenSecret, profile, done) {
					if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
						// Save twitter-specific information to the user
						user.setUserField(req.user.uid, 'twid', profile.id);
						db.setObjectField('twid:uid', profile.id, req.user.uid);
						return done(null, req.user);
					}

					Twitter.login(profile.id, profile.username, profile.photos, function (err, user) {
						if (err) {
							return done(err);
						}

						authenticationController.onSuccessfulLogin(req, user.uid);
						done(null, user);
					});
				}));

				strategies.push({
					name: 'twitter',
					url: '/auth/twitter',
					callbackURL: '/auth/twitter/callback',
					icon: constants.admin.icon,
					scope: ''
				});

			}

			callback(null, strategies);
		});
	};

	Twitter.appendUserHashWhitelist = function (data, callback) {
		data.whitelist.push('twid');
		return setImmediate(callback, null, data);
	};

	Twitter.getAssociation = function (data, callback) {
		user.getUserField(data.uid, 'twid', function (err, twitterId) {
			if (err) {
				return callback(err, data);
			}

			if (twitterId) {
				data.associations.push({
					associated: true,
					url: 'https://twitter.com/intent/user?user_id=' + twitterId,
					deauthUrl: nconf.get('url') + '/deauth/twitter',
					name: constants.name,
					icon: constants.admin.icon
				});
			} else {
				data.associations.push({
					associated: false,
					url: nconf.get('url') + '/auth/twitter',
					name: constants.name,
					icon: constants.admin.icon
				});
			}

			callback(null, data);
		})
	};

	Twitter.login = function (twid, handle, photos, callback) {
		Twitter.getUidByTwitterId(twid, function (err, uid) {
			if (err) {
				return callback(err);
			}

			if (uid !== null) {
				// Existing User
				callback(null, {
					uid: uid
				});
			} else {
				// Abort user creation if registration via SSO is restricted
				if (Twitter.settings.disableRegistration === 'on') {
					return callback(new Error('[[error:sso-registration-disabled, Twitter]]'));
				}

				// New User
				user.create({ username: handle }, function (err, uid) {
					if (err) {
						return callback(err);
					}

					// Save twitter-specific information to the user
					user.setUserField(uid, 'twid', twid);
					db.setObjectField('twid:uid', twid, uid);
					var autoConfirm = Twitter.settings && Twitter.settings.autoconfirm === "on" ? 1 : 0;
					user.setUserField(uid, 'email:confirmed', autoConfirm);
					if (autoConfirm) {
						db.sortedSetRemove('users:notvalidated', uid);
					}
					// Save their photo, if present
					if (photos && photos.length > 0) {
						var photoUrl = photos[0].value;
						photoUrl = path.dirname(photoUrl) + '/' + path.basename(photoUrl, path.extname(photoUrl)).slice(0, -6) + 'bigger' + path.extname(photoUrl);
						user.setUserField(uid, 'uploadedpicture', photoUrl);
						user.setUserField(uid, 'picture', photoUrl);
					}

					callback(null, {
						uid: uid
					});
				});
			}
		});
	};

	Twitter.getUidByTwitterId = function (twid, callback) {
		db.getObjectField('twid:uid', twid, function (err, uid) {
			if (err) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	Twitter.addMenuItem = function (custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	};

	Twitter.deleteUserData = function (data, callback) {
		async.waterfall([
			async.apply(user.getUserField, data.uid, 'twid'),
			function (oAuthIdToDelete, next) {
				db.deleteObjectField('twid:uid', oAuthIdToDelete, next);
			},
			function (next) {
				db.deleteObjectField('user:' + data.uid, 'twid', next);
			},
		], function (err) {
			if (err) {
				winston.error('[sso-twitter] Could not remove OAuthId data for uid ' + uid + '. Error: ' + err);
				return callback(err);
			}
			callback(null, data);
		});
	};

	module.exports = Twitter;
}(module));
