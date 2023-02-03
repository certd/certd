/**
 * ACME API client
 */

const util = require('./util');


/**
 * AcmeApi
 *
 * @class
 * @param {HttpClient} httpClient
 */

class AcmeApi {
    constructor(httpClient, accountUrl = null) {
        this.http = httpClient;
        this.accountUrl = accountUrl;
    }


    /**
     * Get account URL
     *
     * @private
     * @returns {string} Account URL
     */

    getAccountUrl() {
        if (!this.accountUrl) {
            throw new Error('No account URL found, register account first');
        }

        return this.accountUrl;
    }


    /**
     * ACME API request
     *
     * @private
     * @param {string} url Request URL
     * @param {object} [payload] Request payload, default: `null`
     * @param {array} [validStatusCodes] Array of valid HTTP response status codes, default: `[]`
     * @param {object} [opts]
     * @param {boolean} [opts.includeJwsKid] Include KID instead of JWK in JWS header, default: `true`
     * @param {boolean} [opts.includeExternalAccountBinding] Include EAB in request, default: `false`
     * @returns {Promise<object>} HTTP response
     */

    async apiRequest(url, payload = null, validStatusCodes = [], { includeJwsKid = true, includeExternalAccountBinding = false } = {}) {
        const kid = includeJwsKid ? this.getAccountUrl() : null;
        const resp = await this.http.signedRequest(url, payload, { kid, includeExternalAccountBinding });

        if (validStatusCodes.length && (validStatusCodes.indexOf(resp.status) === -1)) {
            throw new Error(util.formatResponseError(resp));
        }

        return resp;
    }


    /**
     * ACME API request by resource name helper
     *
     * @private
     * @param {string} resource Request resource name
     * @param {object} [payload] Request payload, default: `null`
     * @param {array} [validStatusCodes] Array of valid HTTP response status codes, default: `[]`
     * @param {object} [opts]
     * @param {boolean} [opts.includeJwsKid] Include KID instead of JWK in JWS header, default: `true`
     * @param {boolean} [opts.includeExternalAccountBinding] Include EAB in request, default: `false`
     * @returns {Promise<object>} HTTP response
     */

    async apiResourceRequest(resource, payload = null, validStatusCodes = [], { includeJwsKid = true, includeExternalAccountBinding = false } = {}) {
        const resourceUrl = await this.http.getResourceUrl(resource);
        return this.apiRequest(resourceUrl, payload, validStatusCodes, { includeJwsKid, includeExternalAccountBinding });
    }


    /**
     * Get Terms of Service URL if available
     *
     * https://tools.ietf.org/html/rfc8555#section-7.1.1
     *
     * @returns {Promise<string|null>} ToS URL
     */

    async getTermsOfServiceUrl() {
        return this.http.getMetaField('termsOfService');
    }


    /**
     * Create new account
     *
     * https://tools.ietf.org/html/rfc8555#section-7.3
     *
     * @param {object} data Request payload
     * @returns {Promise<object>} HTTP response
     */

    async createAccount(data) {
        const resp = await this.apiResourceRequest('newAccount', data, [200, 201], {
            includeJwsKid: false,
            includeExternalAccountBinding: (data.onlyReturnExisting !== true)
        });

        /* Set account URL */
        if (resp.headers.location) {
            this.accountUrl = resp.headers.location;
        }

        return resp;
    }


    /**
     * Update account
     *
     * https://tools.ietf.org/html/rfc8555#section-7.3.2
     *
     * @param {object} data Request payload
     * @returns {Promise<object>} HTTP response
     */

    updateAccount(data) {
        return this.apiRequest(this.getAccountUrl(), data, [200, 202]);
    }


    /**
     * Update account key
     *
     * https://tools.ietf.org/html/rfc8555#section-7.3.5
     *
     * @param {object} data Request payload
     * @returns {Promise<object>} HTTP response
     */

    updateAccountKey(data) {
        return this.apiResourceRequest('keyChange', data, [200]);
    }


    /**
     * Create new order
     *
     * https://tools.ietf.org/html/rfc8555#section-7.4
     *
     * @param {object} data Request payload
     * @returns {Promise<object>} HTTP response
     */

    createOrder(data) {
        return this.apiResourceRequest('newOrder', data, [201]);
    }


    /**
     * Get order
     *
     * https://tools.ietf.org/html/rfc8555#section-7.4
     *
     * @param {string} url Order URL
     * @returns {Promise<object>} HTTP response
     */

    getOrder(url) {
        return this.apiRequest(url, null, [200]);
    }


    /**
     * Finalize order
     *
     * https://tools.ietf.org/html/rfc8555#section-7.4
     *
     * @param {string} url Finalization URL
     * @param {object} data Request payload
     * @returns {Promise<object>} HTTP response
     */

    finalizeOrder(url, data) {
        return this.apiRequest(url, data, [200]);
    }


    /**
     * Get identifier authorization
     *
     * https://tools.ietf.org/html/rfc8555#section-7.5
     *
     * @param {string} url Authorization URL
     * @returns {Promise<object>} HTTP response
     */

    getAuthorization(url) {
        return this.apiRequest(url, null, [200]);
    }


    /**
     * Update identifier authorization
     *
     * https://tools.ietf.org/html/rfc8555#section-7.5.2
     *
     * @param {string} url Authorization URL
     * @param {object} data Request payload
     * @returns {Promise<object>} HTTP response
     */

    updateAuthorization(url, data) {
        return this.apiRequest(url, data, [200]);
    }


    /**
     * Complete challenge
     *
     * https://tools.ietf.org/html/rfc8555#section-7.5.1
     *
     * @param {string} url Challenge URL
     * @param {object} data Request payload
     * @returns {Promise<object>} HTTP response
     */

    completeChallenge(url, data) {
        return this.apiRequest(url, data, [200]);
    }


    /**
     * Revoke certificate
     *
     * https://tools.ietf.org/html/rfc8555#section-7.6
     *
     * @param {object} data Request payload
     * @returns {Promise<object>} HTTP response
     */

    revokeCert(data) {
        return this.apiResourceRequest('revokeCert', data, [200]);
    }
}


/* Export API */
module.exports = AcmeApi;
