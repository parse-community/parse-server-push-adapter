"use strict";

import Parse from 'parse';
import log from 'npmlog';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { randomString } from './PushAdapterUtils';

const LOG_PREFIX = 'parse-server-push-adapter FCM';
const FCMRegistrationTokensMax = 500;
const FCMTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // FCM allows a max of 4 weeks

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
  const slices = sliceDevices(devices, FCM.FCMRegistrationTokensMax);

  const sendToDeviceSlice = (deviceSlice) => {
    const pushId = randomString(10);
    const timestamp = Date.now();

    // Build a device map
    const devicesMap = deviceSlice.reduce((memo, device) => {
      memo[device.deviceToken] = device;
      return memo;
    }, {});

    const deviceTokens = Object.keys(devicesMap);
    const fcmPayload = generateFCMPayload(data, pushId, timestamp, deviceTokens);
    const length = deviceTokens.length;
    log.info(LOG_PREFIX, `sending push to ${length} devices`);

    return this.sender.sendEachForMulticast(fcmPayload.data)
      .then((response) => {
        const promises = [];
        const failedTokens = [];
        const successfulTokens = [];

        response.responses.forEach((resp, idx) => {
          if (resp.success) {
            successfulTokens.push(deviceTokens[idx]);
            promises.push(createSuccessfulPromise(deviceTokens[idx], devicesMap[deviceTokens[idx]].deviceType));
          } else {
            failedTokens.push(deviceTokens[idx]);
            promises.push(createErrorPromise(deviceTokens[idx], devicesMap[deviceTokens[idx]].deviceType, resp.error));
            log.error(LOG_PREFIX, `failed to send to ${deviceTokens[idx]} with error: ${JSON.stringify(resp.error)}`);
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
 * @param {Number} timeStamp A number in milliseconds since the Unix Epoch
 * @returns {Object} A payload for FCM
 */
function generateFCMPayload(requestData, pushId, timeStamp, deviceTokens) {
  delete requestData['where'];

  const payloadToUse = {
      data: {},
      push_id: pushId,
      time: new Date(timeStamp).toISOString()
  };

  // Use rawPayload instead of the GCM implementation if it exists
  if (requestData.hasOwnProperty('rawPayload')) {
      payloadToUse.data = {
          ...requestData.rawPayload,
          tokens: deviceTokens
      };
  } else {
      // Android payload according to GCM implementation
      const androidPayload = {
          android: {
              priority: 'high'
          },
          tokens: deviceTokens
      };

      if (requestData.hasOwnProperty('notification')) {
          androidPayload.notification = requestData.notification;
      }

      if (requestData.hasOwnProperty('data')) {
          androidPayload.data = requestData.data;
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

      payloadToUse.data = androidPayload;
  }

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
