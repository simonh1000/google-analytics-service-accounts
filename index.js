/* global require, module, console */

(function() {

"use strict";

var events  = require('events');
var util    = require('util');
var request = require('request');
var async   = require('async') ;

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var jwt    = require("jsonwebtoken");

var numberMinutes = 59; 		// until expires, must be < 60

var Report = function(private_key, service_email, debug) {
	this.private_key = private_key;
	this.service_email = service_email;
	this.debug = debug || false;

	events.EventEmitter.call(this);

	this.getToken(function(err, token) {
		if (err) throw err;

		return _this.emit('ready');
	});

	return this;
};

util.inherits(Report, events.EventEmitter);

module.exports = Report;

Report.prototype.getToken = function (cb) {
	var _this = this;
	// if (_this.debug) console.log(".getToken: ", _this.private_key);
	var d = new Date();
	var now = d.getTime() / 1000;			// seconds, not milliseconds
	var seconds = now + 60*numberMinutes;	// end validity less than 1 hour

	// iat is current time
	// exp is number of seconds since 1970....
	var claim_set = {
		"iss"  : this.service_email,
		"scope": 'https://www.googleapis.com/auth/analytics.readonly',
		"aud"  : 'https://www.googleapis.com/oauth2/v3/token',
		"exp"  : seconds,
		"iat"  : now
	};

	var signature = jwt.sign(claim_set, _this.private_key, { algorithm: "RS256" });
	var post_obj = {
		grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		assertion: signature
	};

	request.post({
		url : 'https://www.googleapis.com/oauth2/v3/token',
		form: post_obj
	}, function(err, data) {
		if (err) return cb(err, null);

		var body = JSON.parse(data.body);
		// save the new token
		_this.token = body.access_token;

		if (_this.debug) console.log(".getToken: token rcvd: ", body.access_token);

		// set expiry based on info in token
		var now = new Date();
		_this.exp = now.setTime(now.getTime() + body.expires_in * 1000);

		var tmp = new Date(_this.exp);
		if (_this.debug) console.log("expiry: ", tmp.toLocaleTimeString());

		cb(null);
	});
};

Report.prototype.get = function (options, cb) {
	var _this = this;
	var optionsString = json2url(options);
	// console.log(this.private_key);

	// If token expired then get new one before requesting data.
	// This pattern is an asynchronous if ... then
	async.series([
		function(cb) {
			var now = new Date();
			if (now < _this.exp)
				cb(null);
			else {
				console.log("ga-service-act.get: renewing expired token");
				_this.getToken(cb);
			}
		},
		function(cb) {
			var auth_obj = {
				'auth': { 'bearer': _this.token }
			};
			request.get('https://www.googleapis.com/analytics/v3/data/ga?'+optionsString, auth_obj, cb);
		}
	], function(err, data) {
			if (err) return cb(err, null);
			// data[1] contains data from request.get
			// data[1][0] contains ...
			var body = JSON.parse(data[1][0].body);
			// if (_this.debug) console.log(".get: ", body);
			return cb(null, body);
	});
};

Report.prototype.getManagement = function (options, cb) {
	var _this = this;
	var auth_obj = {
		'auth': { 'bearer': _this.token }
	};
	request.get(
		'https://www.googleapis.com/analytics/v3/management/accounts',
		auth_obj,
		function(err, data) {
			if (err) return cb(err, null);
			var body = JSON.parse(data.body);
			return cb(null, body);
		}
	);
};

var json2url = function (obj) {
	var res = [];
	for (var key in obj) {
		res.push(key + "=" + obj[key]);
	}
	return res.join('&');
};

}());
