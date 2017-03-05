const APNS = require('../src/APNS');

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

  it('can generate APNS notification', (done) => {
    //Mock request data
    let data = {
      'alert': 'alert',
      'badge': 100,
      'sound': 'test',
      'content-available': 1,
      'mutable-content': 1,
      'category': 'INVITE_CATEGORY',
      'key': 'value',
      'keyAgain': 'valueAgain'
    };
    let expirationTime = 1454571491354;

    let notification = APNS._generateNotification(data, expirationTime);

    expect(notification.aps.alert).toEqual(data.alert);
    expect(notification.aps.badge).toEqual(data.badge);
    expect(notification.aps.sound).toEqual(data.sound);
    expect(notification.aps['content-available']).toEqual(1);
    expect(notification.aps['mutable-content']).toEqual(1);
    expect(notification.aps.category).toEqual(data.category);
    expect(notification.payload).toEqual({
      'key': 'value',
      'keyAgain': 'valueAgain'
    });
    expect(notification.expiry).toEqual(expirationTime / 1000);
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
    let data = {
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
        deviceToken: '112236',
        appIdentifier: 'topic'
      }
    ];
    let promise = apns.send(data, mockedDevices);
    expect(provider.send).toHaveBeenCalled();
    let calledArgs = provider.send.calls.first().args;
    let notification = calledArgs[0];
    expect(notification.aps.alert).toEqual(data.data.alert);
    expect(notification.expiry).toEqual(data['expiration_time'] / 1000);
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
    let data = {
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
    expect(notification.expiry).toEqual(data['expiration_time'] / 1000);
    let apnDevices = calledArgs[1];
    expect(apnDevices.length).toBe(3);

    expect(providerDev.send).toHaveBeenCalled();
    calledArgs = providerDev.send.calls.first().args;
    notification = calledArgs[0];
    expect(notification.aps.alert).toEqual(data.data.alert);
    expect(notification.expiry).toEqual(data['expiration_time'] / 1000);
    apnDevices = calledArgs[1];
    expect(apnDevices.length).toBe(2);
    done();
  });
});
