var cachedSecret = {}
var cacheQueue = []
var maxCacheEntries = 50
var v2Identifier = 'jdcloud2_request'

var util = require('../util')

module.exports = {
  /**
   * @api private
   *
   * @param date [String]
   * @param region [String]
   * @param serviceName [String]
   * @return [String]
   */
  createScope: function createScope (date, region, serviceName) {
    return [date.substr(0, 8), region, serviceName, v2Identifier].join('/')
  },

  /**
   * @api private
   *
   * @param credentials [Credentials]
   * @param date [String]
   * @param region [String]
   * @param service [String]
   * @param shouldCache [Boolean]
   * @return [String]
   */
  getSigningKey: function getSigningKey (
    credentials,
    date,
    region,
    service,
    shouldCache
  ) {
    var credsIdentifier = util.crypto.hmac(
      credentials.secretAccessKey,
      credentials.accessKeyId,
      'base64'
    )
    var cacheKey = [credsIdentifier, date, region, service].join('_')
    shouldCache = shouldCache !== false
    if (shouldCache && cacheKey in cachedSecret) {
      return cachedSecret[cacheKey]
    }

    var kDate = util.crypto.hmac(
      'JDCLOUD2' + credentials.secretAccessKey,
      date,
      'buffer'
    )
    var kRegion = util.crypto.hmac(kDate, region, 'buffer')
    var kService = util.crypto.hmac(kRegion, service, 'buffer')

    var signingKey = util.crypto.hmac(kService, v2Identifier, 'buffer')
    if (shouldCache) {
      cachedSecret[cacheKey] = signingKey
      cacheQueue.push(cacheKey)
      if (cacheQueue.length > maxCacheEntries) {
        // remove the oldest entry (not the least recently used)
        delete cachedSecret[cacheQueue.shift()]
      }
    }

    return signingKey
  },

  /**
   * @api private
   *
   * Empties the derived signing key cache. Made available for testing purposes
   * only.
   */
  emptyCache: function emptyCache () {
    cachedSecret = {}
    cacheQueue = []
  }
}
