// Babel-Config-> presets: es2015, babel-polyfill, stage-0

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = EXPO;

var _parse = _interopRequireDefault(require("parse"));

var _npmlog = _interopRequireDefault(require("npmlog"));

var _expoServerSdk = _interopRequireDefault(require("expo-server-sdk"));

require("babel-polyfill");

var _PushAdapterUtils = require("./PushAdapterUtils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var LOG_PREFIX = 'parse-server-push-adapter EXPO';
var GCMRegistrationTokensMax = 1000;
var EXPOTimeToLiveMax = 4 * 7 * 24 * 60 * 60; // GCM allows a max of 4 weeks

function EXPO(args) {
  this.sender = new _expoServerSdk["default"]();
}
/**
 * Send gcm request.
 * @param {Object} data The data we need to send, the format is the same with api request body
 * @param {Array} devices A array of devices
 * @returns {Object} A promise which is resolved after we get results from gcm
 */


EXPO.prototype.send = function (data, devices) {
  var _this = this;

  var pushId = (0, _PushAdapterUtils.randomString)(10); // Make a new array

  devices = devices.slice(0);
  var timestamp = Date.now();
  var expirationTime; // We handle the expiration_time convertion in push.js, so expiration_time is a valid date
  // in Unix epoch time in milliseconds here

  if (data['expiration_time']) {
    expirationTime = data['expiration_time'];
  }

  var messages = []; // Build a device map

  var devicesMap = devices.reduce(function (memo, device) {
    memo[device.deviceToken] = device;
    return memo;
  }, {});
  var deviceTokens = Object.keys(devicesMap);
  var promises = deviceTokens.map(function () {
    return new _parse["default"].Promise();
  });
  var registrationTokens = deviceTokens;
  var length = registrationTokens.length;

  _npmlog["default"].verbose(LOG_PREFIX, "sending to ".concat(length, " ").concat(length > 1 ? 'devices' : 'device'));

  var notificationData = {
    body: data.data.alert,
    title: data.data.title,
    badge: data.data.badge ? data.data.badge : 1,
    data: data.data
  };

  for (var _i = 0, _registrationTokens = registrationTokens; _i < _registrationTokens.length; _i++) {
    var pushToken = _registrationTokens[_i];

    if (!_expoServerSdk["default"].isExpoPushToken(pushToken)) {
      console.error("Push token ".concat(pushToken, " is not a valid Expo push token"));
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

  var chunks = this.sender.chunkPushNotifications(messages);
  var tickets = [];

  _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var _iterator, _step, chunkList, _iterator2, _step2, chunk, ticketChunk;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _iterator = _createForOfIteratorHelper(chunks);
            _context.prev = 1;

            _iterator.s();

          case 3:
            if ((_step = _iterator.n()).done) {
              _context.next = 32;
              break;
            }

            chunkList = _step.value;
            _iterator2 = _createForOfIteratorHelper(chunkList);
            _context.prev = 6;

            _iterator2.s();

          case 8:
            if ((_step2 = _iterator2.n()).done) {
              _context.next = 22;
              break;
            }

            chunk = _step2.value;
            _context.prev = 10;
            _context.next = 13;
            return _this.sender.sendPushNotificationsAsync([chunk]);

          case 13:
            ticketChunk = _context.sent;
            tickets.push.apply(tickets, _toConsumableArray(ticketChunk));
            _context.next = 20;
            break;

          case 17:
            _context.prev = 17;
            _context.t0 = _context["catch"](10);
            console.error(_context.t0);

          case 20:
            _context.next = 8;
            break;

          case 22:
            _context.next = 27;
            break;

          case 24:
            _context.prev = 24;
            _context.t1 = _context["catch"](6);

            _iterator2.e(_context.t1);

          case 27:
            _context.prev = 27;

            _iterator2.f();

            return _context.finish(27);

          case 30:
            _context.next = 3;
            break;

          case 32:
            _context.next = 37;
            break;

          case 34:
            _context.prev = 34;
            _context.t2 = _context["catch"](1);

            _iterator.e(_context.t2);

          case 37:
            _context.prev = 37;

            _iterator.f();

            return _context.finish(37);

          case 40:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[1, 34, 37, 40], [6, 24, 27, 30], [10, 17]]);
  }))();

  var receiptIds = [];

  for (var _i2 = 0, _tickets = tickets; _i2 < _tickets.length; _i2++) {
    var ticket = _tickets[_i2];

    if (ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  var receiptIdChunks = this.sender.chunkPushNotificationReceiptIds(receiptIds);

  _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
    var _iterator3, _step3, chunk, receipts;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _iterator3 = _createForOfIteratorHelper(receiptIdChunks);
            _context2.prev = 1;

            _iterator3.s();

          case 3:
            if ((_step3 = _iterator3.n()).done) {
              _context2.next = 18;
              break;
            }

            chunk = _step3.value;
            _context2.prev = 5;
            _context2.next = 8;
            return _this.sender.getPushNotificationReceiptsAsync(chunk);

          case 8:
            receipts = _context2.sent;
            console.log(receipts); // The receipts specify whether Apple or Google successfully received the
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
            _context2.next = 16;
            break;

          case 13:
            _context2.prev = 13;
            _context2.t0 = _context2["catch"](5);
            console.error(_context2.t0);

          case 16:
            _context2.next = 3;
            break;

          case 18:
            _context2.next = 23;
            break;

          case 20:
            _context2.prev = 20;
            _context2.t1 = _context2["catch"](1);

            _iterator3.e(_context2.t1);

          case 23:
            _context2.prev = 23;

            _iterator3.f();

            return _context2.finish(23);

          case 26:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, null, [[1, 20, 23, 26], [5, 13]]);
  }))();

  return _parse["default"].Promise.when(promises);
};
