# [4.2.0](https://github.com/parse-community/parse-server-push-adapter/compare/4.1.3...4.2.0) (2023-08-06)


### Features

* Upgrade @parse/node-apn from 5.1.3 to 5.2.1 ([#220](https://github.com/parse-community/parse-server-push-adapter/issues/220)) ([3b932d1](https://github.com/parse-community/parse-server-push-adapter/commit/3b932d1e40ddf81d38fcd7f3bbb71bbdcf848978))

## [4.1.3](https://github.com/parse-community/parse-server-push-adapter/compare/4.1.2...4.1.3) (2023-05-20)


### Bug Fixes

* Validate push notification payload; fixes a security vulnerability in which the adapter can crash Parse Server due to an invalid push notification payload ([#217](https://github.com/parse-community/parse-server-push-adapter/issues/217)) ([598cb84](https://github.com/parse-community/parse-server-push-adapter/commit/598cb84d0866b7c5850ca96af920e8cb5ba243ec))

## [4.1.2](https://github.com/parse-community/parse-server-push-adapter/compare/4.1.1...4.1.2) (2022-03-27)


### Bug Fixes

* security bump node-apn 5.1.0 to 5.1.3 ([#207](https://github.com/parse-community/parse-server-push-adapter/issues/207)) ([7257c9a](https://github.com/parse-community/parse-server-push-adapter/commit/7257c9af57eb95e2d4931151bf1e7020ae6b00b7))

## [4.1.1](https://github.com/parse-community/parse-server-push-adapter/compare/4.1.0...4.1.1) (2022-03-27)


### Bug Fixes

* security bump node-fetch from 2.6.6 to 2.6.7 ([#206](https://github.com/parse-community/parse-server-push-adapter/issues/206)) ([3b41a4e](https://github.com/parse-community/parse-server-push-adapter/commit/3b41a4ef04c9ae9e3fb61c0042bcd8e5ab66dfb0))

# [4.1.0](https://github.com/parse-community/parse-server-push-adapter/compare/4.0.0...4.1.0) (2021-11-21)


### Features

* add support for APNS `interruption-level` and `target-content-id` ([#197](https://github.com/parse-community/parse-server-push-adapter/issues/197)) ([e0541ec](https://github.com/parse-community/parse-server-push-adapter/commit/e0541ecc5fd894c5bf34815f837ce41cb467c86f))

# 4.0.0
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.4.1...4.0.0)

### BREAKING CHANGE
- node-apn 5 requires node >= 12 ([#198](https://github.com/parse-community/parse-server-push-adapter/pull/198))

### Bug Fixes
- bump node-apn to 5.0 ([#198](https://github.com/parse-community/parse-server-push-adapter/pull/198))

# 3.4.1
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.4.0...3.4.1)

- Security fixes (Manuel Trezza) [#193](https://github.com/parse-community/parse-server-push-adapter/pull/193)

# [3.4.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.4.0) (2020-10-19)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.3.0...3.4.0)

- Support installing from branch ([#177](https://github.com/parse-community/parse-server-push-adapter/pull/177)) (thanks to [@dplewis](https://github.com/dplewis))
- Update @parse/node-apn@4.0.0
- Update parse@2.17.0

# [3.3.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.3.0) (2020-09-24)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.2.0...3.3.0)

- Update @parse/node-apn ([#170](https://github.com/parse-community/parse-server-push-adapter/pull/170))
- Fixed wrong usage of contentAvailable for iOS push notifications via Firebase ([#165](https://github.com/parse-community/parse-server-push-adapter/pull/165)) (thanks to [@supermar1010](https://github.com/supermar1010))
- Adds request options for the gcm.Sender ([#153](https://github.com/parse-community/parse-server-push-adapter/pull/153)) (thanks to [@simonegiacco](https://github.com/simonegiacco))
- parse@2.16.0

# [3.2.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.2.0) (2019-10-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.1.0...3.2.0)

- Support headers (expiration_time, collapse_id, push_type, priority) in data field ([#148](https://github.com/parse-community/parse-server-push-adapter/pull/148)) (thanks to [@dplewis](https://github.com/dplewis))
- parse@2.8.0

# [3.1.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.1.0) (2019-10-03)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.10...3.1.0)

- Update @parse/node-apn.
- Update parse.

# [3.0.10](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.10) (2019-08-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.9...3.0.10)

Use @parse/node-apn served from npm instead of using our fork served from github.


# [3.0.9](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.9) (2019-07-30)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.8...3.0.9)

Fix: Update node-apn version and improve publish script ([#141](https://github.com/parse-community/parse-server-push-adapter/pull/141)) (thanks to [@davimacedo](https://github.com/davimacedo))

# [3.0.8](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.8) (2019-07-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.7...3.0.8)

Last release had its lib/ folder published but it's failing in parse-server tests. Trying to fix.

# [3.0.7](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.7) (2019-07-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.6...3.0.7)

New attempt to fix last release since it was published empty to npm.

# [3.0.6](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.6) (2019-07-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.5...3.0.6)

Fix last release since it was published empty to npm.

# [3.0.5](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.5) (2019-07-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.4...3.0.5)

Trying to make Travis publish to npm.

# [3.0.4](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.4) (2019-07-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.3...3.0.4)

**What's new**

- Add support for apns-push-type [\#1](https://github.com/parse-community/parse-server-push-adapter/pull/127) (thanks to [@funkenstrahlen](https://github.com/funkenstrahlen))

# [3.0.3](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.3) (2019-07-12)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.2...3.0.3)

Continuing attempt to get travis to deploy to npm on release.  Third time's a charm?

# [3.0.2](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.2) (2019-07-12)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/3.0.1...3.0.2)

Update Travis to deploy the correct repo to npm

# [3.0.1](https://github.com/parse-server-modules/parse-server-push-adapter/tree/3.0.1) (2019-07-11)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v2.0.3...3.0.1)

Update Packages to address security alerts


## [2.0.3](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v2.0.3) (2018-04-13)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v2.0.2...v2.0.3)

**What's new**

- Use updated node-gcm version from @parse org. with safe request version

## [2.0.2](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v2.0.2) (2017-10-22)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v2.0.1...v2.0.2)

**What's new**

- Adds ability to pass apn key for iOS pushes

## [2.0.1](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v2.0.1) (2017-10-21)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v2.0.0...v2.0.1)

**What's new**

- Fixes issue setting the push notificaiton title

## [2.0.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v2.0.0) (2017-03-14)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v2.0.0-alpha.1...v2.0.0)

**What's new**

- Adds support for APNS notification title
- Adds support for APN collapse-id


## [2.0.0-alpha.1](https://github.com/parse-server-modules/parse-server-push-adapter/tree/2.0.0-alpha.1) (2017-03-14)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v1.3.0...v2.0.0-alpha.1)

**What's new**

- Adds support for APNS with HTTP/2.0
- Improvements in testing, tooling

## [1.3.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/1.3.0) (2017-03-14)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v1.2.0...1.3.0)

**Closed issues:**

- Modernize dependencies and test tools [\#60](https://github.com/parse-server-modules/parse-server-push-adapter/issues/60)
- Fixed link for Parse-server push configuration [\#57](https://github.com/parse-server-modules/parse-server-push-adapter/issues/57)

**Merged pull requests:**

- Add macOS and tvOS push notification support [\#58](https://github.com/parse-server-modules/parse-server-push-adapter/pull/58) ([funkenstrahlen](https://github.com/funkenstrahlen))
- Require node version >= 4.6.0 [\#53](https://github.com/parse-server-modules/parse-server-push-adapter/pull/53) ([flovilmart](https://github.com/flovilmart))

## [1.2.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/1.2.0) (2017-01-16)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v1.1.0...1.2.0)

**Closed issues:**

- Classify installation with pushType and failback with deviceType [\#31](https://github.com/parse-server-modules/parse-server-push-adapter/issues/31)
- Send deviceType key to push handler [\#39](https://github.com/parse-server-modules/parse-server-push-adapter/issues/39)
- Added notification field for fcm [\#41](https://github.com/parse-server-modules/parse-server-push-adapter/issues/41)
- fixes 64k limit on GCM push. [\#49](https://github.com/parse-server-modules/parse-server-push-adapter/issues/49)

## [1.1.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/1.1.0) (2016-08-25)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v1.0.4...1.1.0)

**Closed issues:**

- New release for `mutableContent` [\#28](https://github.com/parse-server-modules/parse-server-push-adapter/issues/28)
- APNS TypeError: Cannot read property 'key' of undefined [\#24](https://github.com/parse-server-modules/parse-server-push-adapter/issues/24)
- Can not find sender for push type android/ios [\#16](https://github.com/parse-server-modules/parse-server-push-adapter/issues/16)
- APNS adapter failure -- cannot find valid connection [\#15](https://github.com/parse-server-modules/parse-server-push-adapter/issues/15)
- pushing to thousands of installations [\#9](https://github.com/parse-server-modules/parse-server-push-adapter/issues/9)
- Push is not delivered to iOS device [\#8](https://github.com/parse-server-modules/parse-server-push-adapter/issues/8)
- Push not sent to iOS Device [\#4](https://github.com/parse-server-modules/parse-server-push-adapter/issues/4)

**Merged pull requests:**

- Support `mutable-content` [\#27](https://github.com/parse-server-modules/parse-server-push-adapter/pull/27) ([alexanderedge](https://github.com/alexanderedge))
- Update README.md [\#18](https://github.com/parse-server-modules/parse-server-push-adapter/pull/18) ([tingham](https://github.com/tingham))
- APNS expects expiration time to be in seconds, not MS. [\#14](https://github.com/parse-server-modules/parse-server-push-adapter/pull/14) ([0x18B2EE](https://github.com/0x18B2EE))
- Push notifications to APNS per batches [\#10](https://github.com/parse-server-modules/parse-server-push-adapter/pull/10) ([flovilmart](https://github.com/flovilmart))

## [v1.0.4](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v1.0.4) (2016-03-30)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v1.0.3...v1.0.4)

**Closed issues:**

- Push notifications not sent [\#2](https://github.com/parse-server-modules/parse-server-push-adapter/issues/2)

**Merged pull requests:**

- :tada: v1.0.4 [\#7](https://github.com/parse-server-modules/parse-server-push-adapter/pull/7) ([flovilmart](https://github.com/flovilmart))
- Fixed error when sending pushes to one pushType [\#6](https://github.com/parse-server-modules/parse-server-push-adapter/pull/6) ([Gameleon12](https://github.com/Gameleon12))

## [v1.0.3](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v1.0.3) (2016-03-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v1.0.2...v1.0.3)

**Merged pull requests:**

- Adds verbose logging [\#5](https://github.com/parse-server-modules/parse-server-push-adapter/pull/5) ([flovilmart](https://github.com/flovilmart))

## [v1.0.2](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v1.0.2) (2016-03-26)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v1.0.1...v1.0.2)

**Merged pull requests:**

- reports all sending error for mis-configurations [\#3](https://github.com/parse-server-modules/parse-server-push-adapter/pull/3) ([flovilmart](https://github.com/flovilmart))

## [v1.0.1](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v1.0.1) (2016-03-25)
[Full Changelog](https://github.com/parse-server-modules/parse-server-push-adapter/compare/v1.0.0...v1.0.1)

**Merged pull requests:**

- Expose these two methods [\#1](https://github.com/parse-server-modules/parse-server-push-adapter/pull/1) ([rogerhu](https://github.com/rogerhu))

## [v1.0.0](https://github.com/parse-server-modules/parse-server-push-adapter/tree/v1.0.0) (2016-03-25)


\* *This Change Log was automatically generated by [github_changelog_generator](https://github.com/skywinder/Github-Changelog-Generator)*
