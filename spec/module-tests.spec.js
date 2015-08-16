var path = require('path');
var fs = require('fs');
var Report = require('../index');
// var Report = require('./index.es6');

var SERVICE_EMAIL = "412618503791-0h21osagsg02eqk45me6ts7jn3kf0vfr@developer.gserviceaccount.com";

var query = {
	'ids': 'ga:78624107',
	'start-date': '2015-02-24',
	'end-date': '2015-03-10',
	'metrics': 'ga:users'
};

var private_key = fs.readFileSync(__dirname + '/../ignored/privatekey.pem', "utf8");

describe("GA analytics", function() {
	var report;

	beforeEach(function(done) {
		report = new Report(private_key, SERVICE_EMAIL, 1);
	    report.on('ready', function() {
			console.log("test.js: Token: ", report.token);
        	done();
        });
	});

    it("should connect and emit <ready>", function(done) {
        expect(report.token).toBeDefined();
        done();
    });

    it("should get query data correctly", function(done) {
        report.get(query, function(err, data) {
    		if (err) throw err
            expect(data.rows).toEqual([ [ '5140' ] ]);
            done();
    	});
    });

    it("should get management data correctly", function(done) {
		report.getManagement({}, function(err, data) {
			if (err) throw err
			expect(data.kind).toEqual("analytics#accounts");
			done()
		});
    });
});

describe("GA Module", function() {

	it("should fail when passed bad service email", function(done) {

		var report = new Report(private_key, SERVICE_EMAIL.slice(1), 1);
		report.on('auth_error', function(err) {
			console.error(err);
			expect(err).toBeDefined();
        	done();
        });
	});
});
