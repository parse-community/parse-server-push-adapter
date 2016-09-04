var FCM = require('../src/FCM');
let serverKey = process.env.FCM_SERVER_KEY || 'key';
describe('FCM', () => {
  it('can send FCM request', (done) => {
    var fcm = new FCM({
      serverKey: serverKey
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
      }
    ];

    fcm.send(data, devices).then((res) => {
      expect(res.length).toBe(1);
      let result = res[0];
      expect(result.device.deviceToken).toEqual('token');
      expect(result.transmitted).toBe(false);
      if (process.env.FCM_SERVER_KEY) {
        expect(result.response.error).toEqual('InvalidRegistration');
      } else {
        expect(result.response instanceof Error).toBe(true);
      }
      done();
    }).fail((err) => {
      fail('should not fail');
      done();
    });
  });
})