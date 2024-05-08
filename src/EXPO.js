"use strict";

import Parse from 'parse';
import log from 'npmlog';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const LOG_PREFIX = 'parse-server-push-adapter EXPO';

export class EXPO {
  expo = undefined;
  /**
   * Create a new EXPO push adapter. Based on Web Adapter.
   *
   * @param {Object} args https://github.com/expo/expo-server-sdk-node / https://docs.expo.dev/push-notifications/sending-notifications/
   */
  constructor(args) {
    if (typeof args !== 'object') {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'EXPO Push Configuration is invalid');
    }

    this.expo = new Expo(args)
    this.options = args;
  }

  /**
   * Send Expo push notification request.
   *
   * @param {Object} data The data we need to send, the format is the same with api request body
   * @param {Array} devices An array of devices
   * @returns {Object} A promise which is resolved immediately
   */
  async send(data, devices) {
    const coreData = data && data.data;

    if (!coreData || !devices || !Array.isArray(devices)) {
      log.warn(LOG_PREFIX, 'invalid push payload');
      return;
    }
    const devicesMap = devices.reduce((memo, device) => {
      memo[device.deviceToken] = device;
      return memo;
    }, {});
    const deviceTokens = Object.keys(devicesMap);

    const resolvers = [];
    const promises = deviceTokens.map(() => new Promise(resolve => resolvers.push(resolve)));
    let length = deviceTokens.length;

    log.verbose(LOG_PREFIX, `sending to ${length} ${length > 1 ? 'devices' : 'device'}`);

    const response = await this.sendNotifications(coreData, deviceTokens, this.options);

    log.verbose(LOG_PREFIX, `EXPO Response: %d sent`, response.length);

    deviceTokens.forEach((token, index) => {
      const resolve = resolvers[index];
      const result = response[index];
      const device = devicesMap[token];
      const resolution = {
        transmitted: result.status === 'ok',
        device: {
          deviceToken: token
        },
        response: result,
      };
      resolve(resolution);
    });
    return Promise.all(promises);
  }

  /**
   * Send multiple Expo push notification request.
   *
   * @param {Object} payload The data we need to send, the format is the same with api request body
   * @param {Array} deviceTokens An array of devicesTokens
   * @param {Object} options The options for the request
   * @returns {Object} A promise which is resolved immediately
   */
  async sendNotifications({alert, title, body, ...payload}, deviceTokens, options) {
    const messages = deviceTokens.map((token) => ({
      to: token,
      title: title,
      body: body || alert,
      ...payload
    }));

    return await this.expo.sendPushNotificationsAsync(messages);
  }
}

export default EXPO;
