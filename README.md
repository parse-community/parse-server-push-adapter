# Parse Server Push Adapter <!-- omit in toc -->

[![Build Status](https://github.com/parse-community/parse-server-push-adapter/workflows/ci/badge.svg?branch=master)](https://github.com/parse-community/parse-server-push-adapter/actions?query=workflow%3Aci+branch%3Amaster)
[![Snyk Badge](https://snyk.io/test/github/parse-community/parse-server-push-adapter/badge.svg)](https://snyk.io/test/github/parse-community/parse-server-push-adapter)
[![Coverage](https://img.shields.io/codecov/c/github/parse-community/parse-server-push-adapter/master.svg)](https://codecov.io/github/parse-community/parse-server-push-adapter?branch=master)
[![auto-release](https://img.shields.io/badge/%F0%9F%9A%80-auto--release-9e34eb.svg)](https://github.com/parse-community/parse-server-push-adapter/releases)

[![Node Version](https://img.shields.io/badge/nodejs-18,_20-green.svg?logo=node.js&style=flat)](https://nodejs.org)

[![npm latest version](https://img.shields.io/npm/v/@parse/push-adapter.svg)](https://www.npmjs.com/package/@parse/push-adapter)

---

The official Push Notification adapter for Parse Server. See [Parse Server Push Configuration](http://docs.parseplatform.org/parse-server/guide/#push-notifications) for more details.

---

- [Silent Notifications](#silent-notifications)
- [Logging](#logging)
- [Using a Custom Version on Parse Server](#using-a-custom-version-on-parse-server)
  - [Install Push Adapter](#install-push-adapter)
  - [Configure Parse Server](#configure-parse-server)
    - [Expo Push Options](#expo-push-options)

# Silent Notifications

If you have migrated from parse.com and you are seeing situations where silent (newsstand-like presentless) notifications are failing to deliver please ensure that your payload is setting the content-available attribute to Int(1) and not "1" This value will be explicitly checked.

# Logging

You can enable verbose logging with environment variables:

```
VERBOSE=1

or

VERBOSE_PARSE_SERVER_PUSH_ADAPTER=1
```

This will produce a more verbose output for all the push sending attempts

# Using a Custom Version on Parse Server

## Install Push Adapter

```bash
npm install --save @parse/push-adapter@<VERSION>
```

Replace `<VERSION>` with the version you want to install.

## Configure Parse Server

```js
const PushAdapter = require('@parse/push-adapter').default;
const parseServerOptions = {
  push: {
    adapter: new PushAdapter({
      ios: {
        // Apple push options
      },
      android: {
        // Android push options
      },
      web: {
        // Web push options
      },
      expo: {
        // Expo push options
      },
    }),
  },
  // Other Parse Server options
}
```

### Apple Push Options

Parse Server Push Adapter currently supports these types of Apple ecosystems:

- `ios`: iPhone, iPad, and iPod touch apps
- `osx`: macOS, and macCatalyst apps
- `tvos`: tvOS apps

Delivering push notifications to Apple devices can be done either via Apple Push Notification Service (APNS), or via Firebase Cloud Messaging (FMC). Note that each category of Apple devices require their own configuration section:

- APNS requires a private key that can be downloaded from the Apple Developer Center at https://developer.apple.com/account under _Certificates > Identifiers & Profiles._ The adapter options also require the app ID and team ID which can be found there.
- FCM requires a private key that can be downloaded from the Firebase Console at https://console.firebase.google.com in your project under _Settings > Cloud Messaging._

Example options:

Both services (APNS, FCM) can be used in combination for different Apple ecosystems.

```js
const PushAdapter = require('@parse/push-adapter').default;
const parseServerOptions = {
  push: {
    adapter: new PushAdapter({
      ios: {
        // Deliver push notifications to iOS devices via APNS
        token: {
          key: __dirname + '/AuthKey_XXXXXXXXXX.p8',
          keyId: "XXXXXXXXXX",
          teamId: "AAAAAAAAAA"
        },
        topic: 'com.example.yourawesomeapp',
        production: true
      },
      osx: {
        // Deliver push notifications to macOS devices via FCM
        firebaseServiceAccount: __dirname + '/firebase.json'
      },
    }),
  },
  // Other Parse Server options
}
```

### Android Push Options

Delivering push notifications to Android devices can be done via Firebase Cloud Messaging (FCM):

- FCM requires a private key that can be downloaded from the Firebase Console at https://console.firebase.google.com in your project under _Settings > Cloud Messaging._

Example options:

```js
const PushAdapter = require('@parse/push-adapter').default;
const parseServerOptions = {
  push: {
    adapter: new PushAdapter({
      android: {
        firebaseServiceAccount: __dirname + '/firebase.json'
      },
    }),
  },
  // Other Parse Server options
}
```

#### Migration from FCM legacy API to FCM HTTP v1 API (June 2024)

Sending push notifications to Android devices via the FCM legacy API was deprecated on June 20 2023 and was announced to be decomissioned in June 2024. See [Google docs](https://firebase.google.com/docs/cloud-messaging/migrate-v1). To send push notifications to the newer FCM HTTP v1 API you need to update your existing push configuration for Android by replacing the key `apiKey` with `firebaseServiceAccount`.

Example options:

```js
const PushAdapter = require('@parse/push-adapter').default;
const parseServerOptions = {
  push: {
    adapter: new PushAdapter({
      android: {
        // Deliver push notifications via FCM legacy API (deprecated)
        apiKey: '<API_KEY>'
      },
    }),
  },
  // Other Parse Server options
}
```

### Expo Push Options

Example options:

```js
expo: {
  accessToken: '<EXPO_ACCESS_TOKEN>',
},
```

For more information see the [Expo docs](https://docs.expo.dev/push-notifications/overview/).
