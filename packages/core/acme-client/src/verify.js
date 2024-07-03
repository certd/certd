/**
 * ACME challenge verification
 */

const dns = require('dns').promises;
const https = require('https');
const { log } = require('./logger');
const axios = require('./axios');
const util = require('./util');
const { isAlpnCertificateAuthorizationValid } = require('./crypto');

/**
 * Verify ACME HTTP challenge
 *
 * https://datatracker.ietf.org/doc/html/rfc8555#section-8.3
 *
 * @param {object} authz Identifier authorization
 * @param {object} challenge Authorization challenge
 * @param {string} keyAuthorization Challenge key authorization
 * @param {string} [suffix] URL suffix
 * @returns {Promise<boolean>}
 */

async function verifyHttpChallenge(authz, challenge, keyAuthorization, suffix = `/.well-known/acme-challenge/${challenge.token}`) {
    const httpPort = axios.defaults.acmeSettings.httpChallengePort || 80;
    const challengeUrl = `http://${authz.identifier.value}:${httpPort}${suffix}`;

    /* May redirect to HTTPS with invalid/self-signed cert - https://letsencrypt.org/docs/challenge-types/#http-01-challenge */
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    log(`Sending HTTP query to ${authz.identifier.value}, suffix: ${suffix}, port: ${httpPort}`);
    const resp = await axios.get(challengeUrl, { httpsAgent });
    const data = (resp.data || '').replace(/\s+$/, '');

    log(`Query successful, HTTP status code: ${resp.status}`);

    if (!data || (data !== keyAuthorization)) {
        throw new Error(`Authorization not found in HTTP response from ${authz.identifier.value}`);
    }

    log(`Key authorization match for ${challenge.type}/${authz.identifier.value}, ACME challenge verified`);
    return true;
}

/**
 * Walk DNS until TXT records are found
 */

async function walkDnsChallengeRecord(recordName, resolver = dns) {
    /* Resolve CNAME record first */
    // try {
    //     log(`Checking name for CNAME records: ${recordName}`);
    //     const cnameRecords = await resolver.resolveCname(recordName);
    //
    //     if (cnameRecords.length) {
    //         log(`CNAME record found at ${recordName}, new challenge record name: ${cnameRecords[0]}`);
    //         return walkDnsChallengeRecord(cnameRecords[0]);
    //     }
    // }
    // catch (e) {
    //     log(`No CNAME records found for name: ${recordName}`);
    // }

    /* Resolve TXT records */
    try {
        log(`Checking name for TXT records: ${recordName}`);
        const txtRecords = await resolver.resolveTxt(recordName);

        if (txtRecords.length) {
            log(`Found ${txtRecords.length} TXT records at ${recordName}`);
            return [].concat(...txtRecords);
        }
    }
    catch (e) {
        log(`No TXT records found for name: ${recordName}`);
    }

    /* Found nothing */
    throw new Error(`No TXT records found for name: ${recordName}`);
}

/**
 * Verify ACME DNS challenge
 *
 * https://datatracker.ietf.org/doc/html/rfc8555#section-8.4
 *
 * @param {object} authz Identifier authorization
 * @param {object} challenge Authorization challenge
 * @param {string} keyAuthorization Challenge key authorization
 * @param {string} [prefix] DNS prefix
 * @returns {Promise<boolean>}
 */

async function verifyDnsChallenge(authz, challenge, keyAuthorization, prefix = '_acme-challenge.') {
    let recordValues = [];
    const recordName = `${prefix}${authz.identifier.value}`;
    log(`Resolving DNS TXT from record: ${recordName}`);

    try {
        /* Default DNS resolver first */
        log('Attempting to resolve TXT with default DNS resolver first');
        recordValues = await walkDnsChallengeRecord(recordName);
    }
    catch (e) {
        /* Authoritative DNS resolver */
        log(`Error using default resolver, attempting to resolve TXT with authoritative NS: ${e.message}`);
        const authoritativeResolver = await util.getAuthoritativeDnsResolver(recordName);
        recordValues = await walkDnsChallengeRecord(recordName, authoritativeResolver);
    }

    log(`DNS query finished successfully, found ${recordValues.length} TXT records`);

    if (!recordValues.length || !recordValues.includes(keyAuthorization)) {
        throw new Error(`Authorization not found in DNS TXT record: ${recordName}`);
    }

    log(`Key authorization match for ${challenge.type}/${recordName}, ACME challenge verified`);
    return true;
}

/**
 * Verify ACME TLS ALPN challenge
 *
 * https://datatracker.ietf.org/doc/html/rfc8737
 *
 * @param {object} authz Identifier authorization
 * @param {object} challenge Authorization challenge
 * @param {string} keyAuthorization Challenge key authorization
 * @returns {Promise<boolean>}
 */

async function verifyTlsAlpnChallenge(authz, challenge, keyAuthorization) {
    const tlsAlpnPort = axios.defaults.acmeSettings.tlsAlpnChallengePort || 443;
    const host = authz.identifier.value;
    log(`Establishing TLS connection with host: ${host}:${tlsAlpnPort}`);

    const certificate = await util.retrieveTlsAlpnCertificate(host, tlsAlpnPort);
    log('Certificate received from server successfully, matching key authorization in ALPN');

    if (!isAlpnCertificateAuthorizationValid(certificate, keyAuthorization)) {
        throw new Error(`Authorization not found in certificate from ${authz.identifier.value}`);
    }

    log(`Key authorization match for ${challenge.type}/${authz.identifier.value}, ACME challenge verified`);
    return true;
}

/**
 * Export API
 */

module.exports = {
    'http-01': verifyHttpChallenge,
    'dns-01': verifyDnsChallenge,
    'tls-alpn-01': verifyTlsAlpnChallenge,
};
