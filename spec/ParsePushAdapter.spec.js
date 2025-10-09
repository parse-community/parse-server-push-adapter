import { join } from 'path';
import log from 'npmlog';
import apn from '@parse/node-apn';
import ParsePushAdapterPackage, { ParsePushAdapter as _ParsePushAdapter, FCM as _FCM, APNS as _APNS, WEB as _WEB, EXPO as _EXPO, utils } from '../src/index.js';
const ParsePushAdapter = _ParsePushAdapter;
import { randomString } from '../src/PushAdapterUtils.js';
import MockAPNProvider from './MockAPNProvider.js';
import APNS from '../src/APNS.js';
import WEB from '../src/WEB.js';
import FCM from '../src/FCM.js';
import EXPO from '../src/EXPO.js';

describe('ParsePushAdapter', () => {

  beforeEach(() => {
    spyOn(apn, 'Provider').and.callFake(MockAPNProvider);
  });

  it('properly export the module', () => {
    expect(typeof ParsePushAdapterPackage).toBe('function');
    expect(typeof _ParsePushAdapter).toBe('function');
    expect(typeof _APNS).toBe('function');
    expect(typeof _FCM).toBe('function');
    expect(typeof _WEB).toBe('function');
    expect(typeof _EXPO).toBe('function');
    expect(typeof utils).toBe('object');
  });

  it('can be initialized', (done) => {
    // Make mock config
    const pushConfig = {
      web: {
        vapidDetails: {
          subject: 'test@example.com',
          publicKey: 'publicKey',
          privateKey: 'privateKey',
        },
      },
      android: {
        firebaseServiceAccount: join(__dirname, '..', 'spec', 'support', 'fakeServiceAccount.json')
      },
      expo: {
        apiKey: 'key'
      },
      ios: [
        {
          cert: new Buffer('testCert'),
          key: new Buffer('testKey'),
          production: true,
          topic: 'topic'
        },
        {
          cert: new Buffer('testCert'),
          key: new Buffer('testKey'),
          production: false,
          topic: 'topicAgain'
        }
      ]
    };

    const parsePushAdapter = new ParsePushAdapter(pushConfig);
    // Check ios
    const iosSender = parsePushAdapter.senderMap['ios'];
    expect(iosSender instanceof APNS).toBe(true);
    // Check android
    const androidSender = parsePushAdapter.senderMap['android'];
    expect(androidSender instanceof FCM).toBe(true);
    // Check web
    const webSender = parsePushAdapter.senderMap['web'];
    expect(webSender instanceof WEB).toBe(true);
    // Check expo
    const expoSender = parsePushAdapter.senderMap['expo'];
    expect(expoSender instanceof EXPO).toBe(true);
    done();
  });

  it("can be initialized with FCM for android and ios", (done) => {
    const pushConfig = {
      android: {
        firebaseServiceAccount: join(__dirname, '..', 'spec', 'support', 'fakeServiceAccount.json')
      },
      ios: {
        firebaseServiceAccount: join(__dirname, '..', 'spec', 'support', 'fakeServiceAccount.json')
      },
    };

    const parsePushAdapter = new ParsePushAdapter(pushConfig);
    const iosSender = parsePushAdapter.senderMap["ios"];
    expect(iosSender instanceof FCM).toBe(true);
    const androidSender = parsePushAdapter.senderMap["android"];
    expect(androidSender instanceof FCM).toBe(true);
    done();
  });

  it("can be initialized with FCM for android and APNS for apple", (done) => {
    const pushConfig = {
      android: {
        firebaseServiceAccount: join(__dirname, '..', 'spec', 'support', 'fakeServiceAccount.json')
      },
      ios: [
        {
          cert: new Buffer("testCert"),
          key: new Buffer("testKey"),
          production: true,
          topic: "topic",
        },
        {
          cert: new Buffer("testCert"),
          key: new Buffer("testKey"),
          production: false,
          topic: "topicAgain",
        },
      ],
    };

    const parsePushAdapter = new ParsePushAdapter(pushConfig);
    const iosSender = parsePushAdapter.senderMap["ios"];
    expect(iosSender instanceof APNS).toBe(true);
    const androidSender = parsePushAdapter.senderMap["android"];
    expect(androidSender instanceof FCM).toBe(true);
    done();
  });

  it("can be initialized with FCM for apple and FCM for android", (done) => {
    const pushConfig = {
      android: {
        firebaseServiceAccount: join(__dirname, '..', 'spec', 'support', 'fakeServiceAccount.json')
      },
      ios: {
        firebaseServiceAccount: join(__dirname, '..', 'spec', 'support', 'fakeServiceAccount.json')
      },
    };

    const parsePushAdapter = new ParsePushAdapter(pushConfig);
    const iosSender = parsePushAdapter.senderMap["ios"];
    expect(iosSender instanceof FCM).toBe(true);
    const androidSender = parsePushAdapter.senderMap["android"];
    expect(androidSender instanceof FCM).toBe(true);
    done();
  });

  it('can throw on initializing with unsupported push type', (done) => {
    // Make mock config
    const pushConfig = {
      win: {
        senderId: 'senderId',
        apiKey: 'apiKey'
      }
    };

    expect(function () {
      new ParsePushAdapter(pushConfig);
    }).toThrow();
    done();
  });

  it('throws error when Android/FCM push is initialized without firebaseServiceAccount', (done) => {
    const pushConfig = {
      android: {
        // Missing firebaseServiceAccount
        apiKey: 'someKey'
      }
    };

    expect(function () {
      new ParsePushAdapter(pushConfig);
    }).toThrowError('Firebase service account is required for Android/FCM push notifications');
    done();
  });

  it('throws error when FCM push is initialized without firebaseServiceAccount', (done) => {
    const pushConfig = {
      fcm: {
        // Missing firebaseServiceAccount
        apiKey: 'someKey'
      }
    };

    expect(function () {
      new ParsePushAdapter(pushConfig);
    }).toThrowError('Firebase service account is required for Android/FCM push notifications');
    done();
  });

  it('can get valid push types', (done) => {
    const parsePushAdapter = new ParsePushAdapter();

    expect(parsePushAdapter.getValidPushTypes()).toEqual(['ios', 'osx', 'tvos', 'watchos', 'android', 'fcm', 'web', 'expo']);
    done();
  });

  it('can classify installation', (done) => {
    // Mock installations
    const validPushTypes = ['ios', 'osx', 'tvos', 'watchos', 'android', 'fcm', 'web', 'expo'];
    const installations = [
      {
        deviceType: 'android',
        deviceToken: 'androidToken'
      },
      {
        deviceType: 'ios',
        deviceToken: 'iosToken'
      },
      {
        deviceType: 'tvos',
        deviceToken: 'tvosToken'
      },
      {
        deviceType: 'watchos',
        deviceToken: 'watchosToken'
      },
      {
        deviceType: 'osx',
        deviceToken: 'osxToken'
      },
      {
        deviceType: 'win',
        deviceToken: 'winToken'
      },
      {
        deviceType: 'web',
        deviceToken: 'webToken'
      },
      {
        deviceType: 'android',
        deviceToken: undefined
      },
      {
        deviceType: 'ios',
        pushType: 'expo',
        deviceToken: 'expoToken'
      }
    ];

    const deviceMap = ParsePushAdapter.classifyInstallations(installations, validPushTypes);
    expect(deviceMap['android']).toEqual([makeDevice('androidToken', 'android')]);
    expect(deviceMap['ios']).toEqual([makeDevice('iosToken', 'ios')]);
    expect(deviceMap['osx']).toEqual([makeDevice('osxToken', 'osx')]);
    expect(deviceMap['tvos']).toEqual([makeDevice('tvosToken', 'tvos')]);
    expect(deviceMap['watchos']).toEqual([makeDevice('watchosToken', 'watchos')]);
    expect(deviceMap['web']).toEqual([makeDevice('webToken', 'web')]);
    expect(deviceMap['win']).toBe(undefined);
    expect(deviceMap['expo']).toEqual([makeDevice('expoToken', 'ios')]);
    done();
  });


  it('can send push notifications', (done) => {
    const parsePushAdapter = new ParsePushAdapter();
    // Mock senders
    const androidSender = {
      send: jasmine.createSpy('send')
    };
    const iosSender = {
      send: jasmine.createSpy('send')
    };
    const osxSender = {
      send: jasmine.createSpy('send')
    }
    const webSender = {
      send: jasmine.createSpy('send')
    }
    const expoSender = {
      send: jasmine.createSpy('send')
    }
    const senderMap = {
      osx: osxSender,
      ios: iosSender,
      android: androidSender,
      web: webSender,
      expo: expoSender,
    };
    parsePushAdapter.senderMap = senderMap;
    // Mock installations
    const installations = [
      {
        deviceType: 'android',
        deviceToken: 'androidToken'
      },
      {
        deviceType: 'ios',
        deviceToken: 'iosToken'
      },
      {
        deviceType: 'osx',
        deviceToken: 'osxToken'
      },
      {
        deviceType: 'web',
        deviceToken: 'webToken'
      },
      {
        deviceType: 'win',
        deviceToken: 'winToken'
      },
      {
        deviceType: 'android',
        deviceToken: undefined
      },
      {
        deviceType: 'ios',
        pushType: 'expo',
        deviceToken: 'expoToken'
      }
    ];
    const data = {};

    parsePushAdapter.send(data, installations);
    // Check android sender
    expect(androidSender.send).toHaveBeenCalled();
    let args = androidSender.send.calls.first().args;
    expect(args[0]).toEqual(data);
    expect(args[1]).toEqual([
      makeDevice('androidToken', 'android')
    ]);
    // Check ios sender
    expect(iosSender.send).toHaveBeenCalled();
    args = iosSender.send.calls.first().args;
    expect(args[0]).toEqual(data);
    expect(args[1]).toEqual([
      makeDevice('iosToken', 'ios'),
    ]);
    // Check osx sender
    expect(osxSender.send).toHaveBeenCalled();
    args = osxSender.send.calls.first().args;
    expect(args[0]).toEqual(data);
    expect(args[1]).toEqual([
      makeDevice('osxToken', 'osx')
    ]);
    // Check web sender
    expect(webSender.send).toHaveBeenCalled();
    args = webSender.send.calls.first().args;
    expect(args[0]).toEqual(data);
    expect(args[1]).toEqual([
      makeDevice('webToken', 'web')
    ]);
    // Check expo sender
    expect(expoSender.send).toHaveBeenCalled();
    args = expoSender.send.calls.first().args;
    expect(args[0]).toEqual(data);
    expect(args[1]).toEqual([
      makeDevice('expoToken', 'ios')
    ]);
    done();
  });

  it('can send push notifications by pushType and failback by deviceType', (done) => {
    const parsePushAdapter = new ParsePushAdapter();
    // Mock senders
    const androidSender = {
      send: jasmine.createSpy('send')
    };
    const iosSender = {
      send: jasmine.createSpy('send')
    };
    const senderMap = {
      ios: iosSender,
      android: androidSender
    };
    parsePushAdapter.senderMap = senderMap;
    // Mock installations
    const installations = [
      {
        deviceType: 'android',
        deviceToken: 'androidToken'
      },
      {
        deviceType: 'android',
        pushType: 'ppns',
        deviceToken: 'androidToken'
      },
      {
        deviceType: 'android',
        pushType: 'none',
        deviceToken: 'androidToken'
      },
      {
        deviceType: 'ios',
        deviceToken: 'iosToken'
      },
      {
        deviceType: 'ios',
        pushType: 'ios',
        deviceToken: 'iosToken'
      },
      {
        deviceType: 'win',
        deviceToken: 'winToken'
      },
      {
        deviceType: 'win',
        deviceToken: 'winToken'
      },
      {
        deviceType: 'android',
        deviceToken: undefined
      }
    ];
    const data = {};

    parsePushAdapter.send(data, installations);
    // Check android sender
    expect(androidSender.send).toHaveBeenCalled();
    let args = androidSender.send.calls.first().args;
    expect(args[0]).toEqual(data);
    expect(args[1]).toEqual([
      makeDevice('androidToken', 'android'),
      makeDevice('androidToken', 'android'),
      makeDevice('androidToken', 'android')
    ]);
    // Check ios sender
    expect(iosSender.send).toHaveBeenCalled();
    args = iosSender.send.calls.first().args;
    expect(args[0]).toEqual(data);
    expect(args[1]).toEqual([
      makeDevice('iosToken', 'ios'),
      makeDevice('iosToken', 'ios')
    ]);
    done();
  });

  it('reports proper results', (done) => {
    spyOn(log, 'error').and.callFake(() => { });
    const pushConfig = {
      web: {
        vapidDetails: {
          subject: 'test@example.com',
          publicKey: 'publicKey',
          privateKey: 'privateKey',
        },
      },
      expo: {

      },
      android: {
        firebaseServiceAccount: join(__dirname, '..', 'spec', 'support', 'fakeServiceAccount.json')
      },
      ios: [
        {
          cert: new Buffer('testCert'),
          key: new Buffer('testKey'),
          production: false,
          topic: 'iosbundleId'
        }
      ],
      osx: [
        {
          cert: 'cert.cer',
          key: 'key.pem',
          production: false,
          topic: 'osxbundleId'
        }
      ]
    };
    const installations = [
      {
        deviceType: 'android',
        deviceToken: 'androidToken'
      },
      {
        deviceType: 'ios',
        deviceToken: '0d72a1baa92a2febd9a254cbd6584f750c70b2350af5fc9052d1d12584b738e6',
        appIdentifier: 'iosbundleId'
      },
      {
        deviceType: 'ios',
        deviceToken: 'ff3943ed0b2090c47e5d6f07d8f202a10427941d7897fda5a6b18c6d9fd07d48',
        appIdentifier: 'iosbundleId'
      },
      {
        deviceType: 'osx',
        deviceToken: '5cda62a8d88eb48d9111a6c436f2e326a053eb0cd72dfc3a0893089342602235',
        appIdentifier: 'osxbundleId'
      },
      {
        deviceType: 'tvos',
        deviceToken: '3e72a1baa92a2febd9a254cbd6584f750c70b2350af5fc9052d1d12584b738e6',
        appIdentifier: 'iosbundleId' // ios and tvos share the same bundleid
      },
      {
        deviceType: 'watchos',
        deviceToken: '8f72a1baa92a2febd9a254cbd6584f750c70b2350af5fc9052d1d12584b738e6',
        appIdentifier: 'iosbundleId' // ios and watchos share the same bundleid
      },
      {
        deviceType: 'web',
        deviceToken: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/123' }),
      },
      {
        deviceType: 'win',
        deviceToken: 'winToken'
      },
      {
        deviceType: 'android',
        deviceToken: undefined
      },
      {
        deviceType: 'android',
        pushType: 'expo',
        deviceToken: 'expoToken'
      }
    ];

    const parsePushAdapter = new ParsePushAdapter(pushConfig);
    parsePushAdapter.send({ data: { alert: 'some' } }, installations).then((results) => {
      expect(Array.isArray(results)).toBe(true);

      // 2x iOS, 1x android, 1x osx, 1x tvos, 1x watchos, 1x web, 1x expo
      expect(results.length).toBe(8);
      results.forEach((result) => {
        expect(typeof result.device).toBe('object');
        if (!result.device) {
          fail('result should have device');
          return;
        }
        const device = result.device;
        if (device.pushType) {
          expect(typeof device.pushType).toBe('string');
        }
        expect(typeof device.deviceType).toBe('string');
        expect(typeof device.deviceToken).toBe('string');
        if (['ios', 'osx', 'web'].includes(device.deviceType)) {
          expect(result.transmitted).toBe(true);
        } else {
          expect(result.transmitted).toBe(false);
        }
      })
      done();
    }).catch(() => {
      fail('Should not fail');
      done();
    })
  });

  it('reports properly failures when all transmissions have failed', (done) => {
    spyOn(log, 'error').and.callFake(() => { });
    spyOn(log, 'warn').and.callFake(() => { });
    const pushConfig = {
      ios: [
        {
          cert: 'cert.cer',
          key: 'key.pem',
          production: false,
          shouldFailTransmissions: true,
          bundleId: 'iosbundleId'
        }
      ]
    };
    const installations = [
      {
        deviceType: 'ios',
        deviceToken: '0d72a1baa92a2febd9a254cbd6584f750c70b2350af5fc9052d1d12584b738e6',
        appIdentifier: 'iosbundleId'
      }
    ];

    const parsePushAdapter = new ParsePushAdapter(pushConfig);
    parsePushAdapter.send({ data: { alert: 'some' } }, installations).then((results) => {
      expect(Array.isArray(results)).toBe(true);

      // 2x iOS, 1x android, 1x osx, 1x tvos, 1x watchos
      expect(results.length).toBe(1);
      const result = results[0];
      expect(typeof result.device).toBe('object');
      if (!result.device) {
        fail('result should have device');
        return;
      }
      const device = result.device;
      expect(typeof device.deviceType).toBe('string');
      expect(typeof device.deviceToken).toBe('string');
      expect(result.transmitted).toBe(false);
      expect(typeof result.response.error).toBe('string');
      done();
    }).catch(() => {
      fail('Should not fail');
      done();
    })
  });

  // Xited till we can retry on other connections
  it('reports properly select connection', (done) => {
    spyOn(log, 'warn').and.callFake(() => { });
    const pushConfig = {
      ios: [
        {
          cert: 'cert.cer',
          key: 'key.pem',
          production: false,
          shouldFailTransmissions: true,
          bundleId: 'iosbundleId'
        },
        {
          cert: 'cert.cer',
          key: 'key.pem',
          production: false,
          bundleId: 'iosbundleId'
        }
      ]
    };
    const installations = [
      {
        deviceType: 'ios',
        deviceToken: '0d72a1baa92a2febd9a254cbd6584f750c70b2350af5fc9052d1d12584b738e6',
        appIdentifier: 'iosbundleId'
      }
    ];

    const parsePushAdapter = new ParsePushAdapter(pushConfig);
    parsePushAdapter.send({ data: { alert: 'some' } }, installations).then((results) => {
      expect(Array.isArray(results)).toBe(true);

      // 1x iOS
      expect(results.length).toBe(1);
      const result = results[0];
      expect(typeof result.device).toBe('object');
      if (!result.device) {
        fail('result should have device');
        return;
      }
      const device = result.device;
      expect(typeof device.deviceType).toBe('string');
      expect(typeof device.deviceToken).toBe('string');
      expect(result.transmitted).toBe(true);
      done();
    }).catch(() => {
      fail('Should not fail');
      done();
    })
  });

  it('properly marks not transmitter when sender is missing', (done) => {
    const pushConfig = {
      android: {
        firebaseServiceAccount: join(__dirname, '..', 'spec', 'support', 'fakeServiceAccount.json')
      }
    };
    const installations = [{
      deviceType: 'ios',
      deviceToken: '0d72a1baa92a2febd9a254cbd6584f750c70b2350af5fc9052d1d12584b738e6',
      appIdentifier: 'invalidiosbundleId'
    },
    {
      deviceType: 'ios',
      deviceToken: 'ff3943ed0b2090c47e5d6f07d8f202a10427941d7897fda5a6b18c6d9fd07d48',
      appIdentifier: 'invalidiosbundleId'
    }]
    const parsePushAdapter = new ParsePushAdapter(pushConfig);
    parsePushAdapter.send({ data: { alert: 'some' } }, installations).then((results) => {
      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.transmitted).toBe(false);
        expect(typeof result.device).toBe('object');
        expect(typeof result.device.deviceType).toBe('string');
        expect(typeof result.device.deviceToken).toBe('string');
        expect(result.response.error.indexOf('Can not find sender for push type ios, ')).toBe(0);
      });
      done();
    });
  });

  it('random string throws with size <=0', () => {
    expect(() => randomString(0)).toThrow();
  });

  function makeDevice(deviceToken, deviceType, appIdentifier) {
    return {
      deviceToken: deviceToken,
      deviceType: deviceType,
      appIdentifier: appIdentifier
    };
  }
});
