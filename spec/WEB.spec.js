const WEB = require('../src/WEB').default;
const webpush = require('web-push');

const pushSubscription = {
  endpoint: '',
  keys: {
    p256dh: '',
    auth: '',
  },
};

const vapidDetails = {
  subject: 'test@test.com',
  publicKey: 'publicKey',
  privateKey: 'privateKey',
};

function mockSender() {
  return spyOn(WEB, 'sendNotifications').and.callFake((payload, tokens, options) => {
    const { success } = options;
    const response = {
      sent: success ? tokens.length : 0,
      failed: !success ? tokens.length : 0,
      results: tokens.map(() => {
        return {
          result: success ? 201 : undefined,
          error: !success ? 'push subscription has unsubscribed or expired.' : undefined,
        };
      }),
    };
    return Promise.resolve(response);
  });
}

function mockWebPush(success) {
  return spyOn(webpush, 'sendNotification').and.callFake((deviceToken, payload, options) => {
    if (success) {
      return Promise.resolve({ statusCode: 201 });
    }
    return Promise.reject({ body: 'push subscription has unsubscribed or expired.' });
  });
}

describe('WEB', () => {
  it('can initialize', () => {
    const args = { vapidDetails };
    const web = new WEB(args);
    expect(web.options.vapidDetails).toBe(args.vapidDetails);
  });

  it('can throw on initializing with invalid args', () => {
    expect(function() { new WEB(123); }).toThrow();
    expect(function() { new WEB({ apisKey: 'apiKey' }); }).toThrow();
    expect(function() { new WEB(undefined); }).toThrow();
  });

  it('does log on invalid APNS notification', async () => {
    const log = require('npmlog');
    const spy = spyOn(log, 'warn');
    const web = new WEB({ vapidDetails });
    web.send();
    expect(spy).toHaveBeenCalled();
  });

  it('can send successful WEB request', async () => {
    const log = require('npmlog');
    const spy = spyOn(log, 'verbose');

    const web = new WEB({ vapidDetails: 'apiKey' });
    spyOn(WEB, 'sendNotifications').and.callFake(() => {
      return Promise.resolve({
        sent: 1,
        failed: 0,
        results: [{ result: 201 }], 
      });
    });
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    const response = await web.send(data, devices);
    expect(WEB.sendNotifications).toHaveBeenCalled();
    const args = WEB.sendNotifications.calls.first().args;
    expect(args.length).toEqual(3);
    expect(args[0]).toEqual(data.data);
    expect(args[1]).toEqual(['token']);
    expect(args[2].vapidDetails).toEqual('apiKey');
    expect(spy).toHaveBeenCalled();
    expect(response).toEqual([{
      device: { deviceToken: 'token', deviceType: 'web' },
      response: 201,
      transmitted: true
    }]);
  });

  it('can send failed WEB request', async () => {
    const log = require('npmlog');
    const spy = spyOn(log, 'error');

    const web = new WEB({ vapidDetails: 'apiKey' });
    spyOn(WEB, 'sendNotifications').and.callFake(() => {
      return Promise.resolve({
        sent: 0,
        failed: 1,
        results: [{ error: 'push subscription has unsubscribed or expired.' }], 
      });
    });
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    const response = await web.send(data, devices);
    expect(WEB.sendNotifications).toHaveBeenCalled();
    const args = WEB.sendNotifications.calls.first().args;
    expect(args.length).toEqual(3);
    expect(args[0]).toEqual(data.data);
    expect(args[1]).toEqual(['token']);
    expect(args[2].vapidDetails).toEqual('apiKey');
    expect(spy).toHaveBeenCalled();
    expect(response).toEqual([{
      device: { deviceToken: 'token', deviceType: 'web' },
      response: 'push subscription has unsubscribed or expired.',
      transmitted: false
    }]);
  });

  it('can send multiple successful WEB request', async () => {
    const web = new WEB({ vapidDetails: 'apiKey', success: true });
    const data = { data: { alert: 'alert' } };
    const devices = [
      { deviceToken: 'token1' },
      { deviceToken: 'token2' },
      { deviceToken: 'token3' },
      { deviceToken: 'token4' },
      { deviceToken: 'token5' },
    ];
    mockSender();
    const response = await web.send(data, devices);
    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toEqual(devices.length);
    response.forEach((res, index) => {
      expect(res.transmitted).toEqual(true);
      expect(res.device).toEqual(devices[index]);
    });
  });

  it('can send multiple failed WEB request', async () => {
    const log = require('npmlog');
    const spy = spyOn(log, 'error');

    const web = new WEB({ vapidDetails: 'apiKey', success: false });
    const data = { data: { alert: 'alert' } };
    const devices = [
      { deviceToken: 'token1' },
      { deviceToken: 'token2' },
      { deviceToken: 'token3' },
      { deviceToken: 'token4' },
      { deviceToken: 'token5' },
    ];
    mockSender();
    const response = await web.send(data, devices);
    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toEqual(devices.length);
    response.forEach((res, index) => {
      expect(res.transmitted).toEqual(false);
      expect(res.device).toEqual(devices[index]);
    });
    expect(spy).toHaveBeenCalledWith('parse-server-push-adapter WEB', 'send errored: %d out of %d failed with error %s', 5, 5, 'push subscription has unsubscribed or expired.');
  });

  it('can run successful payload', async () => {
    const payload = { alert: 'alert' };
    const deviceTokens = [JSON.stringify(pushSubscription)];
    mockWebPush(true);
    const response = await WEB.sendNotifications(payload, deviceTokens);
    expect(response.sent).toEqual(1);
    expect(response.failed).toEqual(0);
    expect(response.results.length).toEqual(1);
    expect(response.results[0].result).toEqual(201);
  });

  it('can run failed payload', async () => {
    const payload = { alert: 'alert' };
    const deviceTokens = [JSON.stringify(pushSubscription)];
    mockWebPush(false);
    const response = await WEB.sendNotifications(payload, deviceTokens);
    expect(response.sent).toEqual(0);
    expect(response.failed).toEqual(1);
    expect(response.results.length).toEqual(1);
    expect(response.results[0].error).toEqual('push subscription has unsubscribed or expired.');
  });

  it('can run successful payload with wrong types', async () => {
    const payload = JSON.stringify({ alert: 'alert' });
    const deviceTokens = [pushSubscription];
    mockWebPush(true);
    const response = await WEB.sendNotifications(payload, deviceTokens);
    expect(response.sent).toEqual(1);
    expect(response.failed).toEqual(0);
    expect(response.results.length).toEqual(1);
    expect(response.results[0].result).toEqual(201);
  });
});
