"use strict";
// ParsePushAdapter is the default implementation of
// PushAdapter, it uses GCM for android push and APNS
// for ios push.

import ParsePushAdapter from './ParsePushAdapter';
import GCM from './GCM';
import APNS from './APNS';

export default ParsePushAdapter;
module.exports = ParsePushAdapter;
export { APNS };
export { GCM };
