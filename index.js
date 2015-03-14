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

var numberMinutes = 5; 		// less than 60

var Report = function(fname, service_email) {

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
		// console.log("token expires: ", _this.exp);

		return _this.emit('ready');
	});

	return this;
};

util.inherits(Report, events.EventEmitter);

module.exports = Report;

Report.prototype.getToken = function (cb) {
	var d = new Date();
	var seconds = d.getTime() / 1000 + 60*numberMinutes;		// validity less than 1 hour

	// Don't know what iat is
	// exp is number of seconds since 1970....
	var claim_set = {
		"iss"  : this.service_email,
		"scope": 'https://www.googleapis.com/auth/analytics.readonly',
		"aud"  : 'https://www.googleapis.com/oauth2/v3/token',
		"exp"  : seconds,
		"iat"  : seconds
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
		cb(null, body.access_token);
	});
};

Report.prototype.get = function (options, cb) {
	var _this = this;
	var optionsString = json2url(options);
	// console.log(this.token);
	async.series([
		function(cb) {
			var now = new Date();
			if (now < _this.exp)
				cb(null)
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
			var body = JSON.parse(data[1][0].body);
			return cb(null, body);
	});
};

var json2url = function (obj) {
	var res = [];
	for (var key in obj) {
		res.push(key + "=" + obj[key]);
	}
	return res.join('&');
};

}());
