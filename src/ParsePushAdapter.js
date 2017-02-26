'use strict';
import Parse from 'parse';
import log from 'npmlog';
import APNS from './APNS';
import GCM from './GCM';
import { classifyInstallations } from './PushAdapterUtils';

const LOG_PREFIX = 'parse-server-push-adapter';

export class ParsePushAdapter {

  supportsPushTracking = true;

  constructor(pushConfig = {}) {
    this.validPushTypes = ['ios', 'osx', 'tvos', 'android', 'fcm'];
    this.senderMap = {};
    // used in PushController for Dashboard Features
    this.feature = {
      immediatePush: true
    };
    let pushTypes = Object.keys(pushConfig);

    for (let pushType of pushTypes) {
      if (this.validPushTypes.indexOf(pushType) < 0) {
        throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                              'Push to ' + pushTypes + ' is not supported');
      }
      switch (pushType) {
        case 'ios':
        case 'tvos':
        case 'osx':
          this.senderMap[pushType] = new APNS(pushConfig[pushType]);
          break;
        case 'android':
        case 'fcm':
          this.senderMap[pushType] = new GCM(pushConfig[pushType]);
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
    let deviceMap = classifyInstallations(installations, this.validPushTypes);
    let sendPromises = [];
    for (let pushType in deviceMap) {
      var sender = this.senderMap[pushType];
      let devices = deviceMap[pushType];
      
      if (!sender) {
        if (pushType == 'tvos') {
          // if there is only an ios push configuration available reuse it for tvos
          sender = this.senderMap['ios'];
        } else if (pushType == 'ios') {
          // if there is only a tvos push configuration available reuse it for ios
          sender = this.senderMap['tvos'];
        }
      }

      if(Array.isArray(devices) && devices.length > 0)
      {
        if (!sender) {
          log.verbose(LOG_PREFIX, `Can not find sender for push type ${pushType}, ${data}`)
          let results = devices.map((device) => {
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
    return Promise.all(sendPromises).then((promises) => {
      // flatten all
      return [].concat.apply([], promises);
    })
  }
}
export default ParsePushAdapter;
module.exports = ParsePushAdapter;
