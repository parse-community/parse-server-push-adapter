'use strict';

import Parse from 'parse';
import log from 'npmlog';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { randomString } from './PushAdapterUtils.js';

const LOG_PREFIX = 'parse-server-push-adapter FCM';
const FCMRegistrationTokensMax = 500;
const FCMTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // FCM allows a max of 4 weeks
const apnsIntegerDataKeys = [
  'badge',
  'content-available',
  'mutable-content',
  'priority',
  'expiration_time',
];

export default function FCM(args, pushType) {
  if (typeof args !== 'object' || !args.firebaseServiceAccount) {
    throw new Parse.Error(
      Parse.Error.PUSH_MISCONFIGURED,
      'FCM Configuration is invalid',
    );
  }

  let app;
  if (getApps().length === 0) {
    app = initializeApp({ credential: cert(args.firebaseServiceAccount) });
  } else {
    app = getApp();
  }
  this.sender = getMessaging(app);
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
  if (!data || !devices || !Array.isArray(devices)) {
    log.warn(LOG_PREFIX, 'invalid push payload');
    return;
  }

  // We can only have 500 recepients per send, so we need to slice devices to
  // chunk if necessary
  const slices = sliceDevices(devices, FCM.FCMRegistrationTokensMax);

  const sendToDeviceSlice = (deviceSlice, pushType) => {
    const pushId = randomString(10);
    const timestamp = Date.now();

    // Build a device map
    const devicesMap = deviceSlice.reduce((memo, device) => {
      memo[device.deviceToken] = device;
      return memo;
    }, {});

    const deviceTokens = Object.keys(devicesMap);

    const fcmPayload = generateFCMPayload(
      data,
      pushId,
      timestamp,
      deviceTokens,
      pushType,
    );
    const length = deviceTokens.length;
    log.info(LOG_PREFIX, `sending push to ${length} devices`);

    return this.sender
      .sendEachForMulticast(fcmPayload.data)
      .then((response) => {
        const promises = [];
        const failedTokens = [];
        const successfulTokens = [];

        response.responses.forEach((resp, idx) => {
          if (resp.success) {
            successfulTokens.push(deviceTokens[idx]);
            promises.push(
              createSuccessfulPromise(
                deviceTokens[idx],
                devicesMap[deviceTokens[idx]].deviceType,
              ),
            );
          } else {
            failedTokens.push(deviceTokens[idx]);
            promises.push(
              createErrorPromise(
                deviceTokens[idx],
                devicesMap[deviceTokens[idx]].deviceType,
                resp.error,
              ),
            );
            log.error(
              LOG_PREFIX,
              `failed to send to ${deviceTokens[idx]} with error: ${JSON.stringify(resp.error)}`,
            );
          }
        });

        if (failedTokens.length) {
          log.error(
            LOG_PREFIX,
            `tokens with failed pushes: ${JSON.stringify(failedTokens)}`,
          );
        }

        if (successfulTokens.length) {
          log.verbose(
            LOG_PREFIX,
            `tokens with successful pushes: ${JSON.stringify(successfulTokens)}`,
          );
        }

        return Promise.all(promises);
      });
  };

  const allPromises = Promise.all(
    slices.map((slice) => sendToDeviceSlice(slice, this.pushType)),
  ).catch((err) => {
    log.error(LOG_PREFIX, `error sending push: ${err}`);
  });

  return allPromises;
};

function _APNSToFCMPayload(requestData) {
  let coreData = requestData;

  if (requestData.hasOwnProperty('data')) {
    coreData = requestData.data;
  }

  const expirationTime =
    requestData['expiration_time'] || coreData['expiration_time'];
  const collapseId = requestData['collapse_id'] || coreData['collapse_id'];
  const pushType = requestData['push_type'] || coreData['push_type'];
  const priority = requestData['priority'] || coreData['priority'];

  const apnsPayload = { apns: { payload: { aps: {} } } };
  const headers = {};

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

  for (const key in coreData) {
    switch (key) {
    case 'aps':
      apnsPayload['apns']['payload']['aps'] = coreData.aps;
      break;
    case 'alert':
      if (typeof coreData.alert == 'object') {
        // When we receive a dictionary, use as is to remain
        // compatible with how the APNS.js + node-apn work
        apnsPayload['apns']['payload']['aps']['alert'] = coreData.alert;
      } else {
        // When we receive a value, prepare `alert` dictionary
        // and set its `body` property
        apnsPayload['apns']['payload']['aps']['alert'] = {};
        apnsPayload['apns']['payload']['aps']['alert']['body'] = coreData.alert;
      }
      break;
    case 'title':
      // Ensure the alert object exists before trying to assign the title
      // title always goes into the nested `alert` dictionary
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
      apnsPayload['apns']['payload']['aps']['content-available'] =
          coreData['content-available'];
      break;
    case 'mutable-content':
      apnsPayload['apns']['payload']['aps']['mutable-content'] =
          coreData['mutable-content'];
      break;
    case 'targetContentIdentifier':
      apnsPayload['apns']['payload']['aps']['target-content-id'] =
          coreData.targetContentIdentifier;
      break;
    case 'interruptionLevel':
      apnsPayload['apns']['payload']['aps']['interruption-level'] =
          coreData.interruptionLevel;
      break;
    case 'category':
      apnsPayload['apns']['payload']['aps']['category'] = coreData.category;
      break;
    case 'threadId':
      apnsPayload['apns']['payload']['aps']['thread-id'] = coreData.threadId;
      break;
    case 'expiration_time': // Exclude header-related fields as these are set above
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

function _GCMToFCMPayload(requestData, pushId, timeStamp) {

  const androidPayload = {
    android: {
      priority: 'high',
    },
  };

  if (requestData.hasOwnProperty('notification')) {
    androidPayload.android.notification = requestData.notification;
  }

  if (requestData.hasOwnProperty('data')) {
    // FCM gives an error on send if we have apns keys that should have integer values
    for (const key of apnsIntegerDataKeys) {
      if (requestData.data.hasOwnProperty(key)) {
        delete requestData.data[key]
      }
    }
    androidPayload.android.data = {
      push_id: pushId,
      time: new Date(timeStamp).toISOString(),
      data: JSON.stringify(requestData.data),
    }
  }

  if (requestData['expiration_time']) {
    const expirationTime = requestData['expiration_time'];
    // Convert to seconds
    let timeToLive = Math.floor((expirationTime - timeStamp) / 1000);
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
 * @param {String} pushId Used during GCM payload conversion, required by Parse Android SDK.
 * @param {Number} timeStamp Used during GCM payload conversion for ttl, required by Parse Android SDK.
 * @returns {Object} A FCMv1-compatible payload.
 */
function payloadConverter(requestData, pushType, pushId, timeStamp) {
  if (requestData.hasOwnProperty('rawPayload')) {
    return requestData.rawPayload;
  }

  if (pushType === 'apple') {
    return _APNSToFCMPayload(requestData);
  } else if (pushType === 'android') {
    return _GCMToFCMPayload(requestData, pushId, timeStamp);
  } else {
    throw new Parse.Error(
      Parse.Error.PUSH_MISCONFIGURED,
      'Unsupported push type, apple or android only.',
    );
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
function generateFCMPayload(
  requestData,
  pushId,
  timeStamp,
  deviceTokens,
  pushType,
) {
  delete requestData['where'];

  const payloadToUse = {
    data: {}
  };

  const fcmPayload = payloadConverter(requestData, pushType, pushId, timeStamp);
  payloadToUse.data = {
    ...fcmPayload,
    tokens: deviceTokens,
  };

  return payloadToUse;
}

/**
 * Slice a list of devices to several list of devices with fixed chunk size.
 * @param {Array} devices An array of devices
 * @param {Number} chunkSize The size of the a chunk
 * @returns {Array} An array which contains several arrays of devices with fixed chunk size
 */
function sliceDevices(devices, chunkSize) {
  const chunkDevices = [];
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
      deviceType: deviceType,
    },
    response: { error: errorMessage },
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
      deviceType: deviceType,
    },
  });
}

FCM.generateFCMPayload = generateFCMPayload;

/* istanbul ignore else */
if (process.env.TESTING) {
  FCM.sliceDevices = sliceDevices;
}
