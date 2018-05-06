var FCM = require('../src/FCM').default;

function mockSender(fcm) {
  return spyOn(fcm.sender, 'send').and.callFake(function(message, options, timeout, cb) {
    const response = "projects/maps-demo-12345/messages/0:2525593087651740%115f88a9f9fd7ecd";
    process.nextTick(() => {
      cb(null, response);
    });
  });
}

describe('FCM', () => {
  it('can initialize', (done) => {
    var args = {
      projectId: '123',
      clientEmail: 'sdds@iam.com',
      databaseURL: 'https://XXXX-1234.firebaseio.com'
    };
    var fcm = new FCM(args);
    done();
  });

  it('can throw on initializing with invalid args', (done) => {
    var args = 123
    expect(function() {
      new FCM(args);
    }).toThrow();
    args = {
      projectId: '123',
      privateKey: 'abcd',
      clientEmail: 'sdds@iam.com'
    };
    expect(function() {
      new FCM(args);
    }).toThrow();
    args = undefined;
    expect(function() {
      new FCM(args);
    }).toThrow();
    done();
  });

  it('can generate FCM Payload without expiration time', (done) => {
    //Mock request data
    var requestData = {
      data: {
        'alert': 'alert'
      },
      notification: {
        'title': 'I am a title',
        'body': 'I am a body'
      }
    };
    var pushId = 'pushId';
    var timeStamp = 1454538822113;
    var timeStampISOStr = new Date(timeStamp).toISOString();

    var payload = FCM.generateFCMPayload(requestData, pushId, timeStamp);
    console.log("**" + payload.data);
    expect(payload.android.priority).toEqual('high');
    expect(payload.android.ttl).toEqual(undefined);

    // Firebase NodeJS lib requires only strings for data, so JSON parse it here.
    var dataFromPayload = JSON.parse(payload.data);
    expect(dataFromPayload.time).toEqual(timeStampISOStr);
    expect(payload.notification).toEqual(requestData.notification);
    expect(dataFromPayload['push_id']).toEqual(pushId);
    var dataFromUser = dataFromPayload.data;
    expect(dataFromUser).toEqual(requestData.data);
    done();
  });

  it('can generate FCM Payload with valid expiration time', (done) => {
    //Mock request data
    var requestData = {
      data: {
        'alert': 'alert'
      },
      notification: {
        'title': 'I am a title',
        'body': 'I am a body'
      }
    };
    var pushId = 'pushId';
    var timeStamp = 1454538822113;
    var timeStampISOStr = new Date(timeStamp).toISOString();
    var expirationTime = 1454538922113

    var payload = FCM.generateFCMPayload(requestData, pushId, timeStamp, expirationTime);

    expect(payload.android.priority).toEqual('high');
    expect(payload.android.ttl).toEqual(Math.floor((expirationTime - timeStamp) / 1000) + "s");
    var dataFromPayload = JSON.parse(payload.data);
    expect(dataFromPayload.time).toEqual(timeStampISOStr);
    expect(payload.notification).toEqual(requestData.notification);
    expect(dataFromPayload['push_id']).toEqual(pushId);
    var dataFromUser = dataFromPayload.data;
    expect(dataFromUser).toEqual(requestData.data);
    done();
  });

  it('can generate FCM Payload with too early expiration time', (done) => {
    //Mock request data
    var requestData = {
      data: {
        'alert': 'alert'
      },
      notification: {
        'title': 'I am a title',
        'body': 'I am a body'
      }
    };
    var pushId = 'pushId';
    var timeStamp = 1454538822113;
    var timeStampISOStr = new Date(timeStamp).toISOString();
    var expirationTime = 1454538822112;

    var payload = FCM.generateFCMPayload(requestData, pushId, timeStamp, expirationTime);

    expect(payload.android.priority).toEqual('high');
    expect(payload.android.ttl).toEqual("0s");
    var dataFromPayload = JSON.parse(payload.data);
    expect(dataFromPayload.time).toEqual(timeStampISOStr);
    expect(payload.notification).toEqual(requestData.notification);

    expect(dataFromPayload['push_id']).toEqual(pushId);
    var dataFromUser = dataFromPayload.data;
    expect(dataFromUser).toEqual(requestData.data);
    done();
  });

  it('can generate FCM Payload with too late expiration time', (done) => {
    //Mock request data
    var requestData = {
      data: {
        'alert': 'alert'
      },
      notification: {
        'title': 'I am a title',
        'body': 'I am a body'
      }
    };
    var pushId = 'pushId';
    var timeStamp = 1454538822113;
    var timeStampISOStr = new Date(timeStamp).toISOString();
    var expirationTime = 2454538822113;

    var payload = FCM.generateFCMPayload(requestData, pushId, timeStamp, expirationTime);

    expect(payload.android.priority).toEqual('high');
    // Four week in second
    expect(payload.android.ttl).toEqual(4 * 7 * 24 * 60 * 60 + "s");
    var dataFromPayload = JSON.parse(payload.data);
    expect(dataFromPayload.time).toEqual(timeStampISOStr);
    expect(payload.notification).toEqual(requestData.notification);
    expect(dataFromPayload['push_id']).toEqual(pushId);
    var dataFromUser = dataFromPayload.data;
    expect(dataFromUser).toEqual(requestData.data);
    done();
  });

  it('can send FCM request', (done) => {
    var fcm = new FCM({
      apiKey: 'apiKey'
    });
    // Mock FCM sender
    var sender = {
      send: jasmine.createSpy('send')
    };
    FCM.sender = sender;
    // Mock data
    var expirationTime = 2454538822113;
    var data = {
      'expiration_time': expirationTime,
      'data': {
        'alert': 'alert'
      }
    }
    // Mock devices
    var devices = [
      {
        deviceToken: 'token'
      }
    ];

    FCM.send(data, devices);
    expect(sender.send).toHaveBeenCalled();
    var args = sender.send.calls.first().args;
    // It is too hard to verify message of FCM library, we just verify tokens and retry times
    expect(args[1].registrationTokens).toEqual(['token']);
    expect(args[2]).toEqual(5);
    done();
  });

  it('can send FCM request', (done) => {
    var fcm = new FCM({
      apiKey: 'apiKey'
    });
    // Mock data
    var expirationTime = 2454538822113;
    var data = {
      'expiration_time': expirationTime,
      'data': {
        'alert': 'alert'
      }
    }
    // Mock devices
    var devices = [
      {
        deviceToken: 'token'
      },
      {
        deviceToken: 'token2'
      },
      {
        deviceToken: 'token3'
      },
      {
        deviceToken: 'token4'
      }
    ];
    mockSender(FCM);
    FCM.send(data, devices).then((response) => {
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toEqual(devices.length);
      expect(response.length).toEqual(4);
      response.forEach((res, index) => {
        expect(res.transmitted).toEqual(true);
        expect(res.device).toEqual(devices[index]);
      })
      done();
    })
  });

  it('can send FCM request with slices', (done) => {
    let originalMax = FCM.FCMRegistrationTokensMax;
    FCM.FCMRegistrationTokensMax = 2;
    var fcm = new FCM({
      apiKey: 'apiKey'
    });
    // Mock data
    var expirationTime = 2454538822113;
    var data = {
      'expiration_time': expirationTime,
      'data': {
        'alert': 'alert'
      }
    }
    // Mock devices
    var devices = [
      {
        deviceToken: 'token'
      },
      {
        deviceToken: 'token2'
      },
      {
        deviceToken: 'token3'
      },
      {
        deviceToken: 'token4'
      },
      {
        deviceToken: 'token5'
      },
      {
        deviceToken: 'token6'
      },
      {
        deviceToken: 'token7'
      },
      {
        deviceToken: 'token8'
      }
    ];
    spyOn(FCM, 'send').and.callThrough();
    FCM.send(data, devices).then((response) => {
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toEqual(devices.length);
      expect(response.length).toEqual(8);
      response.forEach((res, index) => {
        expect(res.transmitted).toEqual(false);
        expect(res.device).toEqual(devices[index]);
      });
      // 1 original call
      // 4 calls (1 per slice of 2)
      expect(FCM.send.calls.count()).toBe(1+4);
      FCM.FCMRegistrationTokensMax = originalMax;
      done();
    })
  });

  it('can slice devices', (done) => {
    // Mock devices
    var devices = [makeDevice(1), makeDevice(2), makeDevice(3), makeDevice(4)];

    var chunkDevices = FCM.sliceDevices(devices, 3);
    expect(chunkDevices).toEqual([
      [makeDevice(1), makeDevice(2), makeDevice(3)],
      [makeDevice(4)]
    ]);
    done();
  });

  function makeDevice(deviceToken) {
    return {
      deviceToken: deviceToken
    };
  }
});
