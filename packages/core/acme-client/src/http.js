/**
 * ACME HTTP client
 */

const { createHmac, createSign, constants: { RSA_PKCS1_PADDING } } = require('crypto');
const { getJwk } = require('./crypto');
const { log } = require('./logger');
const axios = require('./axios');


/**
 * ACME HTTP client
 *
 * @class
 * @param {string} directoryUrl ACME directory URL
 * @param {buffer} accountKey PEM encoded account private key
 * @param {object} [opts.externalAccountBinding]
 * @param {string} [opts.externalAccountBinding.kid] External account binding KID
 * @param {string} [opts.externalAccountBinding.hmacKey] External account binding HMAC key
 */

class HttpClient {
    constructor(directoryUrl, accountKey, externalAccountBinding = {}) {
        this.directoryUrl = directoryUrl;
        this.accountKey = accountKey;
        this.externalAccountBinding = externalAccountBinding;

        this.maxBadNonceRetries = 5;
        this.directory = null;
        this.jwk = null;
    }


    /**
     * HTTP request
     *
     * @param {string} url HTTP URL
     * @param {string} method HTTP method
     * @param {object} [opts] Request options
     * @returns {Promise<object>} HTTP response
     */

    async request(url, method, opts = {}) {
        opts.url = url;
        opts.method = method;
        opts.validateStatus = null;

        /* Headers */
        if (typeof opts.headers === 'undefined') {
            opts.headers = {};
        }

        opts.headers['Content-Type'] = 'application/jose+json';

        /* Request */
        log(`HTTP request: ${method} ${url}`);
        const resp = await axios.request(opts);

        log(`RESP ${resp.status} ${method} ${url}`);
        return resp;
    }


    /**
     * Ensure provider directory exists
     *
     * https://tools.ietf.org/html/rfc8555#section-7.1.1
     *
     * @returns {Promise}
     */

    async getDirectory() {
        if (!this.directory) {
            const resp = await this.request(this.directoryUrl, 'get');

            if (resp.status >= 400) {
                throw new Error(`Attempting to read ACME directory returned error ${resp.status}: ${this.directoryUrl}`);
            }

            if (!resp.data) {
                throw new Error('Attempting to read ACME directory returned no data');
            }

            this.directory = resp.data;
        }
    }


    /**
     * Get JSON Web Key
     *
     * @returns {object} JSON Web Key
     */

    getJwk() {
        if (!this.jwk) {
            this.jwk = getJwk(this.accountKey);
        }

        return this.jwk;
    }


    /**
     * Get nonce from directory API endpoint
     *
     * https://tools.ietf.org/html/rfc8555#section-7.2
     *
     * @returns {Promise<string>} nonce
     */

    async getNonce() {
        const url = await this.getResourceUrl('newNonce');
        const resp = await this.request(url, 'head');

        if (!resp.headers['replay-nonce']) {
            throw new Error('Failed to get nonce from ACME provider');
        }

        return resp.headers['replay-nonce'];
    }


    /**
     * Get URL for a directory resource
     *
     * @param {string} resource API resource name
     * @returns {Promise<string>} URL
     */

    async getResourceUrl(resource) {
        await this.getDirectory();

        if (!this.directory[resource]) {
            throw new Error(`Unable to locate API resource URL in ACME directory: "${resource}"`);
        }

        return this.directory[resource];
    }


    /**
     * Get directory meta field
     *
     * @param {string} field Meta field name
     * @returns {Promise<string|null>} Meta field value
     */

    async getMetaField(field) {
        await this.getDirectory();

        if (('meta' in this.directory) && (field in this.directory.meta)) {
            return this.directory.meta[field];
        }

        return null;
    }


    /**
     * Prepare HTTP request body for signature
     *
     * @param {string} alg JWS algorithm
     * @param {string} url Request URL
     * @param {object} [payload] Request payload
     * @param {object} [opts]
     * @param {string} [opts.nonce] JWS anti-replay nonce
     * @param {string} [opts.kid] JWS KID
     * @returns {object} Signed HTTP request body
     */

    prepareSignedBody(alg, url, payload = null, { nonce = null, kid = null } = {}) {
        const header = { alg, url };

        /* Nonce */
        if (nonce) {
            log(`Using nonce: ${nonce}`);
            header.nonce = nonce;
        }

        /* KID or JWK */
        if (kid) {
            header.kid = kid;
        }
        else {
            header.jwk = this.getJwk();
        }

        /* Body */
        return {
            payload: payload ? Buffer.from(JSON.stringify(payload)).toString('base64url') : '',
            protected: Buffer.from(JSON.stringify(header)).toString('base64url')
        };
    }


    /**
     * Create JWS HTTP request body using HMAC
     *
     * @param {string} hmacKey HMAC key
     * @param {string} url Request URL
     * @param {object} [payload] Request payload
     * @param {object} [opts]
     * @param {string} [opts.nonce] JWS anti-replay nonce
     * @param {string} [opts.kid] JWS KID
     * @returns {object} Signed HMAC request body
     */

    createSignedHmacBody(hmacKey, url, payload = null, { nonce = null, kid = null } = {}) {
        const result = this.prepareSignedBody('HS256', url, payload, { nonce, kid });

        /* Signature */
        const signer = createHmac('SHA256', Buffer.from(hmacKey, 'base64')).update(`${result.protected}.${result.payload}`, 'utf8');
        result.signature = signer.digest().toString('base64url');

        return result;
    }


    /**
     * Create JWS HTTP request body using RSA or ECC
     *
     * https://datatracker.ietf.org/doc/html/rfc7515
     *
     * @param {string} url Request URL
     * @param {object} [payload] Request payload
     * @param {object} [opts]
     * @param {string} [opts.nonce] JWS nonce
     * @param {string} [opts.kid] JWS KID
     * @returns {object} JWS request body
     */

    createSignedBody(url, payload = null, { nonce = null, kid = null } = {}) {
        const jwk = this.getJwk();
        let headerAlg = 'RS256';
        let signerAlg = 'SHA256';

        /* https://datatracker.ietf.org/doc/html/rfc7518#section-3.1 */
        if (jwk.crv && (jwk.kty === 'EC')) {
            headerAlg = 'ES256';

            if (jwk.crv === 'P-384') {
                headerAlg = 'ES384';
                signerAlg = 'SHA384';
            }
            else if (jwk.crv === 'P-521') {
                headerAlg = 'ES512';
                signerAlg = 'SHA512';
            }
        }

        /* Prepare body and signer */
        const result = this.prepareSignedBody(headerAlg, url, payload, { nonce, kid });
        const signer = createSign(signerAlg).update(`${result.protected}.${result.payload}`, 'utf8');

        /* Signature - https://stackoverflow.com/questions/39554165 */
        result.signature = signer.sign({
            key: this.accountKey,
            padding: RSA_PKCS1_PADDING,
            dsaEncoding: 'ieee-p1363'
        }, 'base64url');

        return result;
    }


    /**
     * Signed HTTP request
     *
     * https://tools.ietf.org/html/rfc8555#section-6.2
     *
     * @param {string} url Request URL
     * @param {object} payload Request payload
     * @param {object} [opts]
     * @param {string} [opts.kid] JWS KID
     * @param {string} [opts.nonce] JWS anti-replay nonce
     * @param {boolean} [opts.includeExternalAccountBinding] Include EAB in request
     * @param {number} [attempts] Request attempt counter
     * @returns {Promise<object>} HTTP response
     */

    async signedRequest(url, payload, { kid = null, nonce = null, includeExternalAccountBinding = false } = {}, attempts = 0) {
        if (!nonce) {
            nonce = await this.getNonce();
        }

        /* External account binding */
        if (includeExternalAccountBinding && this.externalAccountBinding) {
            if (this.externalAccountBinding.kid && this.externalAccountBinding.hmacKey) {
                const jwk = this.getJwk();
                const eabKid = this.externalAccountBinding.kid;
                const eabHmacKey = this.externalAccountBinding.hmacKey;

                payload.externalAccountBinding = this.createSignedHmacBody(eabHmacKey, url, jwk, { kid: eabKid });
            }
        }

        /* Sign body and send request */
        const data = this.createSignedBody(url, payload, { nonce, kid });
        const resp = await this.request(url, 'post', { data });

        /* Retry on bad nonce - https://tools.ietf.org/html/draft-ietf-acme-acme-10#section-6.4 */
        if (resp.data && resp.data.type && (resp.status === 400) && (resp.data.type === 'urn:ietf:params:acme:error:badNonce') && (attempts < this.maxBadNonceRetries)) {
            nonce = resp.headers['replay-nonce'] || null;
            attempts += 1;

            log(`Caught invalid nonce error, retrying (${attempts}/${this.maxBadNonceRetries}) signed request to: ${url}`);
            return this.signedRequest(url, payload, { kid, nonce, includeExternalAccountBinding }, attempts);
        }

        /* Return response */
        return resp;
    }
}


/* Export client */
module.exports = HttpClient;
