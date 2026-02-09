/**
 * acme-client
 */
import AcmeClinet  from './client.js'
export const Client = AcmeClinet

/**
 * Directory URLs
 */

export const directory = {
    buypass: {
        staging: 'https://api.test4.buypass.no/acme/directory',
        production: 'https://api.buypass.com/acme/directory',
    },
    google: {
        staging: 'https://dv.acme-v02.test-api.pki.goog/directory',
        production: 'https://dv.acme-v02.api.pki.goog/directory',
    },
    letsencrypt: {
        staging: 'https://acme-staging-v02.api.letsencrypt.org/directory',
        production: 'https://acme-v02.api.letsencrypt.org/directory',
    },
    letsencrypt_staging: {
        production: 'https://acme-staging-v02.api.letsencrypt.org/directory',
    },
    zerossl: {
        staging: 'https://acme.zerossl.com/v2/DV90',
        production: 'https://acme.zerossl.com/v2/DV90',
    },
    sslcom:{
      staging: 'https://acme.ssl.com/sslcom-dv-rsa',
      production: 'https://acme.ssl.com/sslcom-dv-rsa',
      ec: 'https://acme.ssl.com/sslcom-dv-ecc',
    },
    litessl: {
        staging: 'https://acme.litessl.com/acme/v2/directory',
        production: 'https://acme.litessl.com/acme/v2/directory',
    },
};

export function getDirectoryUrl(opts) {
  const {sslProvider, pkType} = opts
  const list= directory[sslProvider]
  if (!list) {
    throw new Error(`sslProvider ${sslProvider} not found`)
  }
  let pkTypePrefix = pkType || 'rsa'
  if (pkType) {
   pkTypePrefix = pkType.toLowerCase().split("_")[0]
  }

  if (pkTypePrefix && list[pkTypePrefix]) {
    return list[pkTypePrefix]
  }

  return list.production
}


export function getAllSslProviderDomains() {
  const list = Object.values(directory).map((item) => {
    let url =  item.production.replace('https://', '')
    url = url.substring(0, url.indexOf('/'))
    return url
  })
  return list
}

let sslProviderReverseProxies = {}

function initSslProviderReverseProxies() {
  for (const sslProvider of getAllSslProviderDomains()) {
    sslProviderReverseProxies[sslProvider] = ""
  }
}
initSslProviderReverseProxies()

export function getSslProviderReverseProxies() {
  return sslProviderReverseProxies
}
export function setSslProviderReverseProxies(reverseProxies) {
  Object.assign(sslProviderReverseProxies, reverseProxies)
}

/**
 * Crypto
 */

export * as crypto from './crypto/index.js'
export * as forge from './crypto/forge.js'

/**
 * Axios
 */

export *  from './axios.js'
/**
 * Logger
 */

export * from './logger.js'
export * from './verify.js'
export * from './error.js'

export * from './util.js'