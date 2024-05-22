/**
 * Get ACME certificate issuers
 */

const acme = require('./../');
const util = require('./../src/util');

const pebbleManagementUrl = process.env.ACME_PEBBLE_MANAGEMENT_URL || null;

/**
 * Pebble
 */

async function getPebbleCertIssuers() {
    /* Get intermediate certificate and resolve alternates */
    const root = await acme.axios.get(`${pebbleManagementUrl}/intermediates/0`);
    const links = util.parseLinkHeader(root.headers.link || '');
    const alternates = await Promise.all(links.map(async (link) => acme.axios.get(link)));

    /* Get certificate info */
    const certs = [root].concat(alternates).map((c) => c.data);
    const info = certs.map((c) => acme.crypto.readCertificateInfo(c));

    /* Return issuers */
    return info.map((i) => i.issuer.commonName);
}

/**
 * Get certificate issuers
 */

module.exports = async () => {
    if (pebbleManagementUrl) {
        return getPebbleCertIssuers();
    }

    throw new Error('Unable to resolve list of certificate issuers');
};
