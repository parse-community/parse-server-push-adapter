"use strict";

import Parse from 'parse';
import log from 'npmlog';
import gcm from '@parse/node-gcm';
import { randomString } from './PushAdapterUtils.js';

const LOG_PREFIX = 'parse-server-push-adapter GCM';
const GCMTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // GCM allows a max of 4 weeks
const GCMRegistrationTokensMax = 1000;

export default function GCM(args) {
  if (typeof args !== 'object' || !args.apiKey) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
      'GCM Configuration is invalid');
  }
  this.sender = new gcm.Sender(args.apiKey, args.requestOptions);
}

GCM.GCMRegistrationTokensMax = GCMRegistrationTokensMax;

/**
 * Send gcm request.
 * @param {Object} data The data we need to send, the format is the same with api request body
 * @param {Array} devices A array of devices
 * @returns {Object} A promise which is resolved after we get results from gcm
 */
GCM.prototype.send = function(data, devices) {
  if (!data || !devices || !Array.isArray(devices)) {
    log.warn(LOG_PREFIX, 'invalid push payload');
    return;
  }
  const pushId = randomString(10);
  // Make a new array
  devices = devices.slice(0);
  const timestamp = Date.now();
  // For android, we can only have 1000 recepients per send, so we need to slice devices to
  // chunk if necessary
  const slices = sliceDevices(devices, GCM.GCMRegistrationTokensMax);
  if (slices.length > 1) {
    log.verbose(LOG_PREFIX, `the number of devices exceeds ${GCMRegistrationTokensMax}`);
    // Make 1 send per slice
    const promises = slices.reduce((memo, slice) => {
      const promise = this.send(data, slice, timestamp);
      memo.push(promise);
      return memo;
    }, [])
    return Promise.all(promises).then((results) => {
      const allResults = results.reduce((memo, result) => {
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
  // PushId is not a formal field of GCM, but Parse Android SDK uses this field to deduplicate push notifications
  const gcmPayload = generateGCMPayload(data, pushId, timestamp, expirationTime);
  // Make and send gcm request
  const message = new gcm.Message(gcmPayload);

  // Build a device map
  const devicesMap = devices.reduce((memo, device) => {
    memo[device.deviceToken] = device;
    return memo;
  }, {});

  const deviceTokens = Object.keys(devicesMap);

  const resolvers = [];
  const promises = deviceTokens.map(() => new Promise(resolve => resolvers.push(resolve)));
  const registrationTokens = deviceTokens;
  const length = registrationTokens.length;
  log.verbose(LOG_PREFIX, `sending to ${length} ${length > 1 ? 'devices' : 'device'}`);
  this.sender.send(message, { registrationTokens: registrationTokens }, 5, (error, response) => {
    // example response:
    /*
    {  "multicast_id":7680139367771848000,
      "success":0,
      "failure":4,
      "canonical_ids":0,
      "results":[ {"error":"InvalidRegistration"},
        {"error":"InvalidRegistration"},
        {"error":"InvalidRegistration"},
        {"error":"InvalidRegistration"}] }
    */
    if (error) {
      log.error(LOG_PREFIX, `send errored: %s`, JSON.stringify(error, null, 4));
    } else {
      log.verbose(LOG_PREFIX, `GCM Response: %s`, JSON.stringify(response, null, 4));
    }
    const { results, multicast_id } = response || {};
    registrationTokens.forEach((token, index) => {
      const resolve = resolvers[index];
      const result = results ? results[index] : undefined;
      const device = devicesMap[token];
      device.deviceType = 'android';
      const resolution = {
        device,
        multicast_id,
        response: error || result,
      };
      if (!result || result.error) {
        resolution.transmitted = false;
      } else {
        resolution.transmitted = true;
      }
      resolve(resolution);
    });
  });
  return Promise.all(promises);
}

/**
 * Generate the gcm payload from the data we get from api request.
 * @param {Object} requestData The request body
 * @param {String} pushId A random string
 * @param {Number} timeStamp A number whose format is the Unix Epoch
 * @param {Number|undefined} expirationTime A number whose format is the Unix Epoch or undefined
 * @returns {Object} A promise which is resolved after we get results from gcm
 */
function generateGCMPayload(requestData, pushId, timeStamp, expirationTime) {
  const payload = {
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
    if (timeToLive >= GCMTimeToLiveMax) {
      timeToLive = GCMTimeToLiveMax;
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
  const chunkDevices = [];
  while (devices.length > 0) {
    chunkDevices.push(devices.splice(0, chunkSize));
  }
  return chunkDevices;
}

GCM.generateGCMPayload = generateGCMPayload;

/* istanbul ignore else */
if (process.env.TESTING) {
  GCM.sliceDevices = sliceDevices;
}
