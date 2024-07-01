/**
 * Pebble Challenge Test Server tests
 */

const dns = require('dns').promises;
const { randomUUID: uuid } = require('crypto');
const https = require('https');
const { assert } = require('chai');
const cts = require('./challtestsrv');
const axios = require('./../src/axios');
const { retrieveTlsAlpnCertificate } = require('./../src/util');
const { isAlpnCertificateAuthorizationValid } = require('./../src/crypto');

const domainName = process.env.ACME_DOMAIN_NAME || 'example.com';
const httpPort = axios.defaults.acmeSettings.httpChallengePort || 80;
const httpsPort = axios.defaults.acmeSettings.httpsChallengePort || 443;
const tlsAlpnPort = axios.defaults.acmeSettings.tlsAlpnChallengePort || 443;

describe('pebble', () => {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const testAHost = `${uuid()}.${domainName}`;
    const testARecords = ['1.1.1.1', '2.2.2.2'];
    const testCnameHost = `${uuid()}.${domainName}`;
    const testCnameRecord = `${uuid()}.${domainName}`;

    const testHttp01ChallengeHost = `${uuid()}.${domainName}`;
    const testHttp01ChallengeToken = uuid();
    const testHttp01ChallengeContent = uuid();

    const testHttps01ChallengeHost = `${uuid()}.${domainName}`;
    const testHttps01ChallengeToken = uuid();
    const testHttps01ChallengeContent = uuid();

    const testDns01ChallengeHost = `_acme-challenge.${uuid()}.${domainName}.`;
    const testDns01ChallengeValue = uuid();

    const testTlsAlpn01ChallengeHost = `${uuid()}.${domainName}`;
    const testTlsAlpn01ChallengeValue = uuid();

    /**
     * Pebble CTS required
     */

    before(function () {
        if (!cts.isEnabled()) {
            this.skip();
        }
    });

    /**
     * DNS mocking
     */

    describe('dns', () => {
        it('should not locate a records', async () => {
            const resp = await dns.resolve4(testAHost);

            assert.isArray(resp);
            assert.notDeepEqual(resp, testARecords);
        });

        it('should add dns a records', async () => {
            const resp = await cts.addDnsARecord(testAHost, testARecords);
            assert.isTrue(resp);
        });

        it('should locate a records', async () => {
            const resp = await dns.resolve4(testAHost);

            assert.isArray(resp);
            assert.deepStrictEqual(resp, testARecords);
        });

        it('should not locate cname records', async () => {
            await assert.isRejected(dns.resolveCname(testCnameHost));
        });

        it('should set dns cname record', async () => {
            const resp = await cts.setDnsCnameRecord(testCnameHost, testCnameRecord);
            assert.isTrue(resp);
        });

        it('should locate cname record', async () => {
            const resp = await dns.resolveCname(testCnameHost);

            assert.isArray(resp);
            assert.deepStrictEqual(resp, [testCnameRecord]);
        });
    });

    /**
     * HTTP-01 challenge response
     */

    describe('http-01', () => {
        it('should not locate challenge response', async () => {
            const resp = await axios.get(`http://${testHttp01ChallengeHost}:${httpPort}/.well-known/acme-challenge/${testHttp01ChallengeToken}`);

            assert.isString(resp.data);
            assert.notEqual(resp.data, testHttp01ChallengeContent);
        });

        it('should add challenge response', async () => {
            const resp = await cts.addHttp01ChallengeResponse(testHttp01ChallengeToken, testHttp01ChallengeContent);
            assert.isTrue(resp);
        });

        it('should locate challenge response', async () => {
            const resp = await axios.get(`http://${testHttp01ChallengeHost}:${httpPort}/.well-known/acme-challenge/${testHttp01ChallengeToken}`);

            assert.isString(resp.data);
            assert.strictEqual(resp.data, testHttp01ChallengeContent);
        });
    });

    /**
     * HTTPS-01 challenge response
     */

    describe('https-01', () => {
        it('should not locate challenge response', async () => {
            const r1 = await axios.get(`http://${testHttps01ChallengeHost}:${httpPort}/.well-known/acme-challenge/${testHttps01ChallengeToken}`, { httpsAgent });
            const r2 = await axios.get(`https://${testHttps01ChallengeHost}:${httpsPort}/.well-known/acme-challenge/${testHttps01ChallengeToken}`, { httpsAgent });

            [r1, r2].forEach((resp) => {
                assert.isString(resp.data);
                assert.notEqual(resp.data, testHttps01ChallengeContent);
            });
        });

        it('should add challenge response', async () => {
            const resp = await cts.addHttps01ChallengeResponse(testHttps01ChallengeToken, testHttps01ChallengeContent, testHttps01ChallengeHost);
            assert.isTrue(resp);
        });

        it('should 302 with self-signed cert', async () => {
            /* Assert HTTP 302 */
            const resp = await axios.get(`http://${testHttps01ChallengeHost}:${httpPort}/.well-known/acme-challenge/${testHttps01ChallengeToken}`, {
                maxRedirects: 0,
                validateStatus: null,
            });

            assert.strictEqual(resp.status, 302);
            assert.strictEqual(resp.headers.location, `https://${testHttps01ChallengeHost}:${httpsPort}/.well-known/acme-challenge/${testHttps01ChallengeToken}`);

            /* Self-signed cert test */
            await assert.isRejected(axios.get(`https://${testHttps01ChallengeHost}:${httpsPort}/.well-known/acme-challenge/${testHttps01ChallengeToken}`));
            await assert.isFulfilled(axios.get(`https://${testHttps01ChallengeHost}:${httpsPort}/.well-known/acme-challenge/${testHttps01ChallengeToken}`, { httpsAgent }));
        });

        it('should locate challenge response', async () => {
            const r1 = await axios.get(`http://${testHttps01ChallengeHost}:${httpPort}/.well-known/acme-challenge/${testHttps01ChallengeToken}`, { httpsAgent });
            const r2 = await axios.get(`https://${testHttps01ChallengeHost}:${httpsPort}/.well-known/acme-challenge/${testHttps01ChallengeToken}`, { httpsAgent });

            [r1, r2].forEach((resp) => {
                assert.isString(resp.data);
                assert.strictEqual(resp.data, testHttps01ChallengeContent);
            });
        });
    });

    /**
     * DNS-01 challenge response
     */

    describe('dns-01', () => {
        it('should not locate challenge response', async () => {
            await assert.isRejected(dns.resolveTxt(testDns01ChallengeHost));
        });

        it('should add challenge response', async () => {
            const resp = await cts.addDns01ChallengeResponse(testDns01ChallengeHost, testDns01ChallengeValue);
            assert.isTrue(resp);
        });

        it('should locate challenge response', async () => {
            const resp = await dns.resolveTxt(testDns01ChallengeHost);

            assert.isArray(resp);
            assert.deepStrictEqual(resp, [[testDns01ChallengeValue]]);
        });
    });

    /**
     * TLS-ALPN-01 challenge response
     */

    describe('tls-alpn-01', () => {
        it('should not locate challenge response', async () => {
            await assert.isRejected(retrieveTlsAlpnCertificate(testTlsAlpn01ChallengeHost, tlsAlpnPort), /(failed to retrieve)|(ssl3_read_bytes:tlsv1 alert internal error)/);
        });

        it('should timeout challenge response', async () => {
            await assert.isRejected(retrieveTlsAlpnCertificate('example.org', tlsAlpnPort, 500));
        });

        it('should add challenge response', async () => {
            const resp = await cts.addTlsAlpn01ChallengeResponse(testTlsAlpn01ChallengeHost, testTlsAlpn01ChallengeValue);
            assert.isTrue(resp);
        });

        it('should locate challenge response', async () => {
            const resp = await retrieveTlsAlpnCertificate(testTlsAlpn01ChallengeHost, tlsAlpnPort);
            assert.isTrue(isAlpnCertificateAuthorizationValid(resp, testTlsAlpn01ChallengeValue));
        });
    });
});
