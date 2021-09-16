'use strict';

const Twitter = module.exports;

const passport = require.main.require('passport');
const passportTwitter = require('passport-twitter').Strategy;

const path = require.main.require('path');
const nconf = require.main.require('nconf');
const user = require.main.require('./src/user');
const meta = require.main.require('./src/meta');
const db = require.main.require('./src/database');

const constants = Object.freeze({
	name: 'Twitter',
	admin: {
		route: '/plugins/sso-twitter',
		icon: 'fa-twitter-square',
	},
});

Twitter.init = async function (data) {
	const hostHelpers = require.main.require('./src/routes/helpers');

	hostHelpers.setupAdminPageRoute(data.router, '/admin/plugins/sso-twitter', data.middleware, (req, res) => {
		res.render('admin/plugins/sso-twitter', {});
	});

	hostHelpers.setupPageRoute(data.router, '/deauth/twitter', data.middleware, [data.middleware.requireUser], (req, res) => {
		res.render('plugins/sso-twitter/deauth', {
			service: 'Twitter',
		});
	});

	data.router.get('/auth/twitter/callback', (req, res, next) => {
		// passport-twitter checks that the oauth_token
		// parameter is the same as the one it generated.
		//
		// Twitter does not support OAuth2, so the "state"
		// query string argument is not present.
		req.query.state = req.session.ssoState;
		next();
	});

	data.router.post('/deauth/twitter', [data.middleware.requireUser, data.middleware.applyCSRF], async (req, res, next) => {
		try {
			await Twitter.deleteUserData(req.user.uid);
			res.redirect(`${nconf.get('relative_path')}/me/edit`);
		} catch (err) {
			next(err);
		}
	});
};

Twitter.filterAuthInit = async function (strategies) {
	const settings = await meta.settings.get('sso-twitter');
	Twitter.settings = settings;
	if (settings.key && settings.secret) {
		passport.use(new passportTwitter({
			consumerKey: settings.key,
			consumerSecret: settings.secret,
			callbackURL: `${nconf.get('url')}/auth/twitter/callback`,
			passReqToCallback: true,
		}, async (req, token, tokenSecret, profile, done) => {
			try {
				if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
					// Save twitter-specific information to the user
					await Promise.all([
						user.setUserField(req.user.uid, 'twid', profile.id),
						db.setObjectField('twid:uid', profile.id, req.user.uid),
					]);
					return done(null, req.user);
				}

				const userData = await Twitter.login(profile.id, profile.username, profile.photos);
				done(null, userData);
			} catch (err) {
				done(err);
			}
		}));

		strategies.push({
			name: 'twitter',
			url: '/auth/twitter',
			callbackURL: '/auth/twitter/callback',
			icon: constants.admin.icon,
			scope: '',
		});
	}

	return strategies;
};

Twitter.filterAuthList = async function (data) {
	const twitterId = await user.getUserField(data.uid, 'twid');
	if (twitterId) {
		data.associations.push({
			associated: true,
			url: `https://twitter.com/intent/user?user_id=${twitterId}`,
			deauthUrl: `${nconf.get('url')}/deauth/twitter`,
			name: constants.name,
			icon: constants.admin.icon,
		});
	} else {
		data.associations.push({
			associated: false,
			url: `${nconf.get('url')}/auth/twitter`,
			name: constants.name,
			icon: constants.admin.icon,
		});
	}
	return data;
};

Twitter.addMenuItem = function (custom_header) {
	custom_header.authentication.push({
		route: constants.admin.route,
		icon: constants.admin.icon,
		name: constants.name,
	});
	return custom_header;
};

Twitter.deleteUserData = async function (data) {
	const twid = await user.getUserField(data.uid, 'twid');
	if (twid) {
		await db.deleteObjectField('twid:uid', twid);
		await db.deleteObjectField(`user:${data.uid}`, 'twid');
	}
};

Twitter.filterUserWhitelistFields = function (data) {
	data.whitelist.push('twid');
	return data;
};

Twitter.login = async function (twid, handle, photos) {
	let uid = await Twitter.getUidByTwitterId(twid);
	if (uid) { // Existing User
		return { uid: uid };
	}

	// Abort user creation if registration via SSO is restricted
	if (Twitter.settings.disableRegistration === 'on') {
		throw new Error('[[error:sso-registration-disabled, Twitter]]');
	}

	// New User
	uid = await user.create({ username: handle });
	const twitterData = {
		twid: twid,
	};

	// Save their photo, if present
	if (photos && photos.length > 0) {
		const photoUrl = photos[0].value;
		twitterData.uploadedpicture = `${path.dirname(photoUrl)}/${path.basename(photoUrl, path.extname(photoUrl)).slice(0, -6)}bigger${path.extname(photoUrl)}`;
		twitterData.picture = twitterData.uploadedpicture;
	}

	// Save twitter-specific information to the user
	await Promise.all([
		user.setUserFields(uid, twitterData),
		db.setObjectField('twid:uid', twid, uid),
	]);

	const autoConfirm = Twitter.settings && Twitter.settings.autoconfirm === 'on';
	if (autoConfirm) {
		await user.email.confirmByUid(uid);
	}

	return { uid: uid };
};

Twitter.getUidByTwitterId = async function (twid) {
	return await db.getObjectField('twid:uid', twid);
};




