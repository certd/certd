/**
 * HTTP client tests
 */

const { randomUUID: uuid } = require('crypto');
const { assert } = require('chai');
const nock = require('nock');
const axios = require('./../src/axios');
const HttpClient = require('./../src/http');
const pkg = require('./../package.json');

describe('http', () => {
    let testClient;

    const endpoint = `http://${uuid()}.example.com`;
    const defaultUserAgent = `node-${pkg.name}/${pkg.version}`;
    const customUserAgent = 'custom-ua-123';

    afterEach(() => {
        nock.cleanAll();
    });

    /**
     * Initialize
     */

    it('should initialize clients', () => {
        testClient = new HttpClient();
    });

    /**
     * HTTP verbs
     */

    it('should http get', async () => {
        nock(endpoint).get('/').reply(200, 'ok');
        const resp = await testClient.request(endpoint, 'get');

        assert.isObject(resp);
        assert.strictEqual(resp.status, 200);
        assert.strictEqual(resp.data, 'ok');
    });

    /**
     * User-Agent
     */

    it('should request using default user-agent', async () => {
        nock(endpoint).matchHeader('user-agent', defaultUserAgent).get('/').reply(200, 'ok');
        axios.defaults.headers.common['User-Agent'] = defaultUserAgent;
        const resp = await testClient.request(endpoint, 'get');

        assert.isObject(resp);
        assert.strictEqual(resp.status, 200);
        assert.strictEqual(resp.data, 'ok');
    });

    it('should reject using custom user-agent', async () => {
        nock(endpoint).matchHeader('user-agent', defaultUserAgent).get('/').reply(200, 'ok');
        axios.defaults.headers.common['User-Agent'] = customUserAgent;
        await assert.isRejected(testClient.request(endpoint, 'get'));
    });

    it('should request using custom user-agent', async () => {
        nock(endpoint).matchHeader('user-agent', customUserAgent).get('/').reply(200, 'ok');
        axios.defaults.headers.common['User-Agent'] = customUserAgent;
        const resp = await testClient.request(endpoint, 'get');

        assert.isObject(resp);
        assert.strictEqual(resp.status, 200);
        assert.strictEqual(resp.data, 'ok');
    });

    it('should reject using default user-agent', async () => {
        nock(endpoint).matchHeader('user-agent', customUserAgent).get('/').reply(200, 'ok');
        axios.defaults.headers.common['User-Agent'] = defaultUserAgent;
        await assert.isRejected(testClient.request(endpoint, 'get'));
    });

    /**
     * Retry on HTTP errors
     */

    it('should retry on 429 rate limit', async () => {
        let rateLimitCount = 0;

        nock(endpoint).persist().get('/').reply(() => {
            rateLimitCount += 1;

            if (rateLimitCount < 3) {
                return [429, 'Rate Limit Exceeded', { 'Retry-After': 1 }];
            }

            return [200, 'ok'];
        });

        assert.strictEqual(rateLimitCount, 0);
        const resp = await testClient.request(endpoint, 'get');

        assert.isObject(resp);
        assert.strictEqual(resp.status, 200);
        assert.strictEqual(resp.data, 'ok');
        assert.strictEqual(rateLimitCount, 3);
    });

    it('should retry on 5xx server error', async () => {
        let serverErrorCount = 0;

        nock(endpoint).persist().get('/').reply(() => {
            serverErrorCount += 1;
            return [500, 'Internal Server Error', { 'Retry-After': 1 }];
        });

        assert.strictEqual(serverErrorCount, 0);
        const resp = await testClient.request(endpoint, 'get');

        assert.isObject(resp);
        assert.strictEqual(resp.status, 500);
        assert.strictEqual(serverErrorCount, 4);
    });
});
