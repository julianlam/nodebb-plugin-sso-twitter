(function(module) {
	"use strict";

	var user = module.parent.require('./user'),
		db = module.parent.require('../src/database'),
		passport = module.parent.require('passport'),
  		passportTwitter = require('passport-twitter').Strategy,
  		fs = module.parent.require('fs'),
  		path = module.parent.require('path'),
  		nconf = module.parent.require('nconf');

	var constants = Object.freeze({
		'name': "Twitter",
		'admin': {
			'route': '/twitter',
			'icon': 'fa-twitter-square'
		}
	});

	var Twitter = {};

	Twitter.getStrategy = function(strategies) {
		if (meta.config['social:twitter:key'] && meta.config['social:twitter:secret']) {
			passport.use(new passportTwitter({
				consumerKey: meta.config['social:twitter:key'],
				consumerSecret: meta.config['social:twitter:secret'],
				callbackURL: nconf.get('url') + '/auth/twitter/callback'
			}, function(token, tokenSecret, profile, done) {
				Twitter.login(profile.id, profile.username, profile.photos, function(err, user) {
					if (err) {
						return done(err);
					}
					done(null, user);
				});
			}));

			strategies.push({
				name: 'twitter',
				url: '/auth/twitter',
				callbackURL: '/auth/twitter/callback',
				icon: 'twitter',
				scope: ''
			});
		}

		return strategies;
	};

	Twitter.login = function(twid, handle, photos, callback) {
		Twitter.getUidByTwitterId(twid, function(err, uid) {
			if(err) {
				return callback(err);
			}

			if (uid !== null) {
				// Existing User
				callback(null, {
					uid: uid
				});
			} else {
				// New User
				user.create({username: handle}, function(err, uid) {
					if(err) {
						return callback(err);
					}

					// Save twitter-specific information to the user
					user.setUserField(uid, 'twid', twid);
					db.setObjectField('twid:uid', twid, uid);

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

	Twitter.getUidByTwitterId = function(twid, callback) {
		db.getObjectField('twid:uid', twid, function(err, uid) {
			if (err) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	Twitter.addMenuItem = function(custom_header) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		return custom_header;
	}

	Twitter.addAdminRoute = function(custom_routes, callback) {
		fs.readFile(path.resolve(__dirname, './static/admin.tpl'), function (err, template) {
			custom_routes.routes.push({
				"route": constants.admin.route,
				"method": "get",
				"options": function(req, res, callback) {
					callback({
						req: req,
						res: res,
						route: constants.admin.route,
						name: constants.name,
						content: template
					});
				}
			});

			callback(null, custom_routes);
		});
	};

	module.exports = Twitter;
}(module));