"use strict"

var fs = require('fs');
var events = require('events');
var util = require('util');

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var jwt    = require("jsonwebtoken");
var request = require('request');

var Report = function(fname, service_email) {
	var _this = this;
	events.EventEmitter.call(this);
	this.service_email = service_email;
	this.fname = fname;

	this.getToken(function(err) {
		if (err) throw err;
		// console.log(_this.token);
		return _this.emit('ready');
	});

	return this;
}

util.inherits(Report, events.EventEmitter);

module.exports = Report;

Report.prototype.getToken = function (cb) {
	var _this = this;

	var d = new Date();
	var seconds = d.getTime() / 1000 + 60*59;		// validity less than 1 hour

	// Don't know what iat is
	var claim_set = {
		"iss": this.service_email,
		"scope": 'https://www.googleapis.com/auth/analytics.readonly',
		"aud": 'https://www.googleapis.com/oauth2/v3/token',
		"exp": seconds,
		"iat": seconds
	};

	// this is the .pem file provided by Google console
	var private_key = fs.readFileSync(this.fname);
	var signature = jwt.sign(claim_set, private_key, { algorithm: "RS256" });
	var post_obj = {
		grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		assertion: signature
	};

	request.post({
		url:'https://www.googleapis.com/oauth2/v3/token',
		form: post_obj
	}, function(err, data) {
		if (err) return cb(err);

		var body = JSON.parse(data.body);
		_this.token = body.access_token;
		// console.log(_this.token);
		cb(null)
	});
};

Report.prototype.get = function (options, cb) {
	var optionsString = json2url(options);
	// console.log(this.token);
	var auth_obj = {
		'auth': {
			'bearer': this.token
		}
	};

	return request.get('https://www.googleapis.com/analytics/v3/data/ga?'+optionsString,
		auth_obj,
		function(err, data) {
			if (err) return cb(err, null);

			console.log("get: ", JSON.parse(data.body));
			return cb(null, JSON.parse(data.body));
		}
	);
};

var json2url = function (obj) {
	var res = [];
	var i = 0;
	for (var key in obj) {
		res[i] = key+"="+obj[key];
		i++;
	}
	return res.join('&');
};
