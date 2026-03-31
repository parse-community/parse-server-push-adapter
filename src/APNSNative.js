'use strict';
import Parse from 'parse/node';
import log from 'npmlog';
import APNSToken from './APNSToken.js';
import APNSConnection from './APNSConnection.js';

const LOG_PREFIX = 'parse-server-push-adapter APNSNative';

export class APNSNative {

  /**
   * Create native APNs providers using HTTP/2 and JWT token auth.
   * @constructor
   * @param {Object|Array} args Config or array of configs
   * @param {Object} args.token Token auth config (required)
   * @param {Buffer|String} args.token.key The .p8 private key (file path, string, or Buffer)
   * @param {String} args.token.keyId The Key ID from Apple
   * @param {String} args.token.teamId The Team ID
   * @param {Boolean} args.production Use production endpoint (default: false)
   * @param {String} args.topic App bundle ID (required)
   * @param {String} args.bundleId Deprecated alias for topic
   * @param {Number} args.connectionRetryLimit Max connection retries (default: 3)
   * @param {Number} args.requestTimeout Per-request timeout in ms (default: 5000)
   */
  constructor(args) {
    this.providers = [];

    let argsList = [];
    if (Array.isArray(args)) {
      argsList = argsList.concat(args);
    } else if (typeof args === 'object') {
      argsList.push(args);
    } else {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'APNSNative Configuration is invalid');
    }

    for (const providerArgs of argsList) {
      // Backward compatibility: bundleId -> topic
      if (providerArgs.bundleId && !providerArgs.topic) {
        log.warn(LOG_PREFIX, 'bundleId is deprecated, use topic instead');
        providerArgs.topic = providerArgs.bundleId;
      }

      const provider = APNSNative._createProvider(providerArgs);
      this.providers.push(provider);
    }

    // Sort by priority ascending (production = 0, sandbox = 1)
    this.providers.sort((a, b) => a.priority - b.priority);

    // Set index on each provider
    for (let i = 0; i < this.providers.length; i++) {
      this.providers[i].index = i;
    }
  }

  static _createProvider(providerArgs) {
    if (!providerArgs.topic) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'APNSNative requires a topic (bundle ID)');
    }
    if (!providerArgs.token || !providerArgs.token.key || !providerArgs.token.keyId || !providerArgs.token.teamId) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED, 'APNSNative requires token auth config (token.key, token.keyId, token.teamId)');
    }

    const token = new APNSToken(providerArgs.token);
    const connection = new APNSConnection({
      production: providerArgs.production,
      connectionRetryLimit: providerArgs.connectionRetryLimit,
      requestTimeout: providerArgs.requestTimeout,
    });

    return {
      topic: providerArgs.topic,
      priority: providerArgs.production ? 0 : 1,
      index: 0,
      token,
      connection,
      send: async (notification, devices) => {
        const sent = [];
        const failed = [];

        const promises = devices.map(async (deviceToken) => {
          try {
            const result = await connection.send(
              deviceToken,
              notification.headers,
              notification.payload,
              token.current
            );

            if (result.status === 200) {
              sent.push({ device: deviceToken });
            } else if (result.status === 403 && result.body.reason === 'ExpiredProviderToken') {
              // Refresh token and retry once
              token.refresh();
              const retryResult = await connection.send(
                deviceToken,
                notification.headers,
                notification.payload,
                token.current
              );
              if (retryResult.status === 200) {
                sent.push({ device: deviceToken });
              } else {
                failed.push({ device: deviceToken, status: retryResult.status, response: retryResult.body });
              }
            } else {
              failed.push({ device: deviceToken, status: result.status, response: result.body });
            }
          } catch (err) {
            failed.push({ device: deviceToken, error: err.message });
          }
        });

        await Promise.all(promises);
        return { sent, failed };
      },
    };
  }

  send(data, allDevices) {
    const coreData = data && data.data;
    if (!coreData || !allDevices || !Array.isArray(allDevices)) {
      log.warn(LOG_PREFIX, 'invalid push payload');
      return;
    }
    const expirationTime = data['expiration_time'] ?? coreData['expiration_time'];
    const collapseId = data['collapse_id'] ?? coreData['collapse_id'];
    const pushType = data['push_type'] ?? coreData['push_type'];
    const priority = data['priority'] ?? coreData['priority'];
    let allPromises = [];

    const devicesPerAppIdentifier = Object.create(null);

    allDevices.forEach(device => {
      const appIdentifier = device.appIdentifier;
      devicesPerAppIdentifier[appIdentifier] = devicesPerAppIdentifier[appIdentifier] || [];
      devicesPerAppIdentifier[appIdentifier].push(device);
    });

    for (const key in devicesPerAppIdentifier) {
      const devices = devicesPerAppIdentifier[key];
      const appIdentifier = devices[0].appIdentifier;
      const providers = this._chooseProviders(appIdentifier);

      if (!providers || providers.length === 0) {
        const errorPromises = devices.map(device => APNSNative._createErrorPromise(device.deviceToken, 'No Provider found'));
        allPromises = allPromises.concat(errorPromises);
        continue;
      }

      const headers = { expirationTime, topic: appIdentifier, collapseId, pushType, priority };
      const notification = APNSNative._generateNotification(coreData, headers);
      const deviceIds = devices.map(device => device.deviceToken);
      const promise = this.sendThroughProvider(notification, deviceIds, providers);
      allPromises.push(promise.then(this._handlePromise.bind(this)));
    }

    return Promise.all(allPromises).then((results) => {
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
          const retryDevices = response.failed.map((failure) => failure.device);
          response.failed = [];
          return this.sendThroughProvider(notification,
            retryDevices,
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

  static _generateNotification(coreData, headerOpts) {
    const aps = {};
    const payload = {};

    for (const key in coreData) {
      switch (key) {
      case 'aps':
        Object.assign(aps, coreData.aps);
        break;
      case 'alert':
        if (typeof coreData.alert === 'object') {
          aps.alert = coreData.alert;
        } else {
          aps.alert = aps.alert || {};
          aps.alert.body = coreData.alert;
        }
        break;
      case 'title':
        aps.alert = aps.alert || {};
        aps.alert.title = coreData.title;
        break;
      case 'badge':
        aps.badge = coreData.badge;
        break;
      case 'sound':
        aps.sound = coreData.sound;
        break;
      case 'content-available':
        aps['content-available'] = coreData['content-available'] === 1 ? 1 : undefined;
        break;
      case 'mutable-content':
        aps['mutable-content'] = coreData['mutable-content'] === 1 ? 1 : undefined;
        break;
      case 'targetContentIdentifier':
        aps['target-content-id'] = coreData.targetContentIdentifier;
        break;
      case 'interruptionLevel':
        aps['interruption-level'] = coreData.interruptionLevel;
        break;
      case 'category':
        aps.category = coreData.category;
        break;
      case 'threadId':
        aps['thread-id'] = coreData.threadId;
        break;
      case 'id':
      case 'collapseId':
      case 'channelId':
      case 'requestId':
      case 'pushType':
      case 'topic':
      case 'expiry':
      case 'priority':
      case 'expiration_time':
      case 'collapse_id':
      case 'push_type':
        // Header fields — handled below
        break;
      default:
        payload[key] = coreData[key];
        break;
      }
    }

    // Build notification payload
    const notificationPayload = { aps };
    Object.assign(notificationPayload, payload);

    // Build headers
    const pushType = coreData.pushType ?? headerOpts.pushType ?? 'alert';
    const topic = coreData.topic ?? APNSNative._determineTopic(headerOpts.topic, pushType);
    const defaultPriority = 10;

    let expiry = -1;
    if (headerOpts.expirationTime != null) {
      expiry = Math.round(headerOpts.expirationTime / 1000);
    }
    expiry = coreData.expiry ?? expiry;

    const notificationPriority = coreData.priority ?? headerOpts.priority ?? defaultPriority;

    const collapseId = coreData.collapseId ?? headerOpts.collapseId;
    const id = coreData.id ?? headerOpts.id;

    const headers = {
      'apns-topic': topic,
      'apns-push-type': pushType,
      'apns-priority': String(notificationPriority),
    };
    if (expiry >= 0) {
      headers['apns-expiration'] = String(expiry);
    }
    if (collapseId != null) {
      headers['apns-collapse-id'] = collapseId;
    }
    if (id) {
      headers['apns-id'] = id;
    }

    return {
      headers,
      payload: notificationPayload,
      // Expose for test assertions (mirrors apn.Notification properties)
      get pushType() { return pushType; },
      get topic() { return topic; },
      get expiry() { return expiry; },
      get collapseId() { return collapseId; },
      get priority() { return notificationPriority; },
      get id() { return id; },
      get requestId() { return coreData.requestId ?? headerOpts.requestId; },
      get channelId() { return coreData.channelId ?? headerOpts.channelId; },
      get aps() { return aps; },
    };
  }

  static _determineTopic(topic, pushType) {
    switch (pushType) {
    case 'location':
      return topic + '.location-query';
    case 'voip':
      return topic + '.voip';
    case 'complication':
      return topic + '.complication';
    case 'fileprovider':
      return topic + '.pushkit.fileprovider';
    case 'liveactivity':
      return topic + '.push-type.liveactivity';
    case 'pushtotalk':
      return topic + '.voip-ptt';
    default:
      return topic;
    }
  }

  _chooseProviders(appIdentifier) {
    const qualifiedProviders = this.providers.filter((provider) => appIdentifier === provider.topic);
    if (qualifiedProviders.length > 0) {
      return qualifiedProviders;
    }
    return this.providers.filter((provider) => !provider.topic || provider.topic === '');
  }

  _handlePromise(response) {
    const promises = [];
    response.sent.forEach((token) => {
      log.verbose(LOG_PREFIX, 'APNS transmitted to %s', token.device);
      promises.push(APNSNative._createSuccesfullPromise(token.device));
    });
    response.failed.forEach((failure) => {
      promises.push(APNSNative._handlePushFailure(failure));
    });
    return Promise.all(promises);
  }

  static _handlePushFailure(failure) {
    if (failure.error) {
      log.error(LOG_PREFIX, 'APNS error transmitting to device %s with error %s', failure.device, failure.error);
      return APNSNative._createErrorPromise(failure.device, failure.error);
    } else if (failure.status !== undefined && failure.response?.reason) {
      log.error(LOG_PREFIX, 'APNS error transmitting to device %s with status %s and reason %s', failure.device, failure.status, failure.response.reason);
      return APNSNative._createErrorPromise(failure.device, failure.response.reason);
    } else {
      log.error(LOG_PREFIX, 'APNS error transmitting to device with unknown error');
      return APNSNative._createErrorPromise(failure.device, 'Unknown status');
    }
  }

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

export default APNSNative;
