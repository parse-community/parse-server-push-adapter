"use strict";

import Parse from 'parse';
import log from 'npmlog';
import webpush from 'web-push';

const LOG_PREFIX = 'parse-server-push-adapter WEB';

export class WEB {
  /**
   * Create a new WEB push adapter.
   *
   * @param {Object} args https://github.com/web-push-libs/web-push#api-reference
   */
  constructor(args) {
    if (typeof args !== 'object' || !args.vapidDetails) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'WEB Push Configuration is invalid');
    }
    this.options = args;
  }

  /**
   * Send web push notification request.
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
    const length = deviceTokens.length;
    log.verbose(LOG_PREFIX, `sending to ${length} ${length > 1 ? 'devices' : 'device'}`);

    const response = await WEB.sendNotifications(coreData, deviceTokens, this.options);
    const { results, sent, failed } = response;
    if (sent) {
      log.verbose(LOG_PREFIX, `WEB Response: %d out of %d sent successfully`, sent, results.length);
    }
    if (failed) {
      log.error(LOG_PREFIX, `send errored: %d out of %d failed with error %s`, failed, results.length, 'push subscription has unsubscribed or expired.');
    }
    deviceTokens.forEach((token, index) => {
      const resolve = resolvers[index];
      const { result, error } = results[index];
      const device = devicesMap[token];
      device.deviceType = 'web';
      const resolution = {
        device,
        response: error || result,
        transmitted: !error,
      };
      resolve(resolution);
    });
    return Promise.all(promises);
  }

  /**
   * Send multiple web push notification request.
   *
   * @param {Object} payload The data we need to send, the format is the same with api request body
   * @param {Array} deviceTokens An array of devicesTokens
   * @param {Object} options The options for the request
   * @returns {Object} A promise which is resolved immediately
   */
  static async sendNotifications(payload, deviceTokens, options) {
    const promises = deviceTokens.map((deviceToken) => {
      if (typeof deviceToken === 'string') {
        deviceToken = JSON.parse(deviceToken);
      }
      if (typeof payload === 'object') {
        payload = JSON.stringify(payload);
      }
      return webpush.sendNotification(deviceToken, payload, options);
    });
    const allResults = await Promise.allSettled(promises);
    const response = {
      sent: 0,
      failed: 0,
      results: [],
    };
    allResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        response.sent += 1;
        response.results.push({ result: result.value.statusCode });
      } else {
        response.failed += 1;
        response.results.push({ error: result.reason.body });
      }
    });
    return response;
  }
}

export default WEB;
