/**
 * Legacy node-forge crypto interface
 *
 * DEPRECATION WARNING: This crypto interface is deprecated and will be removed from acme-client in a future
 * major release. Please migrate to the new `acme.crypto` interface at your earliest convenience.
 *
 * @namespace forge
 */

const net = require('net');
const { promisify } = require('util');
const forge = require('node-forge');
const { createPrivateEcdsaKey, getPublicKey } = require('./index');

const generateKeyPair = promisify(forge.pki.rsa.generateKeyPair);

/**
 * Attempt to parse forge object from PEM encoded string
 *
 * @private
 * @param {string} input PEM string
 * @return {object}
 */

function forgeObjectFromPem(input) {
    const msg = forge.pem.decode(input)[0];
    let result;

    switch (msg.type) {
        case 'PRIVATE KEY':
        case 'RSA PRIVATE KEY':
            result = forge.pki.privateKeyFromPem(input);
            break;

        case 'PUBLIC KEY':
        case 'RSA PUBLIC KEY':
            result = forge.pki.publicKeyFromPem(input);
            break;

        case 'CERTIFICATE':
        case 'X509 CERTIFICATE':
        case 'TRUSTED CERTIFICATE':
            result = forge.pki.certificateFromPem(input).publicKey;
            break;

        case 'CERTIFICATE REQUEST':
            result = forge.pki.certificationRequestFromPem(input).publicKey;
            break;

        default:
            throw new Error('Unable to detect forge message type');
    }

    return result;
}

/**
 * Parse domain names from a certificate or CSR
 *
 * @private
 * @param {object} obj Forge certificate or CSR
 * @returns {object} {commonName, altNames}
 */

function parseDomains(obj) {
    let commonName = null;
    let altNames = [];
    let altNamesDict = [];

    const commonNameObject = (obj.subject.attributes || []).find((a) => a.name === 'commonName');
    const rootAltNames = (obj.extensions || []).find((e) => 'altNames' in e);
    const rootExtensions = (obj.attributes || []).find((a) => 'extensions' in a);

    if (rootAltNames && rootAltNames.altNames && rootAltNames.altNames.length) {
        altNamesDict = rootAltNames.altNames;
    }
    else if (rootExtensions && rootExtensions.extensions && rootExtensions.extensions.length) {
        const extAltNames = rootExtensions.extensions.find((e) => 'altNames' in e);

        if (extAltNames && extAltNames.altNames && extAltNames.altNames.length) {
            altNamesDict = extAltNames.altNames;
        }
    }

    if (commonNameObject) {
        commonName = commonNameObject.value;
    }

    if (altNamesDict) {
        altNames = altNamesDict.map((a) => a.value);
    }

    return {
        commonName,
        altNames,
    };
}

/**
 * Generate a private RSA key
 *
 * @param {number} [size] Size of the key, default: `2048`
 * @returns {Promise<buffer>} PEM encoded private RSA key
 *
 * @example Generate private RSA key
 * ```js
 * const privateKey = await acme.forge.createPrivateKey();
 * ```
 *
 * @example Private RSA key with defined size
 * ```js
 * const privateKey = await acme.forge.createPrivateKey(4096);
 * ```
 */

async function createPrivateKey(size = 2048) {
    const keyPair = await generateKeyPair({ bits: size });
    const pemKey = forge.pki.privateKeyToPem(keyPair.privateKey);
    return Buffer.from(pemKey);
}

exports.createPrivateKey = createPrivateKey;

/**
 * Create public key from a private RSA key
 *
 * @param {buffer|string} key PEM encoded private RSA key
 * @returns {Promise<buffer>} PEM encoded public RSA key
 *
 * @example Create public key
 * ```js
 * const publicKey = await acme.forge.createPublicKey(privateKey);
 * ```
 */

exports.createPublicKey = async (key) => {
    const privateKey = forge.pki.privateKeyFromPem(key);
    const publicKey = forge.pki.rsa.setPublicKey(privateKey.n, privateKey.e);
    const pemKey = forge.pki.publicKeyToPem(publicKey);
    return Buffer.from(pemKey);
};

/**
 * Parse body of PEM encoded object from buffer or string
 * If multiple objects are chained, the first body will be returned
 *
 * @param {buffer|string} str PEM encoded buffer or string
 * @returns {string} PEM body
 */

exports.getPemBody = (str) => {
    const msg = forge.pem.decode(str)[0];
    return forge.util.encode64(msg.body);
};

/**
 * Split chain of PEM encoded objects from buffer or string into array
 *
 * @param {buffer|string} str PEM encoded buffer or string
 * @returns {string[]} Array of PEM bodies
 */

exports.splitPemChain = (str) => forge.pem.decode(str).map(forge.pem.encode);

/**
 * Get modulus
 *
 * @param {buffer|string} input PEM encoded private key, certificate or CSR
 * @returns {Promise<buffer>} Modulus
 *
 * @example Get modulus
 * ```js
 * const m1 = await acme.forge.getModulus(privateKey);
 * const m2 = await acme.forge.getModulus(certificate);
 * const m3 = await acme.forge.getModulus(certificateRequest);
 * ```
 */

exports.getModulus = async (input) => {
    if (!Buffer.isBuffer(input)) {
        input = Buffer.from(input);
    }

    const obj = forgeObjectFromPem(input);
    return Buffer.from(forge.util.hexToBytes(obj.n.toString(16)), 'binary');
};

/**
 * Get public exponent
 *
 * @param {buffer|string} input PEM encoded private key, certificate or CSR
 * @returns {Promise<buffer>} Exponent
 *
 * @example Get public exponent
 * ```js
 * const e1 = await acme.forge.getPublicExponent(privateKey);
 * const e2 = await acme.forge.getPublicExponent(certificate);
 * const e3 = await acme.forge.getPublicExponent(certificateRequest);
 * ```
 */

exports.getPublicExponent = async (input) => {
    if (!Buffer.isBuffer(input)) {
        input = Buffer.from(input);
    }

    const obj = forgeObjectFromPem(input);
    return Buffer.from(forge.util.hexToBytes(obj.e.toString(16)), 'binary');
};

/**
 * Read domains from a Certificate Signing Request
 *
 * @param {buffer|string} csr PEM encoded Certificate Signing Request
 * @returns {Promise<object>} {commonName, altNames}
 *
 * @example Read Certificate Signing Request domains
 * ```js
 * const { commonName, altNames } = await acme.forge.readCsrDomains(certificateRequest);
 *
 * console.log(`Common name: ${commonName}`);
 * console.log(`Alt names: ${altNames.join(', ')}`);
 * ```
 */

exports.readCsrDomains = async (csr) => {
    if (!Buffer.isBuffer(csr)) {
        csr = Buffer.from(csr);
    }

    const obj = forge.pki.certificationRequestFromPem(csr);
    return parseDomains(obj);
};

/**
 * Read information from a certificate
 *
 * @param {buffer|string} cert PEM encoded certificate
 * @returns {Promise<object>} Certificate info
 *
 * @example Read certificate information
 * ```js
 * const info = await acme.forge.readCertificateInfo(certificate);
 * const { commonName, altNames } = info.domains;
 *
 * console.log(`Not after: ${info.notAfter}`);
 * console.log(`Not before: ${info.notBefore}`);
 *
 * console.log(`Common name: ${commonName}`);
 * console.log(`Alt names: ${altNames.join(', ')}`);
 * ```
 */

exports.readCertificateInfo = async (cert) => {
    if (!Buffer.isBuffer(cert)) {
        cert = Buffer.from(cert);
    }

    const obj = forge.pki.certificateFromPem(cert);
    const issuerCn = (obj.issuer.attributes || []).find((a) => a.name === 'commonName');

    return {
        issuer: {
            commonName: issuerCn ? issuerCn.value : null,
        },
        domains: parseDomains(obj),
        notAfter: obj.validity.notAfter,
        notBefore: obj.validity.notBefore,
    };
};

/**
 * Determine ASN.1 type for CSR subject short name
 * Note: https://datatracker.ietf.org/doc/html/rfc5280
 *
 * @private
 * @param {string} shortName CSR subject short name
 * @returns {forge.asn1.Type} ASN.1 type
 */

function getCsrValueTagClass(shortName) {
    switch (shortName) {
        case 'C':
            return forge.asn1.Type.PRINTABLESTRING;
        case 'E':
            return forge.asn1.Type.IA5STRING;
        default:
            return forge.asn1.Type.UTF8;
    }
}

/**
 * Create array of short names and values for Certificate Signing Request subjects
 *
 * @private
 * @param {object} subjectObj Key-value of short names and values
 * @returns {object[]} Certificate Signing Request subject array
 */

function createCsrSubject(subjectObj) {
    return Object.entries(subjectObj).reduce((result, [shortName, value]) => {
        if (value) {
            const valueTagClass = getCsrValueTagClass(shortName);
            result.push({ shortName, value, valueTagClass });
        }

        return result;
    }, []);
}

/**
 * Create array of alt names for Certificate Signing Requests
 * Note: https://github.com/digitalbazaar/forge/blob/dfdde475677a8a25c851e33e8f81dca60d90cfb9/lib/x509.js#L1444-L1454
 *
 * @private
 * @param {string[]} altNames Alt names
 * @returns {object[]} Certificate Signing Request alt names array
 */

function formatCsrAltNames(altNames) {
    return altNames.map((value) => {
        const type = net.isIP(value) ? 7 : 2;
        return { type, value };
    });
}

/**
 * Create a Certificate Signing Request
 *
 * @param {object} data
 * @param {number} [data.keySize] Size of newly created private key, default: `2048`
 * @param {string} [data.commonName]
 * @param {string[]} [data.altNames] default: `[]`
 * @param {string} [data.country]
 * @param {string} [data.state]
 * @param {string} [data.locality]
 * @param {string} [data.organization]
 * @param {string} [data.organizationUnit]
 * @param {string} [data.emailAddress]
 * @param {buffer|string} [key] CSR private key
 * @returns {Promise<buffer[]>} [privateKey, certificateSigningRequest]
 *
 * @example Create a Certificate Signing Request
 * ```js
 * const [certificateKey, certificateRequest] = await acme.forge.createCsr({
 *     altNames: ['test.example.com'],
 * });
 * ```
 *
 * @example Certificate Signing Request with both common and alternative names
 * > *Warning*: Certificate subject common name has been [deprecated](https://letsencrypt.org/docs/glossary/#def-CN) and its use is [discouraged](https://cabforum.org/uploads/BRv1.2.3.pdf).
 * ```js
 * const [certificateKey, certificateRequest] = await acme.forge.createCsr({
 *     keySize: 4096,
 *     commonName: 'test.example.com',
 *     altNames: ['foo.example.com', 'bar.example.com'],
 * });
 * ```
 *
 * @example Certificate Signing Request with additional information
 * ```js
 * const [certificateKey, certificateRequest] = await acme.forge.createCsr({
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
 * @example Certificate Signing Request with predefined private key
 * ```js
 * const certificateKey = await acme.forge.createPrivateKey();
 *
 * const [, certificateRequest] = await acme.forge.createCsr({
 *     altNames: ['test.example.com'],
 * }, certificateKey);
 */

exports.createCsr = async (data, keyType = null) => {
    let key = null;
    if (keyType === 'ec') {
        key = await createPrivateEcdsaKey();
    }
    else {
        key = await createPrivateKey(data.keySize);
    }
    // else if (!Buffer.isBuffer(key)) {
    //     key = Buffer.from(key);
    // }

    if (typeof data.altNames === 'undefined') {
        data.altNames = [];
    }

    const csr = forge.pki.createCertificationRequest();

    /* Public key */
    const privateKey = forge.pki.privateKeyFromPem(key);
    const publicKey = forge.pki.rsa.setPublicKey(privateKey.n, privateKey.e);
    csr.publicKey = publicKey;
    // const privateKey = key;
    // csr.publicKey = getPublicKey(key);

    /* Ensure subject common name is present in SAN - https://cabforum.org/wp-content/uploads/BRv1.2.3.pdf */
    if (data.commonName && !data.altNames.includes(data.commonName)) {
        data.altNames.unshift(data.commonName);
    }

    /* Subject */
    const subject = createCsrSubject({
        CN: data.commonName,
        C: data.country,
        ST: data.state,
        L: data.locality,
        O: data.organization,
        OU: data.organizationUnit,
        E: data.emailAddress,
    });

    csr.setSubject(subject);

    /* SAN extension */
    if (data.altNames.length) {
        csr.setAttributes([{
            name: 'extensionRequest',
            extensions: [{
                name: 'subjectAltName',
                altNames: formatCsrAltNames(data.altNames),
            }],
        }]);
    }

    /* Sign CSR using SHA-256 */
    csr.sign(privateKey, forge.md.sha256.create());

    /* Done */
    const pemCsr = forge.pki.certificationRequestToPem(csr);
    return [key, Buffer.from(pemCsr)];
};
