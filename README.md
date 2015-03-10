Node JS Google Analytics REST tools
===================================

Users a service account to access Google Analytics REST service (GET only)


https://developers.google.com/accounts/docs/OAuth2ServiceAccount
Provides instructions to create a service account

https://github.com/auth0/node-jsonwebtoken
tool to sign 

Convert secret key
Downloaded a p12 file, need to convert
requires the key : 'notasecret'
openssl pkcs12 -in privatekey.p12 -nodes -nocerts > privatekey.pem



https://developers.google.com/analytics/devguides/reporting/core/v3/reference
rest api for analytics


Give service user access to analyitcs at account level