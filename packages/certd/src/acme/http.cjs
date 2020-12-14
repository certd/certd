/**
 * ACME HTTP client
 */

const crypto = require('crypto')
const debug = require('debug')('acme-client')
const axios = require('./axios.cjs')
const util = require('./util.cjs')
const forge = require('./crypto/forge.cjs')

/**
 * ACME HTTP client
 *
 * @class
 * @param {string} directoryUrl ACME directory URL
 * @param {buffer} accountKey PEM encoded account private key
 */

class HttpClient {
  constructor (directoryUrl, accountKey) {
    this.directoryUrl = directoryUrl
    this.accountKey = accountKey

    this.maxBadNonceRetries = 5
    this.directory = null
    this.jwk = null
  }

  /**
     * HTTP request
     *
     * @param {string} url HTTP URL
     * @param {string} method HTTP method
     * @param {object} [opts] Request options
     * @returns {Promise<object>} HTTP response
     */

  async request (url, method, opts = {}) {
    opts.url = url
    opts.method = method
    opts.validateStatus = null

    /* Headers */
    if (typeof opts.headers === 'undefined') {
      opts.headers = {}
    }

    opts.headers['Content-Type'] = 'application/jose+json'

    /* Request */
    debug(`HTTP request: ${method} ${url}`)
    const resp = await axios.request(opts)

    debug(`RESP ${resp.status} ${method} ${url}`)
    return resp
  }

  /**
     * Ensure provider directory exists
     *
     * https://tools.ietf.org/html/rfc8555#section-7.1.1
     *
     * @returns {Promise}
     */

  async getDirectory () {
    if (!this.directory) {
      const resp = await this.request(this.directoryUrl, 'get')
      this.directory = resp.data
    }
  }

  /**
     * Get JSON Web Key
     *
     * @returns {Promise<object>} {e, kty, n}
     */

  async getJwk () {
    if (this.jwk) {
      return this.jwk
    }

    const exponent = await forge.getPublicExponent(this.accountKey)
    const modulus = await forge.getModulus(this.accountKey)

    this.jwk = {
      e: util.b64encode(exponent),
      kty: 'RSA',
      n: util.b64encode(modulus)
    }

    return this.jwk
  }

  /**
     * Get nonce from directory API endpoint
     *
     * https://tools.ietf.org/html/rfc8555#section-7.2
     *
     * @returns {Promise<string>} nonce
     */

  async getNonce () {
    const url = await this.getResourceUrl('newNonce')
    const resp = await this.request(url, 'head')

    if (!resp.headers['replay-nonce']) {
      throw new Error('Failed to get nonce from ACME provider')
    }

    return resp.headers['replay-nonce']
  }

  /**
     * Get URL for a directory resource
     *
     * @param {string} resource API resource name
     * @returns {Promise<string>} URL
     */

  async getResourceUrl (resource) {
    await this.getDirectory()

    if (!this.directory[resource]) {
      throw new Error(`Could not resolve URL for API resource: "${resource}"`)
    }

    return this.directory[resource]
  }

  /**
     * Get directory meta field
     *
     * @param {string} field Meta field name
     * @returns {Promise<string|null>} Meta field value
     */

  async getMetaField (field) {
    await this.getDirectory()

    if (('meta' in this.directory) && (field in this.directory.meta)) {
      return this.directory.meta[field]
    }

    return null
  }

  /**
     * Create signed HTTP request body
     *
     * @param {string} url Request URL
     * @param {object} payload Request payload
     * @param {string} [nonce] Request nonce
     * @param {string} [kid] Request KID
     * @returns {Promise<object>} Signed HTTP request body
     */

  async createSignedBody (url, payload = null, nonce = null, kid = null) {
    /* JWS header */
    const header = {
      url,
      alg: 'RS256'
    }

    if (nonce) {
      debug(`Using nonce: ${nonce}`)
      header.nonce = nonce
    }

    /* KID or JWK */
    if (kid) {
      header.kid = kid
    } else {
      header.jwk = await this.getJwk()
    }

    /* Request payload */
    const result = {
      payload: payload ? util.b64encode(JSON.stringify(payload)) : '',
      protected: util.b64encode(JSON.stringify(header))
    }

    /* Signature */
    const signer = crypto.createSign('RSA-SHA256').update(`${result.protected}.${result.payload}`, 'utf8')
    result.signature = util.b64escape(signer.sign(this.accountKey, 'base64'))

    return result
  }

  /**
     * Signed HTTP request
     *
     * https://tools.ietf.org/html/rfc8555#section-6.2
     *
     * @param {string} url Request URL
     * @param {object} payload Request payload
     * @param {string} [kid] Request KID
     * @param {string} [nonce] Request anti-replay nonce
     * @param {number} [attempts] Request attempt counter
     * @returns {Promise<object>} HTTP response
     */

  async signedRequest (url, payload, kid = null, nonce = null, attempts = 0) {
    if (!nonce) {
      nonce = await this.getNonce()
    }

    /* Sign body and send request */
    const data = await this.createSignedBody(url, payload, nonce, kid)
    const resp = await this.request(url, 'post', { data })

    /* Retry on bad nonce - https://tools.ietf.org/html/draft-ietf-acme-acme-10#section-6.4 */
    if (resp.data && resp.data.type && (resp.status === 400) && (resp.data.type === 'urn:ietf:params:acme:error:badNonce') && (attempts < this.maxBadNonceRetries)) {
      const newNonce = resp.headers['replay-nonce'] || null
      attempts += 1

      debug(`Caught invalid nonce error, retrying (${attempts}/${this.maxBadNonceRetries}) signed request to: ${url}`)
      return this.signedRequest(url, payload, kid, newNonce, attempts)
    }

    /* Return response */
    return resp
  }
}

/* Export client */
module.exports = HttpClient
