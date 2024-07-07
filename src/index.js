"use strict";
// ParsePushAdapter is the default implementation of
// PushAdapter, it uses GCM for android push, APNS for ios push.
// WEB for web push.
import log from 'npmlog';

/* istanbul ignore if */
if (process.env.VERBOSE || process.env.VERBOSE_PARSE_SERVER_PUSH_ADAPTER) {
  log.level = 'verbose';
}

import ParsePushAdapter from './ParsePushAdapter.js';
import GCM from './GCM.js';
import APNS from './APNS.js';
import WEB from './WEB.js';
import EXPO from './EXPO.js';
import * as utils from './PushAdapterUtils.js';

export default ParsePushAdapter;
export { ParsePushAdapter, APNS, GCM, WEB, EXPO, utils };
