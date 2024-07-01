## Objects

<dl>
<dt><a href="#crypto">crypto</a> : <code>object</code></dt>
<dd><p>Native Node.js crypto interface</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#createPrivateRsaKey">createPrivateRsaKey([modulusLength])</a> ⇒ <code>Promise.&lt;buffer&gt;</code></dt>
<dd><p>Generate a private RSA key</p>
</dd>
<dt><a href="#createPrivateKey">createPrivateKey()</a></dt>
<dd><p>Alias of <code>createPrivateRsaKey()</code></p>
</dd>
<dt><a href="#createPrivateEcdsaKey">createPrivateEcdsaKey([namedCurve])</a> ⇒ <code>Promise.&lt;buffer&gt;</code></dt>
<dd><p>Generate a private ECDSA key</p>
</dd>
<dt><a href="#getPublicKey">getPublicKey(keyPem)</a> ⇒ <code>buffer</code></dt>
<dd><p>Get a public key derived from a RSA or ECDSA key</p>
</dd>
<dt><a href="#getJwk">getJwk(keyPem)</a> ⇒ <code>object</code></dt>
<dd><p>Get a JSON Web Key derived from a RSA or ECDSA key</p>
<p><a href="https://datatracker.ietf.org/doc/html/rfc7517">https://datatracker.ietf.org/doc/html/rfc7517</a></p>
</dd>
<dt><a href="#splitPemChain">splitPemChain(chainPem)</a> ⇒ <code>Array.&lt;string&gt;</code></dt>
<dd><p>Split chain of PEM encoded objects from string into array</p>
</dd>
<dt><a href="#getPemBodyAsB64u">getPemBodyAsB64u(pem)</a> ⇒ <code>string</code></dt>
<dd><p>Parse body of PEM encoded object and return a Base64URL string
If multiple objects are chained, the first body will be returned</p>
</dd>
<dt><a href="#readCsrDomains">readCsrDomains(csrPem)</a> ⇒ <code>object</code></dt>
<dd><p>Read domains from a Certificate Signing Request</p>
</dd>
<dt><a href="#readCertificateInfo">readCertificateInfo(certPem)</a> ⇒ <code>object</code></dt>
<dd><p>Read information from a certificate
If multiple certificates are chained, the first will be read</p>
</dd>
<dt><a href="#createCsr">createCsr(data, [keyPem])</a> ⇒ <code>Promise.&lt;Array.&lt;buffer&gt;&gt;</code></dt>
<dd><p>Create a Certificate Signing Request</p>
</dd>
<dt><a href="#createAlpnCertificate">createAlpnCertificate(authz, keyAuthorization, [keyPem])</a> ⇒ <code>Promise.&lt;Array.&lt;buffer&gt;&gt;</code></dt>
<dd><p>Create a self-signed ALPN certificate for TLS-ALPN-01 challenges</p>
<p><a href="https://datatracker.ietf.org/doc/html/rfc8737">https://datatracker.ietf.org/doc/html/rfc8737</a></p>
</dd>
<dt><a href="#isAlpnCertificateAuthorizationValid">isAlpnCertificateAuthorizationValid(certPem, keyAuthorization)</a> ⇒ <code>boolean</code></dt>
<dd><p>Validate that a ALPN certificate contains the expected key authorization</p>
</dd>
</dl>

<a name="crypto"></a>

## crypto : <code>object</code>
Native Node.js crypto interface

**Kind**: global namespace  
<a name="createPrivateRsaKey"></a>

## createPrivateRsaKey([modulusLength]) ⇒ <code>Promise.&lt;buffer&gt;</code>
Generate a private RSA key

**Kind**: global function  
**Returns**: <code>Promise.&lt;buffer&gt;</code> - PEM encoded private RSA key  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [modulusLength] | <code>number</code> | <code>2048</code> | Size of the keys modulus in bits, default: `2048` |

**Example**  
Generate private RSA key
```js
const privateKey = await acme.crypto.createPrivateRsaKey();
```
**Example**  
Private RSA key with modulus size 4096
```js
const privateKey = await acme.crypto.createPrivateRsaKey(4096);
```
<a name="createPrivateKey"></a>

## createPrivateKey()
Alias of `createPrivateRsaKey()`

**Kind**: global function  
<a name="createPrivateEcdsaKey"></a>

## createPrivateEcdsaKey([namedCurve]) ⇒ <code>Promise.&lt;buffer&gt;</code>
Generate a private ECDSA key

**Kind**: global function  
**Returns**: <code>Promise.&lt;buffer&gt;</code> - PEM encoded private ECDSA key  

| Param | Type | Description |
| --- | --- | --- |
| [namedCurve] | <code>string</code> | ECDSA curve name (P-256, P-384 or P-521), default `P-256` |

**Example**  
Generate private ECDSA key
```js
const privateKey = await acme.crypto.createPrivateEcdsaKey();
```
**Example**  
Private ECDSA key using P-384 curve
```js
const privateKey = await acme.crypto.createPrivateEcdsaKey('P-384');
```
<a name="getPublicKey"></a>

## getPublicKey(keyPem) ⇒ <code>buffer</code>
Get a public key derived from a RSA or ECDSA key

**Kind**: global function  
**Returns**: <code>buffer</code> - PEM encoded public key  

| Param | Type | Description |
| --- | --- | --- |
| keyPem | <code>buffer</code> \| <code>string</code> | PEM encoded private or public key |

**Example**  
Get public key
```js
const publicKey = acme.crypto.getPublicKey(privateKey);
```
<a name="getJwk"></a>

## getJwk(keyPem) ⇒ <code>object</code>
Get a JSON Web Key derived from a RSA or ECDSA key

https://datatracker.ietf.org/doc/html/rfc7517

**Kind**: global function  
**Returns**: <code>object</code> - JSON Web Key  

| Param | Type | Description |
| --- | --- | --- |
| keyPem | <code>buffer</code> \| <code>string</code> | PEM encoded private or public key |

**Example**  
Get JWK
```js
const jwk = acme.crypto.getJwk(privateKey);
```
<a name="splitPemChain"></a>

## splitPemChain(chainPem) ⇒ <code>Array.&lt;string&gt;</code>
Split chain of PEM encoded objects from string into array

**Kind**: global function  
**Returns**: <code>Array.&lt;string&gt;</code> - Array of PEM objects including headers  

| Param | Type | Description |
| --- | --- | --- |
| chainPem | <code>buffer</code> \| <code>string</code> | PEM encoded object chain |

<a name="getPemBodyAsB64u"></a>

## getPemBodyAsB64u(pem) ⇒ <code>string</code>
Parse body of PEM encoded object and return a Base64URL string
If multiple objects are chained, the first body will be returned

**Kind**: global function  
**Returns**: <code>string</code> - Base64URL-encoded body  

| Param | Type | Description |
| --- | --- | --- |
| pem | <code>buffer</code> \| <code>string</code> | PEM encoded chain or object |

<a name="readCsrDomains"></a>

## readCsrDomains(csrPem) ⇒ <code>object</code>
Read domains from a Certificate Signing Request

**Kind**: global function  
**Returns**: <code>object</code> - {commonName, altNames}  

| Param | Type | Description |
| --- | --- | --- |
| csrPem | <code>buffer</code> \| <code>string</code> | PEM encoded Certificate Signing Request |

**Example**  
Read Certificate Signing Request domains
```js
const { commonName, altNames } = acme.crypto.readCsrDomains(certificateRequest);

console.log(`Common name: ${commonName}`);
console.log(`Alt names: ${altNames.join(', ')}`);
```
<a name="readCertificateInfo"></a>

## readCertificateInfo(certPem) ⇒ <code>object</code>
Read information from a certificate
If multiple certificates are chained, the first will be read

**Kind**: global function  
**Returns**: <code>object</code> - Certificate info  

| Param | Type | Description |
| --- | --- | --- |
| certPem | <code>buffer</code> \| <code>string</code> | PEM encoded certificate or chain |

**Example**  
Read certificate information
```js
const info = acme.crypto.readCertificateInfo(certificate);
const { commonName, altNames } = info.domains;

console.log(`Not after: ${info.notAfter}`);
console.log(`Not before: ${info.notBefore}`);

console.log(`Common name: ${commonName}`);
console.log(`Alt names: ${altNames.join(', ')}`);
```
<a name="createCsr"></a>

## createCsr(data, [keyPem]) ⇒ <code>Promise.&lt;Array.&lt;buffer&gt;&gt;</code>
Create a Certificate Signing Request

**Kind**: global function  
**Returns**: <code>Promise.&lt;Array.&lt;buffer&gt;&gt;</code> - [privateKey, certificateSigningRequest]  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> |  |
| [data.keySize] | <code>number</code> | Size of newly created RSA private key modulus in bits, default: `2048` |
| [data.commonName] | <code>string</code> | FQDN of your server |
| [data.altNames] | <code>Array.&lt;string&gt;</code> | SAN (Subject Alternative Names), default: `[]` |
| [data.country] | <code>string</code> | 2 letter country code |
| [data.state] | <code>string</code> | State or province |
| [data.locality] | <code>string</code> | City |
| [data.organization] | <code>string</code> | Organization name |
| [data.organizationUnit] | <code>string</code> | Organizational unit name |
| [data.emailAddress] | <code>string</code> | Email address |
| [keyPem] | <code>buffer</code> \| <code>string</code> | PEM encoded CSR private key |

**Example**  
Create a Certificate Signing Request
```js
const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
    altNames: ['test.example.com'],
});
```
**Example**  
Certificate Signing Request with both common and alternative names
> *Warning*: Certificate subject common name has been [deprecated](https://letsencrypt.org/docs/glossary/#def-CN) and its use is [discouraged](https://cabforum.org/uploads/BRv1.2.3.pdf).
```js
const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
    keySize: 4096,
    commonName: 'test.example.com',
    altNames: ['foo.example.com', 'bar.example.com'],
});
```
**Example**  
Certificate Signing Request with additional information
```js
const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
    altNames: ['test.example.com'],
    country: 'US',
    state: 'California',
    locality: 'Los Angeles',
    organization: 'The Company Inc.',
    organizationUnit: 'IT Department',
    emailAddress: 'contact@example.com',
});
```
**Example**  
Certificate Signing Request with ECDSA private key
```js
const certificateKey = await acme.crypto.createPrivateEcdsaKey();

const [, certificateRequest] = await acme.crypto.createCsr({
    altNames: ['test.example.com'],
}, certificateKey);
```
<a name="createAlpnCertificate"></a>

## createAlpnCertificate(authz, keyAuthorization, [keyPem]) ⇒ <code>Promise.&lt;Array.&lt;buffer&gt;&gt;</code>
Create a self-signed ALPN certificate for TLS-ALPN-01 challenges

https://datatracker.ietf.org/doc/html/rfc8737

**Kind**: global function  
**Returns**: <code>Promise.&lt;Array.&lt;buffer&gt;&gt;</code> - [privateKey, certificate]  

| Param | Type | Description |
| --- | --- | --- |
| authz | <code>object</code> | Identifier authorization |
| keyAuthorization | <code>string</code> | Challenge key authorization |
| [keyPem] | <code>buffer</code> \| <code>string</code> | PEM encoded CSR private key |

**Example**  
Create a ALPN certificate
```js
const [alpnKey, alpnCertificate] = await acme.crypto.createAlpnCertificate(authz, keyAuthorization);
```
**Example**  
Create a ALPN certificate with ECDSA private key
```js
const alpnKey = await acme.crypto.createPrivateEcdsaKey();
const [, alpnCertificate] = await acme.crypto.createAlpnCertificate(authz, keyAuthorization, alpnKey);
```
<a name="isAlpnCertificateAuthorizationValid"></a>

## isAlpnCertificateAuthorizationValid(certPem, keyAuthorization) ⇒ <code>boolean</code>
Validate that a ALPN certificate contains the expected key authorization

**Kind**: global function  
**Returns**: <code>boolean</code> - True when valid  

| Param | Type | Description |
| --- | --- | --- |
| certPem | <code>buffer</code> \| <code>string</code> | PEM encoded certificate |
| keyAuthorization | <code>string</code> | Expected challenge key authorization |

