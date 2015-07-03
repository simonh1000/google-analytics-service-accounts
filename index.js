'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var request = require('request');
var async = require('async');
var events = require('events');
var util = require('util');

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var jwt = require('jsonwebtoken');

var Report = (function (_events$EventEmitter) {
    function Report(private_key, service_email, numberMinutes, debug) {
        var _this = this;

        _classCallCheck(this, Report);

        _get(Object.getPrototypeOf(Report.prototype), 'constructor', this).call(this);
        this.private_key = private_key;
        this.service_email = service_email;
        this.debug = debug || false;
        this.numberMinutes = numberMinutes || 59; // until expires, must be < 60

        events.EventEmitter.call(this);

        this.getToken(function (err, token) {
            if (err) throw err;

            return _this.emit('ready');
        });
    }

    _inherits(Report, _events$EventEmitter);

    _createClass(Report, [{
        key: 'getToken',
        value: function getToken(cb) {
            var _this2 = this;

            var d = new Date();
            var assertionTime = d.getTime() / 1000; // seconds, not milliseconds
            var exp = assertionTime + 60 * this.numberMinutes; // end validity less than 1 hour

            // iat is current time
            // exp is number of seconds since 1970....
            var claim_set = {
                'iss': this.service_email,
                'scope': 'https://www.googleapis.com/auth/analytics.readonly',
                'aud': 'https://www.googleapis.com/oauth2/v3/token',
                'exp': exp,
                'iat': assertionTime
            };

            var signature = jwt.sign(claim_set, this.private_key, { algorithm: 'RS256' });
            var post_obj = {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: signature
            };

            request.post({
                url: 'https://www.googleapis.com/oauth2/v3/token',
                form: post_obj
            }, function (err, data) {
                if (err) return cb(err, null);

                var body = JSON.parse(data.body);
                // save the new token
                _this2.token = body.access_token;

                if (_this2.debug) console.log('.getToken: token rcvd: ', body.access_token);

                // set expiry based on info in token
                var now = new Date();
                _this2.exp = now.setTime(now.getTime() + body.expires_in * 1000);

                var tmp = new Date(_this2.exp);
                if (_this2.debug) console.log('expiry: ', tmp.toLocaleTimeString());

                cb(null);
            });
        }
    }, {
        key: 'get',
        value: function get(options, cb) {
            var _this3 = this;

            var optionsString = this.json2url(options);
            // console.log(this.private_key);

            // If token expired then get new one before requesting data.
            // This pattern is an asynchronous if ... then
            async.series([function (cb) {
                var now = new Date();
                if (now < _this3.exp) cb(null);else {
                    console.log('ga-service-act.get: renewing expired token');
                    _this3.getToken(cb);
                }
            }, function (cb) {
                var auth_obj = {
                    'auth': { 'bearer': _this3.token }
                };
                request.get('https://www.googleapis.com/analytics/v3/data/ga?' + optionsString, auth_obj, cb);
            }], function (err, data) {
                if (err) return cb(err, null);
                // data[1] contains data from request.get
                // data[1][0] contains ...
                var body = JSON.parse(data[1][0].body);
                // if (this.debug) console.log(".get: ", body);
                return cb(null, body);
            });
        }
    }, {
        key: 'getManagement',
        value: function getManagement(options, cb) {
            var auth_obj = {
                'auth': { 'bearer': this.token }
            };
            request.get('https://www.googleapis.com/analytics/v3/management/accounts', auth_obj, function (err, data) {
                if (err) return cb(err, null);
                var body = JSON.parse(data.body);
                return cb(null, body);
            });
        }
    }, {
        key: 'json2url',
        value: function json2url(obj) {
            var res = [];
            for (var key in obj) {
                res.push(key + '=' + obj[key]);
            }
            return res.join('&');
        }
    }]);

    return Report;
})(events.EventEmitter);

// util.inherits(Report, events.EventEmitter);

module.exports = Report;