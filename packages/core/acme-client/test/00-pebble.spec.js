/**
 * Pebble Challenge Test Server tests
 */

const dns = require('dns').promises;
const { randomUUID: uuid } = require('crypto');
const { assert } = require('chai');
const cts = require('./challtestsrv');
const axios = require('./../src/axios');

const domainName = process.env.ACME_DOMAIN_NAME || 'example.com';
const httpPort = axios.defaults.acmeSettings.httpChallengePort || 80;


describe('pebble', () => {
    const testAHost = `${uuid()}.${domainName}`;
    const testARecords = ['1.1.1.1', '2.2.2.2'];
    const testCnameHost = `${uuid()}.${domainName}`;
    const testCnameRecord = `${uuid()}.${domainName}`;

    const testHttp01ChallengeHost = `${uuid()}.${domainName}`;
    const testHttp01ChallengeToken = uuid();
    const testHttp01ChallengeContent = uuid();
    const testDns01ChallengeHost = `_acme-challenge.${uuid()}.${domainName}.`;
    const testDns01ChallengeValue = uuid();


    /**
     * Pebble CTS required
     */

    before(function() {
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
     * Challenge response
     */

    describe('challenges', () => {
        it('should not locate http-01 challenge response', async () => {
            const resp = await axios.get(`http://${testHttp01ChallengeHost}:${httpPort}/.well-known/acme-challenge/${testHttp01ChallengeToken}`);

            assert.isString(resp.data);
            assert.notEqual(resp.data, testHttp01ChallengeContent);
        });

        it('should add http-01 challenge response', async () => {
            const resp = await cts.addHttp01ChallengeResponse(testHttp01ChallengeToken, testHttp01ChallengeContent);
            assert.isTrue(resp);
        });

        it('should locate http-01 challenge response', async () => {
            const resp = await axios.get(`http://${testHttp01ChallengeHost}:${httpPort}/.well-known/acme-challenge/${testHttp01ChallengeToken}`);

            assert.isString(resp.data);
            assert.strictEqual(resp.data, testHttp01ChallengeContent);
        });

        it('should not locate dns-01 challenge response', async () => {
            await assert.isRejected(dns.resolveTxt(testDns01ChallengeHost));
        });

        it('should add dns-01 challenge response', async () => {
            const resp = await cts.addDns01ChallengeResponse(testDns01ChallengeHost, testDns01ChallengeValue);
            assert.isTrue(resp);
        });

        it('should locate dns-01 challenge response', async () => {
            const resp = await dns.resolveTxt(testDns01ChallengeHost);

            assert.isArray(resp);
            assert.deepStrictEqual(resp, [[testDns01ChallengeValue]]);
        });
    });
});
