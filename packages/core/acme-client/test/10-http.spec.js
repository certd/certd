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

    const defaultUserAgent = `node-${pkg.name}/${pkg.version}`;
    const customUserAgent = 'custom-ua-123';

    const primaryEndpoint = `http://${uuid()}.example.com`;
    const defaultUaEndpoint = `http://${uuid()}.example.com`;
    const customUaEndpoint = `http://${uuid()}.example.com`;


    /**
     * HTTP mocking
     */

    before(() => {
        const defaultUaOpts = { reqheaders: { 'User-Agent': defaultUserAgent } };
        const customUaOpts = { reqheaders: { 'User-Agent': customUserAgent } };

        nock(primaryEndpoint)
            .persist().get('/').reply(200, 'ok');

        nock(defaultUaEndpoint, defaultUaOpts)
            .persist().get('/').reply(200, 'ok');

        nock(customUaEndpoint, customUaOpts)
            .persist().get('/').reply(200, 'ok');
    });

    after(() => {
        axios.defaults.headers.common['User-Agent'] = defaultUserAgent;
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
        const resp = await testClient.request(primaryEndpoint, 'get');

        assert.isObject(resp);
        assert.strictEqual(resp.status, 200);
        assert.strictEqual(resp.data, 'ok');
    });


    /**
     * User-Agent
     */

    it('should request using default user-agent', async () => {
        const resp = await testClient.request(defaultUaEndpoint, 'get');

        assert.isObject(resp);
        assert.strictEqual(resp.status, 200);
        assert.strictEqual(resp.data, 'ok');
    });

    it('should not request using custom user-agent', async () => {
        await assert.isRejected(testClient.request(customUaEndpoint, 'get'));
    });

    it('should request using custom user-agent', async () => {
        axios.defaults.headers.common['User-Agent'] = customUserAgent;
        const resp = await testClient.request(customUaEndpoint, 'get');

        assert.isObject(resp);
        assert.strictEqual(resp.status, 200);
        assert.strictEqual(resp.data, 'ok');
    });

    it('should not request using default user-agent', async () => {
        axios.defaults.headers.common['User-Agent'] = customUserAgent;
        await assert.isRejected(testClient.request(defaultUaEndpoint, 'get'));
    });
});
