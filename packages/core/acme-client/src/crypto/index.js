/**
 * Native Node.js crypto interface
 *
 * @namespace crypto
 */

const net = require('net');
const { promisify } = require('util');
const crypto = require('crypto');
const jsrsasign = require('jsrsasign');

const generateKeyPair = promisify(crypto.generateKeyPair);


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
        signatureAlgorithm: null,
        publicKey: crypto.createPublicKey(keyPem)
    };

    if (result.publicKey.asymmetricKeyType === 'rsa') {
        result.isRSA = true;
        result.signatureAlgorithm = 'SHA256withRSA';
    }
    else if (result.publicKey.asymmetricKeyType === 'ec') {
        result.isECDSA = true;
        result.signatureAlgorithm = 'SHA256withECDSA';
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
            format: 'pem'
        }
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
            format: 'pem'
        }
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
        format: 'pem'
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
        format: 'jwk'
    });

    /* Sort keys */
    return Object.keys(jwk).sort().reduce((result, k) => {
        result[k] = jwk[k];
        return result;
    }, {});
}

exports.getJwk = getJwk;


/**
 * Fix missing support for NIST curve names in jsrsasign
 *
 * @private
 * @param {string} crv NIST curve name
 * @returns {string} SECG curve name
 */

function convertNistCurveNameToSecg(nistName) {
    switch (nistName) {
        case 'P-256':
            return 'secp256r1';
        case 'P-384':
            return 'secp384r1';
        case 'P-521':
            return 'secp521r1';
        default:
            return nistName;
    }
}


/**
 * Split chain of PEM encoded objects from string into array
 *
 * @param {buffer|string} chainPem PEM encoded object chain
 * @returns {array} Array of PEM objects including headers
 */

function splitPemChain(chainPem) {
    if (Buffer.isBuffer(chainPem)) {
        chainPem = chainPem.toString();
    }

    return chainPem
        /* Split chain into chunks, starting at every header */
        .split(/\s*(?=-----BEGIN [A-Z0-9- ]+-----\r?\n?)/g)
        /* Match header, PEM body and footer */
        .map((pem) => pem.match(/\s*-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\S\s]+)\r?\n?-----END \1-----/))
        /* Filter out non-matches or empty bodies */
        .filter((pem) => pem && pem[2] && pem[2].replace(/[\r\n]+/g, '').trim())
        /* Decode to hex, and back to PEM for formatting etc */
        .map(([pem, header]) => jsrsasign.hextopem(jsrsasign.pemtohex(pem, header), header));
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

    /* First object, hex and back to b64 without new lines */
    return jsrsasign.hextob64u(jsrsasign.pemtohex(chain[0]));
};


/**
 * Parse common name from a subject object
 *
 * @private
 * @param {object} subj Subject returned from jsrsasign
 * @returns {string} Common name value
 */

function parseCommonName(subj) {
    const subjectArr = (subj && subj.array) ? subj.array : [];
    const cnArr = subjectArr.find((s) => (s[0] && s[0].type && s[0].value && (s[0].type === 'CN')));
    return (cnArr && cnArr.length && cnArr[0].value) ? cnArr[0].value : null;
}


/**
 * Parse domains from a certificate or CSR
 *
 * @private
 * @param {object} params Certificate or CSR params returned from jsrsasign
 * @returns {object} {commonName, altNames}
 */

function parseDomains(params) {
    const commonName = parseCommonName(params.subject);
    const extensionArr = (params.ext || params.extreq || []);
    let altNames = [];

    if (extensionArr && extensionArr.length) {
        const altNameExt = extensionArr.find((e) => (e.extname && (e.extname === 'subjectAltName')));
        const altNameArr = (altNameExt && altNameExt.array && altNameExt.array.length) ? altNameExt.array : [];
        altNames = altNameArr.map((a) => Object.values(a)[0] || null).filter((a) => a);
    }

    return {
        commonName,
        altNames
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

    /* Parse CSR */
    const params = jsrsasign.KJUR.asn1.csr.CSRUtil.getParam(csrPem);
    return parseDomains(params);
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
    const chain = splitPemChain(certPem);

    if (!chain.length) {
        throw new Error('Unable to parse PEM body from string');
    }

    /* Parse certificate */
    const obj = new jsrsasign.X509();
    obj.readCertPEM(chain[0]);
    const params = obj.getParam();

    return {
        issuer: {
            commonName: parseCommonName(params.issuer)
        },
        domains: parseDomains(params),
        notBefore: jsrsasign.zulutodate(params.notbefore),
        notAfter: jsrsasign.zulutodate(params.notafter)
    };
};


/**
 * Determine ASN.1 character string type for CSR subject field
 *
 * https://tools.ietf.org/html/rfc5280
 * https://github.com/kjur/jsrsasign/blob/2613c64559768b91dde9793dfa318feacb7c3b8a/src/x509-1.1.js#L2404-L2412
 * https://github.com/kjur/jsrsasign/blob/2613c64559768b91dde9793dfa318feacb7c3b8a/src/asn1x509-1.0.js#L3526-L3535
 *
 * @private
 * @param {string} field CSR subject field
 * @returns {string} ASN.1 jsrsasign character string type
 */

function getCsrAsn1CharStringType(field) {
    switch (field) {
        case 'C':
            return 'prn';
        case 'E':
            return 'ia5';
        default:
            return 'utf8';
    }
}


/**
 * Create array of subject fields for a Certificate Signing Request
 *
 * @private
 * @param {object} input Key-value of subject fields
 * @returns {object[]} Certificate Signing Request subject array
 */

function createCsrSubject(input) {
    return Object.entries(input).reduce((result, [type, value]) => {
        if (value) {
            const ds = getCsrAsn1CharStringType(type);
            result.push([{ type, value, ds }]);
        }

        return result;
    }, []);
}


/**
 * Create array of alt names for Certificate Signing Requests
 *
 * https://github.com/kjur/jsrsasign/blob/3edc0070846922daea98d9588978e91d855577ec/src/x509-1.1.js#L1355-L1410
 *
 * @private
 * @param {string[]} altNames Array of alt names
 * @returns {object[]} Certificate Signing Request alt names array
 */

function formatCsrAltNames(altNames) {
    return altNames.map((value) => {
        const key = net.isIP(value) ? 'ip' : 'dns';
        return { [key]: value };
    });
}


/**
 * Create a Certificate Signing Request
 *
 * @param {object} data
 * @param {number} [data.keySize] Size of newly created RSA private key modulus in bits, default: `2048`
 * @param {string} [data.commonName] FQDN of your server
 * @param {array} [data.altNames] SAN (Subject Alternative Names), default: `[]`
 * @param {string} [data.country] 2 letter country code
 * @param {string} [data.state] State or province
 * @param {string} [data.locality] City
 * @param {string} [data.organization] Organization name
 * @param {string} [data.organizationUnit] Organizational unit name
 * @param {string} [data.emailAddress] Email address
 * @param {string} [keyPem] PEM encoded CSR private key
 * @returns {Promise<buffer[]>} [privateKey, certificateSigningRequest]
 *
 * @example Create a Certificate Signing Request
 * ```js
 * const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
 *     commonName: 'test.example.com'
 * });
 * ```
 *
 * @example Certificate Signing Request with both common and alternative names
 * ```js
 * const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
 *     keySize: 4096,
 *     commonName: 'test.example.com',
 *     altNames: ['foo.example.com', 'bar.example.com']
 * });
 * ```
 *
 * @example Certificate Signing Request with additional information
 * ```js
 * const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
 *     commonName: 'test.example.com',
 *     country: 'US',
 *     state: 'California',
 *     locality: 'Los Angeles',
 *     organization: 'The Company Inc.',
 *     organizationUnit: 'IT Department',
 *     emailAddress: 'contact@example.com'
 * });
 * ```
 *
 * @example Certificate Signing Request with ECDSA private key
 * ```js
 * const certificateKey = await acme.crypto.createPrivateEcdsaKey();
 *
 * const [, certificateRequest] = await acme.crypto.createCsr({
 *     commonName: 'test.example.com'
 * }, certificateKey);
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

    /* Get key info and JWK */
    const info = getKeyInfo(keyPem);
    const jwk = getJwk(keyPem);
    const extensionRequests = [];

    /* Missing support for NIST curve names in jsrsasign - https://github.com/kjur/jsrsasign/blob/master/src/asn1x509-1.0.js#L4388-L4393 */
    if (jwk.crv && (jwk.kty === 'EC')) {
        jwk.crv = convertNistCurveNameToSecg(jwk.crv);
    }

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
        E: data.emailAddress
    });

    /* SAN extension */
    if (data.altNames.length) {
        extensionRequests.push({
            extname: 'subjectAltName',
            array: formatCsrAltNames(data.altNames)
        });
    }

    /* Create CSR */
    const csr = new jsrsasign.KJUR.asn1.csr.CertificationRequest({
        subject: { array: subject },
        sigalg: info.signatureAlgorithm,
        sbjprvkey: keyPem.toString(),
        sbjpubkey: jwk,
        extreq: extensionRequests
    });

    /* Sign CSR, get PEM */
    csr.sign();
    const pem = csr.getPEM();

    /* Done */
    return [keyPem, Buffer.from(pem)];
};
