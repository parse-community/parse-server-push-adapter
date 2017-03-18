const { randomBytes } = require('crypto');

/**g
   * Classify the device token of installations based on its device type.
   * @param {Object} installations An array of installations
   * @param {Array} validPushTypes An array of valid push types(string)
   * @returns {Object} A map whose key is device type and value is an array of device
   */
function classifyInstallations(installations, validPushTypes) {
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
        deviceType: installation.deviceType,
        appIdentifier: installation.appIdentifier
      });
    }
  }
  return deviceMap;
}

function randomString(size) {
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

module.exports = {
  classifyInstallations,
  randomString
}
