/**
 * ACME client
 *
 * @namespace Client
 */

const { createHash } = require('crypto');
const { getPemBodyAsB64u } = require('./crypto');
const { log } = require('./logger');
const HttpClient = require('./http');
const AcmeApi = require('./api');
const verify = require('./verify');
const util = require('./util');
const auto = require('./auto');

/**
 * ACME states
 *
 * @private
 */

const validStates = ['ready', 'valid'];
const pendingStates = ['pending', 'processing'];
const invalidStates = ['invalid'];

/**
 * Default options
 *
 * @private
 */

const defaultOpts = {
    directoryUrl: undefined,
    accountKey: undefined,
    accountUrl: null,
    externalAccountBinding: {},
    backoffAttempts: 10,
    backoffMin: 5000,
    backoffMax: 30000,
};

/**
 * AcmeClient
 *
 * @class
 * @param {object} opts
 * @param {string} opts.directoryUrl ACME directory URL
 * @param {buffer|string} opts.accountKey PEM encoded account private key
 * @param {string} [opts.accountUrl] Account URL, default: `null`
 * @param {object} [opts.externalAccountBinding]
 * @param {string} [opts.externalAccountBinding.kid] External account binding KID
 * @param {string} [opts.externalAccountBinding.hmacKey] External account binding HMAC key
 * @param {number} [opts.backoffAttempts] Maximum number of backoff attempts, default: `10`
 * @param {number} [opts.backoffMin] Minimum backoff attempt delay in milliseconds, default: `5000`
 * @param {number} [opts.backoffMax] Maximum backoff attempt delay in milliseconds, default: `30000`
 *
 * @example Create ACME client instance
 * ```js
 * const client = new acme.Client({
 *     directoryUrl: acme.directory.letsencrypt.staging,
 *     accountKey: 'Private key goes here',
 * });
 * ```
 *
 * @example Create ACME client instance
 * ```js
 * const client = new acme.Client({
 *     directoryUrl: acme.directory.letsencrypt.staging,
 *     accountKey: 'Private key goes here',
 *     accountUrl: 'Optional account URL goes here',
 *     backoffAttempts: 10,
 *     backoffMin: 5000,
 *     backoffMax: 30000,
 * });
 * ```
 *
 * @example Create ACME client with external account binding
 * ```js
 * const client = new acme.Client({
 *     directoryUrl: 'https://acme-provider.example.com/directory-url',
 *     accountKey: 'Private key goes here',
 *     externalAccountBinding: {
 *         kid: 'YOUR-EAB-KID',
 *         hmacKey: 'YOUR-EAB-HMAC-KEY',
 *     },
 * });
 * ```
 */

class AcmeClient {
    constructor(opts) {
        if (!Buffer.isBuffer(opts.accountKey)) {
            opts.accountKey = Buffer.from(opts.accountKey);
        }

        this.opts = { ...defaultOpts, ...opts };
        this.backoffOpts = {
            attempts: this.opts.backoffAttempts,
            min: this.opts.backoffMin,
            max: this.opts.backoffMax,
        };

        this.http = new HttpClient(this.opts.directoryUrl, this.opts.accountKey, this.opts.externalAccountBinding, this.opts.urlMapping);
        this.api = new AcmeApi(this.http, this.opts.accountUrl);
    }

    /**
     * Get Terms of Service URL if available
     *
     * @returns {Promise<string|null>} ToS URL
     *
     * @example Get Terms of Service URL
     * ```js
     * const termsOfService = client.getTermsOfServiceUrl();
     *
     * if (!termsOfService) {
     *     // CA did not provide Terms of Service
     * }
     * ```
     */

    getTermsOfServiceUrl() {
        return this.api.getTermsOfServiceUrl();
    }

    /**
     * Get current account URL
     *
     * @returns {string} Account URL
     * @throws {Error} No account URL found
     *
     * @example Get current account URL
     * ```js
     * try {
     *     const accountUrl = client.getAccountUrl();
     * }
     * catch (e) {
     *     // No account URL exists, need to create account first
     * }
     * ```
     */

    getAccountUrl() {
        return this.api.getAccountUrl();
    }

    /**
     * Create a new account
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.3
     *
     * @param {object} [data] Request data
     * @returns {Promise<object>} Account
     *
     * @example Create a new account
     * ```js
     * const account = await client.createAccount({
     *     termsOfServiceAgreed: true,
     * });
     * ```
     *
     * @example Create a new account with contact info
     * ```js
     * const account = await client.createAccount({
     *     termsOfServiceAgreed: true,
     *     contact: ['mailto:test@example.com'],
     * });
     * ```
     */

    async createAccount(data = {}) {
        try {
            this.getAccountUrl();

            /* Account URL exists */
            log('Account URL exists, returning updateAccount()');
            return this.updateAccount(data);
        }
        catch (e) {
            const resp = await this.api.createAccount(data);

            /* HTTP 200: Account exists */
            if (resp.status === 200) {
                log('Account already exists (HTTP 200), returning updateAccount()');
                return this.updateAccount(data);
            }

            return resp.data;
        }
    }

    /**
     * Update existing account
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.3.2
     *
     * @param {object} [data] Request data
     * @returns {Promise<object>} Account
     *
     * @example Update existing account
     * ```js
     * const account = await client.updateAccount({
     *     contact: ['mailto:foo@example.com'],
     * });
     * ```
     */

    async updateAccount(data = {}) {
        try {
            this.api.getAccountUrl();
        }
        catch (e) {
            log('No account URL found, returning createAccount()');
            return this.createAccount(data);
        }

        /* Remove data only applicable to createAccount() */
        if ('onlyReturnExisting' in data) {
            delete data.onlyReturnExisting;
        }

        /* POST-as-GET */
        if (Object.keys(data).length === 0) {
            data = null;
        }

        const resp = await this.api.updateAccount(data);
        return resp.data;
    }

    /**
     * Update account private key
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.3.5
     *
     * @param {buffer|string} newAccountKey New PEM encoded private key
     * @param {object} [data] Additional request data
     * @returns {Promise<object>} Account
     *
     * @example Update account private key
     * ```js
     * const newAccountKey = 'New private key goes here';
     * const result = await client.updateAccountKey(newAccountKey);
     * ```
     */

    async updateAccountKey(newAccountKey, data = {}) {
        if (!Buffer.isBuffer(newAccountKey)) {
            newAccountKey = Buffer.from(newAccountKey);
        }

        const accountUrl = this.api.getAccountUrl();

        /* Create new HTTP and API clients using new key */
        const newHttpClient = new HttpClient(this.opts.directoryUrl, newAccountKey, this.opts.externalAccountBinding);
        const newApiClient = new AcmeApi(newHttpClient, accountUrl);

        /* Get old JWK */
        data.account = accountUrl;
        data.oldKey = this.http.getJwk();

        /* Get signed request body from new client */
        const url = await newHttpClient.getResourceUrl('keyChange');
        const body = newHttpClient.createSignedBody(url, data);

        /* Change key using old client */
        const resp = await this.api.updateAccountKey(body);

        /* Replace existing HTTP and API client */
        this.http = newHttpClient;
        this.api = newApiClient;

        return resp.data;
    }

    /**
     * Create a new order
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.4
     *
     * @param {object} data Request data
     * @returns {Promise<object>} Order
     *
     * @example Create a new order
     * ```js
     * const order = await client.createOrder({
     *     identifiers: [
     *         { type: 'dns', value: 'example.com' },
     *         { type: 'dns', value: 'test.example.com' },
     *     ],
     * });
     * ```
     */

    async createOrder(data) {
        const resp = await this.api.createOrder(data);

        if (!resp.headers.location) {
            throw new Error('Creating a new order did not return an order link');
        }

        /* Add URL to response */
        resp.data.url = this.api.getLocationFromHeader(resp);

        return resp.data;
    }

    /**
     * Refresh order object from CA
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.4
     *
     * @param {object} order Order object
     * @returns {Promise<object>} Order
     *
     * @example
     * ```js
     * const order = { ... }; // Previously created order object
     * const result = await client.getOrder(order);
     * ```
     */

    async getOrder(order) {
        if (!order.url) {
            throw new Error('Unable to get order, URL not found');
        }

        const resp = await this.api.getOrder(order.url);

        /* Add URL to response */
        resp.data.url = order.url;
        return resp.data;
    }

    /**
     * Finalize order
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.4
     *
     * @param {object} order Order object
     * @param {buffer|string} csr PEM encoded Certificate Signing Request
     * @returns {Promise<object>} Order
     *
     * @example Finalize order
     * ```js
     * const order = { ... }; // Previously created order object
     * const csr = { ... }; // Previously created Certificate Signing Request
     * const result = await client.finalizeOrder(order, csr);
     * ```
     */

    async finalizeOrder(order, csr) {
        if (!order.finalize) {
            throw new Error('Unable to finalize order, URL not found');
        }

        if (!Buffer.isBuffer(csr)) {
            csr = Buffer.from(csr);
        }

        const data = { csr: getPemBodyAsB64u(csr) };
        const resp = await this.api.finalizeOrder(order.finalize, data);

        /* Add URL to response */
        resp.data.url = order.url;
        return resp.data;
    }

    /**
     * Get identifier authorizations from order
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.5
     *
     * @param {object} order Order
     * @returns {Promise<object[]>} Authorizations
     *
     * @example Get identifier authorizations
     * ```js
     * const order = { ... }; // Previously created order object
     * const authorizations = await client.getAuthorizations(order);
     *
     * authorizations.forEach((authz) => {
     *     const { challenges } = authz;
     * });
     * ```
     */

    async getAuthorizations(order) {
        return Promise.all((order.authorizations || []).map(async (url) => {
            const resp = await this.api.getAuthorization(url);

            /* Add URL to response */
            resp.data.url = url;
            return resp.data;
        }));
    }

    /**
     * Deactivate identifier authorization
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.5.2
     *
     * @param {object} authz Identifier authorization
     * @returns {Promise<object>} Authorization
     *
     * @example Deactivate identifier authorization
     * ```js
     * const authz = { ... }; // Identifier authorization resolved from previously created order
     * const result = await client.deactivateAuthorization(authz);
     * ```
     */

    async deactivateAuthorization(authz) {
        if (!authz.url) {
            throw new Error('Unable to deactivate identifier authorization, URL not found');
        }

        const data = { status: 'deactivated' };
        const resp = await this.api.updateAuthorization(authz.url, data);

        /* Add URL to response */
        resp.data.url = authz.url;
        return resp.data;
    }

    /**
     * Get key authorization for ACME challenge
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-8.1
     *
     * @param {object} challenge Challenge object returned by API
     * @returns {Promise<string>} Key authorization
     *
     * @example Get challenge key authorization
     * ```js
     * const challenge = { ... }; // Challenge from previously resolved identifier authorization
     * const key = await client.getChallengeKeyAuthorization(challenge);
     *
     * // Write key somewhere to satisfy challenge
     * ```
     */

    async getChallengeKeyAuthorization(challenge) {
        const jwk = this.http.getJwk();
        const keysum = createHash('sha256').update(JSON.stringify(jwk));
        const thumbprint = keysum.digest('base64url');
        const result = `${challenge.token}.${thumbprint}`;

        /* https://datatracker.ietf.org/doc/html/rfc8555#section-8.3 */
        if (challenge.type === 'http-01') {
            return result;
        }

        /* https://datatracker.ietf.org/doc/html/rfc8555#section-8.4 */
        if (challenge.type === 'dns-01') {
            return createHash('sha256').update(result).digest('base64url');
        }

        /* https://datatracker.ietf.org/doc/html/rfc8737 */
        if (challenge.type === 'tls-alpn-01') {
            return result;
        }

        throw new Error(`Unable to produce key authorization, unknown challenge type: ${challenge.type}`);
    }

    /**
     * Verify that ACME challenge is satisfied
     *
     * @param {object} authz Identifier authorization
     * @param {object} challenge Authorization challenge
     * @returns {Promise}
     *
     * @example Verify satisfied ACME challenge
     * ```js
     * const authz = { ... }; // Identifier authorization
     * const challenge = { ... }; // Satisfied challenge
     * await client.verifyChallenge(authz, challenge);
     * ```
     */

    async verifyChallenge(authz, challenge) {
        if (!authz.url || !challenge.url) {
            throw new Error('Unable to verify ACME challenge, URL not found');
        }

        if (typeof verify[challenge.type] === 'undefined') {
            throw new Error(`Unable to verify ACME challenge, unknown type: ${challenge.type}`);
        }

        const keyAuthorization = await this.getChallengeKeyAuthorization(challenge);

        const verifyFn = async () => {
            if (this.opts.signal && this.opts.signal.aborted) {
                throw new Error('用户取消');
            }
            await verify[challenge.type](authz, challenge, keyAuthorization);
        };

        log('Waiting for ACME challenge verification', this.backoffOpts);
        return util.retry(verifyFn, this.backoffOpts);
    }

    /**
     * Notify CA that challenge has been completed
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.5.1
     *
     * @param {object} challenge Challenge object returned by API
     * @returns {Promise<object>} Challenge
     *
     * @example Notify CA that challenge has been completed
     * ```js
     * const challenge = { ... }; // Satisfied challenge
     * const result = await client.completeChallenge(challenge);
     * ```
     */

    async completeChallenge(challenge) {
        if (this.opts.signal && this.opts.signal.aborted) {
            throw new Error('用户取消');
        }
        const resp = await this.api.completeChallenge(challenge.url, {});
        return resp.data;
    }

    /**
     * Wait for ACME provider to verify status on a order, authorization or challenge
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.5.1
     *
     * @param {object} item An order, authorization or challenge object
     * @returns {Promise<object>} Valid order, authorization or challenge
     *
     * @example Wait for valid challenge status
     * ```js
     * const challenge = { ... };
     * await client.waitForValidStatus(challenge);
     * ```
     *
     * @example Wait for valid authorization status
     * ```js
     * const authz = { ... };
     * await client.waitForValidStatus(authz);
     * ```
     *
     * @example Wait for valid order status
     * ```js
     * const order = { ... };
     * await client.waitForValidStatus(order);
     * ```
     */

    async waitForValidStatus(item) {
        if (!item.url) {
            throw new Error('Unable to verify status of item, URL not found');
        }

        const verifyFn = async (abort) => {
            if (this.opts.signal && this.opts.signal.aborted) {
                throw new Error('用户取消');
            }

            const resp = await this.api.apiRequest(item.url, null, [200]);

            /* Verify status */
            log(`Item has status: ${resp.data.status}`);

            if (invalidStates.includes(resp.data.status)) {
                abort();
                throw new Error(util.formatResponseError(resp));
            }
            else if (pendingStates.includes(resp.data.status)) {
                throw new Error('Operation is pending or processing');
            }
            else if (validStates.includes(resp.data.status)) {
                return resp.data;
            }

            throw new Error(`Unexpected item status: ${resp.data.status}`);
        };

        log(`Waiting for valid status from: ${item.url}`, this.backoffOpts);
        return util.retry(verifyFn, this.backoffOpts);
    }

    /**
     * Get certificate from ACME order
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.4.2
     *
     * @param {object} order Order object
     * @param {string} [preferredChain] Indicate which certificate chain is preferred if a CA offers multiple, by exact issuer common name, default: `null`
     * @returns {Promise<string>} Certificate
     *
     * @example Get certificate
     * ```js
     * const order = { ... }; // Previously created order
     * const certificate = await client.getCertificate(order);
     * ```
     *
     * @example Get certificate with preferred chain
     * ```js
     * const order = { ... }; // Previously created order
     * const certificate = await client.getCertificate(order, 'DST Root CA X3');
     * ```
     */

    async getCertificate(order, preferredChain = null) {
        if (!validStates.includes(order.status)) {
            order = await this.waitForValidStatus(order);
        }

        if (!order.certificate) {
            throw new Error('Unable to download certificate, URL not found');
        }

        const resp = await this.api.apiRequest(order.certificate, null, [200]);

        /* Handle alternate certificate chains */
        if (preferredChain && resp.headers.link) {
            const alternateLinks = util.parseLinkHeader(resp.headers.link);
            const alternates = await Promise.all(alternateLinks.map(async (link) => this.api.apiRequest(link, null, [200])));
            const certificates = [resp].concat(alternates).map((c) => c.data);

            return util.findCertificateChainForIssuer(certificates, preferredChain);
        }

        /* Return default certificate chain */
        return resp.data;
    }

    /**
     * Revoke certificate
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.6
     *
     * @param {buffer|string} cert PEM encoded certificate
     * @param {object} [data] Additional request data
     * @returns {Promise}
     *
     * @example Revoke certificate
     * ```js
     * const certificate = { ... }; // Previously created certificate
     * const result = await client.revokeCertificate(certificate);
     * ```
     *
     * @example Revoke certificate with reason
     * ```js
     * const certificate = { ... }; // Previously created certificate
     * const result = await client.revokeCertificate(certificate, {
     *     reason: 4,
     * });
     * ```
     */

    async revokeCertificate(cert, data = {}) {
        data.certificate = getPemBodyAsB64u(cert);
        const resp = await this.api.revokeCert(data);
        return resp.data;
    }

    /**
     * Auto mode
     *
     * @param {object} opts
     * @param {buffer|string} opts.csr Certificate Signing Request
     * @param {function} opts.challengeCreateFn Function returning Promise triggered before completing ACME challenge
     * @param {function} opts.challengeRemoveFn Function returning Promise triggered after completing ACME challenge
     * @param {string} [opts.email] Account email address
     * @param {boolean} [opts.termsOfServiceAgreed] Agree to Terms of Service, default: `false`
     * @param {boolean} [opts.skipChallengeVerification] Skip internal challenge verification before notifying ACME provider, default: `false`
     * @param {string[]} [opts.challengePriority] Array defining challenge type priority, default: `['http-01', 'dns-01']`
     * @param {string} [opts.preferredChain] Indicate which certificate chain is preferred if a CA offers multiple, by exact issuer common name, default: `null`
     * @returns {Promise<string>} Certificate
     *
     * @example Order a certificate using auto mode
     * ```js
     * const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
     *     altNames: ['test.example.com'],
     * });
     *
     * const certificate = await client.auto({
     *     csr: certificateRequest,
     *     email: 'test@example.com',
     *     termsOfServiceAgreed: true,
     *     challengeCreateFn: async (authz, challenge, keyAuthorization) => {
     *         // Satisfy challenge here
     *     },
     *     challengeRemoveFn: async (authz, challenge, keyAuthorization) => {
     *         // Clean up challenge here
     *     },
     * });
     * ```
     *
     * @example Order a certificate using auto mode with preferred chain
     * ```js
     * const [certificateKey, certificateRequest] = await acme.crypto.createCsr({
     *     altNames: ['test.example.com'],
     * });
     *
     * const certificate = await client.auto({
     *     csr: certificateRequest,
     *     email: 'test@example.com',
     *     termsOfServiceAgreed: true,
     *     preferredChain: 'DST Root CA X3',
     *     challengeCreateFn: async () => {},
     *     challengeRemoveFn: async () => {},
     * });
     * ```
     */

    auto(opts) {
        return auto(this, opts);
    }
}

/* Export client */
module.exports = AcmeClient;
