const EventEmitter = require('events');

module.exports = function (args) {
  let emitter = new EventEmitter();
  emitter.options = args;
  emitter.pushNotification = function(push, devices) {
    if (!Array.isArray(devices)) {
      devices = [devices];
    }
    devices.forEach((device) => {
      process.nextTick(() => {
        if (args.shouldFailTransmissions) {
          emitter.emit('transmissionError', -1, push, device);
        } else {
          emitter.emit('transmitted', push, device);
        }
      });
    });
  };
  return emitter;
}