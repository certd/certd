# Changelog

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

## 4.2.4 (2022-03-19)

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

* `added` Support for external account binding - [RFC 8555 Section 7.3.4](https://tools.ietf.org/html/rfc8555#section-7.3.4)
* `added` Ability to pass through custom logger function
* `changed` Increase default `backoffAttempts` to 10
* `fixed` Deactivate authorizations where challenges can not be completed
* `fixed` Attempt authoritative name servers when verifying `dns-01` challenges
* `fixed` Error verbosity when failing to read ACME directory
* `fixed` Correctly recognize `ready` and `processing` states - [RFC 8555 Section 7.1.6](https://tools.ietf.org/html/rfc8555#section-7.1.6)

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
* `fixed` Allow missing ACME directory meta field - [RFC 8555 Section 7.1.1](https://tools.ietf.org/html/rfc8555#section-7.1.1)

## v3.2.1 (2019-11-14)

* `added` New option `skipChallengeVerification` added to `client.auto()` to bypass internal challenge verification

## v3.2.0 (2019-08-26)

* `added` More extensive testing using [letsencrypt/pebble](https://github.com/letsencrypt/pebble)
* `changed` When creating a CSR, `commonName` no longer defaults to `'localhost'`
    * This change is not considered breaking since `commonName: 'localhost'` will result in an error when ordering a certificate
* `fixed` Retry signed API requests on `urn:ietf:params:acme:error:badNonce` - [RFC 8555 Section 6.5](https://tools.ietf.org/html/rfc8555#section-6.5)
* `fixed` Minor bugs related to `POST-as-GET` when calling `updateAccount()`
* `fixed` Ensure subject common name is present in SAN when creating a CSR - [CAB v1.2.3 Section 9.2.2](https://cabforum.org/wp-content/uploads/BRv1.2.3.pdf)
* `fixed` Send empty JSON body when responding to challenges - [RFC 8555 Section 7.5.1](https://tools.ietf.org/html/rfc8555#section-7.5.1)

## v2.3.1 (2019-08-26)

* `backport` Minor bugs related to `POST-as-GET` when calling `client.updateAccount()`
* `backport` Send empty JSON body when responding to challenges

## v3.1.0 (2019-08-21)

* `added` UTF-8 support when generating a CSR subject using forge - [RFC 5280](https://tools.ietf.org/html/rfc5280)
* `fixed` Implement `POST-as-GET` for all ACME API requests - [RFC 8555 Section 6.3](https://tools.ietf.org/html/rfc8555#section-6.3)

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

* `fixed` Key rollover in compliance with [draft-ietf-acme-13](https://tools.ietf.org/html/draft-ietf-acme-acme-13)

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
