Google Analytics REST api for service accounts
==============================================

(Loosely based on [ga-report](https://www.npmjs.com/package/ga-report) - shares same API. I developed this module as ga-report requires you to provide your Google password, which is not ideal and triggers subsequent scary warning messages from the big G!)

This module uses a 'service account' instead to authenticate and access Google Analytics REST service (GET only)

## Service accounts
This module is an implementation [these instructions for Google developers](https://developers.google.com/accounts/docs/OAuth2ServiceAccount)

### Convert secret key
After creating the service email, you will download a `.p12` file than needs to be converted to a `.pem` file using this command:

`openssl pkcs12 -in privatekey.p12 -nodes -nocerts > privatekey.pem`

openssl asks for the private key, which is 'notasecret'

### Sign secret key
Uses [Json Web tools](https://github.com/auth0/node-jsonwebtoken) to sign private key before sending to Google to exchange for an access token

### rest api for analytics
See [here](https://developers.google.com/analytics/devguides/reporting/core/v3/reference)

### Ensure service user has access to analytics
Use GA admin tools on web when logged in as a user with management rights

## Example of usage

```
/* 
* Example use of API
*/
var path = require('path');
var Report = require('ga-service-cert');

var SERVICE_EMAIL = "123456789-2eqk45me6ts7jn3kf0vfr@developer.gserviceaccount.com";

var query = {
	'ids': 'ga:123456', 			// Update with your own view information
	'start-date': '2015-02-24',
	'end-date': '2015-03-10',
	'metrics': 'ga:users'
};

var report = new Report(path.resolve(__dirname+'/privatekey.pem'), SERVICE_EMAIL);

report.on('ready', function() {
	report.get(query, function(err, data) {
		if(err) throw err
		console.log(data); 			// e.g. [ [ '5140' ] ]
	});
});
```