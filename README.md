## Google Analytics REST API via service accounts

This library provides tools to use the [Google Analytics REST API](https://developers.google.com/analytics/devguides/reporting/core/v3/reference) (GET only).

Use of the REST API requires authentication, and this module provides an implementation of Google's [oAuth instructions](https://developers.google.com/accounts/docs/OAuth2ServiceAccount) for 'service accounts' using the oAuth part of the [Google api for Node library](https://github.com/google/google-api-nodejs-client).

There are two additional steps you need to setup to use this code:

### 1. Convert secret key
After creating the service email, you will download a `.p12` key file that needs to be converted to a `.pem` file using:

`openssl pkcs12 -in privatekey.p12 -nodes -nocerts > privatekey.pem`

openssl will ask for the private key, which Google has probably told you is 'notasecret'

The code relies upon [Json Web tokens](https://github.com/auth0/node-jsonwebtoken) and uses the contents of the `.pem` file to sign the request object which is sent to Google for an access token.

### 2. Provide service user access
Use the online [GA Admin tools](https://www.google.com/analytics/web/?hl=en#management/Settings/) "User Management" module to give your service user read access to your GA data (you will need yourself to have management rights to make this change).

## Example of usage

```
var fs = require('fs');
var Report = require('ga-service-cert');

var SERVICE_EMAIL = "123456789-2eqk45me6ts7jn3kf0vfr@developer.gserviceaccount.com";

var query = {
	'ids': 'ga:123456', 			// Update ids with your own view information
	'start-date': '2015-02-24',
	'end-date': '2015-03-10',
	'metrics': 'ga:users'
};

var private_key = fs.readFileSync(__dirname+'/privatekey.pem', "utf8");

var report = new Report(private_key, SERVICE_EMAIL, true);

report.on('ready', function() {
	report.get(query, function(err, data) {
		if (err) throw err
		console.log(data); 			// e.g. [ [ '5140' ] ]
	});
});

report.on('auth_error', function(err) {
	console.log("Auth failed", err);
});
```

### Management data
From version version 0.4, the code implements the simplest [management API](https://developers.google.com/analytics/devguides/config/mgmt/v3/mgmtRest) call (more to follow once I find a use case).

```
report.on('ready', function() {
	report.getManagement(null, function(err, data) {
			if (err) throw err
			console.log(data.kind); 		// e.g. 'analytics#accounts'
	});
});
```

(This module is loosely based on [ga-report](https://www.npmjs.com/package/ga-report), in that it shares the same API. I developed it as ga-report requires you to provide your Google password, which is not ideal from a security perspective, and triggers subsequent scary warning messages from the big G!)

### Change log
 - 1.2.0 - Switched to ES6 for development; shipping with transpiled file
 - 1.0.0 - Breaking change: constructor bow takes the key, rather than filename (to work better with e.g. system variables)
 - 0.4.1 - updated jwt to 5.0 and fixed bug in iat time
