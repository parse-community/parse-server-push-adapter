var ParsePushAdapter = require('../src/index').ParsePushAdapter;
var APNS = require('../src/APNS');
var GCM = require('../src/GCM');

describe('ParsePushAdapter', () => {
  it('can be initialized', (done) => {
    // Make mock config
    var pushConfig = {
      android: {
        senderId: 'senderId',
        apiKey: 'apiKey'
      },
      ios: [
        {
          cert: 'prodCert.pem',
          key: 'prodKey.pem',
          production: true,
          bundleId: 'bundleId'
        },
        {
          cert: 'devCert.pem',
          key: 'devKey.pem',
          production: false,
          bundleId: 'bundleIdAgain'
        }
      ]
    };

    var parsePushAdapter = new ParsePushAdapter(pushConfig);
    // Check ios
    var iosSender = parsePushAdapter.senderMap['ios'];
    expect(iosSender instanceof APNS).toBe(true);
    // Check android
    var androidSender = parsePushAdapter.senderMap['android'];
    expect(androidSender instanceof GCM).toBe(true);
    done();
  });

  it('can throw on initializing with unsupported push type', (done) => {
    // Make mock config
    var pushConfig = {
      win: {
        senderId: 'senderId',
        apiKey: 'apiKey'
      }
    };

    expect(function() {
      new ParsePushAdapter(pushConfig);
    }).toThrow();
    done();
  });

  it('can get valid push types', (done) => {
    var parsePushAdapter = new ParsePushAdapter();

    expect(parsePushAdapter.getValidPushTypes()).toEqual(['ios', 'osx', 'tvos', 'android', 'fcm']);
    done();
  });

  it('can classify installation', (done) => {
    // Mock installations
    var validPushTypes = ['ios', 'osx', 'tvos', 'android', 'fcm'];
    var installations = [
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
        deviceType: 'osx',
        deviceToken: 'osxToken'
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

    var deviceMap = ParsePushAdapter.classifyInstallations(installations, validPushTypes);
    expect(deviceMap['android']).toEqual([makeDevice('androidToken', 'android')]);
    expect(deviceMap['ios']).toEqual([makeDevice('iosToken', 'ios')]);
    expect(deviceMap['osx']).toEqual([makeDevice('osxToken', 'osx')]);
    expect(deviceMap['tvos']).toEqual([makeDevice('tvosToken', 'tvos')]);
    expect(deviceMap['win']).toBe(undefined);
    done();
  });


  it('can send push notifications', (done) => {
    var parsePushAdapter = new ParsePushAdapter();
    // Mock senders
    var androidSender = {
      send: jasmine.createSpy('send')
    };
    var iosSender = {
      send: jasmine.createSpy('send')
    };
    var osxSender = {
      send: jasmine.createSpy('send')
    }
    var senderMap = {
      osx: osxSender,
      ios: iosSender,
      android: androidSender
    };
    parsePushAdapter.senderMap = senderMap;
    // Mock installations
    var installations = [
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
        deviceType: 'win',
        deviceToken: 'winToken'
      },
      {
        deviceType: 'android',
        deviceToken: undefined
      }
    ];
    var data = {};

    parsePushAdapter.send(data, installations);
    // Check android sender
    expect(androidSender.send).toHaveBeenCalled();
    var args = androidSender.send.calls.first().args;
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
    done();
  });

  it('can send push notifications by pushType and failback by deviceType', (done) => {
    var parsePushAdapter = new ParsePushAdapter();
    // Mock senders
    var androidSender = {
      send: jasmine.createSpy('send')
    };
    var iosSender = {
      send: jasmine.createSpy('send')
    };
    var senderMap = {
      ios: iosSender,
      android: androidSender
    };
    parsePushAdapter.senderMap = senderMap;
    // Mock installations
    var installations = [
      {
        deviceType: 'android',
        deviceToken: 'androidToken'
      },
      {
        deviceType: 'android',
        pushType: 'gcm',
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
    var data = {};

    parsePushAdapter.send(data, installations);
    // Check android sender
    expect(androidSender.send).toHaveBeenCalled();
    var args = androidSender.send.calls.first().args;
    expect(args[0]).toEqual(data);
    expect(args[1]).toEqual([
      makeDevice('androidToken', 'android'),
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

  it('reports properly results', (done) => {
    var pushConfig = {
      android: {
        senderId: 'senderId',
        apiKey: 'apiKey'
      },
      ios: [
        {
          cert: 'cert.cer',
          key: 'key.pem',
          production: false,
          bundleId: 'iosbundleId'
        }
      ],
      osx: [
        {
          cert: 'cert.cer',
          key: 'key.pem',
          production: false,
          bundleId: 'osxbundleId'
        }
      ]
    };
    var installations = [
      {
        deviceType: 'android',
        deviceToken: 'androidToken'
      },
      {
        deviceType: 'ios',
        deviceToken: '0d72a1baa92a2febd9a254cbd6584f750c70b2350af5fc9052d1d12584b738e6',
        appIdentifier: 'invalidiosbundleId'
      },
      {
        deviceType: 'ios',
        deviceToken: 'ff3943ed0b2090c47e5d6f07d8f202a10427941d7897fda5a6b18c6d9fd07d48',
        appIdentifier: 'invalidiosbundleId'
      },
      {
        deviceType: 'osx',
        deviceToken: '5cda62a8d88eb48d9111a6c436f2e326a053eb0cd72dfc3a0893089342602235',
        appIdentifier: 'invalidosxbundleId'
      },
      {
        deviceType: 'tvos',
        deviceToken: '3e72a1baa92a2febd9a254cbd6584f750c70b2350af5fc9052d1d12584b738e6',
        appIdentifier: 'invalidiosbundleId' // ios and tvos share the same bundleid
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

    var parsePushAdapter = new ParsePushAdapter(pushConfig);
    parsePushAdapter.send({data: {alert: 'some'}}, installations).then((results) => {
      expect(Array.isArray(results)).toBe(true);

      // 2x iOS, 1x android, 1x osx, 1x tvos
      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(result.transmitted).toBe(false);
        expect(typeof result.device).toBe('object');
        expect(typeof result.device.deviceType).toBe('string');
        expect(typeof result.device.deviceToken).toBe('string');
      })
      done();
    }).catch((err) => {
      fail('Should not fail');
      done();
    })
  });

  function makeDevice(deviceToken, deviceType, appIdentifier) {
    return {
      deviceToken: deviceToken,
      deviceType: deviceType,
      appIdentifier: appIdentifier
    };
  }
});
