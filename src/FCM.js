import { classifyInstallations } from './PushAdapterUtils';
import { sendByBatch } from './PushAdapterUtils';
import Parse from 'parse/node';
import https from 'https';
import log from 'npmlog';

const LOG_PREFIX = 'parse-server-push-adapter FCM';
const FCMRegistrationTokensMax = 1000;

function FCM(options) {
  if (typeof options !== 'object' || !options.serverKey) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'FCM Configuration is invalid, serverKey is missing');
  }
  this.requestOptions = {
    host: 'fcm.googleapis.com',
    port: 443,
    path: '/fcm/send',
    method: 'POST',
    headers: {
      'Authorization': 'key=' + options.serverKey,
      'Host': 'fcm.googleapis.com',
      'Content-Type': 'application/json'
    }
  };
}

FCM.prototype.send = function(data, devices) {
  return sendByBatch(data, devices, FCMRegistrationTokensMax, this._send.bind(this));
}

FCM.prototype._send = function(data, devices) {
  // Build a device map
  let devicesMap = devices.reduce((memo, device) => {
    memo[device.deviceToken] = device;
    return memo;
  }, {});

  let deviceTokens = Object.keys(devicesMap);
  let promises = deviceTokens.map(() => new Parse.Promise());
  let registrationTokens = deviceTokens;
  let length = registrationTokens.length;
  log.verbose(LOG_PREFIX, `sending to ${length} ${length > 1 ? 'devices' : 'device'}`);

  let payload = generateFCMPayload(data); 
  payload.registration_ids = registrationTokens;
  
  sendHTTPRequest(payload, this.requestOptions).then((response) => {
    var error = null;
    if (response instanceof Error) {
      error = response;
    }
    let { results, multicast_id } = response || {};
    registrationTokens.forEach((token, index) => {
      let promise = promises[index];
      let result = results ? results[index] : undefined;
      let device = devicesMap[token];
      let resolution = {
        device,
        multicast_id,
        response: error || result,
      };
      if (!result || result.error) {
        resolution.transmitted = false;
      } else {
        resolution.transmitted = true;
      }
      promise.resolve(resolution);
    });
  });
  return Parse.Promise.when(promises);
}

function sendHTTPRequest(payload, options) {
  return new Promise((resolve, reject) => {
    let payloadString = JSON.stringify(payload);
    options = Object.assign({}, options);
    options.headers['Content-Length'] = payloadString.length;
    const request = https.request(options, function(res) {
      let data = '';
      function handleEnd() {
        var error = null, id = null;
        if (res.statusCode === 401) {
          resolve(new Error('unauthorized'))
        } else {
          try {
            let result = JSON.parse(data);
            resolve(result);
          } catch(e) {
            resolve(new Error('Unable to parse '+data));
          }
        }
      }

      res.on('data', function(chunk) {
          data += chunk;
      });
      res.on('end', handleEnd);
      res.on('close', handleEnd);
    });
    request.end(payloadString);
  });
}


function generateFCMPayload(coreData, timeStamp, expirationTime) {
  let payload = {
    priority: 'normal'
  };
  if (!coreData.data && !coreData.notification) {
    payload.notification = coreData;
  }
  if (coreData.content_available) {
    payload.content_available = coreData.content_available;
    delete coreData.content_available;
  }
  if (coreData.data) {
    payload.data = coreData.data;
  }
  if (coreData.notification) {
    payload.notification = coreData.notification;
  }
  if (expirationTime && timeStamp) {
   // The timeStamp and expiration is in milliseconds but gcm requires second
    let timeToLive = Math.floor((expirationTime - timeStamp) / 1000);
    if (timeToLive < 0) {
      timeToLive = 0;
    }
    if (timeToLive >= GCMTimeToLiveMax) {
      timeToLive = GCMTimeToLiveMax;
    }
    payload.time_to_live = timeToLive;
  }
  return payload;
}

module.exports = FCM;
export default FCM;
