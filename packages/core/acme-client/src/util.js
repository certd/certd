/**
 * Utility methods
 */

const tls = require('tls');
const dns = require('dns').promises;
const { readCertificateInfo, splitPemChain } = require('./crypto');
const { log } = require('./logger');

/**
 * Exponential backoff
 *
 * https://github.com/mokesmokes/backo
 *
 * @class
 * @param {object} [opts]
 * @param {number} [opts.min] Minimum backoff duration in ms
 * @param {number} [opts.max] Maximum backoff duration in ms
 */

class Backoff {
    constructor({ min = 100, max = 10000 } = {}) {
        this.min = min;
        this.max = max;
        this.attempts = 0;
    }

    /**
     * Get backoff duration
     *
     * @returns {number} Backoff duration in ms
     */

    duration() {
        const ms = this.min * (2 ** this.attempts);
        this.attempts += 1;
        return Math.min(ms, this.max);
    }
}

/**
 * Retry promise
 *
 * @param {function} fn Function returning promise that should be retried
 * @param {number} attempts Maximum number of attempts
 * @param {Backoff} backoff Backoff instance
 * @returns {Promise}
 */

async function retryPromise(fn, attempts, backoff) {
    let aborted = false;

    try {
        const data = await fn(() => { aborted = true; });
        return data;
    }
    catch (e) {
        if (aborted || ((backoff.attempts + 1) >= attempts)) {
            throw e;
        }

        const duration = backoff.duration();
        log(`Promise rejected attempt #${backoff.attempts}, retrying in ${duration}ms: ${e.message}`);

        await new Promise((resolve) => { setTimeout(resolve, duration); });
        return retryPromise(fn, attempts, backoff);
    }
}

/**
 * Retry promise
 *
 * @param {function} fn Function returning promise that should be retried
 * @param {object} [backoffOpts] Backoff options
 * @param {number} [backoffOpts.attempts] Maximum number of attempts, default: `5`
 * @param {number} [backoffOpts.min] Minimum attempt delay in milliseconds, default: `5000`
 * @param {number} [backoffOpts.max] Maximum attempt delay in milliseconds, default: `30000`
 * @returns {Promise}
 */

function retry(fn, { attempts = 5, min = 5000, max = 30000 } = {}) {
    const backoff = new Backoff({ min, max });
    return retryPromise(fn, attempts, backoff);
}

/**
 * Parse URLs from Link header
 *
 * https://datatracker.ietf.org/doc/html/rfc8555#section-7.4.2
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link
 *
 * @param {string} header Header contents
 * @param {string} rel Link relation, default: `alternate`
 * @returns {string[]} Array of URLs
 */

function parseLinkHeader(header, rel = 'alternate') {
    const relRe = new RegExp(`\\s*rel\\s*=\\s*"?${rel}"?`, 'i');

    const results = (header || '').split(/,\s*</).map((link) => {
        const [, linkUrl, linkParts] = link.match(/<?([^>]*)>;(.*)/) || [];
        return (linkUrl && linkParts && linkParts.match(relRe)) ? linkUrl : null;
    });

    return results.filter((r) => r);
}

/**
 * Parse date or duration from Retry-After header
 *
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
 *
 * @param {string} header Header contents
 * @returns {number} Retry duration in seconds
 */

function parseRetryAfterHeader(header) {
    const sec = parseInt(header, 10);
    const date = new Date(header);

    /* Seconds into the future */
    if (Number.isSafeInteger(sec) && (sec > 0)) {
        return sec;
    }

    /* Future date string */
    if (date instanceof Date && !Number.isNaN(date)) {
        const now = new Date();
        const diff = Math.ceil((date.getTime() - now.getTime()) / 1000);

        if (diff > 0) {
            return diff;
        }
    }

    return 0;
}

/**
 * Find certificate chain with preferred issuer common name
 *  - If issuer is found in multiple chains, the closest to root wins
 *  - If issuer can not be located, the first chain will be returned
 *
 * @param {string[]} certificates Array of PEM encoded certificate chains
 * @param {string} issuer Preferred certificate issuer
 * @returns {string} PEM encoded certificate chain
 */

function findCertificateChainForIssuer(chains, issuer) {
    log(`Attempting to find match for issuer="${issuer}" in ${chains.length} certificate chains`);
    let bestMatch = null;
    let bestDistance = null;

    chains.forEach((chain) => {
        /* Look up all issuers */
        const certs = splitPemChain(chain);
        const infoCollection = certs.map((c) => readCertificateInfo(c));
        const issuerCollection = infoCollection.map((i) => i.issuer.commonName);

        /* Found issuer match, get distance from root - lower is better */
        if (issuerCollection.includes(issuer)) {
            const distance = (issuerCollection.length - issuerCollection.indexOf(issuer));
            log(`Found matching chain for preferred issuer="${issuer}" distance=${distance} issuers=${JSON.stringify(issuerCollection)}`);

            /* Chain wins, use it */
            if (!bestDistance || (distance < bestDistance)) {
                log(`Issuer is closer to root than previous match, using it (${distance} < ${bestDistance || 'undefined'})`);
                bestMatch = chain;
                bestDistance = distance;
            }
        }
        else {
            /* No match */
            log(`Unable to match certificate for preferred issuer="${issuer}", issuers=${JSON.stringify(issuerCollection)}`);
        }
    });

    /* Return found match */
    if (bestMatch) {
        return bestMatch;
    }

    /* No chains matched, return default */
    log(`Found no match in ${chains.length} certificate chains for preferred issuer="${issuer}", returning default certificate chain`);
    return chains[0];
}

/**
 * Find and format error in response object
 *
 * @param {object} resp HTTP response
 * @returns {string} Error message
 */

function formatResponseError(resp) {
    let result;

    if (resp.data) {
        if (resp.data.error) {
            result = resp.data.error.detail || resp.data.error;
        }
        else {
            result = resp.data.detail || JSON.stringify(resp.data);
        }
    }

    return (result || '').replace(/\n/g, '');
}

/**
 * Resolve root domain name by looking for SOA record
 *
 * @param {string} recordName DNS record name
 * @returns {Promise<string>} Root domain name
 */

async function resolveDomainBySoaRecord(recordName) {
    try {
        await dns.resolveSoa(recordName);
        log(`Found SOA record, considering domain to be: ${recordName}`);
        return recordName;
    }
    catch (e) {
        log(`Unable to locate SOA record for name: ${recordName}`);
        const parentRecordName = recordName.split('.').slice(1).join('.');

        if (!parentRecordName.includes('.')) {
            throw new Error('Unable to resolve domain by SOA record');
        }

        return resolveDomainBySoaRecord(parentRecordName);
    }
}

/**
 * Get DNS resolver using domains authoritative NS records
 *
 * @param {string} recordName DNS record name
 * @returns {Promise<dns.Resolver>} DNS resolver
 */

async function getAuthoritativeDnsResolver(recordName) {
    log(`Locating authoritative NS records for name: ${recordName}`);
    const resolver = new dns.Resolver();

    try {
        /* Resolve root domain by SOA */
        const domain = await resolveDomainBySoaRecord(recordName);

        /* Resolve authoritative NS addresses */
        log(`Looking up authoritative NS records for domain: ${domain}`);
        const nsRecords = await dns.resolveNs(domain);
        const nsAddrArray = await Promise.all(nsRecords.map(async (r) => dns.resolve4(r)));
        const nsAddresses = [].concat(...nsAddrArray).filter((a) => a);

        if (!nsAddresses.length) {
            throw new Error(`Unable to locate any valid authoritative NS addresses for domain: ${domain}`);
        }

        /* Authoritative NS success */
        log(`Found ${nsAddresses.length} authoritative NS addresses for domain: ${domain}`);
        resolver.setServers(nsAddresses);
    }
    catch (e) {
        log(`Authoritative NS lookup error: ${e.message}`);
    }

    /* Return resolver */
    const addresses = resolver.getServers();
    log(`DNS resolver addresses: ${addresses.join(', ')}`);

    return resolver;
}

/**
 * Attempt to retrieve TLS ALPN certificate from peer
 *
 * https://nodejs.org/api/tls.html#tlsconnectoptions-callback
 *
 * @param {string} host Host the TLS client should connect to
 * @param {number} port Port the client should connect to
 * @param {string} servername Server name for the SNI (Server Name Indication)
 * @returns {Promise<string>} PEM encoded certificate
 */

async function retrieveTlsAlpnCertificate(host, port, timeout = 30000) {
    return new Promise((resolve, reject) => {
        let result;

        /* TLS connection */
        const socket = tls.connect({
            host,
            port,
            servername: host,
            rejectUnauthorized: false,
            ALPNProtocols: ['acme-tls/1'],
        });

        socket.setTimeout(timeout);
        socket.setEncoding('utf-8');

        /* Grab certificate once connected and close */
        socket.on('secureConnect', () => {
            result = socket.getPeerX509Certificate();
            socket.end();
        });

        /* Errors */
        socket.on('error', (err) => {
            reject(err);
        });

        socket.on('timeout', () => {
            socket.destroy(new Error('TLS ALPN certificate lookup request timed out'));
        });

        /* Done, return cert as PEM if found */
        socket.on('end', () => {
            if (result) {
                return resolve(result.toString());
            }

            return reject(new Error('TLS ALPN lookup failed to retrieve certificate'));
        });
    });
}

/**
 * Export utils
 */

module.exports = {
    retry,
    parseLinkHeader,
    parseRetryAfterHeader,
    findCertificateChainForIssuer,
    formatResponseError,
    getAuthoritativeDnsResolver,
    retrieveTlsAlpnCertificate,
};
