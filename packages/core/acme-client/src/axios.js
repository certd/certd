/**
 * Axios instance
 */

const axios = require('axios');
const pkg = require('./../package.json');


/**
 * Instance
 */

const instance = axios.create();

/* Default User-Agent */
instance.defaults.headers.common['User-Agent'] = `node-${pkg.name}/${pkg.version}`;

/* Default ACME settings */
instance.defaults.acmeSettings = {
    httpChallengePort: 80,
    httpsChallengePort: 443,
    tlsAlpnChallengePort: 443
};


/**
 * Explicitly set Node as default HTTP adapter
 *
 * https://github.com/axios/axios/issues/1180
 * https://stackoverflow.com/questions/42677387
 */

instance.defaults.adapter = 'http';


/**
 * Export instance
 */

module.exports = instance;
