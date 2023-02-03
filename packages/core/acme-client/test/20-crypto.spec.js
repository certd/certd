/**
 * Crypto tests
 */

const fs = require('fs').promises;
const path = require('path');
const { assert } = require('chai');
const spec = require('./spec');
const { crypto } = require('./../');

const emptyBodyChain1 = `
-----BEGIN TEST-----
a
-----END TEST-----
-----BEGIN TEST-----
b
-----END TEST-----

-----BEGIN TEST-----

-----END TEST-----


-----BEGIN TEST-----
c
-----END TEST-----
`;

const emptyBodyChain2 = `


-----BEGIN TEST-----
-----END TEST-----
-----BEGIN TEST-----



-----END TEST-----

-----BEGIN TEST-----
a
-----END TEST-----


-----BEGIN TEST-----
b
-----END TEST-----
-----BEGIN TEST-----
c
-----END TEST-----
`;


describe('crypto', () => {
    const testCsrDomain = 'example.com';
    const testSanCsrDomains = ['example.com', 'test.example.com', 'abc.example.com'];
    const testKeyPath = path.join(__dirname, 'fixtures', 'private.key');
    const testCertPath = path.join(__dirname, 'fixtures', 'certificate.crt');
    const testSanCertPath = path.join(__dirname, 'fixtures', 'san-certificate.crt');


    /**
     * Key types
     */

    Object.entries({
        rsa: {
            createKeyFns: {
                s1024: () => crypto.createPrivateRsaKey(1024),
                s2048: () => crypto.createPrivateRsaKey(),
                s4096: () => crypto.createPrivateRsaKey(4096)
            },
            jwkSpecFn: spec.jwk.rsa
        },
        ecdsa: {
            createKeyFns: {
                p256: () => crypto.createPrivateEcdsaKey(),
                p384: () => crypto.createPrivateEcdsaKey('P-384'),
                p521: () => crypto.createPrivateEcdsaKey('P-521')
            },
            jwkSpecFn: spec.jwk.ecdsa
        }
    }).forEach(([name, { createKeyFns, jwkSpecFn }]) => {
        describe(name, () => {
            const testPrivateKeys = {};
            const testPublicKeys = {};


            /**
             * Iterate through all generator variations
             */

            Object.entries(createKeyFns).forEach(([n, createFn]) => {
                let testCsr;
                let testSanCsr;
                let testNonCnCsr;
                let testNonAsciiCsr;


                /**
                 * Keys and JWK
                 */

                it(`${n}/should generate private key`, async () => {
                    testPrivateKeys[n] = await createFn();
                    assert.isTrue(Buffer.isBuffer(testPrivateKeys[n]));
                });

                it(`${n}/should get public key`, () => {
                    testPublicKeys[n] = crypto.getPublicKey(testPrivateKeys[n]);
                    assert.isTrue(Buffer.isBuffer(testPublicKeys[n]));
                });

                it(`${n}/should get jwk from private key`, () => {
                    const jwk = crypto.getJwk(testPrivateKeys[n]);
                    jwkSpecFn(jwk);
                });

                it(`${n}/should get jwk from public key`, () => {
                    const jwk = crypto.getJwk(testPublicKeys[n]);
                    jwkSpecFn(jwk);
                });


                /**
                 * Certificate Signing Request
                 */

                it(`${n}/should generate a csr`, async () => {
                    const [key, csr] = await crypto.createCsr({
                        commonName: testCsrDomain
                    }, testPrivateKeys[n]);

                    assert.isTrue(Buffer.isBuffer(key));
                    assert.isTrue(Buffer.isBuffer(csr));

                    testCsr = csr;
                });

                it(`${n}/should generate a san csr`, async () => {
                    const [key, csr] = await crypto.createCsr({
                        commonName: testSanCsrDomains[0],
                        altNames: testSanCsrDomains.slice(1, testSanCsrDomains.length)
                    }, testPrivateKeys[n]);

                    assert.isTrue(Buffer.isBuffer(key));
                    assert.isTrue(Buffer.isBuffer(csr));

                    testSanCsr = csr;
                });

                it(`${n}/should generate a csr without common name`, async () => {
                    const [key, csr] = await crypto.createCsr({
                        altNames: testSanCsrDomains
                    }, testPrivateKeys[n]);

                    assert.isTrue(Buffer.isBuffer(key));
                    assert.isTrue(Buffer.isBuffer(csr));

                    testNonCnCsr = csr;
                });

                it(`${n}/should generate a non-ascii csr`, async () => {
                    const [key, csr] = await crypto.createCsr({
                        commonName: testCsrDomain,
                        organization: '大安區',
                        organizationUnit: '中文部門'
                    }, testPrivateKeys[n]);

                    assert.isTrue(Buffer.isBuffer(key));
                    assert.isTrue(Buffer.isBuffer(csr));

                    testNonAsciiCsr = csr;
                });

                it(`${n}/should throw with invalid key`, async () => {
                    await assert.isRejected(crypto.createCsr({
                        commonName: testCsrDomain
                    }, testPublicKeys[n]));
                });


                /**
                 * Domain and info resolver
                 */

                it(`${n}/should resolve domains from csr`, () => {
                    const result = crypto.readCsrDomains(testCsr);

                    spec.crypto.csrDomains(result);
                    assert.strictEqual(result.commonName, testCsrDomain);
                    assert.deepStrictEqual(result.altNames, [testCsrDomain]);
                });

                it(`${n}/should resolve domains from san csr`, () => {
                    const result = crypto.readCsrDomains(testSanCsr);

                    spec.crypto.csrDomains(result);
                    assert.strictEqual(result.commonName, testSanCsrDomains[0]);
                    assert.deepStrictEqual(result.altNames, testSanCsrDomains);
                });

                it(`${n}/should resolve domains from csr without common name`, () => {
                    const result = crypto.readCsrDomains(testNonCnCsr);

                    spec.crypto.csrDomains(result);
                    assert.isNull(result.commonName);
                    assert.deepStrictEqual(result.altNames, testSanCsrDomains);
                });

                it(`${n}/should resolve domains from non-ascii csr`, () => {
                    const result = crypto.readCsrDomains(testNonAsciiCsr);

                    spec.crypto.csrDomains(result);
                    assert.strictEqual(result.commonName, testCsrDomain);
                    assert.deepStrictEqual(result.altNames, [testCsrDomain]);
                });
            });
        });
    });


    /**
     * Common functionality
     */

    describe('common', () => {
        let testPemKey;
        let testCert;
        let testSanCert;


        it('should read private key fixture', async () => {
            testPemKey = await fs.readFile(testKeyPath);
            assert.isTrue(Buffer.isBuffer(testPemKey));
        });

        it('should read certificate fixture', async () => {
            testCert = await fs.readFile(testCertPath);
            assert.isTrue(Buffer.isBuffer(testCert));
        });

        it('should read san certificate fixture', async () => {
            testSanCert = await fs.readFile(testSanCertPath);
            assert.isTrue(Buffer.isBuffer(testSanCert));
        });


        /**
         * CSR with auto-generated key
         */

        it('should generate a csr with auto-generated key', async () => {
            const [key, csr] = await crypto.createCsr({
                commonName: testCsrDomain
            });

            assert.isTrue(Buffer.isBuffer(key));
            assert.isTrue(Buffer.isBuffer(csr));
        });


        /**
         * Certificate
         */

        it('should read certificate info', () => {
            const info = crypto.readCertificateInfo(testCert);

            spec.crypto.certificateInfo(info);
            assert.strictEqual(info.domains.commonName, testCsrDomain);
            assert.strictEqual(info.domains.altNames.length, 0);
        });

        it('should read certificate info with san', () => {
            const info = crypto.readCertificateInfo(testSanCert);

            spec.crypto.certificateInfo(info);
            assert.strictEqual(info.domains.commonName, testSanCsrDomains[0]);
            assert.deepEqual(info.domains.altNames, testSanCsrDomains.slice(1, testSanCsrDomains.length));
        });


        /**
         * PEM utils
         */

        it('should get pem body as b64u', () => {
            [testPemKey, testCert, testSanCert].forEach((pem) => {
                const body = crypto.getPemBodyAsB64u(pem);

                assert.isString(body);
                assert.notInclude(body, '\r');
                assert.notInclude(body, '\n');
                assert.notInclude(body, '\r\n');
            });
        });

        it('should split pem chain', () => {
            [testPemKey, testCert, testSanCert].forEach((pem) => {
                const chain = crypto.splitPemChain(pem);

                assert.isArray(chain);
                assert.isNotEmpty(chain);
                chain.forEach((c) => assert.isString(c));
            });
        });

        it('should split pem chain with empty bodies', () => {
            const c1 = crypto.splitPemChain(emptyBodyChain1);
            const c2 = crypto.splitPemChain(emptyBodyChain2);

            assert.strictEqual(c1.length, 3);
            assert.strictEqual(c2.length, 3);
        });
    });
});
