/**
 * Utility method tests
 */

const dns = require('dns').promises;
const fs = require('fs').promises;
const path = require('path');
const { assert } = require('chai');
const util = require('./../src/util');
const { readCertificateInfo } = require('./../src/crypto');

describe('util', () => {
    const testCertPath1 = path.join(__dirname, 'fixtures', 'certificate.crt');
    const testCertPath2 = path.join(__dirname, 'fixtures', 'letsencrypt.crt');

    it('retry()', async () => {
        let attempts = 0;
        const backoffOpts = {
            min: 100,
            max: 500,
        };

        await assert.isRejected(util.retry(() => {
            throw new Error('oops');
        }, backoffOpts));

        const r = await util.retry(() => {
            attempts += 1;

            if (attempts < 3) {
                throw new Error('oops');
            }

            return 'abc';
        }, backoffOpts);

        assert.strictEqual(r, 'abc');
        assert.strictEqual(attempts, 3);
    });

    it('parseLinkHeader()', () => {
        const r1 = util.parseLinkHeader('<https://example.com/a>;rel="alternate"');
        assert.isArray(r1);
        assert.strictEqual(r1.length, 1);
        assert.strictEqual(r1[0], 'https://example.com/a');

        const r2 = util.parseLinkHeader('<https://example.com/b>;rel="test"');
        assert.isArray(r2);
        assert.strictEqual(r2.length, 0);

        const r3 = util.parseLinkHeader('<http://example.com/c>; rel="test"', 'test');
        assert.isArray(r3);
        assert.strictEqual(r3.length, 1);
        assert.strictEqual(r3[0], 'http://example.com/c');

        const r4 = util.parseLinkHeader(`<https://example.com/a>; rel="alternate",
            <https://example.com/x>; rel="nope",
            <https://example.com/b>;rel="alternate",
            <https://example.com/c>;   rel="alternate"`);
        assert.isArray(r4);
        assert.strictEqual(r4.length, 3);
        assert.strictEqual(r4[0], 'https://example.com/a');
        assert.strictEqual(r4[1], 'https://example.com/b');
        assert.strictEqual(r4[2], 'https://example.com/c');
    });

    it('parseRetryAfterHeader()', () => {
        const r1 = util.parseRetryAfterHeader('');
        assert.strictEqual(r1, 0);

        const r2 = util.parseRetryAfterHeader('abcdef');
        assert.strictEqual(r2, 0);

        const r3 = util.parseRetryAfterHeader('123');
        assert.strictEqual(r3, 123);

        const r4 = util.parseRetryAfterHeader('123.456');
        assert.strictEqual(r4, 123);

        const r5 = util.parseRetryAfterHeader('-555');
        assert.strictEqual(r5, 0);

        const r6 = util.parseRetryAfterHeader('Wed, 21 Oct 2015 07:28:00 GMT');
        assert.strictEqual(r6, 0);

        const now = new Date();
        const future = new Date(now.getTime() + 123000);
        const r7 = util.parseRetryAfterHeader(future.toUTCString());
        assert.isTrue(r7 > 100);
    });

    it('findCertificateChainForIssuer()', async () => {
        const certs = [
            (await fs.readFile(testCertPath1)).toString(),
            (await fs.readFile(testCertPath2)).toString(),
        ];

        const r1 = util.findCertificateChainForIssuer(certs, 'abc123');
        const r2 = util.findCertificateChainForIssuer(certs, 'example.com');
        const r3 = util.findCertificateChainForIssuer(certs, 'E6');

        [r1, r2, r3].forEach((r) => {
            assert.isString(r);
            assert.isNotEmpty(r);
        });

        assert.strictEqual(readCertificateInfo(r1).issuer.commonName, 'example.com');
        assert.strictEqual(readCertificateInfo(r2).issuer.commonName, 'example.com');
        assert.strictEqual(readCertificateInfo(r3).issuer.commonName, 'E6');
    });

    it('formatResponseError()', () => {
        const e1 = util.formatResponseError({ data: { error: 'aaa' } });
        assert.strictEqual(e1, 'aaa');

        const e2 = util.formatResponseError({ data: { error: { detail: 'bbb' } } });
        assert.strictEqual(e2, 'bbb');

        const e3 = util.formatResponseError({ data: { detail: 'ccc' } });
        assert.strictEqual(e3, 'ccc');

        const e4 = util.formatResponseError({ data: { a: 123 } });
        assert.strictEqual(e4, '{"a":123}');

        const e5 = util.formatResponseError({});
        assert.isString(e5);
        assert.isEmpty(e5);
    });

    it('getAuthoritativeDnsResolver()', async () => {
        /* valid domain - should not use global default */
        const r1 = await util.getAuthoritativeDnsResolver('example.com');
        assert.instanceOf(r1, dns.Resolver);
        assert.isNotEmpty(r1.getServers());
        assert.notDeepEqual(r1.getServers(), dns.getServers());

        /* invalid domain - fallback to global default */
        const r2 = await util.getAuthoritativeDnsResolver('invalid.xtldx');
        assert.instanceOf(r2, dns.Resolver);
        assert.deepStrictEqual(r2.getServers(), dns.getServers());
    });

    /* TODO: Figure out how to test this */
    it('retrieveTlsAlpnCertificate()');
});
