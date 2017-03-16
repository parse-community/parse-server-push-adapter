const EventEmitter = require('events');

module.exports = function (args) {
  let emitter = new EventEmitter();
  emitter.options = args;
  emitter.pushNotification = function(push, devices) {
    devices.forEach((device) => {
      process.nextTick(() => {
        emitter.emit('transmitted', push, device);
      });
    });
  };
  return emitter;
}