"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EXPO = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _parse = require('parse');

var _parse2 = _interopRequireDefault(_parse);

var _npmlog = require('npmlog');

var _npmlog2 = _interopRequireDefault(_npmlog);

var _expoServerSdk = require('expo-server-sdk');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LOG_PREFIX = 'parse-server-push-adapter EXPO';

function expoResultToParseResponse(result) {
  if (result.status === 'ok') {
    return result;
  } else {
    // ParseServer looks for "error", and supports ceratin codes like 'NotRegistered' for
    // cleanup. Expo returns slighyly different ones so changing to match what is expected
    // This can be taken out if the responsibility gets moved to the adapter itself.
    var error = result.message === 'DeviceNotRegistered' ? 'NotRegistered' : result.message;
    return _extends({
      error: error
    }, result);
  }
}

var EXPO = exports.EXPO = function () {
  /**
   * Create a new EXPO push adapter. Based on Web Adapter.
   *
   * @param {Object} args https://github.com/expo/expo-server-sdk-node / https://docs.expo.dev/push-notifications/sending-notifications/
   */
  function EXPO(args) {
    _classCallCheck(this, EXPO);

    this.expo = undefined;

    if ((typeof args === 'undefined' ? 'undefined' : _typeof(args)) !== 'object') {
      throw new _parse2.default.Error(_parse2.default.Error.PUSH_MISCONFIGURED, 'EXPO Push Configuration is invalid');
    }

    this.expo = new _expoServerSdk.Expo(args);
    this.options = args;
  }

  /**
   * Send Expo push notification request.
   *
   * @param {Object} data The data we need to send, the format is the same with api request body
   * @param {Array} devices An array of devices
   * @returns {Object} A promise which is resolved immediately
   */


  _createClass(EXPO, [{
    key: 'send',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(data, devices) {
        var coreData, devicesMap, deviceTokens, resolvers, promises, length, response;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                coreData = data && data.data;

                if (!(!coreData || !devices || !Array.isArray(devices))) {
                  _context.next = 4;
                  break;
                }

                _npmlog2.default.warn(LOG_PREFIX, 'invalid push payload');
                return _context.abrupt('return');

              case 4:
                devicesMap = devices.reduce(function (memo, device) {
                  memo[device.deviceToken] = device;
                  return memo;
                }, {});
                deviceTokens = Object.keys(devicesMap);
                resolvers = [];
                promises = deviceTokens.map(function () {
                  return new Promise(function (resolve) {
                    return resolvers.push(resolve);
                  });
                });
                length = deviceTokens.length;


                _npmlog2.default.verbose(LOG_PREFIX, 'sending to ' + length + ' ' + (length > 1 ? 'devices' : 'device'));

                _context.next = 12;
                return this.sendNotifications(coreData, deviceTokens);

              case 12:
                response = _context.sent;


                _npmlog2.default.verbose(LOG_PREFIX, 'EXPO Response: %d sent', response.length);

                deviceTokens.forEach(function (token, index) {
                  var resolve = resolvers[index];
                  var result = response[index];
                  var device = devicesMap[token];
                  var resolution = {
                    transmitted: result.status === 'ok',
                    device: _extends({}, device, {
                      pushType: 'expo'
                    }),
                    response: expoResultToParseResponse(result)
                  };
                  resolve(resolution);
                });
                return _context.abrupt('return', Promise.all(promises));

              case 16:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function send(_x, _x2) {
        return _ref.apply(this, arguments);
      }

      return send;
    }()

    /**
     * Send multiple Expo push notification request.
     *
     * @param {Object} payload The data we need to send, the format is the same with api request body
     * @param {Array} deviceTokens An array of devicesTokens
     * @param {Object} options The options for the request
     * @returns {Object} A promise which is resolved immediately
     */

  }, {
    key: 'sendNotifications',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(_ref3, deviceTokens) {
        var alert = _ref3.alert,
            body = _ref3.body,
            payload = _objectWithoutProperties(_ref3, ['alert', 'body']);

        var messages;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                messages = deviceTokens.map(function (token) {
                  return _extends({
                    to: token,
                    body: body || alert
                  }, payload);
                });
                _context2.next = 3;
                return this.expo.sendPushNotificationsAsync(messages);

              case 3:
                return _context2.abrupt('return', _context2.sent);

              case 4:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function sendNotifications(_x3, _x4) {
        return _ref2.apply(this, arguments);
      }

      return sendNotifications;
    }()
  }]);

  return EXPO;
}();

exports.default = EXPO;