/*global console module require*/

var request = require("request");
var events  = require("events");
var jwt     = require("jsonwebtoken");

// Ensures support for Node 0.10 (e.g. of Promises)
require("babel").transform("code", { optional: ["runtime"] });
// require("babel/polyfill");

class Report extends events.EventEmitter {

    constructor(privateKey, serviceEmail, numberMinutes, debug) {
        console.log("Creating ga-service-acct Report object");
        super();                                        // inherit EventEmitter methods
        this.debug = debug || false;

        this.privateKey = privateKey;
    	this.serviceEmail = serviceEmail;

        this.numberMinutes = numberMinutes || 59; 		// until expires, must be < 60
        this.exp = new Date();                          // set exp at now, will force update in getToken

        this.scope     = "https://www.googleapis.com/auth/analytics.readonly";
        this.apiUrl    = "https://www.googleapis.com/analytics/v3/data/ga";
        this.googleUrl = "https://www.googleapis.com/oauth2/v3/token";

    	events.EventEmitter.call(this);

        // get a token at launch - arguably not needed
    	this.getToken()
        .then( () => this.emit("ready") )
        .catch( err => this.emit("auth_error", err) );
    }

    getToken() {
        var getTokenPromise = new Promise(
            (resolve, reject) => {

                // first check if we have an unexpired token
                var now = new Date();
    			if (now < this.exp) {
                    console.log("ga-service-act.getToken: token still valid");
    				return resolve("token still valid");
                }

                console.log("ga-service-act.getToken: getting new token");

            	var iat = now.getTime() / 1000;			    // in seconds, not milliseconds
            	var exp = iat + 60 * this.numberMinutes;	// exp = iat + extra seconds

            	var claimSet = {
            		"iss": this.serviceEmail,
            		"scope": this.scope,
            		"aud": this.googleUrl,
            		"exp": exp,
            		"iat": iat
            	};
            	var signature = jwt.sign(claimSet, this.privateKey, { algorithm: "RS256" });

            	var postObj = {
            		grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            		assertion: signature
            	};

            	request.post({
            		url: this.googleUrl,
            		form: postObj
            	}, (err, data) => {
            		if (err) return reject(err);

            		var body = JSON.parse(data.body);

                    // If no token present, then return the error
                    if ((typeof body.access_token) === "undefined") {
                        return reject("Auth request error: " + body.error_description);
                    }

            		// save the new token
            		this.token = body.access_token;

            		// set expiry time (in milliseconds) based on info in token
            		this.exp = now.setTime(now.getTime() + body.expires_in * 1000);

                    console.log(".getToken success, expiry: ", new Date(this.exp));

            		return resolve("success");
            	});
            }
        );

        return getTokenPromise;
    }

    // API: takes json analytics request data, and returns result
    get(options, cb) {

    	var googleRequestUrl = this.apiUrl + "?" + this.json2url(options);

        return this.getToken()
        .then( () => {
            var authObj = {
                "auth": { "bearer": this.token }
            };
            if (typeof cb == "function") {
                request.get(googleRequestUrl, authObj, (err, data) => {
                    if (err) return cb(err, null);
        			return cb(err, JSON.parse(data.body));
                });
            } else {
                return new Promise(function(resolve, reject) {
                    request.get(googleRequestUrl, authObj, (err, data) => {
                        // console.log('sending back a promise', data.body);
                        if (err) reject(err);
                        return resolve(JSON.parse(data.body));
                    })
                });
            }
        })
        .catch( cb );
    }

    getManagement(options, cb) {
        this.getToken()
        .then( () => {
            var authObj = {
                "auth": { "bearer": this.token }
            };
        	request.get(
        		"https://www.googleapis.com/analytics/v3/management/accounts",
        		authObj,
        		(err, data) => {
        			if (err) return cb(err, null);
        			var body = JSON.parse(data.body);
        			return cb(null, body);
        		}
        	);
        })
        .catch( cb );
    }

    // converts json key:object pairs to url string
    json2url(obj) {
    	var res = [];
    	for (var key in obj) {
    		res.push(key + "=" + obj[key]);
    	}
    	return res.join("&");
    }
}

module.exports = Report;
