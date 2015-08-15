/*global console module require*/

"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var request = require("request");
var events = require("events");
var jwt = require("jsonwebtoken");

// Ensures support for Node 0.10 (e.g. of Promises)
require("babel/polyfill");

var Report = (function (_events$EventEmitter) {
    _inherits(Report, _events$EventEmitter);

    function Report(privateKey, serviceEmail, numberMinutes, debug) {
        var _this = this;

        _classCallCheck(this, Report);

        _get(Object.getPrototypeOf(Report.prototype), "constructor", this).call(this); // inherit EventEmitter methods
        this.debug = debug || false;

        this.privateKey = privateKey;
        this.serviceEmail = serviceEmail;

        this.numberMinutes = numberMinutes || 59; // until expires, must be < 60
        this.exp = new Date(); // set exp at now, will force update in getToken

        this.scope = "https://www.googleapis.com/auth/analytics.readonly";
        this.apiUrl = "https://www.googleapis.com/analytics/v3/data/ga";
        this.googleUrl = "https://www.googleapis.com/oauth2/v3/token";

        events.EventEmitter.call(this);

        // get a token at launch - arguably not needed
        this.getToken().then(function () {
            return _this.emit("ready");
        })["catch"](function (err) {
            return _this.emit("auth_error", err);
        });
    }

    _createClass(Report, [{
        key: "getToken",
        value: function getToken() {
            var _this2 = this;

            var getTokenPromise = new Promise(function (resolve, reject) {

                // first check if we have an unexpired token
                var now = new Date();
                if (now < _this2.exp) {
                    void 0;
                    return resolve("token still valid");
                }

                void 0;

                var iat = now.getTime() / 1000; // in seconds, not milliseconds
                var exp = iat + 60 * _this2.numberMinutes; // exp = iat + extra seconds

                var claimSet = {
                    "iss": _this2.serviceEmail,
                    "scope": _this2.scope,
                    "aud": _this2.googleUrl,
                    "exp": exp,
                    "iat": iat
                };
                var signature = jwt.sign(claimSet, _this2.privateKey, { algorithm: "RS256" });

                var postObj = {
                    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    assertion: signature
                };

                request.post({
                    url: _this2.googleUrl,
                    form: postObj
                }, function (err, data) {
                    if (err) return reject(err);

                    var body = JSON.parse(data.body);

                    // If no token present, then return the error
                    if (typeof body.access_token === "undefined") {
                        return reject("Auth request error: " + body.error_description);
                    }

                    // save the new token
                    _this2.token = body.access_token;

                    // set expiry time (in milliseconds) based on info in token
                    _this2.exp = now.setTime(now.getTime() + body.expires_in * 1000);

                    void 0;

                    return resolve("success");
                });
            });

            return getTokenPromise;
        }

        // API: takes json analytics request data, and returns result
    }, {
        key: "get",
        value: function get(options, cb) {
            var _this3 = this;

            var googleRequestUrl = this.apiUrl + "?" + this.json2url(options);

            this.getToken().then(function () {
                var authObj = {
                    "auth": { "bearer": _this3.token }
                };
                request.get(googleRequestUrl, authObj, function (err, data) {
                    if (err) return cb(err, null);
                    var body = JSON.parse(data.body);
                    void 0;
                    return cb(null, body);
                });
            })["catch"](cb);
        }
    }, {
        key: "getManagement",
        value: function getManagement(options, cb) {
            var _this4 = this;

            this.getToken().then(function () {
                var authObj = {
                    "auth": { "bearer": _this4.token }
                };
                request.get("https://www.googleapis.com/analytics/v3/management/accounts", authObj, function (err, data) {
                    if (err) return cb(err, null);
                    var body = JSON.parse(data.body);
                    return cb(null, body);
                });
            })["catch"](cb);
        }

        // converts json key:object pairs to url string
    }, {
        key: "json2url",
        value: function json2url(obj) {
            var res = [];
            for (var key in obj) {
                res.push(key + "=" + obj[key]);
            }
            return res.join("&");
        }
    }]);

    return Report;
})(events.EventEmitter);

module.exports = Report;