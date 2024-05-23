## Classes

<dl>
<dt><a href="#AcmeClient">AcmeClient</a></dt>
<dd><p>AcmeClient</p>
</dd>
</dl>

## Objects

<dl>
<dt><a href="#Client">Client</a> : <code>object</code></dt>
<dd><p>ACME client</p>
</dd>
</dl>

<a name="AcmeClient"></a>

## AcmeClient
AcmeClient

**Kind**: global class  

* [AcmeClient](#AcmeClient)
    * [new AcmeClient(opts)](#new_AcmeClient_new)
    * [.getTermsOfServiceUrl()](#AcmeClient+getTermsOfServiceUrl) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
    * [.getAccountUrl()](#AcmeClient+getAccountUrl) ⇒ <code>string</code>
    * [.createAccount([data])](#AcmeClient+createAccount) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.updateAccount([data])](#AcmeClient+updateAccount) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.updateAccountKey(newAccountKey, [data])](#AcmeClient+updateAccountKey) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.createOrder(data)](#AcmeClient+createOrder) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.getOrder(order)](#AcmeClient+getOrder) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.finalizeOrder(order, csr)](#AcmeClient+finalizeOrder) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.getAuthorizations(order)](#AcmeClient+getAuthorizations) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
    * [.deactivateAuthorization(authz)](#AcmeClient+deactivateAuthorization) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.getChallengeKeyAuthorization(challenge)](#AcmeClient+getChallengeKeyAuthorization) ⇒ <code>Promise.&lt;string&gt;</code>
    * [.verifyChallenge(authz, challenge)](#AcmeClient+verifyChallenge) ⇒ <code>Promise</code>
    * [.completeChallenge(challenge)](#AcmeClient+completeChallenge) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.waitForValidStatus(item)](#AcmeClient+waitForValidStatus) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.getCertificate(order, [preferredChain])](#AcmeClient+getCertificate) ⇒ <code>Promise.&lt;string&gt;</code>
    * [.revokeCertificate(cert, [data])](#AcmeClient+revokeCertificate) ⇒ <code>Promise</code>
    * [.auto(opts)](#AcmeClient+auto) ⇒ <code>Promise.&lt;string&gt;</code>

<a name="new_AcmeClient_new"></a>

### new AcmeClient(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>object</code> |  |
| opts.directoryUrl | <code>string</code> | ACME directory URL |
| opts.accountKey | <code>buffer</code> \| <code>string</code> | PEM encoded account private key |
| [opts.accountUrl] | <code>string</code> | Account URL, default: `null` |
| [opts.externalAccountBinding] | <code>object</code> |  |
| [opts.externalAccountBinding.kid] | <code>string</code> | External account binding KID |
| [opts.externalAccountBinding.hmacKey] | <code>string</code> | External account binding HMAC key |
| [opts.backoffAttempts] | <code>number</code> | Maximum number of backoff attempts, default: `10` |
| [opts.backoffMin] | <code>number</code> | Minimum backoff attempt delay in milliseconds, default: `5000` |
| [opts.backoffMax] | <code>number</code> | Maximum backoff attempt delay in milliseconds, default: `30000` |

**Example**  
Create ACME client instance
```js
const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.staging,
    accountKey: 'Private key goes here',
});
```
**Example**  
Create ACME client instance
```js
const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.staging,
    accountKey: 'Private key goes here',
    accountUrl: 'Optional account URL goes here',
    backoffAttempts: 10,
    backoffMin: 5000,
    backoffMax: 30000,
});
```
**Example**  
Create ACME client with external account binding
```js
const client = new acme.Client({
    directoryUrl: 'https://acme-provider.example.com/directory-url',
    accountKey: 'Private key goes here',
    externalAccountBinding: {
        kid: 'YOUR-EAB-KID',
        hmacKey: 'YOUR-EAB-HMAC-KEY',
    },
});
```
<a name="AcmeClient+getTermsOfServiceUrl"></a>

### acmeClient.getTermsOfServiceUrl() ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
Get Terms of Service URL if available

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - ToS URL  
**Example**  
Get Terms of Service URL
```js
const termsOfService = client.getTermsOfServiceUrl();

if (!termsOfService) {
    // CA did not provide Terms of Service
}
```
<a name="AcmeClient+getAccountUrl"></a>

### acmeClient.getAccountUrl() ⇒ <code>string</code>
Get current account URL

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>string</code> - Account URL  
**Throws**:

- <code>Error</code> No account URL found

**Example**  
Get current account URL
```js
try {
    const accountUrl = client.getAccountUrl();
}
catch (e) {
    // No account URL exists, need to create account first
}
```
<a name="AcmeClient+createAccount"></a>

### acmeClient.createAccount([data]) ⇒ <code>Promise.&lt;object&gt;</code>
Create a new account

https://datatracker.ietf.org/doc/html/rfc8555#section-7.3

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Account  

| Param | Type | Description |
| --- | --- | --- |
| [data] | <code>object</code> | Request data |

**Example**  
Create a new account
```js
const account = await client.createAccount({
    termsOfServiceAgreed: true,
});
```
**Example**  
Create a new account with contact info
```js
const account = await client.createAccount({
    termsOfServiceAgreed: true,
    contact: ['mailto:test@example.com'],
});
```
<a name="AcmeClient+updateAccount"></a>

### acmeClient.updateAccount([data]) ⇒ <code>Promise.&lt;object&gt;</code>
Update existing account

https://datatracker.ietf.org/doc/html/rfc8555#section-7.3.2

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Account  

| Param | Type | Description |
| --- | --- | --- |
| [data] | <code>object</code> | Request data |

**Example**  
Update existing account
```js
const account = await client.updateAccount({
    contact: ['mailto:foo@example.com'],
});
```
<a name="AcmeClient+updateAccountKey"></a>

### acmeClient.updateAccountKey(newAccountKey, [data]) ⇒ <code>Promise.&lt;object&gt;</code>
Update account private key

https://datatracker.ietf.org/doc/html/rfc8555#section-7.3.5

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Account  

| Param | Type | Description |
| --- | --- | --- |
| newAccountKey | <code>buffer</code> \| <code>string</code> | New PEM encoded private key |
| [data] | <code>object</code> | Additional request data |

**Example**  
Update account private key
```js
const newAccountKey = 'New private key goes here';
const result = await client.updateAccountKey(newAccountKey);
```
<a name="AcmeClient+createOrder"></a>

### acmeClient.createOrder(data) ⇒ <code>Promise.&lt;object&gt;</code>
Create a new order

https://datatracker.ietf.org/doc/html/rfc8555#section-7.4

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Order  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Request data |

**Example**  
Create a new order
```js
const order = await client.createOrder({
    identifiers: [
        { type: 'dns', value: 'example.com' },
        { type: 'dns', value: 'test.example.com' },
    ],
});
```
<a name="AcmeClient+getOrder"></a>

### acmeClient.getOrder(order) ⇒ <code>Promise.&lt;object&gt;</code>
Refresh order object from CA

https://datatracker.ietf.org/doc/html/rfc8555#section-7.4

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Order  

| Param | Type | Description |
| --- | --- | --- |
| order | <code>object</code> | Order object |

**Example**  
```js
const order = { ... }; // Previously created order object
const result = await client.getOrder(order);
```
<a name="AcmeClient+finalizeOrder"></a>

### acmeClient.finalizeOrder(order, csr) ⇒ <code>Promise.&lt;object&gt;</code>
Finalize order

https://datatracker.ietf.org/doc/html/rfc8555#section-7.4

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Order  

| Param | Type | Description |
| --- | --- | --- |
| order | <code>object</code> | Order object |
| csr | <code>buffer</code> \| <code>string</code> | PEM encoded Certificate Signing Request |

**Example**  
Finalize order
```js
const order = { ... }; // Previously created order object
const csr = { ... }; // Previously created Certificate Signing Request
const result = await client.finalizeOrder(order, csr);
```
<a name="AcmeClient+getAuthorizations"></a>

### acmeClient.getAuthorizations(order) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
Get identifier authorizations from order

https://datatracker.ietf.org/doc/html/rfc8555#section-7.5

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;Array.&lt;object&gt;&gt;</code> - Authorizations  

| Param | Type | Description |
| --- | --- | --- |
| order | <code>object</code> | Order |

**Example**  
Get identifier authorizations
```js
const order = { ... }; // Previously created order object
const authorizations = await client.getAuthorizations(order);

authorizations.forEach((authz) => {
    const { challenges } = authz;
});
```
<a name="AcmeClient+deactivateAuthorization"></a>

### acmeClient.deactivateAuthorization(authz) ⇒ <code>Promise.&lt;object&gt;</code>
Deactivate identifier authorization

https://datatracker.ietf.org/doc/html/rfc8555#section-7.5.2

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Authorization  

| Param | Type | Description |
| --- | --- | --- |
| authz | <code>object</code> | Identifier authorization |

**Example**  
Deactivate identifier authorization
```js
const authz = { ... }; // Identifier authorization resolved from previously created order
const result = await client.deactivateAuthorization(authz);
```
<a name="AcmeClient+getChallengeKeyAuthorization"></a>

### acmeClient.getChallengeKeyAuthorization(challenge) ⇒ <code>Promise.&lt;string&gt;</code>
Get key authorization for ACME challenge

https://datatracker.ietf.org/doc/html/rfc8555#section-8.1

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;string&gt;</code> - Key authorization  

| Param | Type | Description |
| --- | --- | --- |
| challenge | <code>object</code> | Challenge object returned by API |

**Example**  
Get challenge key authorization
```js
const challenge = { ... }; // Challenge from previously resolved identifier authorization
const key = await client.getChallengeKeyAuthorization(challenge);

// Write key somewhere to satisfy challenge
```
<a name="AcmeClient+verifyChallenge"></a>

### acmeClient.verifyChallenge(authz, challenge) ⇒ <code>Promise</code>
Verify that ACME challenge is satisfied

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  

| Param | Type | Description |
| --- | --- | --- |
| authz | <code>object</code> | Identifier authorization |
| challenge | <code>object</code> | Authorization challenge |

**Example**  
Verify satisfied ACME challenge
```js
const authz = { ... }; // Identifier authorization
const challenge = { ... }; // Satisfied challenge
await client.verifyChallenge(authz, challenge);
```
<a name="AcmeClient+completeChallenge"></a>

### acmeClient.completeChallenge(challenge) ⇒ <code>Promise.&lt;object&gt;</code>
Notify CA that challenge has been completed

https://datatracker.ietf.org/doc/html/rfc8555#section-7.5.1

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Challenge  

| Param | Type | Description |
| --- | --- | --- |
| challenge | <code>object</code> | Challenge object returned by API |

**Example**  
Notify CA that challenge has been completed
```js
const challenge = { ... }; // Satisfied challenge
const result = await client.completeChallenge(challenge);
```
<a name="AcmeClient+waitForValidStatus"></a>

### acmeClient.waitForValidStatus(item) ⇒ <code>Promise.&lt;object&gt;</code>
Wait for ACME provider to verify status on a order, authorization or challenge

https://datatracker.ietf.org/doc/html/rfc8555#section-7.5.1

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Valid order, authorization or challenge  

| Param | Type | Description |
| --- | --- | --- |
| item | <code>object</code> | An order, authorization or challenge object |

**Example**  
Wait for valid challenge status
```js
const challenge = { ... };
await client.waitForValidStatus(challenge);
```
**Example**  
Wait for valid authorization status
```js
const authz = { ... };
await client.waitForValidStatus(authz);
```
**Example**  
Wait for valid order status
```js
const order = { ... };
await client.waitForValidStatus(order);
```
<a name="AcmeClient+getCertificate"></a>

### acmeClient.getCertificate(order, [preferredChain]) ⇒ <code>Promise.&lt;string&gt;</code>
Get certificate from ACME order

https://datatracker.ietf.org/doc/html/rfc8555#section-7.4.2

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;string&gt;</code> - Certificate  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| order | <code>object</code> |  | Order object |
| [preferredChain] | <code>string</code> | <code>null</code> | Indicate which certificate chain is preferred if a CA offers multiple, by exact issuer common name, default: `null` |

**Example**  
Get certificate
```js
const order = { ... }; // Previously created order
const certificate = await client.getCertificate(order);
```
**Example**  
Get certificate with preferred chain
```js
const order = { ... }; // Previously created order
const certificate = await client.getCertificate(order, 'DST Root CA X3');
```
<a name="AcmeClient+revokeCertificate"></a>

### acmeClient.revokeCertificate(cert, [data]) ⇒ <code>Promise</code>
Revoke certificate

https://datatracker.ietf.org/doc/html/rfc8555#section-7.6

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  

| Param | Type | Description |
| --- | --- | --- |
| cert | <code>buffer</code> \| <code>string</code> | PEM encoded certificate |
| [data] | <code>object</code> | Additional request data |

**Example**  
Revoke certificate
```js
const certificate = { ... }; // Previously created certificate
const result = await client.revokeCertificate(certificate);
```
**Example**  
Revoke certificate with reason
```js
const certificate = { ... }; // Previously created certificate
const result = await client.revokeCertificate(certificate, {
    reason: 4,
});
```
<a name="AcmeClient+auto"></a>

### acmeClient.auto(opts) ⇒ <code>Promise.&lt;string&gt;</code>
Auto mode

**Kind**: instance method of [<code>AcmeClient</code>](#AcmeClient)  
**Returns**: <code>Promise.&lt;string&gt;</code> - Certificate  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>object</code> |  |
| opts.csr | <code>buffer</code> \| <code>string</code> | Certificate Signing Request |
| opts.challengeCreateFn | <code>function</code> | Function returning Promise triggered before completing ACME challenge |
| opts.challengeRemoveFn | <code>function</code> | Function returning Promise triggered after completing ACME challenge |
| [opts.email] | <code>string</code> | Account email address |
| [opts.termsOfServiceAgreed] | <code>boolean</code> | Agree to Terms of Service, default: `false` |
| [opts.skipChallengeVerification] | <code>boolean</code> | Skip internal challenge verification before notifying ACME provider, default: `false` |
| [opts.challengePriority] | <code>Array.&lt;string&gt;</code> | Array defining challenge type priority, default: `['http-01', 'dns-01']` |
| [opts.preferredChain] | <code>string</code> | Indicate which certificate chain is preferred if a CA offers multiple, by exact issuer common name, default: `null` |

**Example**  
Order a certificate using auto mode
```js
const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
    altNames: ['test.example.com'],
});

const certificate = await client.auto({
    csr: certificateRequest,
    email: 'test@example.com',
    termsOfServiceAgreed: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        // Satisfy challenge here
    },
    challengeRemoveFn: async (authz, challenge, keyAuthorization) => {
        // Clean up challenge here
    },
});
```
**Example**  
Order a certificate using auto mode with preferred chain
```js
const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
    altNames: ['test.example.com'],
});

const certificate = await client.auto({
    csr: certificateRequest,
    email: 'test@example.com',
    termsOfServiceAgreed: true,
    preferredChain: 'DST Root CA X3',
    challengeCreateFn: async () => {},
    challengeRemoveFn: async () => {},
});
```
<a name="Client"></a>

## Client : <code>object</code>
ACME client

**Kind**: global namespace  
