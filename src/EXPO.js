"use strict";

import Parse from 'parse';
import log from 'npmlog';
import Expo from 'expo-server-sdk';
import { randomString } from './PushAdapterUtils';

const LOG_PREFIX = 'parse-server-push-adapter EXPO';
const GCMRegistrationTokensMax = 1000;
const EXPOTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // GCM allows a max of 4 weeks

export default function EXPO(args) {
  this.sender = new Expo();
}

// GCM.GCMRegistrationTokensMax = GCMRegistrationTokensMax;

/**
 * Send gcm request.
 * @param {Object} data The data we need to send, the format is the same with api request body
 * @param {Array} devices A array of devices
 * @returns {Object} A promise which is resolved after we get results from gcm
 */
EXPO.prototype.send = function(data, devices) {
  let pushId = randomString(10);
  // Make a new array
  devices=devices.slice(0);
  let timestamp = Date.now();

  let expirationTime;
  // We handle the expiration_time convertion in push.js, so expiration_time is a valid date
  // in Unix epoch time in milliseconds here
  if (data['expiration_time']) {
    expirationTime = data['expiration_time'];
  }
  // Generate gcm payload
  // PushId is not a formal field of GCM, but Parse Android SDK uses this field to deduplicate push notifications
  //let gcmPayload = generateEXPOPayload(data, pushId, timestamp, expirationTime);
  // Make and send gcm request
  let messages = [];

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
  for (let pushToken of registrationTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      body: data.alert,
      title: data.title,
      badge: data.badge ? data.badge : 1,
      data: data,
      ttl: EXPOTimeToLiveMax,
      priority: 'high',
      channelId: 'fif-notifications'
    });
  }

  let chunks = this.sender.chunkPushNotifications(messages);
  let tickets = [];

  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }
  })();

  let receiptIds = [];
  for (let ticket of tickets) {
    if (ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  (async () => {
    for (let chunk of receiptIdChunks) {
      try {
        let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        console.log(receipts);

        // The receipts specify whether Apple or Google successfully received the
        // notification and information about an error, if one occurred.
        receipts.forEach((receipt, index) => {
          let promise = promises[index];
          let result = results ? results[index] : undefined;
          let device = devicesMap[token];
          device.deviceType = 'expo';
          let resolution = {
            device,
            multicast_id: 'multicast_id',
            response: receipt,
          };
          if (receipt.status === 'error') {
            resolution.transmitted = false;
          } else {
            resolution.transmitted = true;
          }
          promise.resolve(resolution);
        });
      } catch (error) {
        console.error(error);
      }
    }
  })();

  return Parse.Promise.when(promises);
}
