## Google Analytics REST API via service accounts

This module uses oAuth to authenticate a Google 'service account' to gain access to the [Google Analytics REST API](https://developers.google.com/analytics/devguides/reporting/core/v3/reference) (GET only). In essence, it is an implementation of these [Google developers instructions](https://developers.google.com/accounts/docs/OAuth2ServiceAccount).

There are two things you need also to setup to use this code

### 1. Convert secret key
After creating the service email, you will download a `.p12` key file that needs to be converted to a `.pem` file using:

`openssl pkcs12 -in privatekey.p12 -nodes -nocerts > privatekey.pem`

openssl will ask for the private key, which Google has probably told you is 'notasecret'

The code relies upon [Json Web tokens](https://github.com/auth0/node-jsonwebtoken) and uses the .pem file to sign the request object which is sent to Google for an access token.

### 2. Ensure service user has access to analytics
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
	'ids': 'ga:123456', 			// Update ids with your own view information
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

(This module is loosely based on [ga-report](https://www.npmjs.com/package/ga-report), in that it shares the same API. I developed it as ga-report requires you to provide your Google password, which is not ideal and triggers subsequent scary warning messages from the big G!)