'use strict';
import Parse from 'parse';
import log from 'npmlog';
import APNS from './APNS.js';
import GCM from './GCM.js';
import FCM from './FCM.js';
import WEB from './WEB.js';
import EXPO from './EXPO.js';
import { classifyInstallations } from './PushAdapterUtils.js';

const LOG_PREFIX = 'parse-server-push-adapter';

export default class ParsePushAdapter {

  supportsPushTracking = true;

  constructor(pushConfig = {}) {
    this.validPushTypes = ['ios', 'osx', 'tvos', 'android', 'fcm', 'web', 'expo'];
    this.senderMap = {};
    // used in PushController for Dashboard Features
    this.feature = {
      immediatePush: true
    };
    const pushTypes = Object.keys(pushConfig);

    for (const pushType of pushTypes) {
      // adapter may be passed as part of the parse-server initialization
      if (this.validPushTypes.indexOf(pushType) < 0 && pushType != 'adapter') {
        throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
          'Push to ' + pushType + ' is not supported');
      }
      switch (pushType) {
      case 'ios':
      case 'tvos':
      case 'osx':
        if (pushConfig[pushType].hasOwnProperty('firebaseServiceAccount')) {
          this.senderMap[pushType] = new FCM(pushConfig[pushType], 'apple');
        } else {
          this.senderMap[pushType] = new APNS(pushConfig[pushType]);
        }
        break;
      case 'web':
        this.senderMap[pushType] = new WEB(pushConfig[pushType]);
        break;
      case 'expo':
        this.senderMap[pushType] = new EXPO(pushConfig[pushType]);
        break;
      case 'android':
      case 'fcm':
        if (pushConfig[pushType].hasOwnProperty('firebaseServiceAccount')) {
          this.senderMap[pushType] = new FCM(pushConfig[pushType], 'android');
        } else {
          this.senderMap[pushType] = new GCM(pushConfig[pushType]);
        }
        break;
      }
    }
  }

  getValidPushTypes() {
    return this.validPushTypes;
  }

  static classifyInstallations(installations, validTypes) {
    return classifyInstallations(installations, validTypes)
  }

  send(data, installations) {
    const deviceMap = classifyInstallations(installations, this.validPushTypes);
    const sendPromises = [];
    for (const pushType in deviceMap) {
      const sender = this.senderMap[pushType];
      const devices = deviceMap[pushType];

      if(Array.isArray(devices) && devices.length > 0) {
        if (!sender) {
          log.verbose(LOG_PREFIX, `Can not find sender for push type ${pushType}, ${data}`)
          const results = devices.map((device) => {
            return Promise.resolve({
              device,
              transmitted: false,
              response: {'error': `Can not find sender for push type ${pushType}, ${data}`}
            })
          });
          sendPromises.push(Promise.all(results));
        } else {
          sendPromises.push(sender.send(data, devices));
        }
      }
    }
    return Promise.all(sendPromises).then((promises) => {
      // flatten all
      return [].concat.apply([], promises);
    })
  }
}
