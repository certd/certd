/**
 * Challenge verification tests
 */

const { randomUUID: uuid } = require('crypto');
const { assert } = require('chai');
const cts = require('./challtestsrv');
const verify = require('./../src/verify');

const domainName = process.env.ACME_DOMAIN_NAME || 'example.com';

describe('verify', () => {
    const challengeTypes = ['http-01', 'dns-01'];

    const testHttp01Authz = { identifier: { type: 'dns', value: `${uuid()}.${domainName}` } };
    const testHttp01Challenge = { type: 'http-01', status: 'pending', token: uuid() };
    const testHttp01Key = uuid();

    const testHttps01Authz = { identifier: { type: 'dns', value: `${uuid()}.${domainName}` } };
    const testHttps01Challenge = { type: 'http-01', status: 'pending', token: uuid() };
    const testHttps01Key = uuid();

    const testDns01Authz = { identifier: { type: 'dns', value: `${uuid()}.${domainName}` } };
    const testDns01Challenge = { type: 'dns-01', status: 'pending', token: uuid() };
    const testDns01Key = uuid();
    const testDns01Cname = `${uuid()}.${domainName}`;

    const testTlsAlpn01Authz = { identifier: { type: 'dns', value: `${uuid()}.${domainName}` } };
    const testTlsAlpn01Challenge = { type: 'dns-01', status: 'pending', token: uuid() };
    const testTlsAlpn01Key = uuid();

    /**
     * Pebble CTS required
     */

    before(function () {
        if (!cts.isEnabled()) {
            this.skip();
        }
    });

    /**
     * API
     */

    it('should expose verification api', async () => {
        assert.containsAllKeys(verify, challengeTypes);
    });

    /**
     * http-01
     */

    describe('http-01', () => {
        it('should reject challenge', async () => {
            await assert.isRejected(verify['http-01'](testHttp01Authz, testHttp01Challenge, testHttp01Key));
        });

        it('should mock challenge response', async () => {
            const resp = await cts.addHttp01ChallengeResponse(testHttp01Challenge.token, testHttp01Key);
            assert.isTrue(resp);
        });

        it('should verify challenge', async () => {
            const resp = await verify['http-01'](testHttp01Authz, testHttp01Challenge, testHttp01Key);
            assert.isTrue(resp);
        });

        it('should mock challenge response with trailing newline', async () => {
            const resp = await cts.addHttp01ChallengeResponse(testHttp01Challenge.token, `${testHttp01Key}\n`);
            assert.isTrue(resp);
        });

        it('should verify challenge with trailing newline', async () => {
            const resp = await verify['http-01'](testHttp01Authz, testHttp01Challenge, testHttp01Key);
            assert.isTrue(resp);
        });
    });

    /**
     * https-01
     */

    describe('https-01', () => {
        it('should reject challenge', async () => {
            await assert.isRejected(verify['http-01'](testHttps01Authz, testHttps01Challenge, testHttps01Key));
        });

        it('should mock challenge response', async () => {
            const resp = await cts.addHttps01ChallengeResponse(testHttps01Challenge.token, testHttps01Key, testHttps01Authz.identifier.value);
            assert.isTrue(resp);
        });

        it('should verify challenge', async () => {
            const resp = await verify['http-01'](testHttps01Authz, testHttps01Challenge, testHttps01Key);
            assert.isTrue(resp);
        });
    });

    /**
     * dns-01
     */

    describe('dns-01', () => {
        it('should reject challenge', async () => {
            await assert.isRejected(verify['dns-01'](testDns01Authz, testDns01Challenge, testDns01Key));
        });

        it('should mock challenge response', async () => {
            const resp = await cts.addDns01ChallengeResponse(`_acme-challenge.${testDns01Authz.identifier.value}.`, testDns01Key);
            assert.isTrue(resp);
        });

        it('should add cname to challenge response', async () => {
            const resp = await cts.setDnsCnameRecord(testDns01Cname, `_acme-challenge.${testDns01Authz.identifier.value}.`);
            assert.isTrue(resp);
        });

        it('should verify challenge', async () => {
            const resp = await verify['dns-01'](testDns01Authz, testDns01Challenge, testDns01Key);
            assert.isTrue(resp);
        });

        it('should verify challenge using cname', async () => {
            const resp = await verify['dns-01'](testDns01Authz, testDns01Challenge, testDns01Key);
            assert.isTrue(resp);
        });
    });

    /**
     * tls-alpn-01
     */

    describe('tls-alpn-01', () => {
        it('should reject challenge', async () => {
            await assert.isRejected(verify['tls-alpn-01'](testTlsAlpn01Authz, testTlsAlpn01Challenge, testTlsAlpn01Key));
        });

        it('should mock challenge response', async () => {
            const resp = await cts.addTlsAlpn01ChallengeResponse(testTlsAlpn01Authz.identifier.value, testTlsAlpn01Key);
            assert.isTrue(resp);
        });

        it('should verify challenge', async () => {
            const resp = await verify['tls-alpn-01'](testTlsAlpn01Authz, testTlsAlpn01Challenge, testTlsAlpn01Key);
            assert.isTrue(resp);
        });
    });
});
