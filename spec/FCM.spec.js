import { deleteApp, getApps } from 'firebase-admin/app';
import log from 'npmlog';
import Parse from 'parse/node.js';
import path from 'path';
import FCM from '../src/FCM.js';

let testArgs;

describe('FCM', () => {
  beforeEach(async () => {
    getApps().forEach(app => deleteApp(app));

    testArgs = {
      firebaseServiceAccount: path.join(
        __dirname,
        '..',
        'spec',
        'support',
        'fakeServiceAccount.json',
      ),
    };
  });

  it('can initialize', () => {
    const fcm = new FCM(testArgs);
    expect(fcm).toBeDefined();
  });

  it('can throw on initializing with invalid args', () => {
    expect(function() { new FCM(123); }).toThrow();
    expect(function() { new FCM({}); }).toThrow();
  });

  it('does log on invalid payload', async () => {
    const spy = spyOn(log, 'warn');
    const fcm = new FCM(testArgs);
    fcm.send();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'invalid push payload');
  });

  it('initializes with fcmEnableLegacyHttpTransport set to false by default', () => {
    const fcm = new FCM(testArgs);
    expect(fcm).toBeDefined();
    expect(fcm.sender).toBeDefined();
    expect(fcm.sender.useLegacyTransport).toEqual(false);
  });

  it('can initialize with fcmEnableLegacyHttpTransport set to false', () => {
    const legacyHttpTransportArgs = {
      ...testArgs,
      fcmEnableLegacyHttpTransport: false
    };

    const fcm = new FCM(legacyHttpTransportArgs);
    expect(fcm).toBeDefined();
    expect(fcm.sender).toBeDefined();
    expect(fcm.sender.useLegacyTransport).toEqual(false);
  });

  it('can initialize with fcmEnableLegacyHttpTransport set to true', () => {
    const legacyHttpTransportArgs = {
      ...testArgs,
      fcmEnableLegacyHttpTransport: true
    };

    const fcm = new FCM(legacyHttpTransportArgs);
    expect(fcm).toBeDefined();
    expect(fcm.sender).toBeDefined();
    expect(fcm.sender.useLegacyTransport).toEqual(true);
  });

  it('can send successful FCM android request', async () => {
    const spyVerbose = spyOn(log, 'verbose').and.callFake(() => {});
    const spyInfo = spyOn(log, 'info').and.callFake(() => {});
    const fcm = new FCM(testArgs);
    spyOn(fcm.sender, 'sendEachForMulticast').and.callFake(() => {
      return Promise.resolve({
        responses: [{ success: true }],
      });
    });
    fcm.pushType = 'android';
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    const response = await fcm.send(data, devices);
    expect(fcm.sender.sendEachForMulticast).toHaveBeenCalled();
    const args = fcm.sender.sendEachForMulticast.calls.first().args;
    expect(args.length).toEqual(1);
    expect(args[0].android.priority).toEqual('high');
    expect(args[0].android.data.data).toEqual('{"alert":"alert"}');
    expect(args[0].tokens).toEqual(['token']);
    expect(spyVerbose).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'tokens with successful pushes: ["token"]');
    expect(spyInfo).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'sending push to 1 devices');
    expect(response).toEqual([[{
      device: { deviceToken: 'token', deviceType: undefined },
      transmitted: true
    }]]);
  });

  it('can send successful FCM android request with apns integer keys', async () => {
    const spyVerbose = spyOn(log, 'verbose').and.callFake(() => {});
    const spyInfo = spyOn(log, 'info').and.callFake(() => {});
    const fcm = new FCM(testArgs);
    spyOn(fcm.sender, 'sendEachForMulticast').and.callFake(() => {
      return Promise.resolve({
        responses: [{ success: true }],
      });
    });
    fcm.pushType = 'android';
    const data = { data: { alert: 'alert', badge: 1 } };
    const devices = [{ deviceToken: 'token' }];
    const response = await fcm.send(data, devices);
    expect(fcm.sender.sendEachForMulticast).toHaveBeenCalled();
    const args = fcm.sender.sendEachForMulticast.calls.first().args;
    expect(args.length).toEqual(1);
    expect(args[0].android.priority).toEqual('high');
    // Should not include badge key in data
    expect(args[0].android.data.data).toEqual('{"alert":"alert"}');
    expect(args[0].tokens).toEqual(['token']);
    expect(spyVerbose).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'tokens with successful pushes: ["token"]');
    expect(spyInfo).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'sending push to 1 devices');
    expect(response).toEqual([[{
      device: { deviceToken: 'token', deviceType: undefined },
      transmitted: true
    }]]);
  });

  it('can send successful FCM apple request with alert', async () => {
    const spyVerbose = spyOn(log, 'verbose').and.callFake(() => {});
    const spyInfo = spyOn(log, 'info').and.callFake(() => {});
    const fcm = new FCM(testArgs);
    spyOn(fcm.sender, 'sendEachForMulticast').and.callFake(() => {
      return Promise.resolve({
        responses: [{ success: true }],
      });
    });
    fcm.pushType = 'apple';
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    const response = await fcm.send(data, devices);
    expect(fcm.sender.sendEachForMulticast).toHaveBeenCalled();
    const args = fcm.sender.sendEachForMulticast.calls.first().args;
    expect(args.length).toEqual(1);
    expect(args[0].apns.payload).toEqual({ aps: { alert: { body: 'alert' } } });
    expect(args[0].apns.headers).toEqual({ 'apns-push-type': 'alert' });
    expect(args[0].tokens).toEqual(['token']);
    expect(spyVerbose).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'tokens with successful pushes: ["token"]');
    expect(spyInfo).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'sending push to 1 devices');
    expect(response).toEqual([[{
      device: { deviceToken: 'token', deviceType: undefined },
      transmitted: true
    }]]);
  });

  it('can send successful FCM apple request with title and alert', async () => {
    const spyVerbose = spyOn(log, 'verbose').and.callFake(() => {});
    const spyInfo = spyOn(log, 'info').and.callFake(() => {});
    const fcm = new FCM(testArgs);
    spyOn(fcm.sender, 'sendEachForMulticast').and.callFake(() => {
      return Promise.resolve({
        responses: [{ success: true }],
      });
    });
    fcm.pushType = 'apple';
    const data = { data: { title: 'title', alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    const response = await fcm.send(data, devices);
    expect(fcm.sender.sendEachForMulticast).toHaveBeenCalled();
    const args = fcm.sender.sendEachForMulticast.calls.first().args;
    expect(args.length).toEqual(1);
    expect(args[0].apns.payload).toEqual({ aps: { alert: { title: 'title', body: 'alert' } } });
    expect(args[0].apns.headers).toEqual({ 'apns-push-type': 'alert' });
    expect(args[0].tokens).toEqual(['token']);
    expect(spyVerbose).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'tokens with successful pushes: ["token"]');
    expect(spyInfo).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'sending push to 1 devices');
    expect(response).toEqual([[{
      device: { deviceToken: 'token', deviceType: undefined },
      transmitted: true
    }]]);
  });

  it('can send failed FCM request', async () => {
    const spyInfo = spyOn(log, 'info').and.callFake(() => {});
    const spyError = spyOn(log, 'error').and.callFake(() => {});
    const fcm = new FCM(testArgs);
    spyOn(fcm.sender, 'sendEachForMulticast').and.callFake(() => {
      return Promise.resolve({
        responses: [{ success: false, error: 'testing failed' }],
      });
    });
    fcm.pushType = 'android';
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token', deviceType: 'apple' }];
    const response = await fcm.send(data, devices);
    expect(fcm.sender.sendEachForMulticast).toHaveBeenCalled();
    const args = fcm.sender.sendEachForMulticast.calls.first().args;
    expect(args.length).toEqual(1);
    expect(args[0].android.priority).toEqual('high');
    expect(args[0].android.data.data).toEqual('{"alert":"alert"}');
    expect(args[0].tokens).toEqual(['token']);
    expect(spyInfo).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'sending push to 1 devices');
    expect(spyError.calls.all()[0].args).toEqual(['parse-server-push-adapter FCM', 'failed to send to token with error: "testing failed"']);
    expect(spyError.calls.all()[1].args).toEqual(['parse-server-push-adapter FCM', 'tokens with failed pushes: ["token"]']);
    expect(response).toEqual([[{
      device: { deviceToken: 'token', deviceType: 'apple' },
      response: { error: 'testing failed'},
      transmitted: false,
    }]]);
  });

  it('can handle FCM request error', async () => {
    const spyInfo = spyOn(log, 'info').and.callFake(() => {});
    const spyError = spyOn(log, 'error').and.callFake(() => {});
    const fcm = new FCM(testArgs);
    spyOn(fcm.sender, 'sendEachForMulticast').and.callFake(() => {
      return Promise.reject('testing error abort');
    });
    fcm.pushType = 'android';
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    await fcm.send(data, devices);
    expect(fcm.sender.sendEachForMulticast).toHaveBeenCalled();
    expect(spyInfo).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'sending push to 1 devices');
    expect(spyError).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'error sending push: testing error abort');
  });

  it('rejects exceptions that are unhandled by FCM client', async () => {
    const spyInfo = spyOn(log, 'info').and.callFake(() => {});
    const spyError = spyOn(log, 'error').and.callFake(() => {});
    testArgs.resolveUnhandledClientError = false;
    const fcm = new FCM(testArgs);
    spyOn(fcm.sender, 'sendEachForMulticast').and.callFake(() => {
      throw new Error('test error');
    });
    fcm.pushType = 'android';
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    await expectAsync(fcm.send(data, devices)).toBeRejectedWith(new Parse.Error(Parse.Error.OTHER_CAUSE, 'Error: test error'));
    expect(fcm.sender.sendEachForMulticast).toHaveBeenCalled();
    expect(spyInfo).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'sending push to 1 devices');
    expect(spyError).toHaveBeenCalledTimes(2);
    expect(spyError.calls.all()[0].args).toEqual(['parse-server-push-adapter FCM', 'error sending push: firebase client exception: Error: test error']);
    expect(spyError.calls.all()[1].args).toEqual(['parse-server-push-adapter FCM', 'error sending push: ParseError: -1 Error: test error']);
  });

  it('resolves exceptions that are unhandled by FCM client', async () => {
    const spyInfo = spyOn(log, 'info').and.callFake(() => {});
    const spyError = spyOn(log, 'error').and.callFake(() => {});
    testArgs.resolveUnhandledClientError = true;
    const fcm = new FCM(testArgs);
    spyOn(fcm.sender, 'sendEachForMulticast').and.callFake(() => {
      throw new Error('test error');
    });
    fcm.pushType = 'android';
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    await expectAsync(fcm.send(data, devices)).toBeResolved();
    expect(fcm.sender.sendEachForMulticast).toHaveBeenCalled();
    expect(spyInfo).toHaveBeenCalledWith('parse-server-push-adapter FCM', 'sending push to 1 devices');
    expect(spyError).toHaveBeenCalledTimes(2);
    expect(spyError.calls.all()[0].args).toEqual(['parse-server-push-adapter FCM', 'error sending push: firebase client exception: Error: test error']);
    expect(spyError.calls.all()[1].args).toEqual(['parse-server-push-adapter FCM', 'error sending push: ParseError: -1 Error: test error']);
  });

  it('FCM request invalid push type', async () => {
    const fcm = new FCM(testArgs);
    fcm.pushType = 'invalid';
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    try {
      await fcm.send(data, devices);
      expect(true).toBe(false);
    } catch (e) {
      expect(e.message).toBe('Unsupported push type, apple or android only.');
    }
  });

  it('can use a raw FCM payload', () => {
    // If the payload is wrapped inside a key named 'rawPayload', a user can use the raw FCM payload structure
    // See: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages
    // And: https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.multicastmessage.md#multicastmessage_interface

    const requestData = {
      rawPayload: {
        data: {
          alert: 'alert',
        },
        notification: {
          title: 'I am a title',
          body: 'I am a body',
        },
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '5',
          },
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      },
    };

    const pushId = 'pushId';
    const timeStamp = 1454538822113;
    const payload = FCM.generateFCMPayload(
      requestData,
      pushId,
      timeStamp,
      ['testToken'],
      'android',
    );

    expect(payload.data.data).toEqual(requestData.rawPayload.data);
    expect(payload.data.notification).toEqual(
      requestData.rawPayload.notification,
    );
    expect(payload.data.android).toEqual(requestData.rawPayload.android);
    expect(payload.data.apns).toEqual(requestData.rawPayload.apns);
    expect(payload.data.tokens).toEqual(['testToken']);
  });

  it('can slice devices', () => {
    // Mock devices
    const devices = [makeDevice(1), makeDevice(2), makeDevice(3), makeDevice(4)];

    const chunkDevices = FCM.sliceDevices(devices, 3);
    expect(chunkDevices).toEqual([
      [makeDevice(1), makeDevice(2), makeDevice(3)],
      [makeDevice(4)],
    ]);
  });

  describe('GCM payloads can be converted to compatible FCMv1 payloads', () => {
    it('can generate GCM Payload without expiration time', () => {
      // To maintain backwards compatibility with GCM payload format
      // See corresponding test with same test label in GCM.spec.js

      const requestData = {
        data: {
          alert: { body: 'alert', title: 'title' }
        },
        notification: {
          title: 'I am a title',
          body: 'I am a body',
        },
      };

      const pushId = 'pushId';
      const timeStamp = 1454538822113;
      const timeStampISOStr = new Date(timeStamp).toISOString();

      const payload = FCM.generateFCMPayload(
        requestData,
        pushId,
        timeStamp,
        ['testToken'],
        'android',
      );

      const fcmPayload = payload.data;

      expect(fcmPayload.tokens).toEqual(['testToken']);
      expect(fcmPayload.android.priority).toEqual('high');
      expect(fcmPayload.android.ttl).toEqual(undefined);
      expect(fcmPayload.android.notification).toEqual(requestData.notification);

      expect(fcmPayload.android.data['time']).toEqual(timeStampISOStr);
      expect(fcmPayload.android.data['push_id']).toEqual(pushId);

      const dataFromUser = JSON.parse(fcmPayload.android.data.data);
      expect(dataFromUser).toEqual(requestData.data);
    });

    it('can generate GCM Payload with valid expiration time', () => {
      // To maintain backwards compatibility with GCM payload format
      // See corresponding test with same test label in GCM.spec.js

      // We set expiration_time directly into requestData
      // The GCM module adds the key in send() instead and the value gets passed as a param to the payload generation
      // Has the same effect in the end

      const expirationTime = 1454538922113;

      const requestData = {
        expiration_time: expirationTime,
        data: {
          alert: 'alert',
        },
        notification: {
          title: 'I am a title',
          body: 'I am a body',
        },
      };

      const pushId = 'pushId';
      const timeStamp = 1454538822113;
      const timeStampISOStr = new Date(timeStamp).toISOString();

      const payload = FCM.generateFCMPayload(
        requestData,
        pushId,
        timeStamp,
        ['testToken'],
        'android',
      );

      const fcmPayload = payload.data;

      expect(fcmPayload.tokens).toEqual(['testToken']);
      expect(fcmPayload.android.priority).toEqual('high');
      expect(fcmPayload.android.ttl).toEqual(
        Math.floor((expirationTime - timeStamp) / 1000),
      );
      expect(fcmPayload.android.notification).toEqual(requestData.notification);

      expect(fcmPayload.android.data['time']).toEqual(timeStampISOStr);
      expect(fcmPayload.android.data['push_id']).toEqual(pushId);

      const dataFromUser = JSON.parse(fcmPayload.android.data.data);
      expect(dataFromUser).toEqual(requestData.data);
    });

    it('can generate GCM Payload with too early expiration time', () => {
      // To maintain backwards compatibility with GCM payload format
      // See corresponding test with same test label in GCM.spec.js

      const expirationTime = 1454538822112;

      const requestData = {
        expiration_time: expirationTime,
        data: {
          alert: 'alert',
        },
        notification: {
          title: 'I am a title',
          body: 'I am a body',
        },
      };
      const pushId = 'pushId';
      const timeStamp = 1454538822113;
      const timeStampISOStr = new Date(timeStamp).toISOString();

      const payload = FCM.generateFCMPayload(
        requestData,
        pushId,
        timeStamp,
        ['testToken'],
        'android',
      );
      const fcmPayload = payload.data;
      expect(fcmPayload.tokens).toEqual(['testToken']);
      expect(fcmPayload.android.priority).toEqual('high');
      expect(fcmPayload.android.ttl).toEqual(0);
      expect(fcmPayload.android.notification).toEqual(requestData.notification);

      expect(fcmPayload.android.data['time']).toEqual(timeStampISOStr);
      expect(fcmPayload.android.data['push_id']).toEqual(pushId);

      const dataFromUser = JSON.parse(fcmPayload.android.data.data);
      expect(dataFromUser).toEqual(requestData.data);
    });

    it('can generate GCM Payload with too late expiration time', () => {
      const expirationTime = 2454538822113;

      const requestData = {
        expiration_time: expirationTime,
        data: {
          alert: 'alert',
        },
        notification: {
          title: 'I am a title',
          body: 'I am a body',
        },
      };

      const pushId = 'pushId';
      const timeStamp = 1454538822113;
      const timeStampISOStr = new Date(timeStamp).toISOString();

      const payload = FCM.generateFCMPayload(
        requestData,
        pushId,
        timeStamp,
        ['testToken'],
        'android',
      );
      const fcmPayload = payload.data;

      expect(fcmPayload.tokens).toEqual(['testToken']);
      expect(fcmPayload.android.priority).toEqual('high');

      // Four weeks in seconds
      expect(fcmPayload.android.ttl).toEqual(4 * 7 * 24 * 60 * 60);
      expect(fcmPayload.android.notification).toEqual(requestData.notification);

      expect(fcmPayload.android.data['time']).toEqual(timeStampISOStr);
      expect(fcmPayload.android.data['push_id']).toEqual(pushId);

      const dataFromUser = JSON.parse(fcmPayload.android.data.data);
      expect(dataFromUser).toEqual(requestData.data);
    });
  });

  // We do not need to explicitly set priority to 10 under headers as is done in APNS.js
  // FCM backend sets apns-priority to 10 and apns-expiration to 30 days by default if not set.
  //
  // We also do not need to pass APNS headers like expiration_time, collapse_id etc to FCM.generatePayload() as is done for APNS._generateNotification() for generating the payload.
  // APNS headers get set if present in the payload data.
  describe('APNS payloads can be converted to compatible FCMv1 payloads', () => {
    it('can generate APNS notification', () => {
      // To maintain backwards compatibility with APNS payload format
      // See corresponding test with same test label in APNS.spec.js

      const expirationTime = 1454571491354;
      const collapseId = 'collapseIdentifier';
      const pushType = 'alert';
      const priority = 5;

      const data = {
        expiration_time: expirationTime,
        collapse_id: collapseId,
        push_type: pushType,
        priority: priority,
        alert: 'alert',
        title: 'title',
        badge: 100,
        sound: 'test',
        'content-available': 1,
        'mutable-content': 1,
        targetContentIdentifier: 'window1',
        interruptionLevel: 'passive',
        category: 'INVITE_CATEGORY',
        threadId: 'a-thread-id',
        key: 'value',
        keyAgain: 'valueAgain',
      };

      const pushId = 'pushId';
      const timeStamp = 1454538822113;
      const payload = FCM.generateFCMPayload(
        data,
        pushId,
        timeStamp,
        ['tokenTest'],
        'apple',
      );
      const fcmPayload = payload.data;

      expect(fcmPayload.apns.payload.aps.alert).toEqual({
        body: 'alert',
        title: 'title',
      });
      expect(fcmPayload.apns.payload.aps.badge).toEqual(data.badge);
      expect(fcmPayload.apns.payload.aps.sound).toEqual(data.sound);
      expect(fcmPayload.apns.payload.aps['content-available']).toEqual(1);
      expect(fcmPayload.apns.payload.aps['mutable-content']).toEqual(1);
      expect(fcmPayload.apns.payload.aps['target-content-id']).toEqual(
        'window1',
      );
      expect(fcmPayload.apns.payload.aps['interruption-level']).toEqual(
        'passive',
      );
      expect(fcmPayload.apns.payload.aps.category).toEqual(data.category);
      expect(fcmPayload.apns.payload.aps['thread-id']).toEqual(data.threadId);

      // Custom keys should be outside aps but inside payload according to FCMv1 APNS spec
      expect(fcmPayload.apns.payload).toEqual(
        jasmine.objectContaining({
          key: 'value',
          keyAgain: 'valueAgain',
        }),
      );
      expect(fcmPayload.apns.headers['apns-expiration']).toEqual(
        Math.round(expirationTime / 1000),
      );
      expect(fcmPayload.apns.headers['apns-collapse-id']).toEqual(collapseId);
      expect(fcmPayload.apns.headers['apns-push-type']).toEqual(pushType);
      expect(fcmPayload.apns.headers['apns-priority']).toEqual(priority);
    });

    it('sets push type to alert if not defined explicitly', () => {
      const data = {
        alert: 'alert',
        title: 'title',
        badge: 100,
        sound: 'test',
        'content-available': 1,
        'mutable-content': 1,
        category: 'INVITE_CATEGORY',
        threadId: 'a-thread-id',
        key: 'value',
        keyAgain: 'valueAgain',
      };

      // unused when generating apple payload, required by Parse Android SDK
      const pushId = 'pushId';
      const timeStamp = 1454538822113;

      const payload = FCM.generateFCMPayload(
        data,
        pushId,
        timeStamp,
        ['tokenTest'],
        'apple',
      );
      const fcmPayload = payload.data;

      expect(fcmPayload.apns.headers['apns-push-type']).toEqual('alert');
    });

    it('can generate APNS notification from raw data', () => {
      const expirationTime = 1454571491354;
      const collapseId = 'collapseIdentifier';
      const pushType = 'background';
      const priority = 5;
      const data = {
        expiration_time: expirationTime,
        collapse_id: collapseId,
        push_type: pushType,
        priority: priority,
        aps: {
          alert: {
            'loc-key': 'GAME_PLAY_REQUEST_FORMAT',
            'loc-args': ['Jenna', 'Frank'],
          },
          badge: 100,
          sound: 'test',
          'thread-id': 'a-thread-id',
        },
        key: 'value',
        keyAgain: 'valueAgain',
      };

      // unused when generating apple payload, required by Parse Android SDK
      const pushId = 'pushId';
      const timeStamp = 1454538822113;

      const payload = FCM.generateFCMPayload(
        data,
        pushId,
        timeStamp,
        ['tokenTest'],
        'apple',
      );
      const fcmPayload = payload.data;

      expect(fcmPayload.apns.headers['apns-expiration']).toEqual(
        Math.round(expirationTime / 1000),
      );
      expect(fcmPayload.apns.headers['apns-collapse-id']).toEqual(collapseId);
      expect(fcmPayload.apns.headers['apns-push-type']).toEqual(pushType);
      expect(fcmPayload.apns.headers['apns-priority']).toEqual(priority);
      expect(fcmPayload.apns.payload.aps.alert).toEqual({
        'loc-key': 'GAME_PLAY_REQUEST_FORMAT',
        'loc-args': ['Jenna', 'Frank'],
      });
      expect(fcmPayload.apns.payload.aps.badge).toEqual(100);
      expect(fcmPayload.apns.payload.aps.sound).toEqual('test');
      expect(fcmPayload.apns.payload.aps['thread-id']).toEqual('a-thread-id');
      expect(fcmPayload.apns.payload.key).toEqual('value');
      expect(fcmPayload.apns.payload.keyAgain).toEqual('valueAgain');
    });

    it('can generate an APNS notification with headers in data', () => {
      // See 'can send APNS notification headers in data' in APNS.spec.js
      // Not mocking sends currently, only payload generation

      const expirationTime = 1454571491354;
      const collapseId = 'collapseIdentifier';
      const pushType = 'alert'; // or background

      const data = {
        expiration_time: expirationTime,
        data: {
          alert: { body: 'alert', title: 'title' },
          collapse_id: collapseId,
          push_type: pushType,
          priority: 6,
        },
      };

      // unused when generating apple payload, required by Parse Android SDK
      const pushId = 'pushId';
      const timeStamp = 1454538822113;

      const payload = FCM.generateFCMPayload(
        data,
        pushId,
        timeStamp,
        ['tokenTest'],
        'apple',
      );

      const fcmPayload = payload.data;

      expect(fcmPayload.apns.payload.aps.alert).toEqual({ body: 'alert', title: 'title' });
      expect(fcmPayload.apns.headers['apns-expiration']).toEqual(
        Math.round(expirationTime / 1000),
      );
      expect(fcmPayload.apns.headers['apns-collapse-id']).toEqual(collapseId);
      expect(fcmPayload.apns.headers['apns-push-type']).toEqual(pushType);
      expect(fcmPayload.apns.headers['apns-priority']).toEqual(6);
    });
  });

  function makeDevice(deviceToken) {
    return {
      deviceToken: deviceToken,
    };
  }
});
