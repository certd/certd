# Upgrading to v5 of `acme-client`

This document outlines the breaking changes introduced in v5 of `acme-client`, why they were introduced and what you should look out for when upgrading your application.

First off this release drops support for Node LTS v10, v12 and v14, and the reason for that is a new native crypto interface - more on that below. Since Node v14 is still currently in maintenance mode, `acme-client` v4 will continue to receive security updates and bugfixes until (at least) Node v14 reaches its end-of-line.

## New native crypto interface

A new crypto interface has been introduced with v5, which you can find under `acme.crypto`. It uses native Node.js cryptography APIs to generate private keys, JSON Web Keys and signatures, and finally enables support for ECC/ECDSA (P-256, P384 and P521), both for account private keys and certificates. The [@peculiar/x509](https://www.npmjs.com/package/@peculiar/x509) module is used to handle generation and parsing of Certificate Signing Requests.

Full documentation of `acme.crypto` can be [found here](crypto.md).

Since the release of `acme-client` v1.0.0 the crypto interface API has remained mostly unaltered. Back then an OpenSSL CLI wrapper was used to generate keys, and very much has changed since. This has naturally resulted in a buildup of technical debt and slight API inconsistencies over time. The introduction of a new interface was a good opportunity to finally clean up these APIs.

Below you will find a table summarizing the current `acme.forge` methods, and their new `acme.crypto` replacements. A summary of the changes for each method, including examples on how to migrate, can be found following the table.

*Note: The now deprecated `acme.forge` interface is still available for use in v5, and will not be removed until a future major version, most likely v6. Should you not wish to change to the new interface right away, the following breaking changes will not immediately affect you.*

* :green_circle: = API functionality unchanged between `acme.forge` and `acme.crypto`
* :orange_circle: = Slight API changes, like depromising or renaming, action may be required
* :red_circle: = Breaking API changes or removal, action required if using these methods

| Deprecated `.forge` API       | New `.crypto` API             | State                 |
| ----------------------------- | ----------------------------- | --------------------- |
| `await createPrivateKey()`    | `await createPrivateKey()`    | :green_circle:        |
| `await createPublicKey()`     | `getPublicKey()`              | :orange_circle:   (1) |
| `getPemBody()`                | `getPemBodyAsB64u()`          | :red_circle:      (2) |
| `splitPemChain()`             | `splitPemChain()`             | :green_circle:        |
| `await getModulus()`          | `getJwk()`                    | :red_circle:      (3) |
| `await getPublicExponent()`   | `getJwk()`                    | :red_circle:      (3) |
| `await readCsrDomains()`      | `readCsrDomains()`            | :orange_circle:   (4) |
| `await readCertificateInfo()` | `readCertificateInfo()`       | :orange_circle:   (4) |
| `await createCsr()`           | `await createCsr()`           | :green_circle:        |

### 1. `createPublicKey` renamed and depromised

* The method `createPublicKey()` has been renamed to `getPublicKey()`
* No longer returns a promise, but the resulting public key directly
* This is non-breaking if called with `await`, since `await` does not require its operand to be a promise
* :orange_circle: **This is a breaking change if used with `.then()` or `.catch()`**

```js
// Before
const publicKey = await acme.forge.createPublicKey(privateKey);

// After
const publicKey = acme.crypto.getPublicKey(privateKey);
```

### 2. `getPemBody` renamed, now returns Base64URL

* Method `getPemBody()` has been renamed to `getPemBodyAsB64u()`
* Instead of a Base64-encoded PEM body, now returns a Base64URL-encoded PEM body
* :red_circle: **This is a breaking change**

```js
// Before
const body = acme.forge.getPemBody(pem);

// After
const body = acme.crypto.getPemBodyAsB64u(pem);
```

### 3. `getModulus` and `getPublicExponent` merged into `getJwk`

* Methods `getModulus()` and `getPublicExponent()` have been removed
* Replaced by new method `getJwk()`
* :red_circle: **This is a breaking change**

```js
// Before
const mod = await acme.forge.getModulus(key);
const exp = await acme.forge.getPublicExponent(key);

// After
const { e, n } = acme.crypto.getJwk(key);
```

### 4. `readCsrDomains` and `readCertificateInfo` depromised

* Methods `readCsrDomains()` and `readCertificateInfo()` no longer return promises, but their resulting payloads directly
* This is non-breaking if called with `await`, since `await` does not require its operand to be a promise
* :orange_circle: **This is a breaking change if used with `.then()` or `.catch()`**

```js
// Before
const domains = await acme.forge.readCsrDomains(csr);
const info = await acme.forge.readCertificateInfo(certificate);

// After
const domains = acme.crypto.readCsrDomains(csr);
const info = acme.crypto.readCertificateInfo(certificate);
```
