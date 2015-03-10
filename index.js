var fs = require('fs');
var events = require('events');
var util = require('util');

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var jwt    = require("jsonwebtoken");
var request = require('request');

Report = function(fname, service_email) {
	var _this = this;
	events.EventEmitter.call(this);

	var d = new Date();
	var seconds = d.getTime() / 1000 + 60*59;

	var claim_set = {
		"iss": service_email,
		"scope": 'https://www.googleapis.com/auth/analytics.readonly',
		"aud": 'https://www.googleapis.com/oauth2/v3/token',
		"exp": seconds,
		"iat": seconds
	};

	var algorithm = {"alg":"RS256","typ":"JWT"};
	var private_key = fs.readFileSync(fname);
	var signature = jwt.sign(claim_set, private_key, { algorithm: algorithm.alg});
	var post_obj = {
		grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		assertion: signature
	};

	request.post({
		url:'https://www.googleapis.com/oauth2/v3/token',
		form: post_obj
	}, function(err, data) {
		if (err) throw err;
		var body = JSON.parse(data.body);
		_this.token = body.access_token;
		// console.log(_this.token);
		return _this.emit('ready');
	});

	return this;
}

util.inherits(Report, events.EventEmitter);

module.exports = Report;

Report.prototype.get = function (options, cb) {
	var optionsString = json2url(options);
	var auth_obj = {
		'auth': {
			'bearer': this.token
		}
	};

	return request.get('https://www.googleapis.com/analytics/v3/data/ga?'+optionsString,
		auth_obj,
		function(err, data) {
			if (err) return cb(err, null);

			// console.log("get: ", data.body);
			return cb(null, JSON.parse(data.body));
		}
	);
}

var json2url = function (obj) {
	var res = [];
	var i = 0
	for (key in obj) {
		res[i] = key+"="+obj[key];
		i++
	}
	return res.join('&')
};
