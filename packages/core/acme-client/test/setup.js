/**
 * Setup testing
 */

const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const axios = require('./../src/axios');

/**
 * Add promise support to Chai
 */

chai.use(chaiAsPromised);

/**
 * Challenge test server ports
 */

if (process.env.ACME_HTTP_PORT) {
    axios.defaults.acmeSettings.httpChallengePort = process.env.ACME_HTTP_PORT;
}

if (process.env.ACME_HTTPS_PORT) {
    axios.defaults.acmeSettings.httpsChallengePort = process.env.ACME_HTTPS_PORT;
}

if (process.env.ACME_TLSALPN_PORT) {
    axios.defaults.acmeSettings.tlsAlpnChallengePort = process.env.ACME_TLSALPN_PORT;
}

/**
 * Greatly reduce retry duration while testing
 */

axios.defaults.acmeSettings.retryMaxAttempts = 3;
axios.defaults.acmeSettings.retryDefaultDelay = 1;

/**
 * External account binding
 */

if (('ACME_CAP_EAB_ENABLED' in process.env) && (process.env.ACME_CAP_EAB_ENABLED === '1')) {
    const pebbleConfig = JSON.parse(fs.readFileSync('/etc/pebble/pebble.json').toString());
    const [kid, hmacKey] = Object.entries(pebbleConfig.pebble.externalAccountMACKeys)[0];

    process.env.ACME_EAB_KID = kid;
    process.env.ACME_EAB_HMAC_KEY = hmacKey;
}
