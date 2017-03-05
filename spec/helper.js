const SpecReporter = require('jasmine-spec-reporter').SpecReporter;

jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.PARSE_SERVER_TEST_TIMEOUT || 5000;

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(new SpecReporter());

