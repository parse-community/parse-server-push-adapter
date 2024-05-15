"use strict";
// ParsePushAdapter is the default implementation of
// PushAdapter, it uses GCM for android push, APNS for ios push.
// WEB for web push.
import log from 'npmlog';

/* istanbul ignore if */
if (process.env.VERBOSE || process.env.VERBOSE_PARSE_SERVER_PUSH_ADAPTER) {
  log.level = 'verbose';
}

import ParsePushAdapter from './ParsePushAdapter';
import GCM from './GCM';
import APNS from './APNS';
import WEB from './WEB';
import EXPO from './EXPO';
import * as utils from './PushAdapterUtils';

export default ParsePushAdapter;
export { ParsePushAdapter, APNS, GCM, WEB, EXPO, utils };
