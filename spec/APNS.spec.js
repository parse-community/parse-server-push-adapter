const Parse = require('parse/node');
const APNS = require('../src/APNS').default;
const MockAPNProvider = require('./MockAPNProvider');

describe('APNS', () => {

  it('can initialize with cert', (done) => {
    let args = {
      cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
      key: new Buffer('testKey'),
      production: true,
      topic: 'topic'
    };
    let apns = new APNS(args);

    expect(apns.providers.length).toBe(1);
    let apnsProvider = apns.providers[0];
    expect(apnsProvider.index).toBe(0);
    expect(apnsProvider.topic).toBe(args.topic);
    // TODO: Remove this checking onec we inject APNS
    let prodApnsOptions = apnsProvider.client.config;
    expect(prodApnsOptions.cert).toBe(args.cert);
    expect(prodApnsOptions.key).toBe(args.key);
    expect(prodApnsOptions.production).toBe(args.production);
    done();
  });

  it('fails to initialize with bad data', (done) => {
    try {
      new APNS("args");
    } catch(e) {
      expect(e.code).toBe(Parse.Error.PUSH_MISCONFIGURED);
      done();
      return;
    }
    fail('should not be reached');
  });

  it('fails to initialize with no options', (done) => {
    try {
      new APNS();
    } catch(e) {
      expect(e.code).toBe(Parse.Error.PUSH_MISCONFIGURED);
      done();
      return;
    }
    fail('should not be reached');
  });

  it('fails to initialize without a bundleID', (done) => {
    expect(() => {
      new APNS({
        key: new Buffer('key'),
        production: true,
        bundle: 'hello'
      });
    }).toThrow();

    expect(() => {
      new APNS({
        cert: 'pfx',
        production: true,
        bundle: 'hello'
      });
    }).toThrow();

    expect(() => {
      new APNS({
        pfx: new Buffer(''),
        production: true,
        bundle: 'hello'
      });
    }).toThrow();
    done();
  });

  it('can initialize with multiple certs', (done) => {
    var args = [
      {
        cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
        key: new Buffer('testKey'),
        production: false,
        bundleId: 'bundleId'
      },
      {
        cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
        key: new Buffer('testKey'),
        production: true,
        bundleId: 'bundleIdAgain'
      }
    ]

    var apns = new APNS(args);
    expect(apns.providers.length).toBe(2);
    var devApnsConnection = apns.providers[1];
    expect(devApnsConnection.index).toBe(1);
    var devApnsOptions = devApnsConnection.client.config;
    expect(devApnsOptions.cert).toBe(args[0].cert);
    expect(devApnsOptions.key).toBe(args[0].key);
    expect(devApnsOptions.production).toBe(args[0].production);
    expect(devApnsOptions.bundleId).toBe(args[0].bundleId);
    expect(devApnsOptions.topic).toBe(args[0].bundleId);
    expect(devApnsConnection.topic).toBe(args[0].bundleId);

    var prodApnsConnection = apns.providers[0];
    expect(prodApnsConnection.index).toBe(0);

    // TODO: Remove this checking onec we inject APNS
    var prodApnsOptions = prodApnsConnection.client.config;
    expect(prodApnsOptions.cert).toBe(args[1].cert);
    expect(prodApnsOptions.key).toBe(args[1].key);
    expect(prodApnsOptions.production).toBe(args[1].production);
    expect(prodApnsOptions.bundleId).toBe(args[1].bundleId);
    expect(prodApnsOptions.topic).toBe(args[1].bundleId);
    expect(prodApnsConnection.topic).toBe(args[1].bundleId);
    done();
  });

  it('can initialize with multiple certs', (done) => {
    let args = [
      {
        cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
        key: new Buffer('testKey'),
        production: false,
        topic: 'topic'
      },
      {
        cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
        key: new Buffer('testKey'),
        production: true,
        topic: 'topicAgain'
      }
    ];

    let apns = new APNS(args);

    expect(apns.providers.length).toBe(2);
    let devApnsProvider = apns.providers[1];
    expect(devApnsProvider.index).toBe(1);
    expect(devApnsProvider.topic).toBe(args[0].topic);

    let devApnsOptions = devApnsProvider.client.config;
    expect(devApnsOptions.cert).toBe(args[0].cert);
    expect(devApnsOptions.key).toBe(args[0].key);
    expect(devApnsOptions.production).toBe(args[0].production);

    let prodApnsProvider = apns.providers[0];
    expect(prodApnsProvider.index).toBe(0);
    expect(prodApnsProvider.topic).toBe(args[1].topic);

    // TODO: Remove this checking onec we inject APNS
    let prodApnsOptions = prodApnsProvider.client.config;
    expect(prodApnsOptions.cert).toBe(args[1].cert);
    expect(prodApnsOptions.key).toBe(args[1].key);
    expect(prodApnsOptions.production).toBe(args[1].production);
    done();
  });

  it('sets priority to 10 if not set explicitly', (done) => {
    let data = {
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
    let notification = APNS._generateNotification(data, { });
    expect(notification.priority).toEqual(10);
    done();
  });

  it('can generate APNS notification', (done) => {
    //Mock request data
    let data = {
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
    let expirationTime = 1454571491354;
    let collapseId = "collapseIdentifier";

    let pushType = "alert";
    let priority = 5;
    let notification = APNS._generateNotification(data, { expirationTime: expirationTime, collapseId: collapseId, pushType: pushType, priority: priority });

    expect(notification.aps.alert).toEqual({ body: 'alert', title: 'title' });
    expect(notification.aps.badge).toEqual(data.badge);
    expect(notification.aps.sound).toEqual(data.sound);
    expect(notification.aps['content-available']).toEqual(1);
    expect(notification.aps['mutable-content']).toEqual(1);
    expect(notification.aps['target-content-id']).toEqual('window1');
    expect(notification.aps['interruption-level']).toEqual('passive');
    expect(notification.aps.category).toEqual(data.category);
    expect(notification.aps['thread-id']).toEqual(data.threadId);
    expect(notification.payload).toEqual({
      'key': 'value',
      'keyAgain': 'valueAgain'
    });
    expect(notification.expiry).toEqual(Math.round(expirationTime / 1000));
    expect(notification.collapseId).toEqual(collapseId);
    expect(notification.pushType).toEqual(pushType);
    expect(notification.priority).toEqual(priority);
    done();
  });

  it('sets push type to alert if not defined explicitly', (done) => {
    //Mock request data
    let data = {
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
    let expirationTime = 1454571491354;
    let collapseId = "collapseIdentifier";

    let notification = APNS._generateNotification(data, { expirationTime: expirationTime, collapseId: collapseId });

    expect(notification.pushType).toEqual('alert');
    done();
  });

  it('can generate APNS notification from raw data', (done) => {
      //Mock request data
      let data = {
        'aps': {
          'alert': {
            "loc-key" : "GAME_PLAY_REQUEST_FORMAT",
            "loc-args" : [ "Jenna", "Frank"]
          },
          'badge': 100,
          'sound': 'test',
          'thread-id': 'a-thread-id'
        },
        'key': 'value',
        'keyAgain': 'valueAgain'
      };
      let expirationTime = 1454571491354;
      let collapseId = "collapseIdentifier";
      let pushType = "background";
      let priority = 5;

      let notification = APNS._generateNotification(data, { expirationTime: expirationTime, collapseId: collapseId, pushType: pushType, priority: priority });

      expect(notification.expiry).toEqual(Math.round(expirationTime / 1000));
      expect(notification.collapseId).toEqual(collapseId);
      expect(notification.pushType).toEqual(pushType);
      expect(notification.priority).toEqual(priority);

      let stringifiedJSON = notification.compile();
      let jsonObject = JSON.parse(stringifiedJSON);

      expect(jsonObject.aps.alert).toEqual({ "loc-key" : "GAME_PLAY_REQUEST_FORMAT", "loc-args" : [ "Jenna", "Frank"] });
      expect(jsonObject.aps.badge).toEqual(100);
      expect(jsonObject.aps.sound).toEqual('test');
      expect(jsonObject.aps['thread-id']).toEqual('a-thread-id');
      expect(jsonObject.key).toEqual('value');
      expect(jsonObject.keyAgain).toEqual('valueAgain');
      done();
    });

  it('can choose providers for device with valid appIdentifier', (done) => {
    let appIdentifier = 'topic';
    // Mock providers
    let providers = [
      {
        topic: appIdentifier
      },
      {
        topic: 'topicAgain'
      }
    ];

    let qualifiedProviders = APNS.prototype._chooseProviders.call({providers: providers}, appIdentifier);
    expect(qualifiedProviders).toEqual([{
      topic: 'topic'
    }]);
    done();
  });

  it('can choose providers for device with invalid appIdentifier', (done) => {
    let appIdentifier = 'invalid';
    // Mock providers
    let providers = [
      {
        topic: 'bundleId'
      },
      {
        topic: 'bundleIdAgain'
      }
    ];

    let qualifiedProviders = APNS.prototype._chooseProviders.call({providers: providers}, appIdentifier);
    expect(qualifiedProviders).toEqual([]);
    done();
  });

  it('does log on invalid APNS notification', async () => {
    const args = {
      cert: new Buffer('testCert'),
      key: new Buffer('testKey'),
      production: true,
      topic: 'topic'
    };
    const log = require('npmlog');
    const spy = spyOn(log, 'warn');
    const apns = new APNS(args);
    apns.send();
    expect(spy).toHaveBeenCalled();
  });

  it('can send APNS notification', (done) => {
    let args = {
      cert: new Buffer('testCert'),
      key: new Buffer('testKey'),
      production: true,
      topic: 'topic'
    };
    let apns = new APNS(args);
    let provider = apns.providers[0];
    spyOn(provider, 'send').and.callFake((notification, devices) => {
      return Promise.resolve({
        sent: devices,
        failed: []
      })
    });
    // Mock data
    let expirationTime = 1454571491354;
    let collapseId = "collapseIdentifier";
    let pushType = "alert"; // or background
    let data = {
      'collapse_id': collapseId,
      'push_type': pushType,
      'expiration_time': expirationTime,
      'priority': 6,
      'data': {
        'alert': 'alert'
      }
    };
    // Mock devices
    let mockedDevices = [
      {
        deviceToken: '112233',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112234',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112235',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112236',
        appIdentifier: 'topic'
      }
    ];
    let promise = apns.send(data, mockedDevices);
    expect(provider.send).toHaveBeenCalled();
    let calledArgs = provider.send.calls.first().args;
    let notification = calledArgs[0];
    expect(notification.aps.alert).toEqual(data.data.alert);
    expect(notification.expiry).toEqual(Math.round(data['expiration_time'] / 1000));
    expect(notification.collapseId).toEqual(collapseId);
    expect(notification.pushType).toEqual(pushType);
    expect(notification.priority).toEqual(data['priority']);
    let apnDevices = calledArgs[1];
    expect(apnDevices.length).toEqual(4);
    done();
  });

  it('can send APNS notification headers in data', (done) => {
    let args = {
      cert: new Buffer('testCert'),
      key: new Buffer('testKey'),
      production: true,
      topic: 'topic'
    };
    let apns = new APNS(args);
    let provider = apns.providers[0];
    spyOn(provider, 'send').and.callFake((notification, devices) => {
      return Promise.resolve({
        sent: devices,
        failed: []
      })
    });
    // Mock data
    let expirationTime = 1454571491354;
    let collapseId = "collapseIdentifier";
    let pushType = "alert"; // or background
    let data = {
      'expiration_time': expirationTime,
      'data': {
        'alert': 'alert',
        'collapse_id': collapseId,
        'push_type': pushType,
        'priority': 6,
      }
    };
    // Mock devices
    let mockedDevices = [
      {
        deviceToken: '112233',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112234',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112235',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112236',
        appIdentifier: 'topic'
      }
    ];
    let promise = apns.send(data, mockedDevices);
    expect(provider.send).toHaveBeenCalled();
    let calledArgs = provider.send.calls.first().args;
    let notification = calledArgs[0];
    expect(notification.aps.alert).toEqual(data.data.alert);
    expect(notification.expiry).toEqual(Math.round(data['expiration_time'] / 1000));
    expect(notification.collapseId).toEqual(collapseId);
    expect(notification.pushType).toEqual(pushType);
    expect(notification.priority).toEqual(6);
    let apnDevices = calledArgs[1];
    expect(apnDevices.length).toEqual(4);
    done();
  });

  it('can send APNS notification to multiple bundles', (done) => {
    let args = [{
      cert: new Buffer('testCert'),
      key: new Buffer('testKey'),
      production: true,
      topic: 'topic'
    }, {
      cert: new Buffer('testCert'),
      key: new Buffer('testKey'),
      production: false,
      topic: 'topic.dev'
    }];

    let apns = new APNS(args);
    let provider = apns.providers[0];
    spyOn(provider, 'send').and.callFake((notification, devices) => {
      return Promise.resolve({
        sent: devices,
        failed: []
      })
    });
    let providerDev = apns.providers[1];
    spyOn(providerDev, 'send').and.callFake((notification, devices) => {
      return Promise.resolve({
        sent: devices,
        failed: []
      })
    });
    apns.providers = [provider, providerDev];
    // Mock data
    let expirationTime = 1454571491354;
    let pushType = "alert"; // or background
    let collapseId = "collapseIdentifier";
    let data = {
      'collapse_id': collapseId,
      'push_type': pushType,
      'expiration_time': expirationTime,
      'data': {
        'alert': 'alert'
      }
    };
    // Mock devices
    let mockedDevices = [
      {
        deviceToken: '112233',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112234',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112235',
        appIdentifier: 'topic'
      },
      {
        deviceToken: '112235',
        appIdentifier: 'topic.dev'
      },
      {
        deviceToken: '112236',
        appIdentifier: 'topic.dev'
      }
    ];

    let promise = apns.send(data, mockedDevices);

    expect(provider.send).toHaveBeenCalled();
    let calledArgs = provider.send.calls.first().args;
    let notification = calledArgs[0];
    expect(notification.aps.alert).toEqual(data.data.alert);
    expect(notification.expiry).toEqual(Math.round(data['expiration_time'] / 1000));
    expect(notification.collapseId).toEqual(data['collapse_id']);
    expect(notification.pushType).toEqual(pushType);
    let apnDevices = calledArgs[1];
    expect(apnDevices.length).toBe(3);

    expect(providerDev.send).toHaveBeenCalled();
    calledArgs = providerDev.send.calls.first().args;
    notification = calledArgs[0];
    expect(notification.aps.alert).toEqual(data.data.alert);
    expect(notification.expiry).toEqual(Math.round(data['expiration_time'] / 1000));
    expect(notification.collapseId).toEqual(data['collapse_id']);
    expect(notification.pushType).toEqual(pushType);
    apnDevices = calledArgs[1];
    expect(apnDevices.length).toBe(2);
    done();
  });

  it('reports proper error when no conn is available', (done) => {
    var args = [{
      cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
      key: new Buffer('testKey'),
      production: true,
      bundleId: 'bundleId'
    }];
    var data = {
      'data': {
        'alert': 'alert'
      }
    }
    var devices = [
      {
        deviceToken: '112233',
        appIdentifier: 'invalidBundleId'
      },
    ]
    var apns = new APNS(args);
    apns.send(data, devices).then((results) => {
      expect(results.length).toBe(1);
      let result = results[0];
      expect(result.transmitted).toBe(false);
      expect(result.response.error).toBe('No Provider found');
      done();
    }, (err) => {
      fail('should not fail');
      done();
    })
  });

  it('properly parses errors', (done) => {
    APNS._handlePushFailure({
      device: 'abcd',
      status: -1,
      response: {
        reason: 'Something wrong happend'
      }
    }).then((result) => {
      expect(result.transmitted).toBe(false);
      expect(result.device.deviceToken).toBe('abcd');
      expect(result.device.deviceType).toBe('ios');
      expect(result.response.error).toBe('Something wrong happend');
      done();
    })
  });

  it('properly parses errors again', (done) => {
    APNS._handlePushFailure({
      device: 'abcd',
    }).then((result) => {
      expect(result.transmitted).toBe(false);
      expect(result.device.deviceToken).toBe('abcd');
      expect(result.device.deviceType).toBe('ios');
      expect(result.response.error).toBe('Unkown status');
      done();
    })
  });
});
