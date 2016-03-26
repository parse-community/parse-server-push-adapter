"use strict";
// ParsePushAdapter is the default implementation of
// PushAdapter, it uses GCM for android push and APNS
// for ios push.
import log from 'npmlog';

if (process.env.VERBOSE || process.env.VERBOSE_PARSE_SERVER_PUSH_ADAPTER) {
  log.level = 'verbose';
}

import ParsePushAdapter from './ParsePushAdapter';
import GCM from './GCM';
import APNS from './APNS';
import * as utils from './PushAdapterUtils';

export default ParsePushAdapter;
export { ParsePushAdapter, APNS, GCM, utils };
