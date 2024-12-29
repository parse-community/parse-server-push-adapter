import log from 'npmlog';
import Parse from 'parse/node.js';
import APNS from '../src/APNS.js';

describe('APNS', () => {

  it('can initialize with cert', (done) => {
    const args = {
      cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
      key: Buffer.from('testKey'),
      production: true,
      topic: 'topic'
    };
    const apns = new APNS(args);

    expect(apns.providers.length).toBe(1);
    const apnsProvider = apns.providers[0];
    expect(apnsProvider.index).toBe(0);
    expect(apnsProvider.topic).toBe(args.topic);
    // TODO: Remove this checking onec we inject APNS
    const prodApnsOptions = apnsProvider.client.config;
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
    expect(() => {
      new APNS({
        key: Buffer.from('key'),
        production: true,
        bundle: 'hello'
      });
    }).toThrow();

    expect(() => {
      new APNS({
        cert: 'pfx',
        production: true,
        bundle: 'hello'
      });
    }).toThrow();

    expect(() => {
      new APNS({
        pfx: Buffer.from(''),
        production: true,
        bundle: 'hello'
      });
    }).toThrow();
    done();
  });

  it('can initialize with multiple certs with bundleId', (done) => {
    spyOn(log, 'warn').and.callFake(() => {});
    const args = [
      {
        cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
        key: Buffer.from('testKey'),
        production: false,
        bundleId: 'bundleId'
      },
      {
        cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
        key: Buffer.from('testKey'),
        production: true,
        bundleId: 'bundleIdAgain'
      }
    ]

    const apns = new APNS(args);
    expect(apns.providers.length).toBe(2);
    const devApnsConnection = apns.providers[1];
    expect(devApnsConnection.index).toBe(1);
    const devApnsOptions = devApnsConnection.client.config;
    expect(devApnsOptions.cert).toBe(args[0].cert);
    expect(devApnsOptions.key).toBe(args[0].key);
    expect(devApnsOptions.production).toBe(args[0].production);
    expect(devApnsOptions.bundleId).toBe(args[0].bundleId);
    expect(devApnsOptions.topic).toBe(args[0].bundleId);
    expect(devApnsConnection.topic).toBe(args[0].bundleId);

    const prodApnsConnection = apns.providers[0];
    expect(prodApnsConnection.index).toBe(0);

    // TODO: Remove this checking onec we inject APNS
    const prodApnsOptions = prodApnsConnection.client.config;
    expect(prodApnsOptions.cert).toBe(args[1].cert);
    expect(prodApnsOptions.key).toBe(args[1].key);
    expect(prodApnsOptions.production).toBe(args[1].production);
    expect(prodApnsOptions.bundleId).toBe(args[1].bundleId);
    expect(prodApnsOptions.topic).toBe(args[1].bundleId);
    expect(prodApnsConnection.topic).toBe(args[1].bundleId);
    done();
  });

  it('can initialize with multiple certs with topic', (done) => {
    const args = [
      {
        cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
        key: Buffer.from('testKey'),
        production: false,
        topic: 'topic'
      },
      {
        cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
        key: Buffer.from('testKey'),
        production: true,
        topic: 'topicAgain'
      }
    ];

    const apns = new APNS(args);

    expect(apns.providers.length).toBe(2);
    const devApnsProvider = apns.providers[1];
    expect(devApnsProvider.index).toBe(1);
    expect(devApnsProvider.topic).toBe(args[0].topic);

    const devApnsOptions = devApnsProvider.client.config;
    expect(devApnsOptions.cert).toBe(args[0].cert);
    expect(devApnsOptions.key).toBe(args[0].key);
    expect(devApnsOptions.production).toBe(args[0].production);

    const prodApnsProvider = apns.providers[0];
    expect(prodApnsProvider.index).toBe(0);
    expect(prodApnsProvider.topic).toBe(args[1].topic);

    // TODO: Remove this checking onec we inject APNS
    const prodApnsOptions = prodApnsProvider.client.config;
    expect(prodApnsOptions.cert).toBe(args[1].cert);
    expect(prodApnsOptions.key).toBe(args[1].key);
    expect(prodApnsOptions.production).toBe(args[1].production);
    done();
  });

  it('sets priority to 10 if not set explicitly', (done) => {
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
    const notification = APNS._generateNotification(data, { });
    expect(notification.priority).toEqual(10);
    done();
  });

  it('can generate APNS notification', (done) => {
    //Mock request data
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
    const collapseId = "collapseIdentifier";

    const pushType = "alert";
    const priority = 5;
    const notification = APNS._generateNotification(data, { expirationTime: expirationTime, collapseId: collapseId, pushType: pushType, priority: priority });

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

  it('can generate APNS notification with nested alert dictionary', (done) => {
    //Mock request data
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
    const collapseId = "collapseIdentifier";

    const pushType = "alert";
    const priority = 5;
    const notification = APNS._generateNotification(data, { expirationTime: expirationTime, collapseId: collapseId, pushType: pushType, priority: priority });

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
    const expirationTime = 1454571491354;
    const collapseId = "collapseIdentifier";

    const notification = APNS._generateNotification(data, { expirationTime: expirationTime, collapseId: collapseId });

    expect(notification.pushType).toEqual('alert');
    done();
  });

  it('can generate APNS notification from raw data', (done) => {
    //Mock request data
    const data = {
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
    const expirationTime = 1454571491354;
    const collapseId = "collapseIdentifier";
    const pushType = "background";
    const priority = 5;

    const notification = APNS._generateNotification(data, { expirationTime: expirationTime, collapseId: collapseId, pushType: pushType, priority: priority });

    expect(notification.expiry).toEqual(Math.round(expirationTime / 1000));
    expect(notification.collapseId).toEqual(collapseId);
    expect(notification.pushType).toEqual(pushType);
    expect(notification.priority).toEqual(priority);

    const stringifiedJSON = notification.compile();
    const jsonObject = JSON.parse(stringifiedJSON);

    expect(jsonObject.aps.alert).toEqual({ "loc-key" : "GAME_PLAY_REQUEST_FORMAT", "loc-args" : [ "Jenna", "Frank"] });
    expect(jsonObject.aps.badge).toEqual(100);
    expect(jsonObject.aps.sound).toEqual('test');
    expect(jsonObject.aps['thread-id']).toEqual('a-thread-id');
    expect(jsonObject.key).toEqual('value');
    expect(jsonObject.keyAgain).toEqual('valueAgain');
    done();
  });

  it('generating notification prioritizes header information from notification data', async () => {
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
      'keyAgain': 'valueAgain',
      'topic': 'bundle',
      'expiry': 20,
      'collapseId': 'collapse',
      'pushType': 'alert',
      'priority': 7,
    };
    const topic = 'bundleId';
    const expirationTime = 1454571491354;
    const collapseId = "collapseIdentifier";
    const pushType = "background";
    const priority = 5;

    const notification = APNS._generateNotification(data, { topic: topic, expirationTime: expirationTime, collapseId: collapseId, pushType: pushType, priority: priority });
    expect(notification.topic).toEqual(data.topic);
    expect(notification.expiry).toEqual(data.expiry);
    expect(notification.collapseId).toEqual(data.collapseId);
    expect(notification.pushType).toEqual(data.pushType);
    expect(notification.priority).toEqual(data.priority);
  });

  it('generating notification does not override default notification info when header info is missing', async () => {
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
      'keyAgain': 'valueAgain',
    };
    const topic = 'bundleId';
    const collapseId = "collapseIdentifier";
    const pushType = "background";

    const notification = APNS._generateNotification(data, { topic: topic, collapseId: collapseId, pushType: pushType });
    expect(notification.topic).toEqual(topic);
    expect(notification.expiry).toEqual(-1);
    expect(notification.collapseId).toEqual(collapseId);
    expect(notification.pushType).toEqual(pushType);
    expect(notification.priority).toEqual(10);
  });

  it('defaults to original topic', async () => {
    const topic = 'bundleId';
    const pushType = 'alert';
    const updatedTopic = APNS._determineTopic(topic, pushType);
    expect(updatedTopic).toEqual(topic);
  });

  it('updates topic based on location pushType', async () => {
    const topic = 'bundleId';
    const pushType = 'location';
    const updatedTopic = APNS._determineTopic(topic, pushType);
    expect(updatedTopic).toEqual(topic+'.location-query');
  });

  it('updates topic based on voip pushType', async () => {
    const topic = 'bundleId';
    const pushType = 'voip';
    const updatedTopic = APNS._determineTopic(topic, pushType);
    expect(updatedTopic).toEqual(topic+'.voip');
  });

  it('updates topic based on complication pushType', async () => {
    const topic = 'bundleId';
    const pushType = 'complication';
    const updatedTopic = APNS._determineTopic(topic, pushType);
    expect(updatedTopic).toEqual(topic+'.complication');
  });

  it('updates topic based on complication pushType', async () => {
    const topic = 'bundleId';
    const pushType = 'fileprovider';
    const updatedTopic = APNS._determineTopic(topic, pushType);
    expect(updatedTopic).toEqual(topic+'.pushkit.fileprovider');
  });

  it('updates topic based on liveactivity pushType', async () => {
    const topic = 'bundleId';
    const pushType = 'liveactivity';
    const updatedTopic = APNS._determineTopic(topic, pushType);
    expect(updatedTopic).toEqual(topic+'.push-type.liveactivity');
  });

  it('updates topic based on pushtotalk pushType', async () => {
    const topic = 'bundleId';
    const pushType = 'pushtotalk';
    const updatedTopic = APNS._determineTopic(topic, pushType);
    expect(updatedTopic).toEqual(topic+'.voip-ptt');
  });

  it('can choose providers for device with valid appIdentifier', (done) => {
    const appIdentifier = 'topic';
    // Mock providers
    const providers = [
      {
        topic: appIdentifier
      },
      {
        topic: 'topicAgain'
      }
    ];

    const qualifiedProviders = APNS.prototype._chooseProviders.call({providers: providers}, appIdentifier);
    expect(qualifiedProviders).toEqual([{
      topic: 'topic'
    }]);
    done();
  });

  it('can choose providers for device with invalid appIdentifier', (done) => {
    const appIdentifier = 'invalid';
    // Mock providers
    const providers = [
      {
        topic: 'bundleId'
      },
      {
        topic: 'bundleIdAgain'
      }
    ];

    const qualifiedProviders = APNS.prototype._chooseProviders.call({providers: providers}, appIdentifier);
    expect(qualifiedProviders).toEqual([]);
    done();
  });

  it('does log on invalid APNS notification', async () => {
    const args = {
      cert: Buffer.from('testCert'),
      key: Buffer.from('testKey'),
      production: true,
      topic: 'topic'
    };
    const spy = spyOn(log, 'warn');
    const apns = new APNS(args);
    apns.send();
    expect(spy).toHaveBeenCalled();
  });

  it('can send APNS notification', (done) => {
    const args = {
      cert: Buffer.from('testCert'),
      key: Buffer.from('testKey'),
      production: true,
      topic: 'topic'
    };
    const apns = new APNS(args);
    const provider = apns.providers[0];
    spyOn(provider, 'send').and.callFake((notification, devices) => {
      return Promise.resolve({
        sent: devices,
        failed: []
      })
    });
    // Mock data
    const expirationTime = 1454571491354;
    const collapseId = "collapseIdentifier";
    const pushType = "alert"; // or background
    const data = {
      'collapse_id': collapseId,
      'push_type': pushType,
      'expiration_time': expirationTime,
      'priority': 6,
      'data': {
        'alert': 'alert'
      }
    };
    // Mock devices
    const mockedDevices = [
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
    apns.send(data, mockedDevices);

    expect(provider.send).toHaveBeenCalled();
    const calledArgs = provider.send.calls.first().args;
    const notification = calledArgs[0];
    expect(notification.aps.alert).toEqual(data.data.alert);
    expect(notification.expiry).toEqual(Math.round(data['expiration_time'] / 1000));
    expect(notification.collapseId).toEqual(collapseId);
    expect(notification.pushType).toEqual(pushType);
    expect(notification.priority).toEqual(data['priority']);
    const apnDevices = calledArgs[1];
    expect(apnDevices.length).toEqual(4);
    done();
  });

  it('can send APNS notification headers in data', (done) => {
    const args = {
      cert: Buffer.from('testCert'),
      key: Buffer.from('testKey'),
      production: true,
      topic: 'topic'
    };
    const apns = new APNS(args);
    const provider = apns.providers[0];
    spyOn(provider, 'send').and.callFake((notification, devices) => {
      return Promise.resolve({
        sent: devices,
        failed: []
      })
    });
    // Mock data
    const expirationTime = 1454571491354;
    const collapseId = "collapseIdentifier";
    const pushType = "alert"; // or background
    const data = {
      'expiration_time': expirationTime,
      'data': {
        'alert': 'alert',
        'collapse_id': collapseId,
        'push_type': pushType,
        'priority': 6,
      }
    };
    // Mock devices
    const mockedDevices = [
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
    apns.send(data, mockedDevices);
    expect(provider.send).toHaveBeenCalled();
    const calledArgs = provider.send.calls.first().args;
    const notification = calledArgs[0];
    expect(notification.aps.alert).toEqual(data.data.alert);
    expect(notification.expiry).toEqual(Math.round(data['expiration_time'] / 1000));
    expect(notification.collapseId).toEqual(collapseId);
    expect(notification.pushType).toEqual(pushType);
    expect(notification.priority).toEqual(6);
    const apnDevices = calledArgs[1];
    expect(apnDevices.length).toEqual(4);
    done();
  });

  it('can send APNS notification to multiple bundles', (done) => {
    const args = [{
      cert: Buffer.from('testCert'),
      key: Buffer.from('testKey'),
      production: true,
      topic: 'topic'
    }, {
      cert: Buffer.from('testCert'),
      key: Buffer.from('testKey'),
      production: false,
      topic: 'topic.dev'
    }];

    const apns = new APNS(args);
    const provider = apns.providers[0];
    spyOn(provider, 'send').and.callFake((notification, devices) => {
      return Promise.resolve({
        sent: devices,
        failed: []
      })
    });
    const providerDev = apns.providers[1];
    spyOn(providerDev, 'send').and.callFake((notification, devices) => {
      return Promise.resolve({
        sent: devices,
        failed: []
      })
    });
    apns.providers = [provider, providerDev];
    // Mock data
    const expirationTime = 1454571491354;
    const pushType = "alert"; // or background
    const collapseId = "collapseIdentifier";
    const data = {
      'collapse_id': collapseId,
      'push_type': pushType,
      'expiration_time': expirationTime,
      'data': {
        'alert': 'alert'
      }
    };
    // Mock devices
    const mockedDevices = [
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
    apns.send(data, mockedDevices);

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

  it('reports proper error when no conn is available', (done) => {
    spyOn(log, 'warn').and.callFake(() => {});
    const args = [{
      cert: '-----BEGIN CERTIFICATE-----fPEYJtQrEMXLC9JtFUJ6emXAWv2QdKu93QE+6o5htM+Eu/2oNFIEj2A71WUBu7kA-----END CERTIFICATE-----',
      key: Buffer.from('testKey'),
      production: true,
      bundleId: 'bundleId'
    }];
    const data = {
      'data': {
        'alert': 'alert'
      }
    }
    const devices = [
      {
        deviceToken: '112233',
        appIdentifier: 'invalidBundleId'
      },
    ]
    const apns = new APNS(args);
    apns.send(data, devices).then((results) => {
      expect(results.length).toBe(1);
      const result = results[0];
      expect(result.transmitted).toBe(false);
      expect(result.response.error).toBe('No Provider found');
      done();
    }, () => {
      fail('should not fail');
      done();
    })
  });

  it('properly parses errors', (done) => {
    spyOn(log, 'error').and.callFake(() => {});
    APNS._handlePushFailure({
      device: 'abcd',
      status: -1,
      response: {
        reason: 'Something wrong happend'
      }
    }).then((result) => {
      expect(result.transmitted).toBe(false);
      expect(result.device.deviceToken).toBe('abcd');
      expect(result.device.deviceType).toBe('ios');
      expect(result.response.error).toBe('Something wrong happend');
      done();
    })
  });

  it('properly parses errors again', (done) => {
    spyOn(log, 'error').and.callFake(() => {});
    APNS._handlePushFailure({
      device: 'abcd',
    }).then((result) => {
      expect(result.transmitted).toBe(false);
      expect(result.device.deviceToken).toBe('abcd');
      expect(result.device.deviceType).toBe('ios');
      expect(result.response.error).toBe('Unkown status');
      done();
    })
  });
});
