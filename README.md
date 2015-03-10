Node JS Google Analytics REST tools
===================================

(Loosely based on https://www.npmjs.com/package/ga-report which requires you to provide password!)

Users a service account to access Google Analytics REST service (GET only)


https://developers.google.com/accounts/docs/OAuth2ServiceAccount
Provides instructions to create a service account

https://github.com/auth0/node-jsonwebtoken
tool to sign 

* Convert secret key

Downloaded a p12 file, need to convert

requires the key : 'notasecret'

`openssl pkcs12 -in privatekey.p12 -nodes -nocerts > privatekey.pem`



* rest api for analytics
https://developers.google.com/analytics/devguides/reporting/core/v3/reference


Give service user access to analytics at account level
- use admin tools on web

```
/* 
* Example use of API
*/
var path = require('path');
var Report = require('ga-service-cert');

var config = {
	SERVICE_EMAIL     : "123456789-2eqk45me6ts7jn3kf0vfr@developer.gserviceaccount.com"
}

var query = {
	'ids': 'ga:123456',
	'start-date': '2015-02-24',
	'end-date': '2015-03-10',
	'metrics': 'ga:users'
};

var report = new Report(path.resolve(__dirname+'/privatekey.pem'), config.SERVICE_EMAIL);

report.on('ready', function() {
	report.get(query, function(err, data) {
		if(err) throw err
		console.log(data);
	});
});
```