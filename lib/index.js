"use strict";
// ParsePushAdapter is the default implementation of
// PushAdapter, it uses GCM for android push and APNS
// for ios push.
const log = require('npmlog');

/* istanbul ignore if */
if (process.env.VERBOSE || process.env.VERBOSE_PARSE_SERVER_PUSH_ADAPTER) {
  log.level = 'verbose';
}

const ParsePushAdapter = require('./ParsePushAdapter');
const GCM  = require('./GCM');
const APNS  = require('./APNS');
const utils = require('./PushAdapterUtils');

module.exports = Object.assign({}, 
                  ParsePushAdapter, 
                  { ParsePushAdapter,
                    APNS, 
                    GCM, 
                    utils });
