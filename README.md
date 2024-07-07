# Parse Server Push Adapter <!-- omit in toc -->

[![Build Status](https://github.com/parse-community/parse-server-push-adapter/workflows/ci/badge.svg?branch=master)](https://github.com/parse-community/parse-server-push-adapter/actions?query=workflow%3Aci+branch%3Amaster)
[![Snyk Badge](https://snyk.io/test/github/parse-community/parse-server-push-adapter/badge.svg)](https://snyk.io/test/github/parse-community/parse-server-push-adapter)
[![Coverage](https://img.shields.io/codecov/c/github/parse-community/parse-server-push-adapter/master.svg)](https://codecov.io/github/parse-community/parse-server-push-adapter?branch=master)
[![auto-release](https://img.shields.io/badge/%F0%9F%9A%80-auto--release-9e34eb.svg)](https://github.com/parse-community/parse-server-push-adapter/releases)

[![Node Version](https://img.shields.io/badge/nodejs-18,_20,_22-green.svg?logo=node.js&style=flat)](https://nodejs.org)

[![npm latest version](https://img.shields.io/npm/v/@parse/push-adapter.svg)](https://www.npmjs.com/package/@parse/push-adapter)

---

The official Push Notification adapter for Parse Server. See [Parse Server Push Configuration](http://docs.parseplatform.org/parse-server/guide/#push-notifications) for more details.

---

- [Installation](#installation)
- [Configure Parse Server](#configure-parse-server)
  - [Apple Push Options](#apple-push-options)
  - [Android Push Options](#android-push-options)
    - [Google Cloud Service Account Key](#google-cloud-service-account-key)
    - [Migration to FCM HTTP v1 API (June 2024)](#migration-to-fcm-http-v1-api-june-2024)
  - [Expo Push Options](#expo-push-options)
- [Bundled with Parse Server](#bundled-with-parse-server)
- [Logging](#logging)

## Installation

```shell
npm install --save @parse/push-adapter@<VERSION>
```

Replace `<VERSION>` with the version you want to install.

## Configure Parse Server

```js
import { ParsePushAdapter } from '@parse/push-adapter';

// For CommonJS replace the import statemtent above with the following line:
// const ParsePushAdapter = require('@parse/push-adapter').default;

const parseServerOptions = {
  push: {
    adapter: new ParsePushAdapter({
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
      }
    })
  }
  // Other Parse Server options
};
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
ios: {
  // Deliver push notifications to iOS devices via APNS
  token: {
    key: __dirname + '/apns.p8',
    keyId: '<APNS_KEY_ID>',
    teamId: '<APNS_TEAM_ID>'
  },
  topic: '<BUNDLE_IDENTIFIER>',
  production: true
},
osx: {
  // Deliver push notifications to macOS devices via FCM
  firebaseServiceAccount: __dirname + '/firebase.json'
}
```

### Android Push Options

Delivering push notifications to Android devices can be done via Firebase Cloud Messaging (FCM):

- FCM requires a private key that can be downloaded from the Firebase Console at https://console.firebase.google.com in your project under _Settings > Cloud Messaging._

Example options:

```js
android: {
  firebaseServiceAccount: __dirname + '/firebase.json'
}
```

#### Google Cloud Service Account Key

The Firebase console allows to easily create and download a Google Cloud service account key JSON file with the required permissions. Instead of setting `firebaseServiceAccount` to the path of the JSON file, you can provide an object representing a Google Cloud service account key:

```js
android: {
  firebaseServiceAccount: {
    projectId: '<PROJECT_ID>',
    clientEmail: 'example@<PROJECT_ID>.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----<KEY>-----END PRIVATE KEY-----\n'
  }
}
```

This can be helpful if you are already managing credentials to Google Cloud APIs in other parts of your code and you want to reuse these credentials, or if you want to manage credentials on a more granular level directly in Google Cloud. Make sure that the service account has the permission `cloudmessaging.messages.create` which is for example part of role `Firebase Cloud Messaging API Admin`.

#### Migration to FCM HTTP v1 API (June 2024)

⚠️ Sending push notifications to Android devices via the FCM legacy API was deprecated on June 20 2023 and was announced to be decommissioned in June 2024. See [Google docs](https://firebase.google.com/docs/cloud-messaging/migrate-v1). To send push notifications to the newer FCM HTTP v1 API you need to update your existing push configuration for Android by replacing the key `apiKey` with `firebaseServiceAccount`.

Example options (deprecated):

```js
android: {
  // Deliver push notifications via FCM legacy API (deprecated)
  apiKey: '<API_KEY>'
}
```

### Expo Push Options

Example options:

```js
expo: {
  accessToken: '<EXPO_ACCESS_TOKEN>'
}
```

For more information see the [Expo docs](https://docs.expo.dev/push-notifications/overview/).

## Bundled with Parse Server

Parse Server already comes bundled with a specific version of the push adapter. This installation is only necessary when customizing the push adapter version that should be used by Parse Server. When using a customized version of the push adapter, ensure that it's compatible with the version of Parse Server you are using.

When using the bundled version, it is not necessary to initialize the push adapter in code and the push options are configured directly in the `push` key, without the nested `adapter` key:

```js
const parseServerOptions = {
  push: {
    ios: {
      // Apple push options
    }
    // Other push options
  }
  // Other Parse Server options
};
```

## Logging

You can enable verbose logging to produce a more detailed output for all push sending attempts with the following environment variables:

```js
VERBOSE=1
```

or

```js
VERBOSE_PARSE_SERVER_PUSH_ADAPTER=1
```
