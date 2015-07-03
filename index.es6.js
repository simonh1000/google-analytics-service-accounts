var request = require('request');
var async   = require('async') ;
var events  = require('events');
var util    = require('util');

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var jwt    = require("jsonwebtoken");

class Report extends events.EventEmitter {

    constructor(private_key, service_email, numberMinutes, debug) {
        super();
        this.private_key = private_key;
    	this.service_email = service_email;
    	this.debug = debug || false;
        this.numberMinutes = numberMinutes || 59; 		// until expires, must be < 60

    	events.EventEmitter.call(this);

    	this.getToken( (err, token) => {
    		if (err) throw err;

    		return this.emit('ready');
    	});
    }

    getToken(cb) {
    	var d = new Date();
    	var assertionTime = d.getTime() / 1000;			// seconds, not milliseconds
    	var exp = assertionTime + 60 * this.numberMinutes;	// end validity less than 1 hour

    	// iat is current time
    	// exp is number of seconds since 1970....
    	var claim_set = {
    		"iss"  : this.service_email,
    		"scope": 'https://www.googleapis.com/auth/analytics.readonly',
    		"aud"  : 'https://www.googleapis.com/oauth2/v3/token',
    		"exp"  : exp,
    		"iat"  : assertionTime
    	};

    	var signature = jwt.sign(claim_set, this.private_key, { algorithm: "RS256" });
    	var post_obj = {
    		grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    		assertion: signature
    	};

    	request.post({
    		url : 'https://www.googleapis.com/oauth2/v3/token',
    		form: post_obj
    	}, (err, data) => {
    		if (err) return cb(err, null);

    		var body = JSON.parse(data.body);
    		// save the new token
    		this.token = body.access_token;

    		if (this.debug) console.log(".getToken: token rcvd: ", body.access_token);

    		// set expiry based on info in token
    		var now = new Date();
    		this.exp = now.setTime(now.getTime() + body.expires_in * 1000);

    		var tmp = new Date(this.exp);
    		if (this.debug) console.log("expiry: ", tmp.toLocaleTimeString());

    		cb(null);
    	});
    }

    get(options, cb) {
    	var optionsString = this.json2url(options);
    	// console.log(this.private_key);

    	// If token expired then get new one before requesting data.
    	// This pattern is an asynchronous if ... then
    	async.series([
    		(cb) => {
    			var now = new Date();
    			if (now < this.exp)
    				cb(null);
    			else {
    				console.log("ga-service-act.get: renewing expired token");
    				this.getToken(cb);
    			}
    		},
    		(cb) => {
    			var auth_obj = {
    				'auth': { 'bearer': this.token }
    			};
    			request.get('https://www.googleapis.com/analytics/v3/data/ga?'+optionsString, auth_obj, cb);
    		}
    	], function(err, data) {
    			if (err) return cb(err, null);
    			// data[1] contains data from request.get
    			// data[1][0] contains ...
    			var body = JSON.parse(data[1][0].body);
    			// if (this.debug) console.log(".get: ", body);
    			return cb(null, body);
    	});
    }

    getManagement(options, cb) {
    	var auth_obj = {
    		'auth': { 'bearer': this.token }
    	};
    	request.get(
    		'https://www.googleapis.com/analytics/v3/management/accounts',
    		auth_obj,
    		(err, data) => {
    			if (err) return cb(err, null);
    			var body = JSON.parse(data.body);
    			return cb(null, body);
    		}
    	);
    }

    json2url(obj) {
    	var res = [];
    	for (var key in obj) {
    		res.push(key + "=" + obj[key]);
    	}
    	return res.join('&');
    }

}

// util.inherits(Report, events.EventEmitter);

module.exports = Report;
