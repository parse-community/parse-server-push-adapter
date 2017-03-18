"use strict";

const Parse = require('parse/node');
const log = require('npmlog');
const gcm = require('node-gcm');
const { randomString } = require('./PushAdapterUtils');

const LOG_PREFIX = 'parse-server-push-adapter GCM';
const GCMTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // GCM allows a max of 4 weeks
const GCMRegistrationTokensMax = 1000;

function GCM(args) {
  if (typeof args !== 'object' || !args.apiKey) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'GCM Configuration is invalid');
  }
  this.sender = new gcm.Sender(args.apiKey);
}

/**
 * Send gcm request.
 * @param {Object} data The data we need to send, the format is the same with api request body
 * @param {Array} devices A array of devices
 * @returns {Object} A promise which is resolved after we get results from gcm
 */
GCM.prototype.send = function(data, devices) {
  let pushId = randomString(10);
  // Make a new array
  devices=devices.slice(0);
  let timestamp = Date.now();
  // For android, we can only have 1000 recepients per send, so we need to slice devices to
  // chunk if necessary
  let slices = sliceDevices(devices, GCMRegistrationTokensMax);
  if (slices.length > 1) {
    log.verbose(LOG_PREFIX, `the number of devices exceeds ${GCMRegistrationTokensMax}`);
    // Make 1 send per slice
    let promises = slices.reduce((memo, slice) => {
      let promise = this.send(data, slice, timestamp);
      memo.push(promise);
      return memo;
    }, [])
    return Parse.Promise.when(promises).then((results) => {
      let allResults = results.reduce((memo, result) => {
        return memo.concat(result);
      }, []);
      return Parse.Promise.as(allResults);
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
  let gcmPayload = generateGCMPayload(data, pushId, timestamp, expirationTime);
  // Make and send gcm request
  let message = new gcm.Message(gcmPayload);

  // Build a device map
  let devicesMap = devices.reduce((memo, device) => {
    memo[device.deviceToken] = device;
    return memo;
  }, {});

  let deviceTokens = Object.keys(devicesMap);

  let promises = deviceTokens.map(() => new Parse.Promise());
  let registrationTokens = deviceTokens;
  let length = registrationTokens.length;
  log.verbose(LOG_PREFIX, `sending to ${length} ${length > 1 ? 'devices' : 'device'}`);
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
    let { results, multicast_id } = response || {};
    registrationTokens.forEach((token, index) => {
      let promise = promises[index];
      let result = results ? results[index] : undefined;
      let device = devicesMap[token];
      device.deviceType = 'android';
      let resolution = {
        device,
        multicast_id,
        response: error || result,
      };
      if (!result || result.error) {
        resolution.transmitted = false;
      } else {
        resolution.transmitted = true;
      }
      promise.resolve(resolution);
    });
  });
  return Parse.Promise.when(promises);
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
  let payload = {
    priority: 'high'
  };
  payload.data = {
    data: requestData.data,
    push_id: pushId,
    time: new Date(timeStamp).toISOString()
  }
  if (requestData.content_available) {
    payload.content_available = requestData.content_available;
  }
  if (requestData.notification) {
    payload.notification = requestData.notification;
  }
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
  let chunkDevices = [];
  while (devices.length > 0) {
    chunkDevices.push(devices.splice(0, chunkSize));
  }
  return chunkDevices;
}

GCM.generateGCMPayload = generateGCMPayload;

if (process.env.TESTING) {
  GCM.sliceDevices = sliceDevices;
}

module.exports = GCM;
