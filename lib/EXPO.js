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

// GCM.GCMRegistrationTokensMax = GCMRegistrationTokensMax;

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
        body: data.data.alert,
        title: data.data.title,
        badge: data.badge ? data.data.badge : 1,
        data: data.data,
        ttl: EXPOTimeToLiveMax,
        priority: 'high',
        channelId: 'fif-notifications'
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
    var _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, chunk, ticketChunk;

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
              _context.next = 20;
              break;
            }

            chunk = _step2.value;
            _context.prev = 7;
            _context.next = 10;
            return _this.sender.sendPushNotificationsAsync(chunk);

          case 10:
            ticketChunk = _context.sent;

            tickets.push.apply(tickets, _toConsumableArray(ticketChunk));
            _context.next = 17;
            break;

          case 14:
            _context.prev = 14;
            _context.t0 = _context['catch'](7);

            console.error(_context.t0);

          case 17:
            _iteratorNormalCompletion2 = true;
            _context.next = 5;
            break;

          case 20:
            _context.next = 26;
            break;

          case 22:
            _context.prev = 22;
            _context.t1 = _context['catch'](3);
            _didIteratorError2 = true;
            _iteratorError2 = _context.t1;

          case 26:
            _context.prev = 26;
            _context.prev = 27;

            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }

          case 29:
            _context.prev = 29;

            if (!_didIteratorError2) {
              _context.next = 32;
              break;
            }

            throw _iteratorError2;

          case 32:
            return _context.finish(29);

          case 33:
            return _context.finish(26);

          case 34:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, _this, [[3, 22, 26, 34], [7, 14], [27,, 29, 33]]);
  }))();

  var receiptIds = [];
  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = tickets[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var ticket = _step3.value;

      if (ticket.id) {
        receiptIds.push(ticket.id);
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  var receiptIdChunks = this.sender.chunkPushNotificationReceiptIds(receiptIds);
  _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
    var _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, chunk, receipts;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _iteratorNormalCompletion4 = true;
            _didIteratorError4 = false;
            _iteratorError4 = undefined;
            _context2.prev = 3;
            _iterator4 = receiptIdChunks[Symbol.iterator]();

          case 5:
            if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
              _context2.next = 21;
              break;
            }

            chunk = _step4.value;
            _context2.prev = 7;
            _context2.next = 10;
            return _this.sender.getPushNotificationReceiptsAsync(chunk);

          case 10:
            receipts = _context2.sent;

            console.log(receipts);

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
            _iteratorNormalCompletion4 = true;
            _context2.next = 5;
            break;

          case 21:
            _context2.next = 27;
            break;

          case 23:
            _context2.prev = 23;
            _context2.t1 = _context2['catch'](3);
            _didIteratorError4 = true;
            _iteratorError4 = _context2.t1;

          case 27:
            _context2.prev = 27;
            _context2.prev = 28;

            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }

          case 30:
            _context2.prev = 30;

            if (!_didIteratorError4) {
              _context2.next = 33;
              break;
            }

            throw _iteratorError4;

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