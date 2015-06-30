/* global require, module, console */

(function() {

"use strict";

var fs = require('fs');
var events = require('events');
var util    = require('util');
var request = require('request');
var async   = require('async') ;

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var jwt    = require("jsonwebtoken");

var numberMinutes = 59; 		// until expires, must be < 60

var Report = function(fname, service_email, debug) {

	this.debug = debug || false;
	var _this = this;
	this.fname = fname;
	this.service_email = service_email;
	this.exp = new Date();

	events.EventEmitter.call(this);

	this.getToken(function(err, token) {
		if (err) throw err;
		_this.token = token;

		var now = new Date();
		_this.exp = now.setTime(now.getTime() + 60*numberMinutes*1000);
		// console.log("ga-service-act: token expires: ", _this.exp);

		return _this.emit('ready');
	});

	return this;
};

util.inherits(Report, events.EventEmitter);

module.exports = Report;

Report.prototype.getToken = function (cb) {
	var _this = this;
	var d = new Date();
	var now = d.getTime() / 1000;			// start validity now
	var seconds = now + 60*numberMinutes;	// end validity less than 1 hour

	// Don't know what iat is
	// exp is number of seconds since 1970....
	var claim_set = {
		"iss"  : this.service_email,
		"scope": 'https://www.googleapis.com/auth/analytics.readonly',
		"aud"  : 'https://www.googleapis.com/oauth2/v3/token',
		"exp"  : seconds,
		"iat"  : now
	};

	// this is the .pem file provided by Google console
	var private_key = fs.readFileSync(this.fname);
	var signature = jwt.sign(claim_set, private_key, { algorithm: "RS256" });
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
		if (_this.debug) console.log(".getToken: token rcvd: ", body.access_token);
		cb(null, body.access_token);
	});
};

Report.prototype.get = function (options, cb) {
	var _this = this;
	var optionsString = json2url(options);
	// console.log(this.token);

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
			// data[1] contains data from second function in async.series
			// data[1][0] contains ...
			var body = JSON.parse(data[1][0].body);
			if (_this.debug) console.log(".get: ", body);
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
