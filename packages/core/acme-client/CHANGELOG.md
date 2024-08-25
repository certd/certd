# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.24.0](https://github.com/publishlab/node-acme-client/compare/v1.23.1...v1.24.0) (2024-08-25)

### Bug Fixes

* 修复成功后跳过之后丢失腾讯云证书id的bug ([37eb762](https://github.com/publishlab/node-acme-client/commit/37eb762afe25c5896b75dee25f32809f8426e7b7))
* 修复创建流水线后立即运行时报no id错误的bug ([17ead54](https://github.com/publishlab/node-acme-client/commit/17ead547aab25333603980304aa3aad3db1f73d5))
* 修复使用代理的情况下申请证书失败的bug ([95122e2](https://github.com/publishlab/node-acme-client/commit/95122e28609333f4df55c266e5434897954c0fb3))

### Features

* 支持google证书申请（需要使用代理） ([a593056](https://github.com/publishlab/node-acme-client/commit/a593056e79e99dd6a74f75b5eab621af7248cfbe))

### Performance Improvements

* 优化证书申请成功率 ([968c469](https://github.com/publishlab/node-acme-client/commit/968c4690a07f69c08dcb3d3a494da4e319627345))

## [1.22.6](https://github.com/publishlab/node-acme-client/compare/v1.22.5...v1.22.6) (2024-08-03)

**Note:** Version bump only for package @certd/acme-client

## [1.22.4](https://github.com/publishlab/node-acme-client/compare/v1.22.3...v1.22.4) (2024-07-26)

### Performance Improvements

* 证书申请支持反向代理，letsencrypt无法访问时的备用方案 ([b7b5df0](https://github.com/publishlab/node-acme-client/commit/b7b5df0587e0f7ea288c1b2af6f87211f207395f))

## [1.22.3](https://github.com/publishlab/node-acme-client/compare/v1.22.2...v1.22.3) (2024-07-25)

**Note:** Version bump only for package @certd/acme-client

## [1.22.2](https://github.com/publishlab/node-acme-client/compare/v1.22.1...v1.22.2) (2024-07-23)

**Note:** Version bump only for package @certd/acme-client

## [1.22.1](https://github.com/publishlab/node-acme-client/compare/v1.22.0...v1.22.1) (2024-07-20)

**Note:** Version bump only for package @certd/acme-client

# [1.22.0](https://github.com/publishlab/node-acme-client/compare/v1.21.2...v1.22.0) (2024-07-19)

### Features

* 升级midway，支持esm ([485e603](https://github.com/publishlab/node-acme-client/commit/485e603b5165c28bc08694997726eaf2a585ebe7))

## [1.21.2](https://github.com/publishlab/node-acme-client/compare/v1.21.1...v1.21.2) (2024-07-08)

**Note:** Version bump only for package @certd/acme-client

## [1.21.1](https://github.com/publishlab/node-acme-client/compare/v1.21.0...v1.21.1) (2024-07-08)

**Note:** Version bump only for package @certd/acme-client

# [1.21.0](https://github.com/publishlab/node-acme-client/compare/v1.20.17...v1.21.0) (2024-07-03)

### Features

* 支持zero ssl ([eade2c2](https://github.com/publishlab/node-acme-client/commit/eade2c2b681569f03e9cd466e7d5bcd6703ed492))

## [1.20.17](https://github.com/publishlab/node-acme-client/compare/v1.20.16...v1.20.17) (2024-07-03)

### Performance Improvements

* 创建dns解析后，强制等待60s ([f47b35f](https://github.com/publishlab/node-acme-client/commit/f47b35f6d5bd7d675005c3e286b7e9a029201f8b))
* 优化cname verify ([eba333d](https://github.com/publishlab/node-acme-client/commit/eba333de7a5b5ef4b0b7eaa904f578720102fa61))

## [1.20.16](https://github.com/publishlab/node-acme-client/compare/v1.20.15...v1.20.16) (2024-07-01)

### Bug Fixes

* 修复配置了cdn cname后申请失败的bug ([4a5fa76](https://github.com/publishlab/node-acme-client/commit/4a5fa767edc347d03d29a467e86c9a4d70b0220c))

## [1.20.15](https://github.com/publishlab/node-acme-client/compare/v1.20.14...v1.20.15) (2024-06-28)

### Performance Improvements

* 腾讯云dns provider 支持腾讯云的accessId ([e0eb3a4](https://github.com/publishlab/node-acme-client/commit/e0eb3a441384d474fe2923c69b25318264bdc9df))

## [1.20.14](https://github.com/publishlab/node-acme-client/compare/v1.20.13...v1.20.14) (2024-06-23)

**Note:** Version bump only for package @certd/acme-client

## [1.20.13](https://github.com/publishlab/node-acme-client/compare/v1.20.12...v1.20.13) (2024-06-18)

**Note:** Version bump only for package @certd/acme-client

## [1.20.12](https://github.com/publishlab/node-acme-client/compare/v1.20.10...v1.20.12) (2024-06-17)

### Bug Fixes

* 修复aliyun域名超过100个找不到域名的bug ([5b1494b](https://github.com/publishlab/node-acme-client/commit/5b1494b3ce93d1026dc56ee741342fbb8bf7be24))

### Performance Improvements

* 支持cloudflare域名 ([fbb9a47](https://github.com/publishlab/node-acme-client/commit/fbb9a47e8f7bb805289b9ee64bd46ffee0f01c06))

## [1.20.10](https://github.com/publishlab/node-acme-client/compare/v1.20.9...v1.20.10) (2024-05-30)

**Note:** Version bump only for package @certd/acme-client

## [1.20.9](https://github.com/publishlab/node-acme-client/compare/v1.20.8...v1.20.9) (2024-03-22)

**Note:** Version bump only for package @certd/acme-client

## [1.20.8](https://github.com/publishlab/node-acme-client/compare/v1.20.7...v1.20.8) (2024-03-22)

**Note:** Version bump only for package @certd/acme-client

## [1.20.7](https://github.com/publishlab/node-acme-client/compare/v1.20.6...v1.20.7) (2024-03-22)

**Note:** Version bump only for package @certd/acme-client

## [1.20.6](https://github.com/publishlab/node-acme-client/compare/v1.20.5...v1.20.6) (2024-03-21)

**Note:** Version bump only for package @certd/acme-client

## [1.20.5](https://github.com/publishlab/node-acme-client/compare/v1.20.2...v1.20.5) (2024-03-11)

### Bug Fixes

* 修复腾讯云cdn部署无法选择端点的bug ([154409b](https://github.com/publishlab/node-acme-client/commit/154409b1dfee3ea1caae740ad9c1f99a6e7a9814))

# Changelog

## v5.4.0 (2024-07-16)

* `added` Directory URLs for [Google](https://cloud.google.com/certificate-manager/docs/overview) ACME provider
* `fixed` Invalidate ACME provider directory cache after 24 hours
* `fixed` Retry HTTP requests on server errors or when rate limited - [#89](https://github.com/publishlab/node-acme-client/issues/89)

## v5.3.1 (2024-05-22)

* `fixed` Allow `client.auto()` being called with an empty CSR common name
* `fixed` Bug when calling `updateAccountKey()` with external account binding

## v5.3.0 (2024-02-05)

* `added` Support and tests for satisfying `tls-alpn-01` challenges
* `changed` Replace `jsrsasign` with `@peculiar/x509` for certificate and CSR handling
* `changed` Method `getChallengeKeyAuthorization()` now returns `$token.$thumbprint` when called with a `tls-alpn-01` challenge
    * Previously returned base64url encoded SHA256 digest of `$token.$thumbprint` erroneously
    * This change is not considered breaking since the previous behavior was incorrect

## v5.2.0 (2024-01-22)

* `fixed` Allow self-signed or invalid certs when validating `http-01` challenges that redirect to HTTPS - [#65](https://github.com/publishlab/node-acme-client/issues/65)
* `fixed` Wait for all challenge promises to settle before rejecting `client.auto()` - [#75](https://github.com/publishlab/node-acme-client/issues/75)

## v5.1.0 (2024-01-20)

* `fixed` Upgrade `jsrsasign@11.0.0` - [GHSA-rh63-9qcf-83gf](https://github.com/kjur/jsrsasign/security/advisories/GHSA-rh63-9qcf-83gf)
* `fixed` Upgrade `axios@1.6.5` - [CVE-2023-45857](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2023-45857)

## v5.0.0 (2022-07-28)

* [Upgrade guide here](docs/upgrade-v5.md)
* `added` New native crypto interface, ECC/ECDSA support
* `breaking` Remove support for Node v10, v12 and v14
* `breaking` Prioritize issuer closest to root during preferred chain selection - [#46](https://github.com/publishlab/node-acme-client/issues/46)
* `changed` Replace `bluebird` dependency with native promise APIs
* `changed` Replace `backo2` dependency with internal utility

## v4.2.5 (2022-03-21)

* `fixed` Upgrade `axios@0.26.1`
* `fixed` Upgrade `node-forge@1.3.0` - [CVE-2022-24771](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-24771), [CVE-2022-24772](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-24772), [CVE-2022-24773](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-24773)

## v4.2.4 (2022-03-19)

* `fixed` Use SHA-256 when signing CSRs

## v3.3.2 (2022-03-19)

* `backport` Use SHA-256 when signing CSRs

## v4.2.3 (2022-01-11)

* `added` Directory URLs for ACME providers [Buypass](https://www.buypass.com) and [ZeroSSL](https://zerossl.com)
* `fixed` Skip already valid authorizations when using `client.auto()`

## v4.2.2 (2022-01-10)

* `fixed` Upgrade `node-forge@1.2.0`

## v4.2.1 (2022-01-10)

* `fixed` ZeroSSL `duplicate_domains_in_array` error when using `client.auto()`

## v4.2.0 (2022-01-06)

* `added` Support for external account binding - [RFC 8555 Section 7.3.4](https://datatracker.ietf.org/doc/html/rfc8555#section-7.3.4)
* `added` Ability to pass through custom logger function
* `changed` Increase default `backoffAttempts` to 10
* `fixed` Deactivate authorizations where challenges can not be completed
* `fixed` Attempt authoritative name servers when verifying `dns-01` challenges
* `fixed` Error verbosity when failing to read ACME directory
* `fixed` Correctly recognize `ready` and `processing` states - [RFC 8555 Section 7.1.6](https://datatracker.ietf.org/doc/html/rfc8555#section-7.1.6)

## v4.1.4 (2021-12-23)

* `fixed` Upgrade `axios@0.21.4` - [CVE-2021-3749](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-3749)

## v4.1.3 (2021-02-22)

* `fixed` Upgrade `axios@0.21.1` - [CVE-2020-28168](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-28168)

## v4.1.2 (2020-11-16)

* `fixed` Bug when encoding PEM payloads, potentially causing malformed requests

## v4.1.1 (2020-11-13)

* `fixed` Missing TypeScript definitions

## v4.1.0 (2020-11-12)

* `added` Option `preferredChain` added to `client.getCertificate()` and `client.auto()` to indicate which certificate chain is preferred if a CA offers multiple
    * Related: [https://community.letsencrypt.org/t/transition-to-isrgs-root-delayed-until-jan-11-2021/125516](https://community.letsencrypt.org/t/transition-to-isrgs-root-delayed-until-jan-11-2021/125516)
* `added` Method `client.getOrder()` to refresh order from CA
* `fixed` Upgrade `axios@0.21.0`
* `fixed` Error when attempting to revoke a certificate chain
* `fixed` Missing URL augmentation in `client.finalizeOrder()` and `client.deactivateAuthorization()`
* `fixed` Add certificate issuer to response from `forge.readCertificateInfo()`

## v4.0.2 (2020-10-09)

* `fixed` Explicitly set default `axios` HTTP adapter - [axios/axios#1180](https://github.com/axios/axios/issues/1180)

## v4.0.1 (2020-09-15)

* `fixed` Upgrade `node-forge@0.10.0` - [CVE-2020-7720](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-7720)

## v4.0.0 (2020-05-29)

* `breaking` Remove support for Node v8
* `breaking` Remove deprecated `openssl` crypto module
* `fixed` Incorrect TypeScript `CertificateInfo` definitions
* `fixed` Allow trailing whitespace character in `http-01` challenge response

## v3.3.1 (2020-01-07)

* `fixed` Improvements to TypeScript definitions

## v3.3.0 (2019-12-19)

* `added` TypeScript definitions
* `fixed` Allow missing ACME directory meta field - [RFC 8555 Section 7.1.1](https://datatracker.ietf.org/doc/html/rfc8555#section-7.1.1)

## v3.2.1 (2019-11-14)

* `added` New option `skipChallengeVerification` added to `client.auto()` to bypass internal challenge verification

## v3.2.0 (2019-08-26)

* `added` More extensive testing using [letsencrypt/pebble](https://github.com/letsencrypt/pebble)
* `changed` When creating a CSR, `commonName` no longer defaults to `'localhost'`
    * This change is not considered breaking since `commonName: 'localhost'` will result in an error when ordering a certificate
* `fixed` Retry signed API requests on `urn:ietf:params:acme:error:badNonce` - [RFC 8555 Section 6.5](https://datatracker.ietf.org/doc/html/rfc8555#section-6.5)
* `fixed` Minor bugs related to `POST-as-GET` when calling `updateAccount()`
* `fixed` Ensure subject common name is present in SAN when creating a CSR - [CAB v1.2.3 Section 9.2.2](https://cabforum.org/wp-content/uploads/BRv1.2.3.pdf)
* `fixed` Send empty JSON body when responding to challenges - [RFC 8555 Section 7.5.1](https://datatracker.ietf.org/doc/html/rfc8555#section-7.5.1)

## v2.3.1 (2019-08-26)

* `backport` Minor bugs related to `POST-as-GET` when calling `client.updateAccount()`
* `backport` Send empty JSON body when responding to challenges

## v3.1.0 (2019-08-21)

* `added` UTF-8 support when generating a CSR subject using forge - [RFC 5280](https://datatracker.ietf.org/doc/html/rfc5280)
* `fixed` Implement `POST-as-GET` for all ACME API requests - [RFC 8555 Section 6.3](https://datatracker.ietf.org/doc/html/rfc8555#section-6.3)

## v2.3.0 (2019-08-21)

* `backport` Implement `POST-as-GET` for all ACME API requests

## v3.0.0 (2019-07-13)

* `added` Expose `axios` instance to allow manipulating HTTP client defaults
* `breaking` Remove support for Node v4 and v6
* `breaking` Remove Babel transpilation

## v2.2.3 (2019-01-25)

* `added` DNS CNAME detection when verifying `dns-01` challenges

## v2.2.2 (2019-01-07)

* `added` Support for `tls-alpn-01` challenge key authorization

## v2.2.1 (2019-01-04)

* `fixed` Handle and throw errors from OpenSSL process

## v2.2.0 (2018-11-06)

* `added` New [node-forge](https://www.npmjs.com/package/node-forge) crypto interface, removes OpenSSL CLI dependency
* `added` Support native `crypto.generateKeyPair()` API when generating key pairs

## v2.1.0 (2018-10-21)

* `added` Ability to set and get current account URL
* `fixed` Replace HTTP client `request` with `axios`
* `fixed` Auto-mode no longer tries to create account when account URL exists

## v2.0.1 (2018-08-17)

* `fixed` Key rollover in compliance with [draft-ietf-acme-13](https://datatracker.ietf.org/doc/html/draft-ietf-acme-acme-13)

## v2.0.0 (2018-04-02)

* `breaking` ACMEv2
* `breaking` API changes
* `breaking` Rewrite to ES6
* `breaking` Promises instead of callbacks

## v1.0.0 (2017-10-20)

* API stable

## v0.2.1 (2017-09-27)

* `fixed` Bug causing invalid anti-replay nonce

## v0.2.0 (2017-09-21)

* `breaking` OpenSSL method `readCsrDomains` and `readCertificateInfo` now return domains as an object
* `fixed` Added and fixed some tests

## v0.1.0 (2017-09-14)

* `acme-client` released
