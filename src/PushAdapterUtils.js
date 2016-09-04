import { randomBytes } from 'crypto';
import Parse from 'parse/node';
/**g
   * Classify the device token of installations based on its device type.
   * @param {Object} installations An array of installations
   * @param {Array} validPushTypes An array of valid push types(string)
   * @returns {Object} A map whose key is device type and value is an array of device
   */
export function classifyInstallations(installations, validPushTypes) {
  // Init deviceTokenMap, create a empty array for each valid pushType
  let deviceMap = {};
  for (let validPushType of validPushTypes) {
    deviceMap[validPushType] = [];
  }
  for (let installation of installations) {
    // No deviceToken, ignore
    if (!installation.deviceToken) {
      continue;
    }
    let devices = deviceMap[installation.pushType] || deviceMap[installation.deviceType] || null;
    if (Array.isArray(devices)) {
      devices.push({
        deviceToken: installation.deviceToken,
        appIdentifier: installation.appIdentifier
      });
    }
  }
  return deviceMap;
}

export function randomString(size) {
  if (size === 0) {
    throw new Error('Zero-length randomString is useless.');
  }
  let chars = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
               'abcdefghijklmnopqrstuvwxyz' +
               '0123456789');
  let objectId = '';
  let bytes = randomBytes(size);
  for (let i = 0; i < bytes.length; ++i) {
    objectId += chars[bytes.readUInt8(i) % chars.length];
  }
  return objectId;
}

/**
 * Slice a list of devices to several list of devices with fixed chunk size.
 * @param {Array} devices An array of devices
 * @param {Number} chunkSize The size of the a chunk
 * @returns {Array} An array which contaisn several arries of devices with fixed chunk size
 */
export function sliceDevices(devices, chunkSize) {
  let chunkDevices = [];
  while (devices.length > 0) {
    chunkDevices.push(devices.splice(0, chunkSize));
  }
  return chunkDevices;
}

export function sendByBatch(data, devices, maxBatchSize, sendCallback) {
  // Make a new array
  devices = new Array(...devices);
  let slices = sliceDevices(devices, maxBatchSize);
  if (slices.length > 1) {
    log.verbose(LOG_PREFIX, `the number of devices exceeds ${maxBatchSize}`);
  }
  // Make 1 send per slice
  let promises = slices.reduce((memo, slice) => {
    let promise = sendCallback(data, slice);
    memo.push(promise);
    return memo;
  }, [])
  return Parse.Promise.when(promises).then((results) => {
    let allResults = results.reduce((memo, result) => {
      return memo.concat(result);
    }, []);
    return Parse.Promise.as(allResults);
  });
}
