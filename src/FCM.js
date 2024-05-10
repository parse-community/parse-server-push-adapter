'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = FCM;

var _parse = require('parse');

var _parse2 = _interopRequireDefault(_parse);

var _npmlog = require('npmlog');

var _npmlog2 = _interopRequireDefault(_npmlog);

var _app = require('firebase-admin/app');

var _messaging = require('firebase-admin/messaging');

var _PushAdapterUtils = require('./PushAdapterUtils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var LOG_PREFIX = 'parse-server-push-adapter FCM';
var FCMRegistrationTokensMax = 500;
var FCMTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // FCM allows a max of 4 weeks
var apnsIntegerDataKeys = ['badge', 'content-available', 'mutable-content', 'priority', 'expiration_time'];

function FCM(args, pushType) {
console.log(args)
console.log('nessa parte')
if ((typeof args === 'undefined' ? 'undefined' : _typeof(args)) !== 'object' || !args.firebaseServiceAccount) {
    throw new _parse2.default.Error(_parse2.default.Error.PUSH_MISCONFIGURED, 'FCM Configuration is invalid');
  }

  var app = void 0;
  if ((0, _app.getApps)().length === 0) {
    app = (0, _app.initializeApp)({ credential: (0, _app.cert)(args.firebaseServiceAccount) });
  } else {
    app = (0, _app.getApp)();
  }
  this.sender = (0, _messaging.getMessaging)(app);
  this.pushType = pushType; // Push type is only used to remain backwards compatible with APNS and GCM
}

FCM.FCMRegistrationTokensMax = FCMRegistrationTokensMax;

/**
 * Send fcm request.
 * @param {Object} data The data we need to send, the format is the same with api request body
 * @param {Array} devices A array of devices
 * @returns {Object} Array of resolved promises
 */

FCM.prototype.send = function (data, devices) {
  var _this = this;

  if (!data || !devices || !Array.isArray(devices)) {
    _npmlog2.default.warn(LOG_PREFIX, 'invalid push payload');
    return;
  }

  // We can only have 500 recepients per send, so we need to slice devices to
  // chunk if necessary
  var slices = sliceDevices(devices, FCM.FCMRegistrationTokensMax);

  var sendToDeviceSlice = function sendToDeviceSlice(deviceSlice, pushType) {
    var pushId = (0, _PushAdapterUtils.randomString)(10);
    var timestamp = Date.now();

    // Build a device map
    var devicesMap = deviceSlice.reduce(function (memo, device) {
      memo[device.deviceToken] = device;
      return memo;
    }, {});

    var deviceTokens = Object.keys(devicesMap);

    var fcmPayload = generateFCMPayload(data, pushId, timestamp, deviceTokens, pushType);
    var length = deviceTokens.length;
    _npmlog2.default.info(LOG_PREFIX, 'sending push to ' + length + ' devices');

    return _this.sender.sendEachForMulticast(fcmPayload.data).then(function (response) {
      var promises = [];
      var failedTokens = [];
      var successfulTokens = [];

      response.responses.forEach(function (resp, idx) {
        if (resp.success) {
          successfulTokens.push(deviceTokens[idx]);
          promises.push(createSuccessfulPromise(deviceTokens[idx], devicesMap[deviceTokens[idx]].deviceType));
        } else {
          failedTokens.push(deviceTokens[idx]);
          promises.push(createErrorPromise(deviceTokens[idx], devicesMap[deviceTokens[idx]].deviceType, resp.error));
          _npmlog2.default.error(LOG_PREFIX, 'failed to send to ' + deviceTokens[idx] + ' with error: ' + JSON.stringify(resp.error));
        }
      });

      if (failedTokens.length) {
        _npmlog2.default.error(LOG_PREFIX, 'tokens with failed pushes: ' + JSON.stringify(failedTokens));
      }

      if (successfulTokens.length) {
        _npmlog2.default.verbose(LOG_PREFIX, 'tokens with successful pushes: ' + JSON.stringify(successfulTokens));
      }

      return Promise.all(promises);
    });
  };

  var allPromises = Promise.all(slices.map(function (slice) {
    return sendToDeviceSlice(slice, _this.pushType);
  })).catch(function (err) {
    _npmlog2.default.error(LOG_PREFIX, 'error sending push: ' + err);
  });

  return allPromises;
};

function _APNSToFCMPayload(requestData) {
  var coreData = requestData;

  if (requestData.hasOwnProperty('data')) {
    coreData = requestData.data;
  }

  var expirationTime = requestData['expiration_time'] || coreData['expiration_time'];
  var collapseId = requestData['collapse_id'] || coreData['collapse_id'];
  var pushType = requestData['push_type'] || coreData['push_type'];
  var priority = requestData['priority'] || coreData['priority'];

  var apnsPayload = { apns: { payload: { aps: {} } } };
  var headers = {};

  // Set to alert by default if not set explicitly
  headers['apns-push-type'] = 'alert';

  if (expirationTime) {
    headers['apns-expiration'] = Math.round(expirationTime / 1000);
  }

  if (collapseId) {
    headers['apns-collapse-id'] = collapseId;
  }
  if (pushType) {
    headers['apns-push-type'] = pushType;
  }
  if (priority) {
    headers['apns-priority'] = priority;
  }

  if (Object.keys(headers).length > 0) {
    apnsPayload.apns.headers = headers;
  }

  for (var key in coreData) {
    switch (key) {
      case 'aps':
        apnsPayload['apns']['payload']['aps'] = coreData.aps;
        break;
      case 'alert':
        if (!apnsPayload['apns']['payload']['aps'].hasOwnProperty('alert')) {
          apnsPayload['apns']['payload']['aps']['alert'] = {};
        }
        // In APNS.js we set a body with the same value as alert in requestData.
        // See L200 in APNS.spec.js
        apnsPayload['apns']['payload']['aps']['alert']['body'] = coreData.alert;
        break;
      case 'title':
        // Ensure the alert object exists before trying to assign the title
        if (!apnsPayload['apns']['payload']['aps'].hasOwnProperty('alert')) {
          apnsPayload['apns']['payload']['aps']['alert'] = {};
        }
        apnsPayload['apns']['payload']['aps']['alert']['title'] = coreData.title;
        break;
      case 'badge':
        apnsPayload['apns']['payload']['aps']['badge'] = coreData.badge;
        break;
      case 'sound':
        apnsPayload['apns']['payload']['aps']['sound'] = coreData.sound;
        break;
      case 'content-available':
        apnsPayload['apns']['payload']['aps']['content-available'] = coreData['content-available'];
        break;
      case 'mutable-content':
        apnsPayload['apns']['payload']['aps']['mutable-content'] = coreData['mutable-content'];
        break;
      case 'targetContentIdentifier':
        apnsPayload['apns']['payload']['aps']['target-content-id'] = coreData.targetContentIdentifier;
        break;
      case 'interruptionLevel':
        apnsPayload['apns']['payload']['aps']['interruption-level'] = coreData.interruptionLevel;
        break;
      case 'category':
        apnsPayload['apns']['payload']['aps']['category'] = coreData.category;
        break;
      case 'threadId':
        apnsPayload['apns']['payload']['aps']['thread-id'] = coreData.threadId;
        break;
      case 'expiration_time':
        // Exclude header-related fields as these are set above
        break;
      case 'collapse_id':
        break;
      case 'push_type':
        break;
      case 'priority':
        break;
      default:
        apnsPayload['apns']['payload'][key] = coreData[key]; // Custom keys should be outside aps
        break;
    }
  }
  return apnsPayload;
}

function _GCMToFCMPayload(requestData, timeStamp) {
  var androidPayload = {
    android: {
      priority: 'high'
    }
  };

if (requestData.hasOwnProperty('notification')) {
  androidPayload.android.notification = requestData.notification;
} else if (requestData.hasOwnProperty('data')) {;
  androidPayload.android.notification = {};
  if (requestData.data.title) androidPayload.android.notification['title'] = requestData.data.title;
  if (requestData.data.alert) androidPayload.android.notification['body'] = requestData.data.alert;
  else if (requestData.data.body) androidPayload.android.notification['body'] = requestData.data.body;
}

if (typeof androidPayload.android.notification.body == "object") androidPayload.android.notification['body'] = JSON.stringify(androidPayload.android.notification.body)

  if (requestData.hasOwnProperty('data')) {
    // FCM gives an error on send if we have apns keys that should have integer values
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = apnsIntegerDataKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var key = _step.value;

        if (requestData.data.hasOwnProperty(key)) {
          delete requestData.data[key];
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

  if (requestData.data && requestData.data.alert && typeof requestData.data.alert == "object"){
  androidPayload.android.data = {
  ...requestData.data,
  alert: JSON.stringify(requestData.data.alert)
  }
}
  else androidPayload.android.data = requestData.data;
  }

  if (requestData['expiration_time']) {
    var expirationTime = requestData['expiration_time'];
    // Convert to seconds
    var timeToLive = Math.floor((expirationTime - timeStamp) / 1000);
    if (timeToLive < 0) {
      timeToLive = 0;
    }
    if (timeToLive >= FCMTimeToLiveMax) {
      timeToLive = FCMTimeToLiveMax;
    }

    androidPayload.android.ttl = timeToLive;
  }

  return androidPayload;
}

/**
 * Converts payloads used by APNS or GCM into a FCMv1-compatible payload.
 * Purpose is to remain backwards-compatible will payloads used in the APNS.js and GCM.js modules.
 * If the key rawPayload is present in the requestData, a raw payload will be used. Otherwise, conversion is done.
 * @param {Object} requestData The request body
 * @param {String} pushType Either apple or android.
 * @param {Number} timeStamp Used during GCM payload conversion for ttl
 * @returns {Object} A FCMv1-compatible payload.
 */
function payloadConverter(requestData, pushType, timeStamp) {
  if (requestData.hasOwnProperty('rawPayload')) {
    return requestData.rawPayload;
  }

  if (pushType === 'apple') {
    return _APNSToFCMPayload(requestData);
  } else if (pushType === 'android') {
    return _GCMToFCMPayload(requestData, timeStamp);
  } else {
    throw new _parse2.default.Error(_parse2.default.Error.PUSH_MISCONFIGURED, 'Unsupported push type, apple or android only.');
  }
}

/**
 * Generate the fcm payload from the data we get from api request.
 * @param {Object} requestData The request body
 * @param {String} pushId A random string
 * @param {Number} timeStamp A number in milliseconds since the Unix Epoch
 * @param {Array.<String>} deviceTokens An array of deviceTokens
 * @param {String} pushType Either apple or android
 * @returns {Object} A payload for FCM
 */
function generateFCMPayload(requestData, pushId, timeStamp, deviceTokens, pushType) {
  delete requestData['where'];

  var payloadToUse = {
    data: {},
    push_id: pushId,
    time: new Date(timeStamp).toISOString()
  };

  var fcmPayload = payloadConverter(requestData, pushType, timeStamp);
  payloadToUse.data = _extends({}, fcmPayload, {
    tokens: deviceTokens
  });

  return payloadToUse;
}

/**
 * Slice a list of devices to several list of devices with fixed chunk size.
 * @param {Array} devices An array of devices
 * @param {Number} chunkSize The size of the a chunk
 * @returns {Array} An array which contains several arrays of devices with fixed chunk size
 */
function sliceDevices(devices, chunkSize) {
  var chunkDevices = [];
  while (devices.length > 0) {
    chunkDevices.push(devices.splice(0, chunkSize));
  }
  return chunkDevices;
}

/**
 * Creates an errorPromise for return.
 *
 * @param {String} token Device-Token
 * @param {String} deviceType Device-Type
 * @param {String} errorMessage ErrrorMessage as string
 */
function createErrorPromise(token, deviceType, errorMessage) {
  return Promise.resolve({
    transmitted: false,
    device: {
      deviceToken: token,
      deviceType: deviceType
    },
    response: { error: errorMessage }
  });
}

/**
 * Creates an successfulPromise for return.
 *
 * @param {String} token Device-Token
 * @param {String} deviceType Device-Type
 */
function createSuccessfulPromise(token, deviceType) {
  return Promise.resolve({
    transmitted: true,
    device: {
      deviceToken: token,
      deviceType: deviceType
    }
  });
}

FCM.generateFCMPayload = generateFCMPayload;

/* istanbul ignore else */
if (process.env.TESTING) {
  FCM.sliceDevices = sliceDevices;
}