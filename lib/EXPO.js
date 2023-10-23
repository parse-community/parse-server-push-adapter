// Babel-Config-> presets: es2015, babel-polyfill, stage-0

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EXPO;

var _parse = require('parse');

var _parse2 = _interopRequireDefault(_parse);

var _npmlog = require('npmlog');

var _npmlog2 = _interopRequireDefault(_npmlog);

var _expoServerSdk = require('expo-server-sdk');

var _expoServerSdk2 = _interopRequireDefault(_expoServerSdk);

require('babel-polyfill');

var _PushAdapterUtils = require('./PushAdapterUtils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var LOG_PREFIX = 'parse-server-push-adapter EXPO';
var GCMRegistrationTokensMax = 1000;
var EXPOTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // GCM allows a max of 4 weeks

function EXPO(args) {
  this.sender = new _expoServerSdk2.default();
}

/**
 * Send gcm request.
 * @param {Object} data The data we need to send, the format is the same with api request body
 * @param {Array} devices A array of devices
 * @returns {Object} A promise which is resolved after we get results from gcm
 */
EXPO.prototype.send = function (data, devices) {
  var _this = this;

  var pushId = (0, _PushAdapterUtils.randomString)(10);
  // Make a new array
  devices = devices.slice(0);
  var timestamp = Date.now();

  var expirationTime = void 0;
  // We handle the expiration_time convertion in push.js, so expiration_time is a valid date
  // in Unix epoch time in milliseconds here
  if (data['expiration_time']) {
    expirationTime = data['expiration_time'];
  }

  var messages = [];

  // Build a device map
  var devicesMap = devices.reduce(function (memo, device) {
    memo[device.deviceToken] = device;
    return memo;
  }, {});

  var deviceTokens = Object.keys(devicesMap);

  var promises = deviceTokens.map(function () {
    return new _parse2.default.Promise();
  });
  var registrationTokens = deviceTokens;
  var length = registrationTokens.length;
  _npmlog2.default.verbose(LOG_PREFIX, 'sending to ' + length + ' ' + (length > 1 ? 'devices' : 'device'));
  var notificationData = {
    body: data.data.alert,
    title: data.data.title,
    badge: data.data.badge ? data.data.badge : 1,
    data: data.data
  };
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = registrationTokens[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var pushToken = _step.value;

      if (!_expoServerSdk2.default.isExpoPushToken(pushToken)) {
        console.error('Push token ' + pushToken + ' is not a valid Expo push token');
        continue;
      }
      messages.push({
        to: pushToken,
        sound: 'default',
        body: notificationData.body,
        title: notificationData.title,
        badge: notificationData.badge,
        data: notificationData,
        ttl: EXPOTimeToLiveMax,
        priority: 'high',
        channelId: 'fif-notifications',
        'content-available': 1
      });
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var chunks = this.sender.chunkPushNotifications(messages);
  var tickets = [];

  _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, chunkList, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, chunk, ticketChunk;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _iteratorNormalCompletion2 = true;
            _didIteratorError2 = false;
            _iteratorError2 = undefined;
            _context.prev = 3;
            _iterator2 = chunks[Symbol.iterator]();

          case 5:
            if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
              _context.next = 44;
              break;
            }

            chunkList = _step2.value;
            _iteratorNormalCompletion3 = true;
            _didIteratorError3 = false;
            _iteratorError3 = undefined;
            _context.prev = 10;
            _iterator3 = chunkList[Symbol.iterator]();

          case 12:
            if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
              _context.next = 27;
              break;
            }

            chunk = _step3.value;
            _context.prev = 14;
            _context.next = 17;
            return _this.sender.sendPushNotificationsAsync([chunk]);

          case 17:
            ticketChunk = _context.sent;

            tickets.push.apply(tickets, _toConsumableArray(ticketChunk));
            _context.next = 24;
            break;

          case 21:
            _context.prev = 21;
            _context.t0 = _context['catch'](14);

            console.error(_context.t0);

          case 24:
            _iteratorNormalCompletion3 = true;
            _context.next = 12;
            break;

          case 27:
            _context.next = 33;
            break;

          case 29:
            _context.prev = 29;
            _context.t1 = _context['catch'](10);
            _didIteratorError3 = true;
            _iteratorError3 = _context.t1;

          case 33:
            _context.prev = 33;
            _context.prev = 34;

            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }

          case 36:
            _context.prev = 36;

            if (!_didIteratorError3) {
              _context.next = 39;
              break;
            }

            throw _iteratorError3;

          case 39:
            return _context.finish(36);

          case 40:
            return _context.finish(33);

          case 41:
            _iteratorNormalCompletion2 = true;
            _context.next = 5;
            break;

          case 44:
            _context.next = 50;
            break;

          case 46:
            _context.prev = 46;
            _context.t2 = _context['catch'](3);
            _didIteratorError2 = true;
            _iteratorError2 = _context.t2;

          case 50:
            _context.prev = 50;
            _context.prev = 51;

            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }

          case 53:
            _context.prev = 53;

            if (!_didIteratorError2) {
              _context.next = 56;
              break;
            }

            throw _iteratorError2;

          case 56:
            return _context.finish(53);

          case 57:
            return _context.finish(50);

          case 58:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, _this, [[3, 46, 50, 58], [10, 29, 33, 41], [14, 21], [34,, 36, 40], [51,, 53, 57]]);
  }))();

  var receiptIds = [];
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = tickets[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var ticket = _step4.value;

      if (ticket.id) {
        receiptIds.push(ticket.id);
      }
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }

  var receiptIdChunks = this.sender.chunkPushNotificationReceiptIds(receiptIds);
  _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
    var _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, chunk, receipts;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _iteratorNormalCompletion5 = true;
            _didIteratorError5 = false;
            _iteratorError5 = undefined;
            _context2.prev = 3;
            _iterator5 = receiptIdChunks[Symbol.iterator]();

          case 5:
            if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
              _context2.next = 21;
              break;
            }

            chunk = _step5.value;
            _context2.prev = 7;
            _context2.next = 10;
            return _this.sender.getPushNotificationReceiptsAsync(chunk);

          case 10:
            receipts = _context2.sent;

            (0, _PushAdapterUtils.updateReciepientStatus)(receipts);
            // The receipts specify whether Apple or Google successfully received the
            // notification and information about an error, if one occurred.
            receipts.forEach(function (receipt, index) {
              var promise = promises[index];
              var result = results ? results[index] : undefined;
              var device = devicesMap[token];
              device.deviceType = 'expo';
              var resolution = {
                device: device,
                multicast_id: 'multicast_id',
                response: receipt
              };
              if (receipt.status === 'error') {
                resolution.transmitted = false;
              } else {
                resolution.transmitted = true;
              }
              promise.resolve(resolution);
            });
            _context2.next = 18;
            break;

          case 15:
            _context2.prev = 15;
            _context2.t0 = _context2['catch'](7);

            console.error(_context2.t0);

          case 18:
            _iteratorNormalCompletion5 = true;
            _context2.next = 5;
            break;

          case 21:
            _context2.next = 27;
            break;

          case 23:
            _context2.prev = 23;
            _context2.t1 = _context2['catch'](3);
            _didIteratorError5 = true;
            _iteratorError5 = _context2.t1;

          case 27:
            _context2.prev = 27;
            _context2.prev = 28;

            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }

          case 30:
            _context2.prev = 30;

            if (!_didIteratorError5) {
              _context2.next = 33;
              break;
            }

            throw _iteratorError5;

          case 33:
            return _context2.finish(30);

          case 34:
            return _context2.finish(27);

          case 35:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, _this, [[3, 23, 27, 35], [7, 15], [28,, 30, 34]]);
  }))();

  return _parse2.default.Promise.when(promises);
};