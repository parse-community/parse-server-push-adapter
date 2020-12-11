# parse-server-push-adapter

[![NPM Version](https://img.shields.io/npm/v/@parse/push-adapter.svg?style=flat-square)](https://www.npmjs.com/package/@parse/push-adapter)
[![codecov.io](https://codecov.io/github/parse-community/parse-server-push-adapter/coverage.svg?branch=master)](https://codecov.io/github/parse-community/parse-server-push-adapter?branch=master)
<a href="https://github.com/parse-community/parse-server-push-adapter/actions?query=workflow%3Aci+branch%3Amaster">
  <img alt="Build status" src="https://github.com/parse-community/parse-server-push-adapter/workflows/ci/badge.svg?branch=master">
</a>

Official Push adapter for parse-server

See [parse-server push configuration](http://docs.parseplatform.org/parse-server/guide/#push-notifications)

## Silent Notifications

If you have migrated from parse.com and you are seeing situations where silent (newsstand-like presentless) notifications are failing to deliver please ensure that your payload is setting the content-available attribute to Int(1) and not "1" This value will be explicitly checked.

### see more logs

You can enable verbose logging with environment variables:

```
VERBOSE=1

or 

VERBOSE_PARSE_SERVER_PUSH_ADAPTER=1
```

This will produce a more verbose output for all the push sending attempts

### Using a custom version on parse-server

#### Install the push adapter

```
npm install --save @parse/push-adapter@VERSION
```

Replace VERSION with the version you want to install.

#### Configure parse-server

```js
const PushAdapter = require('@parse/push-adapter').default;
const pushOptions = {
  ios: { /* iOS push options */ } ,
  android: { /* android push options */ }   
}
// starting 3.0.0
const options = {
  appId: "****",
  masterKey: "****",
  push: {
    adapter: new PushAdapter(pushOptions),
  },
  /* ... */ 
}

const server = new ParseServer(options);

/* continue with the initialization of parse-server */
```

## Want to ride the bleeding edge?

We recommend using the most recent tagged build published to npm for production. However, you can test not-yet-released versions of the parse-server-push-adapter by referencing specific branches in your `package.json`. For example, to use the master branch:

```
npm install parse-community/parse-server-push-adapter.git#master
```

### Experimenting

You can also use your own forks, and work in progress branches by specifying them:

```
npm install github:myUsername/parse-server-push-adapter#my-awesome-feature
```
