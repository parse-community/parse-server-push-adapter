'use strict';
import apn from '@parse/node-apn';
import Parse from 'parse';
import log from 'npmlog';

const LOG_PREFIX = 'parse-server-push-adapter APNS';

export class APNS {

  /**
   * Create a new provider for the APN service.
   * @constructor
   * @param {Object|Array} args An argument or a list of arguments to config APNS provider
   * @param {Object} args.token {Object} Configuration for Provider Authentication Tokens. (Defaults to: null i.e. fallback to Certificates)
   * @param {Buffer|String} args.token.key The filename of the provider token key (as supplied by Apple) to load from disk, or a Buffer/String containing the key data.
   * @param {String} args.token.keyId The ID of the key issued by Apple
   * @param {String} args.token.teamId ID of the team associated with the provider token key
   * @param {Buffer|String} args.cert The filename of the connection certificate to load from disk, or a Buffer/String containing the certificate data.
   * @param {Buffer|String} args.key {Buffer|String} The filename of the connection key to load from disk, or a Buffer/String containing the key data.
   * @param {Buffer|String} args.pfx path for private key, certificate and CA certs in PFX or PKCS12 format, or a Buffer containing the PFX data. If supplied will always be used instead of certificate and key above.
   * @param {String} args.passphrase The passphrase for the provider key, if required
   * @param {Boolean} args.production Specifies which environment to connect to: Production (if true) or Sandbox
   * @param {String} args.topic Specififies an App-Id for this Provider
   * @param {String} args.bundleId DEPRECATED: Specifies an App-ID for this Provider
   * @param {Number} args.connectionRetryLimit  The maximum number of connection failures that will be tolerated before apn.Provider will "give up". (Defaults to: 3)
   */
  constructor(args) {
    // Define class members
    this.providers = [];

    // Since for ios, there maybe multiple cert/key pairs, typePushConfig can be an array.
    let apnsArgsList = [];
    if (Array.isArray(args)) {
      apnsArgsList = apnsArgsList.concat(args);
    } else if (typeof args === 'object') {
      apnsArgsList.push(args);
    } else {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'APNS Configuration is invalid');
    }

    // Create Provider from each arg-object
    for (let apnsArgs of apnsArgsList) {

      // rewrite bundleId to topic for backward-compatibility
      if (apnsArgs.bundleId) {
        log.warn(LOG_PREFIX, 'bundleId is deprecated, use topic instead');
        apnsArgs.topic = apnsArgs.bundleId
      }

      let provider = APNS._createProvider(apnsArgs);
      this.providers.push(provider);
    }

    // Sort the providers based on priority ascending, high pri first
    this.providers.sort((s1, s2) => {
      return s1.priority - s2.priority;
    });

    // Set index-property of providers
    for (let index = 0; index < this.providers.length; index++) {
      this.providers[index].index = index;
    }
  }

  /**
   * Send apns request.
   *
   * @param {Object} data The data we need to send, the format is the same with api request body
   * @param {Array} allDevices An array of devices
   * @returns {Object} A promise which is resolved immediately
   */
  send(data, allDevices) {
    let coreData = data && data.data;
    if (!coreData || !allDevices || !Array.isArray(allDevices)) {
      log.warn(LOG_PREFIX, 'invalid push payload');
      return;
    }
    let expirationTime = data['expiration_time'] || coreData['expiration_time'];
    let collapseId = data['collapse_id'] || coreData['collapse_id'];
    let pushType = data['push_type'] || coreData['push_type'];
    let priority = data['priority'] || coreData['priority'];
    let allPromises = [];

    let devicesPerAppIdentifier = {};

    // Start by clustering the devices per appIdentifier
    allDevices.forEach(device => {
      let appIdentifier = device.appIdentifier;
      devicesPerAppIdentifier[appIdentifier] = devicesPerAppIdentifier[appIdentifier] || [];
      devicesPerAppIdentifier[appIdentifier].push(device);
    });

    for (let key in devicesPerAppIdentifier) {
      let devices = devicesPerAppIdentifier[key];
      let appIdentifier = devices[0].appIdentifier;
      let providers = this._chooseProviders(appIdentifier);

      // No Providers found
      if (!providers || providers.length === 0) {
        let errorPromises = devices.map(device => APNS._createErrorPromise(device.deviceToken, 'No Provider found'));
        allPromises = allPromises.concat(errorPromises);
        continue;
      }

      let headers = { expirationTime: expirationTime, topic: appIdentifier, collapseId: collapseId, pushType: pushType, priority: priority }
      let notification = APNS._generateNotification(coreData, headers);
      const deviceIds = devices.map(device => device.deviceToken);
      let promise = this.sendThroughProvider(notification, deviceIds, providers);
      allPromises.push(promise.then(this._handlePromise.bind(this)));
    }

    return Promise.all(allPromises).then((results) => {
      // flatten all
      return [].concat.apply([], results);
    });
  }

  sendThroughProvider(notification, devices, providers) {
    return providers[0]
        .send(notification, devices)
        .then((response) => {
          if (response.failed
              && response.failed.length > 0
              && providers && providers.length > 1) {
            let devices = response.failed.map((failure) => { return failure.device; });
            // Reset the failures as we'll try next connection
            response.failed = [];
            return this.sendThroughProvider(notification,
                            devices,
                            providers.slice(1, providers.length)).then((retryResponse) => {
                              response.failed = response.failed.concat(retryResponse.failed);
                              response.sent = response.sent.concat(retryResponse.sent);
                              return response;
                            });
          } else {
            return response;
          }
        });
  }

  static _validateAPNArgs(apnsArgs) {
    if (apnsArgs.topic) {
      return true;
    }
    return !(apnsArgs.cert || apnsArgs.key || apnsArgs.pfx);
  }

  /**
   * Creates an Provider base on apnsArgs.
   */
  static _createProvider(apnsArgs) {
    // if using certificate, then topic must be defined
    if (!APNS._validateAPNArgs(apnsArgs)) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'topic is mssing for %j', apnsArgs);
    }

    let provider = new apn.Provider(apnsArgs);

    // Sets the topic on this provider
    provider.topic = apnsArgs.topic;

    // Set the priority of the providers, prod cert has higher priority
    if (apnsArgs.production) {
      provider.priority = 0;
    } else {
      provider.priority = 1;
    }

    return provider;
  }

  /**
   * Generate the apns Notification from the data we get from api request.
   * @param {Object} coreData The data field under api request body
   * @param {Object} headers The header properties for the notification (topic, expirationTime, collapseId, pushType, priority)
   * @returns {Object} A apns Notification
   */
  static _generateNotification(coreData, headers) {
    let notification = new apn.Notification();
    let payload = {};
    for (let key in coreData) {
      switch (key) {
        case 'aps':
          notification.aps = coreData.aps;
          break;
        case 'alert':
          notification.setAlert(coreData.alert);
          break;
        case 'title':
          notification.setTitle(coreData.title);
        break;
        case 'badge':
          notification.setBadge(coreData.badge);
          break;
        case 'sound':
          notification.setSound(coreData.sound);
          break;
        case 'content-available':
          let isAvailable = coreData['content-available'] === 1;
          notification.setContentAvailable(isAvailable);
          break;
        case 'mutable-content':
          let isMutable = coreData['mutable-content'] === 1;
          notification.setMutableContent(isMutable);
          break;
        case 'targetContentIdentifier':
          notification.setTargetContentIdentifier(coreData.targetContentIdentifier);
          break;
        case 'interruptionLevel':
          notification.setInterruptionLevel(coreData.interruptionLevel);
          break;
        case 'category':
          notification.setCategory(coreData.category);
          break;
        case 'threadId':
          notification.setThreadId(coreData.threadId);
          break;
        default:
          payload[key] = coreData[key];
          break;
      }
    }

    notification.payload = payload;

    notification.topic = headers.topic;
    notification.expiry = Math.round(headers.expirationTime / 1000);
    notification.collapseId = headers.collapseId;
    // set alert as default push type. If push type is not set notifications are not delivered to devices running iOS 13, watchOS 6 and later.
    notification.pushType = 'alert';
    if (headers.pushType) {
      notification.pushType = headers.pushType;
    }
    if (headers.priority) {
      // if headers priority is not set 'node-apn' defaults it to 5 which is min. required value for background pushes to launch the app in background.
      notification.priority = headers.priority
    }
    return notification;
  }

  /**
   * Choose appropriate providers based on device appIdentifier.
   *
   * @param {String} appIdentifier appIdentifier for required provider
   * @returns {Array} Returns Array with appropriate providers
   */
  _chooseProviders(appIdentifier) {
    // If the device we need to send to does not have appIdentifier, any provider could be a qualified provider
    /*if (!appIdentifier || appIdentifier === '') {
        return this.providers.map((provider) => provider.index);
    }*/

    // Otherwise we try to match the appIdentifier with topic on provider
    let qualifiedProviders = this.providers.filter((provider) => appIdentifier === provider.topic);

    if (qualifiedProviders.length > 0) {
      return qualifiedProviders;
    }

    // If qualifiedProviders empty, add all providers without topic
    return this.providers
      .filter((provider) => !provider.topic || provider.topic === '');
  }

  _handlePromise(response) {
    let promises = [];
    response.sent.forEach((token) => {
      log.verbose(LOG_PREFIX, 'APNS transmitted to %s', token.device);
      promises.push(APNS._createSuccesfullPromise(token.device));
    });
    response.failed.forEach((failure) => {
      promises.push(APNS._handlePushFailure(failure));
    });
    return Promise.all(promises);
  }

  static _handlePushFailure(failure) {
    if (failure.error) {
      log.error(LOG_PREFIX, 'APNS error transmitting to device %s with error %s', failure.device, failure.error);
      return APNS._createErrorPromise(failure.device, failure.error);
    } else if (failure.status && failure.response && failure.response.reason) {
      log.error(LOG_PREFIX, 'APNS error transmitting to device %s with status %s and reason %s', failure.device, failure.status, failure.response.reason);
      return APNS._createErrorPromise(failure.device, failure.response.reason);
    } else {
       log.error(LOG_PREFIX, 'APNS error transmitting to device with unkown error');
       return APNS._createErrorPromise(failure.device, 'Unkown status');
    }
  }

  /**
   * Creates an errorPromise for return.
   *
   * @param {String} token Device-Token
   * @param {String} errorMessage ErrrorMessage as string
   */
  static _createErrorPromise(token, errorMessage) {
    return Promise.resolve({
      transmitted: false,
      device: {
        deviceToken: token,
        deviceType: 'ios'
      },
      response: { error: errorMessage }
    });
  }

  /**
   * Creates an successfulPromise for return.
   *
   * @param {String} token Device-Token
   */
  static _createSuccesfullPromise(token) {
    return Promise.resolve({
      transmitted: true,
      device: {
        deviceToken: token,
        deviceType: 'ios'
      }
    });
  }
}

export default APNS;
