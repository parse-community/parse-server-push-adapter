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

```
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
        /* Apple push notification options, see below for more info */
      },
      android: {
        /* Android push options, see below for more info */
      }
      web: {
        /* Web push options */
      }
    })
  },
  /* Other Parse Server options */
}
```

### Apple configuration

Delivering push notifications to Apple devices can be done either via Apple APNS (Apple Push Notification Service), or via FCM (Firebase Cloud Messaging) service. Note that each category of Apple devices require their own configuration section. Parse Server Push Adapter currently supports these types of Apple devices:

- `ios` -> iPhone, iPad, and iPod touch apps
- `osx` -> macOS, and macCatalyst apps
- `tvos` -> tvOS apps


Apple Push Notification Service requires a p8 encoded private key that can be generated and downloaded in Apple Developer Member Center under Certificates, Identifiers & Profiles.

Google Firebase Cloud Messaging requires Firebase Service Account json encoded private key that can be downloaded in Firebase Console under your project Settings, and Cloud Messaging tab.

Here is an example configuration for both methods:

```js
const PushAdapter = require('@parse/push-adapter').default;
const parseServerOptions = {
  push: {
    adapter: new PushAdapter({
      ios: {
        /* Deliver push notifications to iOS devices via Apple APNS */
        /* You will need app id, team id, and auth key available on developer.apple.com/account */
        token: {
          key: __dirname + '/AuthKey_XXXXXXXXXX.p8',
          keyId: "XXXXXXXXXX",
          teamId: "AAAAAAAAAA"
        },
        topic: 'com.example.yourawesomeapp',
        production: true
      },
      osx: {
        /* Deliver push notifications to macOS devices via Google FCM */
        /* You will need admin key available on console.firebase.google.com */
        firebaseServiceAccount: __dirname + "/your-awesome-app-firebase-adminsdk-abcd-efgh.json"
      }
    })
  },
  /* Other Parse Server options */
}
```

### Android configuration

Delivering push notifications to Android devices can be done via FCM (Firebase Cloud Messaging) service.

Google Firebase Cloud Messaging requires Firebase Service Account json encoded private key that can be downloaded in Firebase Console under your project Settings, and Cloud Messaging tab.

Here is an example configuration:

```js
const PushAdapter = require('@parse/push-adapter').default;
const parseServerOptions = {
  push: {
    adapter: new PushAdapter({
      android: {
        /* Deliver push notifications to Android devices via Google FCM */
        /* You will need admin key available on console.firebase.google.com */
        firebaseServiceAccount: __dirname + "/your-awesome-app-firebase-adminsdk-abcd-efgh.json"
      }
      web: {
        /* Web push options */
      }
    })
  },
  /* Other Parse Server options */
}
```
