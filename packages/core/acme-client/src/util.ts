// @ts-nocheck
/**
 * Utility methods
 */

import tls from 'tls';
import dnsSdk from 'dns';
import net from 'net';
import { readCertificateInfo, splitPemChain }from './crypto/index.js'
import { log } from './logger.js'

const dns = dnsSdk.promises;
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

async function retryPromise(fn, attempts, backoff, logger = log) {
    let aborted = false;
    let abortedFromUser = false;

    try {
        const setAbort = (fromUser = false) => { aborted = true; abortedFromUser = fromUser; }
        const data = await fn(setAbort);
        return data;
    }
    catch (e) {
        if (aborted){
            if (abortedFromUser){
                logger(`用户取消重试`);
            }
            throw e;
        }
        if ( ((backoff.attempts + 1) >= attempts)) {
            logger(`重试次数超过${attempts}次`);
            throw e;
        }

        logger(`Promise rejected: ${e.message}`);
        const duration = backoff.duration();
        logger(`Promise rejected attempt #${backoff.attempts}, ${duration}ms 后重试: ${e.message}`);

        await new Promise((resolve) => { setTimeout(resolve, duration); });
        return retryPromise(fn, attempts, backoff, logger);
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

function retry(fn, { attempts = 5, min = 5000, max = 30000 } = {}, logger = log) {
    const backoff = new Backoff({ min, max });
    return retryPromise(fn, attempts, backoff, logger);
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

async function resolveDomainBySoaRecord(recordName, logger = log, resolver = dns) {
    try {
        await resolver.resolveSoa(recordName);
        logger(`找到${recordName}的SOA记录`);
        return recordName;
    }
    catch (e) {
        logger(`找不到${recordName}的SOA记录,继续往主域名查找`);
        const parentRecordName = recordName.split('.').slice(1).join('.');

        if (!parentRecordName.includes('.')) {
            throw new Error('SOA record查找失败');
        }

        return resolveDomainBySoaRecord(parentRecordName,logger,resolver);
    }
}

/**
 * Get DNS resolver using domains authoritative NS records
 *
 * @param {string} recordName DNS record name
 * @returns {Promise<dns.Resolver>} DNS resolver
 */


/**
 * 创建自定义DNS resolver，支持 ip:port / host:port（非标准端口）。
 * host 会先通过系统DNS解析为IP，再交给 Resolver。
 */
async function createCustomResolver(servers, logger = log) {
    const resolver = new dns.Resolver({ timeout: 2000, tries: 2 });
    const normalized = [];
    for (const item of servers || []) {
        const value = String(item || "").trim();
        if (!value) continue;
        let host = value;
        let port = "";
        if (value.startsWith("[")) {
            const match = value.match(/^\[([^\]]+)\](?::(\d+))?$/);
            if (!match || !net.isIP(match[1])) throw new Error(`DNS服务器IPv6格式错误: ${value}`);
            host = match[1];
            port = match[2] || "";
        } else if (net.isIP(value)) {
            host = value; // 裸IPv4/IPv6，不猜测端口
        } else {
            const lastColon = value.lastIndexOf(":");
            if (lastColon > 0) {
                const maybePort = value.slice(lastColon + 1);
                const maybeHost = value.slice(0, lastColon);
                if (/^\d+$/.test(maybePort) && net.isIP(maybeHost) !== 6) {
                    host = maybeHost;
                    port = maybePort;
                }
            }
        }
        if (port && (Number(port) < 1 || Number(port) > 65535)) throw new Error(`DNS服务器端口超出范围: ${value}`);
        let address = host;
        if (!net.isIP(host)) {
            const records = await dns.lookup(host, { all: true, verbatim: true });
            if (!records.length) throw new Error(`DNS服务器域名解析失败: ${host}`);
            address = records[0].address;
        }
        normalized.push(net.isIP(address) === 6 ? (port ? `[${address}]:${port}` : address) : (port ? `${address}:${port}` : address));
    }
    if (!normalized.length) return null;
    resolver.setServers(normalized);
    logger(`使用自定义DNS服务器: ${normalized.join(", ")}`);
    return resolver;
}

async function getAuthoritativeDnsResolver(recordName, logger = log, customServers = undefined) {
    logger(`获取域名${recordName}的权威NS服务器: `);
    const resolver = (await createCustomResolver(customServers, logger)) || new dns.Resolver({timeout: 2000,tries: 2});
    const baseResolver = customServers?.length ? resolver : dns;

    try {
        /* Resolve root domain by SOA */
        const domain = await resolveDomainBySoaRecord(recordName,logger,baseResolver);

        /* Resolve authoritative NS addresses */
        logger(`获取到权威NS服务器name: ${domain}`);
        const nsRecords = await baseResolver.resolveNs(domain);
        logger(`域名权威NS服务器：${nsRecords}`);
        const nsAddrArray = await Promise.all(nsRecords.map(async (r) => baseResolver.resolve4(r)));
        let nsAddresses = [].concat(...nsAddrArray).filter((a) => a);
        // 权威NS默认仅接受公网地址；管理员显式配置的可信DNS除外
        if (!customServers?.length) {
            nsAddresses = nsAddresses.filter((a) => isPublicUnicastIp(a));
        }

        if (!nsAddresses.length) {
            throw new Error(`Unable to locate any valid authoritative NS addresses for domain（获取权威服务器IP失败）: ${domain}`);
        }

        /* Authoritative NS success */
        logger(`Found ${nsAddresses.length} authoritative NS addresses for domain: ${domain}`);
        resolver.setServers(nsAddresses);
    }
    catch (e) {
        logger(`Authoritative NS lookup error（获取权威NS服务器地址失败）: ${e.message}`);
    }

    /* Return resolver */
    const addresses = resolver.getServers();
    logger(`DNS resolver addresses（域名的权威NS服务器地址）: ${addresses.join(', ')}`);

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
    // 与HTTP-01一致：校验全部解析地址为公网单播，并固定到首个合格地址连接，防SSRF与DNS重绑定
    const addresses = await dns.lookup(host, { all: true, verbatim: true });
    if (!addresses.length) {
        throw new Error(`[error] 域名解析失败：${host}`);
    }
    for (const item of addresses) {
        if (!isPublicUnicastIp(item.address)) {
            throw new Error(`[error] TLS-ALPN挑战目标指向非公网地址，已拒绝预检：${host} -> ${item.address}`);
        }
    }
    const pinned = addresses[0];
    return new Promise((resolve, reject) => {
        let result;

        /* TLS connection（连接固定IP，SNI仍用原域名） */
        const socket = tls.connect({
            host: pinned.address,
            port,
            servername: host,
            family: pinned.family,
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

export {
    retry,
    parseLinkHeader,
    parseRetryAfterHeader,
    findCertificateChainForIssuer,
    formatResponseError,
    getAuthoritativeDnsResolver,
    createCustomResolver,
    retrieveTlsAlpnCertificate,
    resolveDomainBySoaRecord
};

/** 判断IP是否为公网单播地址（拒绝私网/回环/链路本地/保留/文档/ULA等）。 */
export function isPublicUnicastIp(ip) {
    const addr = String(ip || '').trim().replace(/^\[|\]$/g, '').replace(/%.*$/, '');
    const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    const v4 = mapped ? mapped[1] : addr;
    if (net.isIP(v4) === 4) {
        const p = v4.split('.').map(Number);
        const [a, b] = p;
        if (a === 0 || a === 10 || a === 127) return false;
        if (a === 100 && b >= 64 && b <= 127) return false;
        if (a === 169 && b === 254) return false;
        if (a === 172 && b >= 16 && b <= 31) return false;
        if (a === 192 && (b === 168 || b === 0)) return false;
        if (a === 198 && (b === 18 || b === 19)) return false;
        if (a === 192 && b === 0 && p[2] === 2) return false;
        if (a === 198 && b === 51 && p[2] === 100) return false;
        if (a === 203 && b === 0 && p[2] === 113) return false;
        if (a >= 224) return false;
        return true;
    }
    if (net.isIP(addr) === 6) {
        const lower = addr.toLowerCase();
        if (lower === '::' || lower === '::1') return false;
        if (lower.startsWith('::ffff:')) return false;
        const parts = lower.split(':');
        const g0 = parseInt(parts[0] || '0', 16);
        const g1 = parseInt(parts[1] || '0', 16);
        if ((g0 & 0xfe00) === 0xfc00) return false; // fc00::/7 唯一本地地址
        if ((g0 & 0xffc0) === 0xfe80) return false; // fe80::/10 链路本地
        if (g0 === 0x2001 && g1 <= 0x01ff) return false; // 2001::/23 IETF协议分配（含ORCHID）
        if (g0 === 0x2001 && g1 === 0x0db8) return false; // 2001:db8::/32 文档地址
        if (g0 === 0x2002) return false; // 2002::/16 6to4
        if (g0 === 0x3fff && (g1 & 0xf000) === 0) return false; // 3fff::/20 保留
        return true;
    }
    return false;
}
