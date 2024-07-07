import { Expo } from 'expo-server-sdk';
import log from 'npmlog';
import EXPO from '../src/EXPO.js';

function mockSender(success) {
  return spyOn(EXPO.prototype, 'sendNotifications').and.callFake((payload, tokens) => {
    return Promise.resolve(tokens.map(() => ({ status: success ? 'ok' : 'error' })));
  });
}

function mockExpoPush(success) {
  return spyOn(Expo.prototype, 'sendPushNotificationsAsync').and.callFake((deviceToken) => {
    if (success) {
      return Promise.resolve(deviceToken.map(() => ({ status: 'ok' })));
    }
    return Promise.resolve(deviceToken.map(() => ({ status: 'error', message: 'Failed to send' })));
  });
}

describe('EXPO', () => {
  it('can initialize', () => {
    const args = { };
    new EXPO(args);
  });

  it('can throw on initializing with invalid args', () => {
    expect(function() { new EXPO(123); }).toThrow();
    expect(function() { new EXPO(undefined); }).toThrow();
  });

  it('can send successful EXPO request', async () => {
    const spy = spyOn(log, 'verbose');

    const expo = new EXPO({ vapidDetails: 'apiKey' });
    spyOn(EXPO.prototype, 'sendNotifications').and.callFake(() => {
      return Promise.resolve([{ status: 'ok' }]);
    });
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    const response = await expo.send(data, devices);
    expect(EXPO.prototype.sendNotifications).toHaveBeenCalled();
    const args = EXPO.prototype.sendNotifications.calls.first().args;
    expect(args.length).toEqual(2);
    expect(args[0]).toEqual(data.data);
    expect(args[1]).toEqual(['token']);
    expect(spy).toHaveBeenCalled();
    expect(response).toEqual([{
      device: { deviceToken: 'token', pushType: 'expo' },
      response: { status: 'ok' },
      transmitted: true
    }]);
  });

  it('can send failed EXPO request', async () => {
    const expo = new EXPO({ vapidDetails: 'apiKey' });
    spyOn(EXPO.prototype, 'sendNotifications').and.callFake(() => {
      return Promise.resolve([{ status: 'error', message: 'DeviceNotRegistered' }])});
    const data = { data: { alert: 'alert' } };
    const devices = [{ deviceToken: 'token' }];
    const response = await expo.send(data, devices);

    expect(EXPO.prototype.sendNotifications).toHaveBeenCalled();
    const args = EXPO.prototype.sendNotifications.calls.first().args;
    expect(args.length).toEqual(2);
    expect(args[0]).toEqual(data.data);
    expect(args[1]).toEqual(['token']);

    expect(response).toEqual([{
      device: { deviceToken: 'token', pushType: 'expo' },
      response: { status: 'error', message: 'DeviceNotRegistered', error: 'NotRegistered' },
      transmitted: false
    }]);
  });

  it('can send multiple successful EXPO request', async () => {
    const expo = new EXPO({ });
    const data = { data: { alert: 'alert' } };
    const devices = [
      { deviceToken: 'token1', deviceType: 'ios' },
      { deviceToken: 'token2', deviceType: 'ios' },
      { deviceToken: 'token3', deviceType: 'ios' },
      { deviceToken: 'token4', deviceType: 'ios' },
      { deviceToken: 'token5', deviceType: 'ios' },
    ];
    mockSender(true);
    const response = await expo.send(data, devices);

    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toEqual(devices.length);
    response.forEach((res, index) => {
      expect(res.transmitted).toEqual(true);
      expect(res.device.deviceToken).toEqual(devices[index].deviceToken);
    });
  });

  it('can send multiple failed EXPO request', async () => {
    const expo = new EXPO({ });
    const data = { data: { alert: 'alert' } };
    const devices = [
      { deviceToken: 'token1' },
      { deviceToken: 'token2' },
      { deviceToken: 'token3' },
      { deviceToken: 'token4' },
      { deviceToken: 'token5' },
    ];
    mockSender(false);
    const response = await expo.send(data, devices);
    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toEqual(devices.length);
    response.forEach((res, index) => {
      expect(res.transmitted).toEqual(false);
      expect(res.device.deviceToken).toEqual(devices[index].deviceToken);
    });
  });

  it('can run successful payload', async () => {
    const payload = { alert: 'alert' };
    const deviceTokens = ['ExpoPush[1]'];
    mockExpoPush(true);
    const response = await new EXPO({}).sendNotifications(payload, deviceTokens);
    expect(response.length).toEqual(1);
    expect(response[0].status).toEqual('ok');
  });

  it('can run failed payload', async () => {
    const payload = { alert: 'alert' };
    const deviceTokens = ['ExpoPush[1]'];
    mockExpoPush(false);
    const response = await new EXPO({}).sendNotifications(payload, deviceTokens);
    expect(response.length).toEqual(1);
    expect(response[0].status).toEqual('error');
  });

  it('can run successful payload with wrong types', async () => {
    const payload = JSON.stringify({ alert: 'alert' });
    const deviceTokens = ['ExpoPush[1]'];
    mockExpoPush(true);
    const response = await new EXPO({}).sendNotifications(payload, deviceTokens);
    expect(response.length).toEqual(1);
    expect(response[0].status).toEqual('ok');
  });
});
