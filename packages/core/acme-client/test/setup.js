/**
 * Setup testing
 */

const url = require('url');
const net = require('net');
const fs = require('fs');
const dns = require('dns').promises;
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const axios = require('./../src/axios');


/**
 * Add promise support to Chai
 */

chai.use(chaiAsPromised);


/**
 * HTTP challenge port
 */

if (process.env.ACME_HTTP_PORT) {
    axios.defaults.acmeSettings.httpChallengePort = process.env.ACME_HTTP_PORT;
}


/**
 * External account binding
 */

if (('ACME_CAP_EAB_ENABLED' in process.env) && (process.env.ACME_CAP_EAB_ENABLED === '1')) {
    const pebbleConfig = JSON.parse(fs.readFileSync('/etc/pebble/pebble.json').toString());
    const [kid, hmacKey] = Object.entries(pebbleConfig.pebble.externalAccountMACKeys)[0];

    process.env.ACME_EAB_KID = kid;
    process.env.ACME_EAB_HMAC_KEY = hmacKey;
}


/**
 * Custom DNS resolver
 */

if (process.env.ACME_DNS_RESOLVER) {
    dns.setServers([process.env.ACME_DNS_RESOLVER]);


    /**
     * Axios DNS resolver
     */

    axios.interceptors.request.use(async (config) => {
        const urlObj = url.parse(config.url);

        /* Bypass */
        if (axios.defaults.acmeSettings.bypassCustomDnsResolver === true) {
            return config;
        }

        /* Skip IP addresses and localhost */
        if (net.isIP(urlObj.hostname) || (urlObj.hostname === 'localhost')) {
            return config;
        }

        /* Lookup hostname */
        const result = await dns.resolve4(urlObj.hostname);

        if (!result.length) {
            throw new Error(`Unable to lookup address: ${urlObj.hostname}`);
        }

        /* Place hostname in header */
        config.headers = config.headers || {};
        config.headers.Host = urlObj.hostname;

        /* Inject address into URL */
        delete urlObj.host;
        urlObj.hostname = result[0];
        config.url = url.format(urlObj);

        /* Done */
        return config;
    });
}
