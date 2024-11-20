"use strict";
// ParsePushAdapter is the default implementation of
// PushAdapter, it uses GCM for android push, APNS for ios push.
// WEB for web push.

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.utils = exports.EXPO = exports.WEB = exports.APNS = exports.ParsePushAdapter = undefined;

var _npmlog = require('npmlog');

var _npmlog2 = _interopRequireDefault(_npmlog);

var _ParsePushAdapter = require('./ParsePushAdapter');

var _ParsePushAdapter2 = _interopRequireDefault(_ParsePushAdapter);

var _APNS = require('./APNS');

var _APNS2 = _interopRequireDefault(_APNS);

var _WEB = require('./WEB');

var _WEB2 = _interopRequireDefault(_WEB);

var _EXPO = require('./EXPO');

var _EXPO2 = _interopRequireDefault(_EXPO);

var _PushAdapterUtils = require('./PushAdapterUtils');

var utils = _interopRequireWildcard(_PushAdapterUtils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* istanbul ignore if */
if (process.env.VERBOSE || process.env.VERBOSE_PARSE_SERVER_PUSH_ADAPTER) {
  _npmlog2.default.level = 'verbose';
}exports.default = _ParsePushAdapter2.default;
exports.ParsePushAdapter = _ParsePushAdapter2.default;
exports.APNS = _APNS2.default;
exports.WEB = _WEB2.default;
exports.EXPO = _EXPO2.default;
exports.utils = utils;