const EventEmitter = require('events');

const MockAPNProvider = function (args) {
  const emitter = new EventEmitter();
  emitter.options = args;
  emitter.send = function(push, devices) {
    if (!Array.isArray(devices)) {
      devices = [devices];
    }
    const sent = [];
    const failed = [];

    devices.forEach((device) => {
      if (args.shouldFailTransmissions) {
        if (args.errorBuilder) {
          failed.push()
        } else {
          failed.push({
            error: "Something went wrong",
            status: -1,
            device
          });
        }
      } else {
        sent.push({
          device
        });
      }
    })
    return Promise.resolve({ sent, failed });
  };
  return emitter;
}

const makeError = function(device) {
  return {
    error: "Something went wrong",
    status: -1,
    device
  }
};

MockAPNProvider.makeError = makeError;
MockAPNProvider.restore = function() {
  MockAPNProvider.makeError = makeError;
}

module.exports = MockAPNProvider;
