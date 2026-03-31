import log from 'npmlog';
import Parse from 'parse/node';
import { generateKeyPairSync } from 'node:crypto';
import APNSNative from '../src/APNSNative.js';

describe('APNSNative', () => {
  let testKeyPEM;

  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    testKeyPEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
  });

  function makeTokenConfig(overrides = {}) {
    return {
      token: { key: testKeyPEM, keyId: 'KEYID12345', teamId: 'TEAMID1234' },
      production: true,
      topic: 'com.example.app',
      ...overrides,
    };
  }

  describe('constructor', () => {
    it('can initialize with token config', () => {
      const apns = new APNSNative(makeTokenConfig());
      expect(apns.providers.length).toBe(1);
      expect(apns.providers[0].topic).toBe('com.example.app');
      expect(apns.providers[0].index).toBe(0);
      expect(apns.providers[0].priority).toBe(0); // production
    });

    it('fails to initialize with bad data', () => {
      try {
        new APNSNative('args');
        fail('should not be reached');
      } catch (e) {
        expect(e.code).toBe(Parse.Error.PUSH_MISCONFIGURED);
      }
    });

    it('fails to initialize without token config', () => {
      expect(() => {
        new APNSNative({ topic: 'com.example', production: true });
      }).toThrow();
    });

    it('fails to initialize without topic', () => {
      expect(() => {
        new APNSNative({
          token: { key: testKeyPEM, keyId: 'KEY1', teamId: 'TEAM1' },
          production: true,
        });
      }).toThrow();
    });

    it('can initialize with multiple configs', () => {
      const apns = new APNSNative([
        makeTokenConfig({ topic: 'com.example.app', production: false }),
        makeTokenConfig({ topic: 'com.example.app.dev', production: true }),
      ]);
      expect(apns.providers.length).toBe(2);
      // Production (priority 0) should be first
      expect(apns.providers[0].topic).toBe('com.example.app.dev');
      expect(apns.providers[0].index).toBe(0);
      expect(apns.providers[1].topic).toBe('com.example.app');
      expect(apns.providers[1].index).toBe(1);
    });

    it('supports deprecated bundleId', () => {
      spyOn(log, 'warn').and.callFake(() => {});
      const apns = new APNSNative(makeTokenConfig({ bundleId: 'com.example.old', topic: undefined }));
      expect(apns.providers[0].topic).toBe('com.example.old');
      expect(log.warn).toHaveBeenCalled();
    });
  });

  describe('notification generation', () => {
    it('sets priority to 10 if not set explicitly', () => {
      const data = {
        'alert': 'alert',
        'title': 'title',
        'badge': 100,
        'sound': 'test',
        'content-available': 1,
        'mutable-content': 1,
        'category': 'INVITE_CATEGORY',
        'threadId': 'a-thread-id',
        'key': 'value',
        'keyAgain': 'valueAgain'
      };
      const notification = APNSNative._generateNotification(data, {});
      expect(notification.priority).toEqual(10);
    });

    it('can generate APNS notification', () => {
      const data = {
        'alert': 'alert',
        'title': 'title',
        'badge': 100,
        'sound': 'test',
        'content-available': 1,
        'mutable-content': 1,
        'targetContentIdentifier': 'window1',
        'interruptionLevel': 'passive',
        'category': 'INVITE_CATEGORY',
        'threadId': 'a-thread-id',
        'key': 'value',
        'keyAgain': 'valueAgain'
      };
      const expirationTime = 1454571491354;
      const collapseId = 'collapseIdentifier';
      const pushType = 'alert';
      const priority = 5;
      const notification = APNSNative._generateNotification(data, { expirationTime, collapseId, pushType, priority });

      expect(notification.aps.alert).toEqual({ body: 'alert', title: 'title' });
      expect(notification.aps.badge).toEqual(data.badge);
      expect(notification.aps.sound).toEqual(data.sound);
      expect(notification.aps['content-available']).toEqual(1);
      expect(notification.aps['mutable-content']).toEqual(1);
      expect(notification.aps['target-content-id']).toEqual('window1');
      expect(notification.aps['interruption-level']).toEqual('passive');
      expect(notification.aps.category).toEqual(data.category);
      expect(notification.aps['thread-id']).toEqual(data.threadId);
      expect(notification.payload.key).toEqual('value');
      expect(notification.payload.keyAgain).toEqual('valueAgain');
      expect(notification.expiry).toEqual(Math.round(expirationTime / 1000));
      expect(notification.collapseId).toEqual(collapseId);
      expect(notification.pushType).toEqual(pushType);
      expect(notification.priority).toEqual(priority);
    });

    it('can generate APNS notification with nested alert dictionary', () => {
      const data = {
        'alert': { body: 'alert', title: 'title' },
        'badge': 100,
        'sound': 'test',
        'content-available': 1,
        'mutable-content': 1,
        'targetContentIdentifier': 'window1',
        'interruptionLevel': 'passive',
        'category': 'INVITE_CATEGORY',
        'threadId': 'a-thread-id',
        'key': 'value',
        'keyAgain': 'valueAgain'
      };
      const expirationTime = 1454571491354;
      const collapseId = 'collapseIdentifier';
      const pushType = 'alert';
      const priority = 5;
      const notification = APNSNative._generateNotification(data, { expirationTime, collapseId, pushType, priority });

      expect(notification.aps.alert).toEqual({ body: 'alert', title: 'title' });
      expect(notification.aps.badge).toEqual(data.badge);
      expect(notification.aps.sound).toEqual(data.sound);
      expect(notification.aps['content-available']).toEqual(1);
      expect(notification.aps['mutable-content']).toEqual(1);
      expect(notification.aps['target-content-id']).toEqual('window1');
      expect(notification.aps['interruption-level']).toEqual('passive');
      expect(notification.aps.category).toEqual(data.category);
      expect(notification.aps['thread-id']).toEqual(data.threadId);
      expect(notification.expiry).toEqual(Math.round(expirationTime / 1000));
      expect(notification.collapseId).toEqual(collapseId);
      expect(notification.pushType).toEqual(pushType);
      expect(notification.priority).toEqual(priority);
    });

    it('sets push type to alert if not defined explicitly', () => {
      const data = { 'alert': 'alert' };
      const notification = APNSNative._generateNotification(data, { expirationTime: 1454571491354, collapseId: 'id' });
      expect(notification.pushType).toEqual('alert');
    });

    it('can generate APNS notification from raw data', () => {
      const data = {
        'aps': {
          'alert': {
            'loc-key': 'GAME_PLAY_REQUEST_FORMAT',
            'loc-args': ['Jenna', 'Frank']
          },
          'badge': 100,
          'sound': 'test',
          'thread-id': 'a-thread-id'
        },
        'key': 'value',
        'keyAgain': 'valueAgain'
      };
      const expirationTime = 1454571491354;
      const collapseId = 'collapseIdentifier';
      const pushType = 'background';
      const priority = 5;
      const notification = APNSNative._generateNotification(data, { expirationTime, collapseId, pushType, priority });

      expect(notification.expiry).toEqual(Math.round(expirationTime / 1000));
      expect(notification.collapseId).toEqual(collapseId);
      expect(notification.pushType).toEqual(pushType);
      expect(notification.priority).toEqual(priority);

      const jsonPayload = notification.payload;
      expect(jsonPayload.aps.alert).toEqual({ 'loc-key': 'GAME_PLAY_REQUEST_FORMAT', 'loc-args': ['Jenna', 'Frank'] });
      expect(jsonPayload.aps.badge).toEqual(100);
      expect(jsonPayload.aps.sound).toEqual('test');
      expect(jsonPayload.aps['thread-id']).toEqual('a-thread-id');
      expect(jsonPayload.key).toEqual('value');
      expect(jsonPayload.keyAgain).toEqual('valueAgain');
    });

    it('generating notification prioritizes header information from notification data', () => {
      const data = {
        'id': 'hello',
        'requestId': 'world',
        'channelId': 'foo',
        'topic': 'bundle',
        'expiry': 20,
        'collapseId': 'collapse',
        'pushType': 'alert',
        'priority': 7,
      };
      const notification = APNSNative._generateNotification(data, {
        id: 'foo', requestId: 'hello', channelId: 'world',
        topic: 'bundleId', expirationTime: 1454571491354,
        collapseId: 'collapseIdentifier', pushType: 'background', priority: 5
      });
      expect(notification.id).toEqual(data.id);
      expect(notification.requestId).toEqual(data.requestId);
      expect(notification.channelId).toEqual(data.channelId);
      expect(notification.topic).toEqual(data.topic);
      expect(notification.expiry).toEqual(data.expiry);
      expect(notification.collapseId).toEqual(data.collapseId);
      expect(notification.pushType).toEqual(data.pushType);
      expect(notification.priority).toEqual(data.priority);
    });

    it('generating notification does not override default notification info when header info is missing', () => {
      const data = {};
      const notification = APNSNative._generateNotification(data, { topic: 'bundleId', collapseId: 'collapseIdentifier', pushType: 'background' });
      expect(notification.topic).toEqual('bundleId');
      expect(notification.expiry).toEqual(-1);
      expect(notification.collapseId).toEqual('collapseIdentifier');
      expect(notification.pushType).toEqual('background');
      expect(notification.priority).toEqual(10);
    });
  });

  describe('topic determination', () => {
    it('generating notification updates topic properly', () => {
      const notification = APNSNative._generateNotification({}, { topic: 'bundleId', pushType: 'liveactivity' });
      expect(notification.topic).toEqual('bundleId.push-type.liveactivity');
      expect(notification.pushType).toEqual('liveactivity');
    });

    it('defaults to original topic', () => {
      expect(APNSNative._determineTopic('bundleId', 'alert')).toEqual('bundleId');
    });

    it('updates topic based on location pushType', () => {
      expect(APNSNative._determineTopic('bundleId', 'location')).toEqual('bundleId.location-query');
    });

    it('updates topic based on voip pushType', () => {
      expect(APNSNative._determineTopic('bundleId', 'voip')).toEqual('bundleId.voip');
    });

    it('updates topic based on complication pushType', () => {
      expect(APNSNative._determineTopic('bundleId', 'complication')).toEqual('bundleId.complication');
    });

    it('updates topic based on fileprovider pushType', () => {
      expect(APNSNative._determineTopic('bundleId', 'fileprovider')).toEqual('bundleId.pushkit.fileprovider');
    });

    it('updates topic based on liveactivity pushType', () => {
      expect(APNSNative._determineTopic('bundleId', 'liveactivity')).toEqual('bundleId.push-type.liveactivity');
    });

    it('updates topic based on pushtotalk pushType', () => {
      expect(APNSNative._determineTopic('bundleId', 'pushtotalk')).toEqual('bundleId.voip-ptt');
    });
  });

  describe('provider selection', () => {
    it('can choose providers for device with valid appIdentifier', () => {
      const providers = [
        { topic: 'topic' },
        { topic: 'topicAgain' }
      ];
      const qualifiedProviders = APNSNative.prototype._chooseProviders.call({ providers }, 'topic');
      expect(qualifiedProviders).toEqual([{ topic: 'topic' }]);
    });

    it('can choose providers for device with invalid appIdentifier', () => {
      const providers = [
        { topic: 'bundleId' },
        { topic: 'bundleIdAgain' }
      ];
      const qualifiedProviders = APNSNative.prototype._chooseProviders.call({ providers }, 'invalid');
      expect(qualifiedProviders).toEqual([]);
    });
  });

  describe('send', () => {
    it('does log on invalid APNS notification', () => {
      const spy = spyOn(log, 'warn');
      const apns = new APNSNative(makeTokenConfig());
      apns.send();
      expect(spy).toHaveBeenCalled();
    });

    it('can send APNS notification', async () => {
      const apns = new APNSNative(makeTokenConfig());
      const provider = apns.providers[0];
      spyOn(provider, 'send').and.callFake((notification, devices) => {
        return Promise.resolve({
          sent: devices.map(d => ({ device: d })),
          failed: []
        });
      });

      const data = {
        'collapse_id': 'collapseIdentifier',
        'push_type': 'alert',
        'expiration_time': 1454571491354,
        'priority': 6,
        'data': { 'alert': 'alert' }
      };
      const mockedDevices = [
        { deviceToken: '112233', appIdentifier: 'com.example.app' },
        { deviceToken: '112234', appIdentifier: 'com.example.app' },
        { deviceToken: '112235', appIdentifier: 'com.example.app' },
        { deviceToken: '112236', appIdentifier: 'com.example.app' }
      ];

      await apns.send(data, mockedDevices);

      expect(provider.send).toHaveBeenCalled();
      const calledArgs = provider.send.calls.first().args;
      const notification = calledArgs[0];
      expect(notification.aps.alert).toEqual({ body: 'alert' });
      expect(notification.expiry).toEqual(Math.round(data['expiration_time'] / 1000));
      expect(notification.collapseId).toEqual('collapseIdentifier');
      expect(notification.pushType).toEqual('alert');
      expect(notification.priority).toEqual(6);
      const apnDevices = calledArgs[1];
      expect(apnDevices.length).toEqual(4);
    });

    it('can send APNS notification headers in data', async () => {
      const apns = new APNSNative(makeTokenConfig());
      const provider = apns.providers[0];
      spyOn(provider, 'send').and.callFake((notification, devices) => {
        return Promise.resolve({
          sent: devices.map(d => ({ device: d })),
          failed: []
        });
      });

      const data = {
        'expiration_time': 1454571491354,
        'data': {
          'alert': 'alert',
          'collapse_id': 'collapseIdentifier',
          'push_type': 'alert',
          'priority': 6,
        }
      };
      const mockedDevices = [
        { deviceToken: '112233', appIdentifier: 'com.example.app' },
        { deviceToken: '112234', appIdentifier: 'com.example.app' },
        { deviceToken: '112235', appIdentifier: 'com.example.app' },
        { deviceToken: '112236', appIdentifier: 'com.example.app' }
      ];

      await apns.send(data, mockedDevices);

      expect(provider.send).toHaveBeenCalled();
      const calledArgs = provider.send.calls.first().args;
      const notification = calledArgs[0];
      expect(notification.aps.alert).toEqual({ body: 'alert' });
      expect(notification.expiry).toEqual(Math.round(data['expiration_time'] / 1000));
      const apnDevices = calledArgs[1];
      expect(apnDevices.length).toEqual(4);
    });

    it('can send to multiple bundles', async () => {
      const apns = new APNSNative([
        makeTokenConfig({ topic: 'topic', production: true }),
        makeTokenConfig({ topic: 'topic.dev', production: false }),
      ]);

      const provider = apns.providers[0];
      spyOn(provider, 'send').and.callFake((notification, devices) => {
        return Promise.resolve({ sent: devices.map(d => ({ device: d })), failed: [] });
      });
      const providerDev = apns.providers[1];
      spyOn(providerDev, 'send').and.callFake((notification, devices) => {
        return Promise.resolve({ sent: devices.map(d => ({ device: d })), failed: [] });
      });

      const data = {
        'collapse_id': 'collapseIdentifier',
        'push_type': 'alert',
        'expiration_time': 1454571491354,
        'data': { 'alert': 'alert' }
      };
      const mockedDevices = [
        { deviceToken: '112233', appIdentifier: 'topic' },
        { deviceToken: '112234', appIdentifier: 'topic' },
        { deviceToken: '112235', appIdentifier: 'topic' },
        { deviceToken: '112235', appIdentifier: 'topic.dev' },
        { deviceToken: '112236', appIdentifier: 'topic.dev' },
      ];

      await apns.send(data, mockedDevices);

      expect(provider.send).toHaveBeenCalled();
      let calledArgs = provider.send.calls.first().args;
      expect(calledArgs[1].length).toBe(3);

      expect(providerDev.send).toHaveBeenCalled();
      calledArgs = providerDev.send.calls.first().args;
      expect(calledArgs[1].length).toBe(2);
    });

    it('reports error when no provider available', async () => {
      spyOn(log, 'warn').and.callFake(() => {});
      const apns = new APNSNative(makeTokenConfig({ bundleId: 'bundleId', topic: undefined }));
      const data = { 'data': { 'alert': 'alert' } };
      const devices = [{ deviceToken: '112233', appIdentifier: 'invalidBundleId' }];
      const results = await apns.send(data, devices);
      expect(results.length).toBe(1);
      expect(results[0].transmitted).toBe(false);
      expect(results[0].response.error).toBe('No Provider found');
    });

    it('retries with next provider when first provider fails', async () => {
      spyOn(log, 'error').and.callFake(() => {});
      const apns = new APNSNative([
        makeTokenConfig({ topic: 'topic', production: true }),
        makeTokenConfig({ topic: 'topic', production: false }),
      ]);

      const provider1 = apns.providers[0];
      spyOn(provider1, 'send').and.callFake((notification, devices) => {
        return Promise.resolve({
          sent: [],
          failed: devices.map(d => ({ device: d, status: 500, response: { reason: 'InternalError' } }))
        });
      });
      const provider2 = apns.providers[1];
      spyOn(provider2, 'send').and.callFake((notification, devices) => {
        return Promise.resolve({
          sent: devices.map(d => ({ device: d })),
          failed: []
        });
      });

      const data = { 'data': { 'alert': 'alert' } };
      const devices = [
        { deviceToken: '112233', appIdentifier: 'topic' },
      ];
      const results = await apns.send(data, devices);

      expect(provider1.send).toHaveBeenCalled();
      expect(provider2.send).toHaveBeenCalled();
      expect(results.length).toBe(1);
      expect(results[0].transmitted).toBe(true);
    });
  });

  describe('provider internal send', () => {
    it('calls connection.send and returns sent/failed', async () => {
      const apns = new APNSNative(makeTokenConfig());
      const provider = apns.providers[0];

      spyOn(provider.connection, 'send').and.callFake(async (deviceToken) => {
        if (deviceToken === 'good') {
          return { status: 200, body: {} };
        }
        return { status: 400, body: { reason: 'BadDeviceToken' } };
      });

      const notification = APNSNative._generateNotification({ alert: 'test' }, { topic: 'com.example.app' });
      const result = await provider.send(notification, ['good', 'bad']);

      expect(result.sent.length).toBe(1);
      expect(result.sent[0].device).toBe('good');
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].device).toBe('bad');
      expect(result.failed[0].response.reason).toBe('BadDeviceToken');
    });

    it('handles ExpiredProviderToken with token refresh', async () => {
      const apns = new APNSNative(makeTokenConfig());
      const provider = apns.providers[0];

      let callCount = 0;
      spyOn(provider.connection, 'send').and.callFake(async () => {
        callCount++;
        if (callCount === 1) {
          return { status: 403, body: { reason: 'ExpiredProviderToken' } };
        }
        return { status: 200, body: {} };
      });
      spyOn(provider.token, 'refresh').and.callThrough();

      const notification = APNSNative._generateNotification({ alert: 'test' }, { topic: 'com.example.app' });
      const result = await provider.send(notification, ['device1']);

      expect(provider.token.refresh).toHaveBeenCalled();
      expect(result.sent.length).toBe(1);
      expect(result.sent[0].device).toBe('device1');
    });

    it('reports failure when ExpiredProviderToken retry also fails', async () => {
      const apns = new APNSNative(makeTokenConfig());
      const provider = apns.providers[0];

      spyOn(provider.connection, 'send').and.callFake(async () => {
        return { status: 403, body: { reason: 'ExpiredProviderToken' } };
      });

      const notification = APNSNative._generateNotification({ alert: 'test' }, { topic: 'com.example.app' });
      const result = await provider.send(notification, ['device1']);

      expect(result.sent.length).toBe(0);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].status).toBe(403);
    });

    it('handles connection errors', async () => {
      const apns = new APNSNative(makeTokenConfig());
      const provider = apns.providers[0];

      spyOn(provider.connection, 'send').and.callFake(async () => {
        throw new Error('Connection refused');
      });

      const notification = APNSNative._generateNotification({ alert: 'test' }, { topic: 'com.example.app' });
      const result = await provider.send(notification, ['device1']);

      expect(result.sent.length).toBe(0);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toBe('Connection refused');
    });
  });

  describe('error handling', () => {
    it('properly parses errors', async () => {
      spyOn(log, 'error').and.callFake(() => {});
      const result = await APNSNative._handlePushFailure({
        device: 'abcd',
        status: -1,
        response: { reason: 'Something wrong happend' }
      });
      expect(result.transmitted).toBe(false);
      expect(result.device.deviceToken).toBe('abcd');
      expect(result.device.deviceType).toBe('ios');
      expect(result.response.error).toBe('Something wrong happend');
    });

    it('properly parses status 0 transport failures', async () => {
      spyOn(log, 'error').and.callFake(() => {});
      const result = await APNSNative._handlePushFailure({
        device: 'abcd',
        status: 0,
        response: { reason: 'RequestTimeout' }
      });
      expect(result.transmitted).toBe(false);
      expect(result.device.deviceToken).toBe('abcd');
      expect(result.device.deviceType).toBe('ios');
      expect(result.response.error).toBe('RequestTimeout');
    });

    it('properly parses errors again', async () => {
      spyOn(log, 'error').and.callFake(() => {});
      const result = await APNSNative._handlePushFailure({ device: 'abcd' });
      expect(result.transmitted).toBe(false);
      expect(result.device.deviceToken).toBe('abcd');
      expect(result.device.deviceType).toBe('ios');
      expect(result.response.error).toBe('Unknown status');
    });
  });
});
