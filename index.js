'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var request = require('request');
var events = require('events');
var jwt = require('jsonwebtoken');

// Ensures support for Node 0.10
require('babel/polyfill');

var Report = (function (_events$EventEmitter) {
    function Report(private_key, service_email, numberMinutes, debug) {
        var _this = this;

        _classCallCheck(this, Report);

        _get(Object.getPrototypeOf(Report.prototype), 'constructor', this).call(this);
        this.private_key = private_key;
        this.service_email = service_email;
        this.numberMinutes = numberMinutes || 59; // until expires, must be < 60
        this.debug = debug || false;
        this.exp = new Date();
        this.scope = 'https://www.googleapis.com/auth/analytics.readonly';
        this.api_url = 'https://www.googleapis.com/analytics/v3/data/ga';

        events.EventEmitter.call(this);

        this.getToken().then(function () {
            return _this.emit('ready');
        })['catch'](function () {
            return _this.emit('auth_error', err);
        });
    }

    _inherits(Report, _events$EventEmitter);

    _createClass(Report, [{
        key: 'getToken',
        value: function getToken(cb) {
            var _this2 = this;

            var d = new Date();
            var iat = d.getTime() / 1000; // iat; seconds, not milliseconds
            var exp = iat + 60 * this.numberMinutes; // exp = iat + extra seconds
            var google_url = 'https://www.googleapis.com/oauth2/v3/token';

            var claim_set = {
                'iss': this.service_email,
                'scope': this.scope,
                'aud': google_url,
                'exp': exp,
                'iat': iat
            };
            var signature = jwt.sign(claim_set, this.private_key, { algorithm: 'RS256' });

            var post_obj = {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: signature
            };

            var getTokenPromise = new Promise(function (resolve, reject) {

                // first check if we have an unexpired token
                var now = new Date();
                if (now < _this2.exp) {
                    if (_this2.debug) console.log('ga-service-act.get: token still valid');
                    return resolve('token still valid');
                } else {
                    if (_this2.debug) console.log('ga-service-act.get: getting new token');
                }

                request.post({
                    url: google_url,
                    form: post_obj
                }, function (err, data) {
                    if (err) return reject(err);

                    var body = JSON.parse(data.body);

                    // If no token presnet, then return the error
                    if (typeof body.access_token == 'undefined') {
                        return reject('Auth request error: ' + body.error_description);
                    }

                    // save the new token
                    _this2.token = body.access_token;

                    // set expiry time (in milliseconds) based on info in token
                    var now = new Date();
                    _this2.exp = now.setTime(now.getTime() + body.expires_in * 1000);

                    if (_this2.debug) {
                        // console.log(".getToken success, result: ", body);
                        var tmp = new Date(_this2.exp);
                        console.log('.getToken success, expiry: ', tmp.toLocaleTimeString());
                    }

                    return resolve('success');
                });
            });
            return getTokenPromise;
        }
    }, {
        key: 'get',
        value: function get(options, cb) {
            var _this3 = this;

            var google_request_url = this.api_url + '?' + this.json2url(options);

            this.getToken().then(function () {
                var auth_obj = {
                    'auth': { 'bearer': _this3.token }
                };
                request.get(google_request_url, auth_obj, function (err, data) {
                    if (err) return cb(err, null);
                    var body = JSON.parse(data.body);
                    // if (this.debug) console.log(".get: ", body);
                    return cb(null, body);
                });
            })['catch'](function (err) {
                return cb(err);
            });
        }
    }, {
        key: 'getManagement',
        value: function getManagement(options, cb) {
            var _this4 = this;

            this.getToken().then(function () {
                var auth_obj = {
                    'auth': { 'bearer': _this4.token }
                };
                request.get('https://www.googleapis.com/analytics/v3/management/accounts', auth_obj, function (err, data) {
                    if (err) return cb(err, null);
                    var body = JSON.parse(data.body);
                    return cb(null, body);
                });
            })['catch'](function (err) {
                return cb(err);
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