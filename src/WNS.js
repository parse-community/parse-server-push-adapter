"use strict";

import Parse from 'parse';
import log from 'npmlog';
import fs from 'fs';
import wns from 'wns';

const LOG_PREFIX = 'parse-server-push-adapter WNS';

function WNS(args) {
  if (typeof args !== 'object' || !args.clientID || !args.clientSecret || !args.accessTokenPath) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'WNS Configuration is invalid');
  }

  this.clientID = args.clientID;
  this.clientSecret = args.clientSecret;
  this.accessTokenPath = args.accessTokenPath;
}

WNS.prototype.send = function(data, devices) {
  fs.access(this.accessTokenPath, fs.F_OK, (err) => {
    if (err) {
      fs.open(this.accessTokenPath, 'w', (err, fd) => {
        fs.close(fd, () => {
          log.verbose(LOG_PREFIX, `create new accessToken file`);
          
          sendWNSNow(data, devices);
         });
      });
    } else {
      sendWNSNow(data, devices);
    }
  });
}

WNS.prototype.sendWNSNow = function(data, devices) {
  devices = new Array(...devices);

  fs.readFile(this.accessTokenPath, (err, data) => {
    if (err) {
      log.verbose(LOG_PREFIX, `read accessToken file failed`);
    } else {
      let currentAccessToken = data;
      if (currentAccessToken.length == 0) {
        log.verbose(LOG_PREFIX, `currentAccessToken not existed.get new access`);

        currentAccessToken = getNewAccessToken();

        if (currentAccessToken == false) {
          log.error(LOG_PREFIX, `cannot get currentAccessToken From WNS`);
        } else {
          fs.writeFile(this.accessTokenPath, currentAccessToken, function(err) {
            if (err) {
              log.error(LOG_PREFIX, `cannot write new currentAccessToken to %s`,this.accessTokenPath);
            }
          }); 
        }

        let wnsPayload = getWNSToastPayload(data.title, data.alert);

        let promises = devices.map((device) => {
          return new Promise((resolve, reject) => {
            wns.sendToastText02(device.deviceToken, wnsPayload, {
              client_id: this.clientID,
              client_secret: this.clientSecret,
              accessToken: currentAccessToken
            }, function (error, result) {
              if (error) {
                log.error(LOG_PREFIX, `send errored: %s`, JSON.stringify(error, null, 4));
              } else {
                log.verbose(LOG_PREFIX, `WNS Response: %s`, JSON.stringify(response, null, 4));
              }
              currentAccessToken = error ? error.newAccessToken : result.newAccessToken;
            });
          });
        });

        return Parse.Promise.when(promises);
      }
    }
  });
}

WNS.prototype.getNewAccessToken = function() {
  let payload = url.format({
    query: {
      grant_type: 'client_credentials',
      client_id: this.clientID,
      client_secret: this.clientSecret,
      scope: 'notify.windows.com'
    }
  }).substring(1); // strip leading ?

  // make the request for accessToken to live.com 
  let options = {
    host: 'login.live.com',
    path: '/accesstoken.srf',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': payload.length
    }
  };

  let newAccessToken;
  let completed;
  let req = https.request(options, function (res) {
    let body = '';

    res.on('data', function (chunk) { body += chunk; });
    res.on('end', function () {
      if (!completed) {
        completed = true;
        if (res.statusCode === 200) {
          let tokenResponse;
          try{
            tokenResponse = JSON.parse(body);
            if (typeof tokenResponse.access_token !== 'string' || tokenResponse.token_type !== 'bearer')
              throw new Error('Invalid response');
          } catch (e) {
            let error = new Error('Unable to obtain access token for WNS. Invalid response body: ' + body);
            error.statusCode = res.statusCode;
            error.headers = res.headers;
            error.innerError = e;
            return false;
          }

          newAccessToken = tokenResponse.access_token;
          return newAccessToken;
        } else {
          let error = new Error('Unable to obtain access token for WNS. HTTP status code: ' + res.statusCode
                                 + '. HTTP response body: ' + body);
          error.statusCode = res.statusCode;
          error.headers = res.headers;
          error.innerError = body;
        }
      }
    });
  });

  req.on('error', function (error) {
    if (!completed) {
      completed = true;
      let result = new Error('Unable to send reqeust for access token to Windows Notification Service: ' + error.message);
      result.innerError = error;
    }
  });

  req.write(payload);
  req.end();

  return false;
}

WNS.prototype.getWNSToastPayload = function(text1, text2) {
  let payloadData =  {
    'text1': text1,
    'text2': text2
  };

  return payloadData;
}

module.exports = WNS;
export default WNS;
