'use strict';

import apn from 'apn';
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
  constructor(args = []) {
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
    let coreData = data.data;
    let expirationTime = data['expiration_time'];
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

      let notification = APNS._generateNotification(coreData, expirationTime, appIdentifier);
      let promise = providers[0]
        .send(notification, devices.map(device => device.deviceToken))
        .then(this._handlePromise.bind(this));
      allPromises.push(promise);
    }

    return Promise.all(allPromises);
  }

  /**
   * Creates an Provider base on apnsArgs.
   */
  static _createProvider(apnsArgs) {
    let provider = new apn.Provider(apnsArgs);

    // if using certificate, then topic must be defined
    if ((apnsArgs.cert || apnsArgs.key || apnsArgs.pfx) && !apnsArgs.topic) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'topic is mssing for %j', apnsArgs);
    }
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
   * @param {number} expirationTime The expiration time in milliseconds since Jan 1 1970
   * @param {String} topic Topic the Notification is sent to
   * @returns {Object} A apns Notification
   */
  static _generateNotification(coreData, expirationTime, topic) {
    let notification = new apn.Notification();
    let payload = {};
    for (let key in coreData) {
      switch (key) {
        case 'alert':
          notification.setAlert(coreData.alert);
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
        case 'category':
          notification.setCategory(coreData.category);
          break;
        default:
          payload[key] = coreData[key];
          break;
      }
    }
    notification.topic = topic;
    notification.payload = payload;
    notification.expiry = expirationTime / 1000;
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
      if (failure.error) {
        log.error(LOG_PREFIX, 'APNS error transmitting to device %s with error %s', failure.device, failure.error);
        promises.push(PNS._createErrorPromise(failure.device, failure.error));
      } else if (failure.status && failure.response && failure.response.reason) {
        log.error(LOG_PREFIX, 'APNS error transmitting to device %s with status %s and reason %s', failure.device, failure.status, failure.response.reason);
        promises.push(APNS._createErrorPromise(failure.device, failure.response.reason));
      }
    });
    return Promise.all(promises);
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
      result: { error: errorMessage }
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

module.exports = APNS;
export default APNS;