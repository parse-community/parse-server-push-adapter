# Parse Server Push Adapter <!-- omit in toc -->

[![Build Status](https://github.com/parse-community/parse-server-push-adapter/actions/workflows/ci.yml/badge.svg)](https://github.com/parse-community/parse-server-push-adapter/actions/workflows/ci.yml)
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
  - [Firebase Cloud Messaging (FCM)](#firebase-cloud-messaging-fcm)
    - [Google Cloud Service Account Key](#google-cloud-service-account-key)
    - [Migration to FCM HTTP v1 API (June 2024)](#migration-to-fcm-http-v1-api-june-2024)
    - [HTTP/1.1 Legacy Option](#http11-legacy-option)
    - [Firebase Client Error](#firebase-client-error)
  - [Expo Push Options](#expo-push-options)
- [Push Queue](#push-queue)
  - [Throttling](#throttling)
  - [Push Options](#push-options)
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
- `watchos`: watchOS apps

Push notifications can be delivered to Apple devices either via Apple Push Notification Service (APNS) or Firebase Cloud Messaging (FMC). Note that each category of Apple devices requires their own configuration section:

- APNS requires a private key that can be downloaded from the Apple Developer Center at https://developer.apple.com/account under _Certificates > Identifiers & Profiles._ The adapter options also require the app ID and team ID, which can be found there.
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

### Firebase Cloud Messaging (FCM)

This section contains some considerations when using FCM, regardless of the destination ecosystems the push notification is sent to.

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

#### HTTP/1.1 Legacy Option

With the introduction of the FCM HTTP v1 API, support for HTTP/2 was added which provides faster throughput for push notifications. To use the older version HTTP/1.1 set `fcmEnableLegacyHttpTransport: true` in your push options.

Example options:

```js
android: {
  firebaseServiceAccount: __dirname + '/firebase.json',
  fcmEnableLegacyHttpTransport: true
}
```

#### Firebase Client Error

Occasionally, errors within the Firebase Cloud Messaging (FCM) client may not be managed internally and are instead passed to the Parse Server Push Adapter. These errors can occur, for instance, due to unhandled FCM server connection issues.

- `resolveUnhandledClientError: true`: Logs the error and gracefully resolves it, ensuring that push sending does not result in a failure.
- `resolveUnhandledClientError: false`: Causes push sending to fail, returning a `Parse.Error.OTHER_CAUSE` with error details that can be parsed to handle it accordingly. This is the default.

In both cases, detailed error logs are recorded in the Parse Server logs for debugging purposes.

### Expo Push Options

Example options:

```js
expo: {
  accessToken: '<EXPO_ACCESS_TOKEN>'
}
```

For more information see the [Expo docs](https://docs.expo.dev/push-notifications/overview/).

## Push Queue

### Throttling

Push providers usually throttle their APIs, so that sending too many pushes notifications within a short time may cause the API not accept any more requests. To address this, push sending can be throttled per provider by adding a `throttle` option to the respective push configuration. The option `maxPerSecond` defines the maximum number of pushes sent per second. If not throttle is configured, pushes are sent as quickly as possible.

Example throttle configuration:

```js
const parseServerOptions = {
  push: {
    adapter: new ParsePushAdapter({
      ios: {
        // ...
        queue: {
          throttle: { maxPerSecond: 100 }
        }
      }
    })
  }
};
```

### Push Options

Each push request may specify the following options for handling in the queue.

| Parameter        | Default    | Optional | Description                                                                                                                                                                                  |
|------------------|------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `queue.ttl`      | `Infinity` | Yes      | The time-to-live of the push in the queue in seconds. If a queued push expires before it is sent to the push provider, it is discarded. Default is `Infinity`, meaning pushes never expire.  |
| `queue.priority` | `0`        | Yes      | The priority of the push in the queue. When processing the queue, pushes are sent in order of their priority. For example, a push with priority `1` is sent before a push with priority `0`. |

Example push payload:

```js
pushData = {
  queue: {
    // Discard after 10 seconds from queue if push has not been sent to push provider yet
    ttl: 10,
    // Send with higher priority than default pushes
    priority: 1,
  },
  data: { alert: 'Hello' }
};
```

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
