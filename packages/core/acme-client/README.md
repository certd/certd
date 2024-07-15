# acme-client [![test](https://github.com/publishlab/node-acme-client/actions/workflows/tests.yml/badge.svg)](https://github.com/publishlab/node-acme-client/actions/workflows/tests.yml)

*A simple and unopinionated ACME client.*

This module is written to handle communication with a Boulder/Let's Encrypt-style ACME API.

* RFC 8555 - Automatic Certificate Management Environment (ACME): [https://datatracker.ietf.org/doc/html/rfc8555](https://datatracker.ietf.org/doc/html/rfc8555)
* Boulder divergences from ACME: [https://github.com/letsencrypt/boulder/blob/master/docs/acme-divergences.md](https://github.com/letsencrypt/boulder/blob/master/docs/acme-divergences.md)

## Compatibility

| acme-client | Node.js |                                           |
| ----------- | ------- | ----------------------------------------- |
| v5.x        | >= v16  | [Upgrade guide](docs/upgrade-v5.md)       |
| v4.x        | >= v10  | [Changelog](CHANGELOG.md#v400-2020-05-29) |
| v3.x        | >= v8   | [Changelog](CHANGELOG.md#v300-2019-07-13) |
| v2.x        | >= v4   | [Changelog](CHANGELOG.md#v200-2018-04-02) |
| v1.x        | >= v4   | [Changelog](CHANGELOG.md#v100-2017-10-20) |

## Table of contents

* [Installation](#installation)
* [Usage](#usage)
    * [Directory URLs](#directory-urls)
    * [External account binding](#external-account-binding)
    * [Specifying the account URL](#specifying-the-account-url)
* [Cryptography](#cryptography)
    * [Legacy .forge interface](#legacy-forge-interface)
* [Auto mode](#auto-mode)
    * [Challenge priority](#challenge-priority)
    * [Internal challenge verification](#internal-challenge-verification)
* [API](#api)
* [HTTP client defaults](#http-client-defaults)
* [Debugging](#debugging)
* [License](#license)

## Installation

```bash
$ npm install acme-client
```

## Usage

```js
const acme = require('acme-client');

const accountPrivateKey = '<PEM encoded private key>';

const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.staging,
    accountKey: accountPrivateKey,
});
```

### Directory URLs

```js
acme.directory.buypass.staging;
acme.directory.buypass.production;

acme.directory.google.staging;
acme.directory.google.production;

acme.directory.letsencrypt.staging;
acme.directory.letsencrypt.production;

acme.directory.zerossl.production;
```

### External account binding

To enable [external account binding](https://datatracker.ietf.org/doc/html/rfc8555#section-7.3.4) when creating your ACME account, provide your KID and HMAC key to the client constructor.

```js
const client = new acme.Client({
    directoryUrl: 'https://acme-provider.example.com/directory-url',
    accountKey: accountPrivateKey,
    externalAccountBinding: {
        kid: 'YOUR-EAB-KID',
        hmacKey: 'YOUR-EAB-HMAC-KEY',
    },
});
```

### Specifying the account URL

During the ACME account creation process, the server will check the supplied account key and either create a new account if the key is unused, or return the existing ACME account bound to that key.

In some cases, for example with some EAB providers, this account creation step may be prohibited and might require you to manually specify the account URL beforehand. This can be done through `accountUrl` in the client constructor.

```js
const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.staging,
    accountKey: accountPrivateKey,
    accountUrl: 'https://acme-v02.api.letsencrypt.org/acme/acct/12345678',
});
```

You can fetch the clients current account URL, either after creating an account or supplying it through the constructor, using `getAccountUrl()`:

```js
const myAccountUrl = client.getAccountUrl();
```

## Cryptography

For key pairs `acme-client` utilizes native Node.js cryptography APIs, supporting signing and generation of both RSA and ECDSA keys. The module [@peculiar/x509](https://www.npmjs.com/package/@peculiar/x509) is used to generate and parse Certificate Signing Requests.

These utility methods are exposed through `.crypto`.

* **Documentation: [docs/crypto.md](docs/crypto.md)**

```js
const privateRsaKey = await acme.crypto.createPrivateRsaKey();
const privateEcdsaKey = await acme.crypto.createPrivateEcdsaKey();

const [certificateKey, certificateCsr] = await acme.crypto.createCsr({
    altNames: ['example.com', '*.example.com'],
});
```

### Legacy `.forge` interface

The legacy `node-forge` crypto interface is still available for backward compatibility, however this interface is now considered deprecated and will be removed in a future major version of `acme-client`.

You should consider migrating to the new `.crypto` API at your earliest convenience. More details can be found in the [acme-client v5 upgrade guide](docs/upgrade-v5.md).

* **Documentation: [docs/forge.md](docs/forge.md)**

## Auto mode

For convenience an `auto()` method is included in the client that takes a single config object. This method will handle the entire process of getting a certificate for one or multiple domains.

* **Documentation: [docs/client.md#AcmeClient+auto](docs/client.md#AcmeClient+auto)**
* **Full example: [examples/auto.js](examples/auto.js)**

```js
const autoOpts = {
    csr: '<PEM encoded CSR>',
    email: 'test@example.com',
    termsOfServiceAgreed: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {},
    challengeRemoveFn: async (authz, challenge, keyAuthorization) => {},
};

const certificate = await client.auto(autoOpts);
```

### Challenge priority

When ordering a certificate using auto mode, `acme-client` uses a priority list when selecting challenges to respond to. Its default value is `['http-01', 'dns-01']` which translates to "use `http-01` if any challenges exist, otherwise fall back to `dns-01`".

While most challenges can be validated using the method of your choosing, please note that **wildcard certificates can only be validated through `dns-01`**. More information regarding Let's Encrypt challenge types [can be found here](https://letsencrypt.org/docs/challenge-types/).

To modify challenge priority, provide a list of challenge types in `challengePriority`:

```js
await client.auto({
    ...,
    challengePriority: ['http-01', 'dns-01'],
});
```

### Internal challenge verification

When using auto mode, `acme-client` will first validate that challenges are satisfied internally before completing the challenge at the ACME provider. In some cases (firewalls, etc) this internal challenge verification might not be possible to complete.

If internal challenge validation needs to travel through an HTTP proxy, see [HTTP client defaults](#http-client-defaults).

To completely disable `acme-client`s internal challenge verification, enable `skipChallengeVerification`:

```js
await client.auto({
    ...,
    skipChallengeVerification: true,
});
```

## API

For more fine-grained control you can interact with the ACME API using the methods documented below.

* **Documentation: [docs/client.md](docs/client.md)**
* **Full example: [examples/api.js](examples/api.js)**

```js
const account = await client.createAccount({
    termsOfServiceAgreed: true,
    contact: ['mailto:test@example.com'],
});

const order = await client.createOrder({
    identifiers: [
        { type: 'dns', value: 'example.com' },
        { type: 'dns', value: '*.example.com' },
    ],
});
```

## HTTP client defaults

This module uses [axios](https://github.com/axios/axios) when communicating with the ACME HTTP API, and exposes the client instance through `.axios`.

For example, should you need to change the default axios configuration to route requests through an HTTP proxy, this can be achieved as follows:

```js
const acme = require('acme-client');

acme.axios.defaults.proxy = {
    host: '127.0.0.1',
    port: 9000,
};
```

A complete list of axios options and documentation can be found at:

* [https://github.com/axios/axios#request-config](https://github.com/axios/axios#request-config)
* [https://github.com/axios/axios#custom-instance-defaults](https://github.com/axios/axios#custom-instance-defaults)

## Debugging

To get a better grasp of what `acme-client` is doing behind the scenes, you can either pass it a logger function, or enable debugging through an environment variable.

Setting a logger function may for example be useful for passing messages on to another logging system, or just dumping them to the console.

```js
acme.setLogger((message) => {
    console.log(message);
});
```

Debugging to the console can also be enabled through [debug](https://www.npmjs.com/package/debug) by setting an environment variable.

```bash
DEBUG=acme-client node index.js
```

## License

[MIT](LICENSE)
