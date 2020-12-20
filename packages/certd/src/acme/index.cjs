/**
 * acme-client
 */

exports.Client = require('./client.cjs')

/**
 * Directory URLs
 */

exports.directory = {
  letsencrypt: {
    staging: 'https://acme-staging-v02.api.letsencrypt.org/directory',
    production: 'https://acme-v02.api.letsencrypt.org/directory'
  }
}

/**
 * Crypto
 */

exports.forge = require('./crypto/forge.cjs')

/**
 * Axios
 */

exports.axios = require('./axios.cjs')
