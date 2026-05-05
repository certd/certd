// @ts-nocheck
/**
 * ACME challenge verification
 */

import dnsSdk from "dns"
import https from 'https'
import { log as defaultLog } from './logger.js'
import axios from './axios.js'
import * as util from './util.js'
import { isAlpnCertificateAuthorizationValid } from './crypto/index.js'
import { utils } from '@certd/basic'

const dns = dnsSdk.promises

let walkFromAuthoritative = true
export function setWalkFromAuthoritative(value = true) {
    walkFromAuthoritative = value
}

export function createChallengeFn(opts = {}) {
    const logger = opts?.logger || { info: defaultLog, error: defaultLog, warn: defaultLog, debug: defaultLog }

    const log = function (...args) {
        logger.info(...args)
    }
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

        async function doQuery(challengeUrl) {
            log(`正在测试请求 ${challengeUrl} `)
            // const httpsPort = axios.defaults.acmeSettings.httpsChallengePort || 443;
            // const challengeUrl = `https://${authz.identifier.value}:${httpsPort}${suffix}`;

            /* May redirect to HTTPS with invalid/self-signed cert - https://letsencrypt.org/docs/challenge-types/#http-01-challenge */
            const httpsAgent = new https.Agent({ rejectUnauthorized: false });

            log(`Sending HTTP query to ${authz.identifier.value}, suffix: ${suffix}, port: ${httpPort}`);
            let data = ""
            try {
                const resp = await axios.get(challengeUrl, { httpsAgent });
                data = (resp.data || '').replace(/\s+$/, '');
            } catch (e) {
                log(`[error] HTTP request error from ${authz.identifier.value}`, e.message);
                return false
            }

            if (!data || (data !== keyAuthorization)) {
                log(`[error] Authorization not found in HTTP response from ${authz.identifier.value}`);
                return false
            }
            return true

        }

        const httpPort = axios.defaults.acmeSettings.httpChallengePort || 80;
        let host = authz.identifier.value;
        if (utils.domain.isIpv6(host)) {
            host = `[${host}]`;
        }
        const challengeUrl = `http://${host}:${httpPort}${suffix}`;

        if (!await doQuery(challengeUrl)) {
            const httpsPort = axios.defaults.acmeSettings.httpsChallengePort || 443;
            const httpsChallengeUrl = `https://${host}:${httpsPort}${suffix}`;
            const res = await doQuery(httpsChallengeUrl)
            if (!res) {
                throw new Error(`[error] 验证失败，请检查以上测试url是否可以正常访问`);
            }
        }


        log(`Key authorization match for ${challenge.type}/${authz.identifier.value}, ACME challenge verified`);
        return true;
    }

    /**
     * Walk DNS until TXT records are found
     */

    async function walkDnsChallengeRecord(recordName, resolver = dns, deep = 0) {

        let records = [];

        const isAuthoritative = resolver === dns
        /* Resolve TXT records */
        try {
            log(`检查域名 ${recordName} 的TXT记录(from ${isAuthoritative ? '本地DNS' : '权威DNS服务器'})`);
            const txtRecords = await resolver.resolveTxt(recordName);
            if (txtRecords && txtRecords.length) {
                log(`找到 ${txtRecords.length} 条 TXT记录（ ${recordName}）`);
                log(`TXT records: ${JSON.stringify(txtRecords)}`);
                records = records.concat(...txtRecords);
            }
        } catch (e) {
            log(`解析 TXT 记录出错, ${recordName} :${e.message}`);
        }

        /* Resolve CNAME record first */
        try {
            log(`检查是否存在CNAME映射: ${recordName}`);
            const cnameRecords = await resolver.resolveCname(recordName);

            if (cnameRecords.length) {
                const cnameRecord = cnameRecords[0];
                log(`已找到${recordName}的CNAME记录，将检查: ${cnameRecord}`);
                let res = await walkTxtRecord(cnameRecord, deep + 1);
                if (res && res.length) {
                    log(`从CNAME中找到TXT记录: ${JSON.stringify(res)}`);
                    records = records.concat(...res);
                }
            } else {
                log(`没有CNAME映射（${recordName}）`);
            }
        } catch (e) {
            log(`检查CNAME出错（${recordName}） :${e.message}`);
        }
        return records
    }

    async function walkTxtRecord(recordName, deep = 0) {
        if (deep > 5) {
            log(`walkTxtRecord too deep (#${deep}) , skip walk`)
            return []
        }

        const txtRecords = []
        try {
            /* Default DNS resolver first */
            log('从本地DNS服务器获取TXT解析记录');
            const res = await walkDnsChallengeRecord(recordName, dns, deep);
            if (res && res.length > 0) {
                for (const item of res) {
                    txtRecords.push(item)
                }
            }

        } catch (e) {
            log(`本地获取TXT解析记录失败:${e.message}`)
        }

        if (walkFromAuthoritative !==false) {
            try {
                /* Authoritative DNS resolver */
                log(`从域名权威服务器获取TXT解析记录`);
                const authoritativeResolver = await util.getAuthoritativeDnsResolver(recordName, log);
                const res = await walkDnsChallengeRecord(recordName, authoritativeResolver, deep);
                if (res && res.length > 0) {
                    for (const item of res) {
                        txtRecords.push(item)
                    }
                }
            } catch (e) {
                log(`权威服务器获取TXT解析记录失败:${e.message}`)
            }
        }else{
            log(`跳过从权威服务器获取TXT解析记录`);
        }


        if (txtRecords.length === 0) {
            throw new Error(`没有找到TXT解析记录（${recordName}）`);
        }
        return txtRecords;
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
        const recordName = `${prefix}${authz.identifier.value}`;
        log(`本地校验TXT记录）: ${recordName}`);
        let recordValues = await walkTxtRecord(recordName, 0, walkFromAuthoritative);
        //去重
        recordValues = [...new Set(recordValues)];
        log(`DNS查询成功, 找到 ${recordValues.length} 条TXT记录：${recordValues}`);
        if (!recordValues.length || !recordValues.includes(keyAuthorization)) {
            const err = `没有找到需要的DNS TXT记录: ${recordName}，期望:${keyAuthorization},结果:${recordValues}`
            throw new Error(err);
        }

        log(`关键授权匹配成功（${challenge.type}/${recordName}）:${keyAuthorization}，校验成功， ACME challenge verified`);
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

    return {
        challenges: {
            'http-01': verifyHttpChallenge,
            'dns-01': verifyDnsChallenge,
            'tls-alpn-01': verifyTlsAlpnChallenge,
        },
        walkTxtRecord,
        walkDnsChallengeRecord,
    }

}



// createChallengeFn({logger:{info:console.log}}).walkDnsChallengeRecord("handsfree.work")
