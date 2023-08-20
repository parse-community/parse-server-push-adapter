"use strict";

import Parse from 'parse';
import log from 'npmlog';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { randomString } from './PushAdapterUtils';

const LOG_PREFIX = 'parse-server-push-adapter FCM';
const FCMRegistrationTokensMax = 500;

export default function FCM(args) {
  if (typeof args !== 'object' || !args.firebaseServiceAccount) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'FCM Configuration is invalid');
  }

  let app;
  if (getApps().length === 0) {
    app = initializeApp({credential: cert(args.firebaseServiceAccount)});
  }
  else {
    app = getApp();
  }
  this.sender = getMessaging(app);
}

FCM.FCMRegistrationTokensMax = FCMRegistrationTokensMax;

/**
 * Send fcm request.
 * @param {Object} data The data we need to send, the format is the same with api request body
 * @param {Array} devices A array of devices
 * @returns {Object} Array of resolved promises
 */

FCM.prototype.send = function(data, devices) {
  if (!data || !devices || !Array.isArray(devices)) {
    log.warn(LOG_PREFIX, 'invalid push payload');
    return;
  }


  // We can only have 500 recepients per send, so we need to slice devices to
  // chunk if necessary
  let slices = sliceDevices(devices, FCM.FCMRegistrationTokensMax);

  const sendToDeviceSlice = (deviceSlice) => {
    let pushId = randomString(10);
    let timestamp = Date.now();

    // Build a device map
    let devicesMap = deviceSlice.reduce((memo, device) => {
      memo[device.deviceToken] = device;
      return memo;
    }, {});

    let deviceTokens = Object.keys(devicesMap);
    let fcmPayload = generateFCMPayload(data, pushId, timestamp, deviceTokens);
    let registrationTokens = deviceTokens;
    let length = registrationTokens.length;
    log.info(LOG_PREFIX, `sending push to ${length} devices`);

    return this.sender.sendEachForMulticast(fcmPayload.payload.data)
      .then((response) => {
        const promises = [];
        const failedTokens = [];
        const successfulTokens = [];

        response.responses.forEach((resp, idx) => {
          if (resp.success) {
            successfulTokens.push(registrationTokens[idx]);
            promises.push(createSuccesfullPromise(registrationTokens[idx], devicesMap[registrationTokens[idx]].deviceType));
          } else {
            failedTokens.push(registrationTokens[idx]);
            promises.push(createErrorPromise(registrationTokens[idx], devicesMap[registrationTokens[idx]].deviceType, resp.error));
            log.error(LOG_PREFIX, `failed to send to ${registrationTokens[idx]} with error: ${JSON.stringify(resp.error)}`);
          }
        });

        if (failedTokens.length) {
          log.error(LOG_PREFIX, `tokens with failed pushes: ${JSON.stringify(failedTokens)}`);
        }

        if (successfulTokens.length) {
          log.verbose(LOG_PREFIX, `tokens with successful pushes: ${JSON.stringify(successfulTokens)}`);
        }

        return Promise.all(promises);
      });
  };

  const allPromises = Promise.all(slices.map(sendToDeviceSlice))
    .catch((err) => {
      log.error(LOG_PREFIX, `error sending push: ${err}`);
    });

  return allPromises;
}

/**
 * Generate the fcm payload from the data we get from api request.
 * @param {Object} requestData The request body
 * @param {String} pushId A random string
 * @param {Number} timeStamp A number whose format is the Unix Epoch
 * @returns {Object} A payload for FCM
 */
function generateFCMPayload(requestData, pushId, timeStamp, deviceTokens) {
  delete requestData['where'];
  requestData.tokens = deviceTokens;
  let payload = {}

  payload.payload = {
    data: requestData,
    push_id: pushId,
    time: new Date(timeStamp).toISOString()
  }

  return payload;
}

/**
 * Slice a list of devices to several list of devices with fixed chunk size.
 * @param {Array} devices An array of devices
 * @param {Number} chunkSize The size of the a chunk
 * @returns {Array} An array which contaisn several arries of devices with fixed chunk size
 */
function sliceDevices(devices, chunkSize) {
  let chunkDevices = [];
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
function createSuccesfullPromise(token, deviceType) {
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
