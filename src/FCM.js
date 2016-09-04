import { classifyInstallations } from './PushAdapterUtils';
import { sendByBatch } from './PushAdapterUtils';
const FCMRegistrationTokensMax = 1000;

function FCM(options) {
  if (typeof args !== 'object' || !args.serverKey) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'FCM Configuration is invalid, serverKey is missing');
  }
  this.requestOptions = {
    host: 'fcm.googleapis.com',
    port: 443,
    path: '/fcm/send',
    method: 'POST',
    headers: {}
  };
}

FCM.prototype.send = function(data, devices) {
  return sendByBatch(data, devices, FCMRegistrationTokensMax, this._send.bind(this));
}

FCM.prototype._send = function(data, devices) {
  throw new Error('FCM is not implemented yet');
}
