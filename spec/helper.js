const SpecReporter = require('jasmine-spec-reporter').SpecReporter;

jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.PARSE_SERVER_TEST_TIMEOUT || 5000;

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(new SpecReporter());

var libraryCache = {};
jasmine.mockLibrary = function(library, name, mock) {
  var original = require(library)[name];
  if (!libraryCache[library]) {
    libraryCache[library] = {};
  }
  require(library)[name] = mock;
  libraryCache[library][name] = original;
}

jasmine.restoreLibrary = function(library, name) {
  if (!libraryCache[library] || !libraryCache[library][name]) {
    throw 'Can not find library ' + library + ' ' + name;
  }
  require(library)[name] = libraryCache[library][name];
}
