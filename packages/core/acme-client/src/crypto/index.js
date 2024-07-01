/**
 * Native Node.js crypto interface
 *
 * @namespace crypto
 */

const net = require('net');
const { promisify } = require('util');
const crypto = require('crypto');
const asn1js = require('asn1js');
const x509 = require('@peculiar/x509');

const randomInt = promisify(crypto.randomInt);
const generateKeyPair = promisify(crypto.generateKeyPair);

/* Use Node.js Web Crypto API */
x509.cryptoProvider.set(crypto.webcrypto);

/* id-ce-subjectAltName - https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.6 */
const subjectAltNameOID = '2.5.29.17';

/* id-pe-acmeIdentifier - https://datatracker.ietf.org/doc/html/rfc8737#section-6.1 */
const alpnAcmeIdentifierOID = '1.3.6.1.5.5.7.1.31';

/**
 * Determine key type and info by attempting to derive public key
 *
 * @private
 * @param {buffer|string} keyPem PEM encoded private or public key
 * @returns {object}
 */

function getKeyInfo(keyPem) {
    const result = {
        isRSA: false,
        isECDSA: false,
        publicKey: crypto.createPublicKey(keyPem),
    };

    if (result.publicKey.asymmetricKeyType === 'rsa') {
        result.isRSA = true;
    }
    else if (result.publicKey.asymmetricKeyType === 'ec') {
        result.isECDSA = true;
    }
    else {
        throw new Error('Unable to parse key information, unknown format');
    }

    return result;
}

/**
 * Generate a private RSA key
 *
 * @param {number} [modulusLength] Size of the keys modulus in bits, default: `2048`
 * @returns {Promise<buffer>} PEM encoded private RSA key
 *
 * @example Generate private RSA key
 * ```js
 * const privateKey = await acme.crypto.createPrivateRsaKey();
 * ```
 *
 * @example Private RSA key with modulus size 4096
 * ```js
 * const privateKey = await acme.crypto.createPrivateRsaKey(4096);
 * ```
 */

async function createPrivateRsaKey(modulusLength = 2048) {
    const pair = await generateKeyPair('rsa', {
        modulusLength,
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });

    return Buffer.from(pair.privateKey);
}

exports.createPrivateRsaKey = createPrivateRsaKey;

/**
 * Alias of `createPrivateRsaKey()`
 *
 * @function
 */

exports.createPrivateKey = createPrivateRsaKey;

/**
 * Generate a private ECDSA key
 *
 * @param {string} [namedCurve] ECDSA curve name (P-256, P-384 or P-521), default `P-256`
 * @returns {Promise<buffer>} PEM encoded private ECDSA key
 *
 * @example Generate private ECDSA key
 * ```js
 * const privateKey = await acme.crypto.createPrivateEcdsaKey();
 * ```
 *
 * @example Private ECDSA key using P-384 curve
 * ```js
 * const privateKey = await acme.crypto.createPrivateEcdsaKey('P-384');
 * ```
 */

exports.createPrivateEcdsaKey = async (namedCurve = 'P-256') => {
    const pair = await generateKeyPair('ec', {
        namedCurve,
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });

    return Buffer.from(pair.privateKey);
};

/**
 * Get a public key derived from a RSA or ECDSA key
 *
 * @param {buffer|string} keyPem PEM encoded private or public key
 * @returns {buffer} PEM encoded public key
 *
 * @example Get public key
 * ```js
 * const publicKey = acme.crypto.getPublicKey(privateKey);
 * ```
 */

exports.getPublicKey = (keyPem) => {
    const info = getKeyInfo(keyPem);

    const publicKey = info.publicKey.export({
        type: info.isECDSA ? 'spki' : 'pkcs1',
        format: 'pem',
    });

    return Buffer.from(publicKey);
};

/**
 * Get a JSON Web Key derived from a RSA or ECDSA key
 *
 * https://datatracker.ietf.org/doc/html/rfc7517
 *
 * @param {buffer|string} keyPem PEM encoded private or public key
 * @returns {object} JSON Web Key
 *
 * @example Get JWK
 * ```js
 * const jwk = acme.crypto.getJwk(privateKey);
 * ```
 */

function getJwk(keyPem) {
    const jwk = crypto.createPublicKey(keyPem).export({
        format: 'jwk',
    });

    /* Sort keys */
    return Object.keys(jwk).sort().reduce((result, k) => {
        result[k] = jwk[k];
        return result;
    }, {});
}

exports.getJwk = getJwk;

/**
 * Produce CryptoKeyPair and signing algorithm from a PEM encoded private key
 *
 * @private
 * @param {buffer|string} keyPem PEM encoded private key
 * @returns {Promise<array>} [keyPair, signingAlgorithm]
 */

async function getWebCryptoKeyPair(keyPem) {
    const info = getKeyInfo(keyPem);
    const jwk = getJwk(keyPem);

    /* Signing algorithm */
    const sigalg = {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
    };

    if (info.isECDSA) {
        sigalg.name = 'ECDSA';
        sigalg.namedCurve = jwk.crv;

        if (jwk.crv === 'P-384') {
            sigalg.hash.name = 'SHA-384';
        }

        if (jwk.crv === 'P-521') {
            sigalg.hash.name = 'SHA-512';
        }
    }

    /* Decode PEM and import into CryptoKeyPair */
    const privateKeyDec = x509.PemConverter.decodeFirst(keyPem.toString());
    const privateKey = await crypto.webcrypto.subtle.importKey('pkcs8', privateKeyDec, sigalg, true, ['sign']);
    const publicKey = await crypto.webcrypto.subtle.importKey('jwk', jwk, sigalg, true, ['verify']);

    return [{ privateKey, publicKey }, sigalg];
}

/**
 * Split chain of PEM encoded objects from string into array
 *
 * @param {buffer|string} chainPem PEM encoded object chain
 * @returns {string[]} Array of PEM objects including headers
 */

function splitPemChain(chainPem) {
    if (Buffer.isBuffer(chainPem)) {
        chainPem = chainPem.toString();
    }

    /* Decode into array and re-encode */
    return x509.PemConverter.decodeWithHeaders(chainPem)
        .map((params) => x509.PemConverter.encode([params]));
}

exports.splitPemChain = splitPemChain;

/**
 * Parse body of PEM encoded object and return a Base64URL string
 * If multiple objects are chained, the first body will be returned
 *
 * @param {buffer|string} pem PEM encoded chain or object
 * @returns {string} Base64URL-encoded body
 */

exports.getPemBodyAsB64u = (pem) => {
    const chain = splitPemChain(pem);

    if (!chain.length) {
        throw new Error('Unable to parse PEM body from string');
    }

    /* Select first object, extract body and convert to b64u */
    const dec = x509.PemConverter.decodeFirst(chain[0]);
    return Buffer.from(dec).toString('base64url');
};

/**
 * Parse domains from a certificate or CSR
 *
 * @private
 * @param {object} input x509.Certificate or x509.Pkcs10CertificateRequest
 * @returns {object} {commonName, altNames}
 */

function parseDomains(input) {
    const commonName = input.subjectName.getField('CN').pop() || null;
    const altNamesRaw = input.getExtension(subjectAltNameOID);
    let altNames = [];

    if (altNamesRaw) {
        const altNamesExt = new x509.SubjectAlternativeNameExtension(altNamesRaw.rawData);
        altNames = altNames.concat(altNamesExt.names.items.map((i) => i.value));
    }

    return {
        commonName,
        altNames,
    };
}

/**
 * Read domains from a Certificate Signing Request
 *
 * @param {buffer|string} csrPem PEM encoded Certificate Signing Request
 * @returns {object} {commonName, altNames}
 *
 * @example Read Certificate Signing Request domains
 * ```js
 * const { commonName, altNames } = acme.crypto.readCsrDomains(certificateRequest);
 *
 * console.log(`Common name: ${commonName}`);
 * console.log(`Alt names: ${altNames.join(', ')}`);
 * ```
 */

exports.readCsrDomains = (csrPem) => {
    if (Buffer.isBuffer(csrPem)) {
        csrPem = csrPem.toString();
    }

    const dec = x509.PemConverter.decodeFirst(csrPem);
    const csr = new x509.Pkcs10CertificateRequest(dec);
    return parseDomains(csr);
};

/**
 * Read information from a certificate
 * If multiple certificates are chained, the first will be read
 *
 * @param {buffer|string} certPem PEM encoded certificate or chain
 * @returns {object} Certificate info
 *
 * @example Read certificate information
 * ```js
 * const info = acme.crypto.readCertificateInfo(certificate);
 * const { commonName, altNames } = info.domains;
 *
 * console.log(`Not after: ${info.notAfter}`);
 * console.log(`Not before: ${info.notBefore}`);
 *
 * console.log(`Common name: ${commonName}`);
 * console.log(`Alt names: ${altNames.join(', ')}`);
 * ```
 */

exports.readCertificateInfo = (certPem) => {
    if (Buffer.isBuffer(certPem)) {
        certPem = certPem.toString();
    }

    const dec = x509.PemConverter.decodeFirst(certPem);
    const cert = new x509.X509Certificate(dec);

    return {
        issuer: {
            commonName: cert.issuerName.getField('CN').pop() || null,
        },
        domains: parseDomains(cert),
        notBefore: cert.notBefore,
        notAfter: cert.notAfter,
    };
};

/**
 * Determine ASN.1 character string type for CSR subject field name
 *
 * https://datatracker.ietf.org/doc/html/rfc5280
 * https://github.com/PeculiarVentures/x509/blob/ecf78224fd594abbc2fa83c41565d79874f88e00/src/name.ts#L65-L71
 *
 * @private
 * @param {string} field CSR subject field name
 * @returns {string} ASN.1 character string type
 */

function getCsrAsn1CharStringType(field) {
    switch (field) {
        case 'C':
            return 'printableString';
        case 'E':
            return 'ia5String';
        default:
            return 'utf8String';
    }
}

/**
 * Create array of subject fields for a Certificate Signing Request
 *
 * https://github.com/PeculiarVentures/x509/blob/ecf78224fd594abbc2fa83c41565d79874f88e00/src/name.ts#L65-L71
 *
 * @private
 * @param {object} input Key-value of subject fields
 * @returns {object[]} Certificate Signing Request subject array
 */

function createCsrSubject(input) {
    return Object.entries(input).reduce((result, [type, value]) => {
        if (value) {
            const ds = getCsrAsn1CharStringType(type);
            result.push({ [type]: [{ [ds]: value }] });
        }

        return result;
    }, []);
}

/**
 * Create x509 subject alternate name extension
 *
 * https://github.com/PeculiarVentures/x509/blob/ecf78224fd594abbc2fa83c41565d79874f88e00/src/extensions/subject_alt_name.ts
 *
 * @private
 * @param {string[]} altNames Array of alt names
 * @returns {x509.SubjectAlternativeNameExtension} Subject alternate name extension
 */

function createSubjectAltNameExtension(altNames) {
    return new x509.SubjectAlternativeNameExtension(altNames.map((value) => {
        const type = net.isIP(value) ? 'ip' : 'dns';
        return { type, value };
    }));
}

/**
 * Create a Certificate Signing Request
 *
 * @param {object} data
 * @param {number} [data.keySize] Size of newly created RSA private key modulus in bits, default: `2048`
 * @param {string} [data.commonName] FQDN of your server
 * @param {string[]} [data.altNames] SAN (Subject Alternative Names), default: `[]`
 * @param {string} [data.country] 2 letter country code
 * @param {string} [data.state] State or province
 * @param {string} [data.locality] City
 * @param {string} [data.organization] Organization name
 * @param {string} [data.organizationUnit] Organizational unit name
 * @param {string} [data.emailAddress] Email address
 * @param {buffer|string} [keyPem] PEM encoded CSR private key
 * @returns {Promise<buffer[]>} [privateKey, certificateSigningRequest]
 *
 * @example Create a Certificate Signing Request
 * ```js
 * const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
 *     altNames: ['test.example.com'],
 * });
 * ```
 *
 * @example Certificate Signing Request with both common and alternative names
 * > *Warning*: Certificate subject common name has been [deprecated](https://letsencrypt.org/docs/glossary/#def-CN) and its use is [discouraged](https://cabforum.org/uploads/BRv1.2.3.pdf).
 * ```js
 * const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
 *     keySize: 4096,
 *     commonName: 'test.example.com',
 *     altNames: ['foo.example.com', 'bar.example.com'],
 * });
 * ```
 *
 * @example Certificate Signing Request with additional information
 * ```js
 * const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
 *     altNames: ['test.example.com'],
 *     country: 'US',
 *     state: 'California',
 *     locality: 'Los Angeles',
 *     organization: 'The Company Inc.',
 *     organizationUnit: 'IT Department',
 *     emailAddress: 'contact@example.com',
 * });
 * ```
 *
 * @example Certificate Signing Request with ECDSA private key
 * ```js
 * const certificateKey = await acme.crypto.createPrivateEcdsaKey();
 *
 * const [, certificateRequest] = await acme.crypto.createCsr({
 *     altNames: ['test.example.com'],
 * }, certificateKey);
 * ```
 */

exports.createCsr = async (data, keyPem = null) => {
    if (!keyPem) {
        keyPem = await createPrivateRsaKey(data.keySize);
    }
    else if (!Buffer.isBuffer(keyPem)) {
        keyPem = Buffer.from(keyPem);
    }

    if (typeof data.altNames === 'undefined') {
        data.altNames = [];
    }

    /* Ensure subject common name is present in SAN - https://cabforum.org/wp-content/uploads/BRv1.2.3.pdf */
    if (data.commonName && !data.altNames.includes(data.commonName)) {
        data.altNames.unshift(data.commonName);
    }

    /* CryptoKeyPair and signing algorithm from private key */
    const [keys, signingAlgorithm] = await getWebCryptoKeyPair(keyPem);

    const extensions = [
        /* https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.3 */
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyEncipherment), // eslint-disable-line no-bitwise

        /* https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.6 */
        createSubjectAltNameExtension(data.altNames),
    ];

    /* Create CSR */
    const csr = await x509.Pkcs10CertificateRequestGenerator.create({
        keys,
        extensions,
        signingAlgorithm,
        name: createCsrSubject({
            CN: data.commonName,
            C: data.country,
            ST: data.state,
            L: data.locality,
            O: data.organization,
            OU: data.organizationUnit,
            E: data.emailAddress,
        }),
    });

    /* Done */
    const pem = csr.toString('pem');
    return [keyPem, Buffer.from(pem)];
};

/**
 * Create a self-signed ALPN certificate for TLS-ALPN-01 challenges
 *
 * https://datatracker.ietf.org/doc/html/rfc8737
 *
 * @param {object} authz Identifier authorization
 * @param {string} keyAuthorization Challenge key authorization
 * @param {buffer|string} [keyPem] PEM encoded CSR private key
 * @returns {Promise<buffer[]>} [privateKey, certificate]
 *
 * @example Create a ALPN certificate
 * ```js
 * const [alpnKey, alpnCertificate] = await acme.crypto.createAlpnCertificate(authz, keyAuthorization);
 * ```
 *
 * @example Create a ALPN certificate with ECDSA private key
 * ```js
 * const alpnKey = await acme.crypto.createPrivateEcdsaKey();
 * const [, alpnCertificate] = await acme.crypto.createAlpnCertificate(authz, keyAuthorization, alpnKey);
 * ```
 */

exports.createAlpnCertificate = async (authz, keyAuthorization, keyPem = null) => {
    if (!keyPem) {
        keyPem = await createPrivateRsaKey();
    }
    else if (!Buffer.isBuffer(keyPem)) {
        keyPem = Buffer.from(keyPem);
    }

    const now = new Date();
    const commonName = authz.identifier.value;

    /* Pseudo-random serial - max 20 bytes, 11 for epoch (year 5138), 9 random */
    const random = await randomInt(1, 999999999);
    const serialNumber = `${Math.floor(now.getTime() / 1000)}${random}`;

    /* CryptoKeyPair and signing algorithm from private key */
    const [keys, signingAlgorithm] = await getWebCryptoKeyPair(keyPem);

    const extensions = [
        /* https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.3 */
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true), // eslint-disable-line no-bitwise

        /* https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.9 */
        new x509.BasicConstraintsExtension(true, 2, true),

        /* https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.2 */
        await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),

        /* https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.6 */
        createSubjectAltNameExtension([commonName]),
    ];

    /* ALPN extension */
    const payload = crypto.createHash('sha256').update(keyAuthorization).digest('hex');
    const octstr = new asn1js.OctetString({ valueHex: Buffer.from(payload, 'hex') });
    extensions.push(new x509.Extension(alpnAcmeIdentifierOID, true, octstr.toBER()));

    /* Self-signed ALPN certificate */
    const cert = await x509.X509CertificateGenerator.createSelfSigned({
        keys,
        signingAlgorithm,
        extensions,
        serialNumber,
        notBefore: now,
        notAfter: now,
        name: createCsrSubject({
            CN: commonName,
        }),
    });

    /* Done */
    const pem = cert.toString('pem');
    return [keyPem, Buffer.from(pem)];
};

/**
 * Validate that a ALPN certificate contains the expected key authorization
 *
 * @param {buffer|string} certPem PEM encoded certificate
 * @param {string} keyAuthorization Expected challenge key authorization
 * @returns {boolean} True when valid
 */

exports.isAlpnCertificateAuthorizationValid = (certPem, keyAuthorization) => {
    const expected = crypto.createHash('sha256').update(keyAuthorization).digest('hex');

    /* Attempt to locate ALPN extension */
    const cert = new x509.X509Certificate(certPem);
    const ext = cert.getExtension(alpnAcmeIdentifierOID);

    if (!ext) {
        throw new Error('Unable to locate ALPN extension within parsed certificate');
    }

    /* Decode extension value */
    const parsed = asn1js.fromBER(ext.value);
    const result = Buffer.from(parsed.result.valueBlock.valueHexView).toString('hex');

    /* Return true if match */
    return (result === expected);
};
