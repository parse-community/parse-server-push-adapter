"use strict";

import Parse from 'parse';
import log from 'npmlog';
import { initializeApp } from 'firebase-admin/app';
import { randomString } from './PushAdapterUtils';

const LOG_PREFIX = 'parse-server-push-adapter FCM';
const FCMTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // FCM allows a max of 4 weeks
const FCMRegistrationTokensMax = 1000;

export default function FCM(args) {
  if (typeof args !== 'object' || !args.firebaseServiceAccount) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'FCM Configuration is invalid');
  }
  initializeApp({credential: args.firebaseServiceAccount});
  this.sender = getMessaging();
  //this.sender = new gcm.Sender(args.apiKey, args.requestOptions);
}

/**
 * Send gcm request.
 * @param {Object} data The data we need to send, the format is the same with api request body
 * @param {Array} devices A array of devices
 * @returns {Object} A promise which is resolved after we get results from gcm
 */
FCM.prototype.send = function(data, devices) {
  if (!data || !devices || !Array.isArray(devices)) {
    log.warn(LOG_PREFIX, 'invalid push payload');
    return;
  }
  let pushId = randomString(10);
  // Make a new array
  devices=devices.slice(0);
  let timestamp = Date.now();
  // For android, we can only have 1000 recepients per send, so we need to slice devices to
  // chunk if necessary
  let slices = sliceDevices(devices, FCM.FCMRegistrationTokensMax);
  if (slices.length > 1) {
    log.verbose(LOG_PREFIX, `the number of devices exceeds ${FCMRegistrationTokensMax}`);
    // Make 1 send per slice
    let promises = slices.reduce((memo, slice) => {
      let promise = this.send(data, slice, timestamp);
      memo.push(promise);
      return memo;
    }, [])
    return Promise.all(promises).then((results) => {
      let allResults = results.reduce((memo, result) => {
        return memo.concat(result);
      }, []);
      return Promise.resolve(allResults);
    });
  }
  // get the devices back...
  devices = slices[0];

  let expirationTime;
  // We handle the expiration_time convertion in push.js, so expiration_time is a valid date
  // in Unix epoch time in milliseconds here
  if (data['expiration_time']) {
    expirationTime = data['expiration_time'];
  }
  // Generate gcm payload
  // PushId is not a formal field of FCM, but Parse Android SDK uses this field to deduplicate push notifications
  let fcmPayload = generateFCMPayload(data, pushId, timestamp, expirationTime);
  // Make and send gcm request
  //let message = new gcm.Message(fcmPayload);

  // Build a device map
  let devicesMap = devices.reduce((memo, device) => {
    memo[device.deviceToken] = device;
    return memo;
  }, {});

  let deviceTokens = Object.keys(devicesMap);

  const resolvers = [];
  //const promises = deviceTokens.map(() => new Promise(resolve => resolvers.push(resolve)));
  fcmPayload.tokens = registrationTokens;
  let registrationTokens = deviceTokens;
  let length = registrationTokens.length;
  log.verbose(LOG_PREFIX, `sending to ${length} ${length > 1 ? 'devices' : 'device'}`);

  this.sender.sendMulticast(fcmPayload)
}

/**
 * Generate the gcm payload from the data we get from api request.
 * @param {Object} requestData The request body
 * @param {String} pushId A random string
 * @param {Number} timeStamp A number whose format is the Unix Epoch
 * @param {Number|undefined} expirationTime A number whose format is the Unix Epoch or undefined
 * @returns {Object} A promise which is resolved after we get results from gcm
 */
function generateFCMPayload(requestData, pushId, timeStamp, expirationTime) {
  let payload = {
    priority: 'high'
  };
  payload.data = {
    data: requestData.data,
    push_id: pushId,
    time: new Date(timeStamp).toISOString()
  }
  const optionalKeys = ['contentAvailable', 'notification'];
  optionalKeys.forEach((key) => {
    if (requestData.hasOwnProperty(key)) {
      payload[key] = requestData[key];
    }
  });

  if (expirationTime) {
   // The timeStamp and expiration is in milliseconds but gcm requires second
    let timeToLive = Math.floor((expirationTime - timeStamp) / 1000);
    if (timeToLive < 0) {
      timeToLive = 0;
    }
    if (timeToLive >= FCMTimeToLiveMax) {
      timeToLive = FCMTimeToLiveMax;
    }
    payload.timeToLive = timeToLive;
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

FCM.generateFCMPayload = generateFCMPayload;

/* istanbul ignore else */
if (process.env.TESTING) {
  FCM.sliceDevices = sliceDevices;
}
