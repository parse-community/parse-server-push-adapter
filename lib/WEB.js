"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WEB = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _parse = require('parse');

var _parse2 = _interopRequireDefault(_parse);

var _npmlog = require('npmlog');

var _npmlog2 = _interopRequireDefault(_npmlog);

var _webPush = require('web-push');

var _webPush2 = _interopRequireDefault(_webPush);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LOG_PREFIX = 'parse-server-push-adapter WEB';

var WEB = exports.WEB = function () {
  /**
   * Create a new WEB push adapter.
   * 
   * @param {Object} args https://github.com/web-push-libs/web-push#api-reference
   */
  function WEB(args) {
    _classCallCheck(this, WEB);

    if ((typeof args === 'undefined' ? 'undefined' : _typeof(args)) !== 'object' || !args.vapidDetails) {
      throw new _parse2.default.Error(_parse2.default.Error.PUSH_MISCONFIGURED, 'WEB Push Configuration is invalid');
    }
    this.options = args;
  }

  /**
   * Send web push notification request.
   *
   * @param {Object} data The data we need to send, the format is the same with api request body
   * @param {Array} devices An array of devices
   * @returns {Object} A promise which is resolved immediately
   */


  _createClass(WEB, [{
    key: 'send',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(data, devices) {
        var coreData, devicesMap, deviceTokens, resolvers, promises, length, response, results, sent, failed;
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
                return WEB.sendNotifications(coreData, deviceTokens, this.options);

              case 12:
                response = _context.sent;
                results = response.results, sent = response.sent, failed = response.failed;

                if (sent) {
                  _npmlog2.default.verbose(LOG_PREFIX, 'WEB Response: %d out of %d sent successfully', sent, results.length);
                }
                if (failed) {
                  _npmlog2.default.error(LOG_PREFIX, 'send errored: %d out of %d failed with error %s', failed, results.length, 'push subscription has unsubscribed or expired.');
                }
                deviceTokens.forEach(function (token, index) {
                  var resolve = resolvers[index];
                  var _results$index = results[index],
                      result = _results$index.result,
                      error = _results$index.error;

                  var device = devicesMap[token];
                  device.deviceType = 'web';
                  var resolution = {
                    device: device,
                    response: error || result,
                    transmitted: !error
                  };
                  resolve(resolution);
                });
                return _context.abrupt('return', Promise.all(promises));

              case 18:
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
     * Send multiple web push notification request.
     *
     * @param {Object} payload The data we need to send, the format is the same with api request body
     * @param {Array} deviceTokens An array of devicesTokens
     * @param {Object} options The options for the request
     * @returns {Object} A promise which is resolved immediately
     */

  }], [{
    key: 'sendNotifications',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(payload, deviceTokens, options) {
        var promises, allResults, response;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                promises = deviceTokens.map(function (deviceToken) {
                  if (typeof deviceToken === 'string') {
                    deviceToken = JSON.parse(deviceToken);
                  }
                  if ((typeof payload === 'undefined' ? 'undefined' : _typeof(payload)) === 'object') {
                    payload = JSON.stringify(payload);
                  }
                  return _webPush2.default.sendNotification(deviceToken, payload, options);
                });
                _context2.next = 3;
                return Promise.allSettled(promises);

              case 3:
                allResults = _context2.sent;
                response = {
                  sent: 0,
                  failed: 0,
                  results: []
                };

                allResults.forEach(function (result) {
                  if (result.status === 'fulfilled') {
                    response.sent += 1;
                    response.results.push({ result: result.value.statusCode });
                  } else {
                    response.failed += 1;
                    response.results.push({ error: result.reason.body });
                  }
                });
                return _context2.abrupt('return', response);

              case 7:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function sendNotifications(_x3, _x4, _x5) {
        return _ref2.apply(this, arguments);
      }

      return sendNotifications;
    }()
  }]);

  return WEB;
}();

exports.default = WEB;