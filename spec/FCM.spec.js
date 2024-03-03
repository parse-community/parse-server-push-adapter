const FCM = require('../src/FCM').default;
const path = require('path');

describe('FCM', () => {
  it('can initialize', (done) => {
    const args = {
      firebaseServiceAccount: path.join(
        __dirname,
        '..',
        'spec',
        'support',
        'fakeServiceAccount.json',
      ),
    };
    const fcm = new FCM(args);
    expect(fcm).toBeDefined();
    done();
  });

  it('can use a raw FCM payload', (done) => {
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
    const timeStampISOStr = new Date(timeStamp).toISOString();

    const payload = FCM.generateFCMPayload(
      requestData,
      pushId,
      timeStamp,
      ['testToken'],
      'android',
    );

    // Up to the user to declare a payload compatible with the FCM v1 API
    // so not checking anythhttps://docs.parseplatform.org/rest/guide/#sending-optionsing else

    expect(payload.data.tokens).toEqual(['testToken']);
    expect(payload.time).toEqual(timeStampISOStr);
    expect(payload['push_id']).toEqual(pushId);
    done();
  });

  it('can slice devices', (done) => {
    // Mock devices
    var devices = [makeDevice(1), makeDevice(2), makeDevice(3), makeDevice(4)];

    var chunkDevices = FCM.sliceDevices(devices, 3);
    expect(chunkDevices).toEqual([
      [makeDevice(1), makeDevice(2), makeDevice(3)],
      [makeDevice(4)],
    ]);
    done();
  });

  describe('GCM payloads can be converted to compatible FCMv1 payloads', () => {
    it('can generate GCM Payload without expiration time', (done) => {
      // To maintain backwards compatibility with GCM payload format
      // See corresponding test with same test label in GCM.spec.js

      const requestData = {
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
      expect(fcmPayload.android.ttl).toEqual(undefined);
      expect(fcmPayload.android.notification).toEqual(requestData.notification);

      expect(payload.time).toEqual(timeStampISOStr);
      expect(payload['push_id']).toEqual(pushId);

      const dataFromUser = fcmPayload.android.data;
      expect(dataFromUser).toEqual(requestData.data);
      done();
    });

    it('can generate GCM Payload with valid expiration time', (done) => {
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

      expect(payload.time).toEqual(timeStampISOStr);
      expect(payload['push_id']).toEqual(pushId);

      const dataFromUser = fcmPayload.android.data;
      expect(dataFromUser).toEqual(requestData.data);
      done();
    });

    it('can generate GCM Payload with too early expiration time', (done) => {
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

      expect(payload.time).toEqual(timeStampISOStr);
      expect(payload['push_id']).toEqual(pushId);

      const dataFromUser = fcmPayload.android.data;
      expect(dataFromUser).toEqual(requestData.data);
      done();
    });

    it('can generate GCM Payload with too late expiration time', (done) => {
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

      expect(payload.time).toEqual(timeStampISOStr);
      expect(payload['push_id']).toEqual(pushId);

      const dataFromUser = fcmPayload.android.data;
      expect(dataFromUser).toEqual(requestData.data);
      done();
    });
  });

  // We do not need to explicitly set priority to 10 under headers as is done in APNS.js
  // FCM backend sets apns-priority to 10 and apns-expiration to 30 days by default if not set.
  //
  // We also do not need to pass APNS headers like expiration_time, collapse_id etc to FCM.generatePayload() as is done for APNS._generateNotification() for generating the payload.
  // APNS headers get set if present in the payload data.
  describe('APNS payloads can be converted to compatible FCMv1 payloads', () => {
    it('can generate APNS notification', (done) => {
      // To maintain backwards compatibility with APNS payload format
      // See corresponding test with same test label in APNS.spec.js

      let expirationTime = 1454571491354;
      let collapseId = 'collapseIdentifier';
      let pushType = 'alert';
      let priority = 5;

      let data = {
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
      const timeStampISOStr = new Date(timeStamp).toISOString();

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

      expect(payload.time).toEqual(timeStampISOStr);
      expect(payload['push_id']).toEqual(pushId);
      done();
    });

    it('sets push type to alert if not defined explicitly', (done) => {
      let data = {
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

      const pushId = 'pushId';
      const timeStamp = 1454538822113;
      const timeStampISOStr = new Date(timeStamp).toISOString();

      const payload = FCM.generateFCMPayload(
        data,
        pushId,
        timeStamp,
        ['tokenTest'],
        'apple',
      );
      const fcmPayload = payload.data;

      expect(fcmPayload.apns.headers['apns-push-type']).toEqual('alert');
      expect(payload.time).toEqual(timeStampISOStr);
      expect(payload['push_id']).toEqual(pushId);
      done();
    });

    it('can generate APNS notification from raw data', (done) => {
      let expirationTime = 1454571491354;
      let collapseId = 'collapseIdentifier';
      let pushType = 'background';
      let priority = 5;
      let data = {
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

      const pushId = 'pushId';
      const timeStamp = 1454538822113;
      const timeStampISOStr = new Date(timeStamp).toISOString();

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

      expect(payload.time).toEqual(timeStampISOStr);
      expect(payload['push_id']).toEqual(pushId);
      done();
    });

    it('can generate an APNS notification with headers in data', (done) => {
      // See 'can send APNS notification headers in data' in APNS.spec.js
      // Not mocking sends currently, only payload generation

      let expirationTime = 1454571491354;
      let collapseId = 'collapseIdentifier';
      let pushType = 'alert'; // or background

      let data = {
        expiration_time: expirationTime,
        data: {
          alert: 'alert',
          collapse_id: collapseId,
          push_type: pushType,
          priority: 6,
        },
      };

      const pushId = 'pushId';
      const timeStamp = 1454538822113;
      const timeStampISOStr = new Date(timeStamp).toISOString();

      const payload = FCM.generateFCMPayload(
        data,
        pushId,
        timeStamp,
        ['tokenTest'],
        'apple',
      );

      const fcmPayload = payload.data;

      // Not exactly the same as in APNS, think the APNS test case for this is wrong.
      // According to https://docs.parseplatform.org/rest/guide/#sending-options
      // This should be the alert message, and this is satisifed with a body key inside alert.
      expect(fcmPayload.apns.payload.aps.alert).toEqual({ body: 'alert' });
      expect(fcmPayload.apns.headers['apns-expiration']).toEqual(
        Math.round(expirationTime / 1000),
      );
      expect(fcmPayload.apns.headers['apns-collapse-id']).toEqual(collapseId);
      expect(fcmPayload.apns.headers['apns-push-type']).toEqual(pushType);
      expect(fcmPayload.apns.headers['apns-priority']).toEqual(6);

      expect(payload.time).toEqual(timeStampISOStr);
      expect(payload['push_id']).toEqual(pushId);
      done();
    });
  });

  function makeDevice(deviceToken) {
    return {
      deviceToken: deviceToken,
    };
  }
});
