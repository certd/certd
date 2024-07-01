/**
 * Legacy crypto tests
 */

const fs = require('fs').promises;
const path = require('path');
const { assert } = require('chai');
const spec = require('./spec');
const forge = require('./../src/crypto/forge');

const cryptoEngines = {
    forge,
};

describe('crypto-legacy', () => {
    let testPemKey;
    let testCert;
    let testSanCert;

    const modulusStore = [];
    const exponentStore = [];
    const publicKeyStore = [];

    const testCsrDomain = 'example.com';
    const testSanCsrDomains = ['example.com', 'test.example.com', 'abc.example.com'];
    const testKeyPath = path.join(__dirname, 'fixtures', 'private.key');
    const testCertPath = path.join(__dirname, 'fixtures', 'certificate.crt');
    const testSanCertPath = path.join(__dirname, 'fixtures', 'san-certificate.crt');

    /**
     * Fixtures
     */

    describe('fixtures', () => {
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
    });

    /**
     * Engines
     */

    Object.entries(cryptoEngines).forEach(([name, engine]) => {
        describe(`engine/${name}`, () => {
            let testCsr;
            let testSanCsr;
            let testNonCnCsr;
            let testNonAsciiCsr;

            /**
             * Key generation
             */

            it('should generate a private key', async () => {
                const key = await engine.createPrivateKey();
                assert.isTrue(Buffer.isBuffer(key));
            });

            it('should generate a private key with size=1024', async () => {
                const key = await engine.createPrivateKey(1024);
                assert.isTrue(Buffer.isBuffer(key));
            });

            it('should generate a public key', async () => {
                const key = await engine.createPublicKey(testPemKey);
                assert.isTrue(Buffer.isBuffer(key));
                publicKeyStore.push(key.toString().replace(/[\r\n]/gm, ''));
            });

            /**
             * Certificate Signing Request
             */

            it('should generate a csr', async () => {
                const [key, csr] = await engine.createCsr({
                    commonName: testCsrDomain,
                });

                assert.isTrue(Buffer.isBuffer(key));
                assert.isTrue(Buffer.isBuffer(csr));

                testCsr = csr;
            });

            it('should generate a san csr', async () => {
                const [key, csr] = await engine.createCsr({
                    commonName: testSanCsrDomains[0],
                    altNames: testSanCsrDomains.slice(1, testSanCsrDomains.length),
                });

                assert.isTrue(Buffer.isBuffer(key));
                assert.isTrue(Buffer.isBuffer(csr));

                testSanCsr = csr;
            });

            it('should generate a csr without common name', async () => {
                const [key, csr] = await engine.createCsr({
                    altNames: testSanCsrDomains,
                });

                assert.isTrue(Buffer.isBuffer(key));
                assert.isTrue(Buffer.isBuffer(csr));

                testNonCnCsr = csr;
            });

            it('should generate a non-ascii csr', async () => {
                const [key, csr] = await engine.createCsr({
                    commonName: testCsrDomain,
                    organization: '大安區',
                    organizationUnit: '中文部門',
                });

                assert.isTrue(Buffer.isBuffer(key));
                assert.isTrue(Buffer.isBuffer(csr));

                testNonAsciiCsr = csr;
            });

            it('should resolve domains from csr', async () => {
                const result = await engine.readCsrDomains(testCsr);

                spec.crypto.csrDomains(result);
                assert.strictEqual(result.commonName, testCsrDomain);
                assert.deepStrictEqual(result.altNames, [testCsrDomain]);
            });

            it('should resolve domains from san csr', async () => {
                const result = await engine.readCsrDomains(testSanCsr);

                spec.crypto.csrDomains(result);
                assert.strictEqual(result.commonName, testSanCsrDomains[0]);
                assert.deepStrictEqual(result.altNames, testSanCsrDomains);
            });

            it('should resolve domains from san without common name', async () => {
                const result = await engine.readCsrDomains(testNonCnCsr);

                spec.crypto.csrDomains(result);
                assert.isNull(result.commonName);
                assert.deepStrictEqual(result.altNames, testSanCsrDomains);
            });

            it('should resolve domains from non-ascii csr', async () => {
                const result = await engine.readCsrDomains(testNonAsciiCsr);

                spec.crypto.csrDomains(result);
                assert.strictEqual(result.commonName, testCsrDomain);
                assert.deepStrictEqual(result.altNames, [testCsrDomain]);
            });

            /**
             * Certificate
             */

            it('should read info from certificate', async () => {
                const info = await engine.readCertificateInfo(testCert);

                spec.crypto.certificateInfo(info);
                assert.strictEqual(info.domains.commonName, testCsrDomain);
                assert.strictEqual(info.domains.altNames.length, 0);
            });

            it('should read info from san certificate', async () => {
                const info = await engine.readCertificateInfo(testSanCert);

                spec.crypto.certificateInfo(info);
                assert.strictEqual(info.domains.commonName, testSanCsrDomains[0]);
                assert.deepEqual(info.domains.altNames, testSanCsrDomains.slice(1, testSanCsrDomains.length));
            });

            /**
             * PEM utils
             */

            it('should get pem body', () => {
                [testPemKey, testCert, testSanCert].forEach((pem) => {
                    const body = engine.getPemBody(pem);

                    assert.isString(body);
                    assert.notInclude(body, '\r');
                    assert.notInclude(body, '\n');
                    assert.notInclude(body, '\r\n');
                });
            });

            it('should split pem chain', () => {
                [testPemKey, testCert, testSanCert].forEach((pem) => {
                    const chain = engine.splitPemChain(pem);

                    assert.isArray(chain);
                    assert.isNotEmpty(chain);
                    chain.forEach((c) => assert.isString(c));
                });
            });

            /**
             * Modulus and exponent
             */

            it('should get modulus', async () => {
                const result = await Promise.all([testPemKey, testCert, testSanCert].map(async (item) => {
                    const mod = await engine.getModulus(item);
                    assert.isTrue(Buffer.isBuffer(mod));

                    return mod;
                }));

                modulusStore.push(result);
            });

            it('should get public exponent', async () => {
                const result = await Promise.all([testPemKey, testCert, testSanCert].map(async (item) => {
                    const exp = await engine.getPublicExponent(item);
                    assert.isTrue(Buffer.isBuffer(exp));

                    const b64exp = exp.toString('base64');
                    assert.strictEqual(b64exp, 'AQAB');

                    return b64exp;
                }));

                exponentStore.push(result);
            });
        });
    });

    /**
     * Verify identical results
     */

    describe('verification', () => {
        it('should have identical public keys', () => {
            if (publicKeyStore.length > 1) {
                const reference = publicKeyStore.shift();
                publicKeyStore.forEach((item) => assert.strictEqual(reference, item));
            }
        });

        it('should have identical moduli', () => {
            if (modulusStore.length > 1) {
                const reference = modulusStore.shift();
                modulusStore.forEach((item) => assert.deepStrictEqual(reference, item));
            }
        });

        it('should have identical public exponents', () => {
            if (exponentStore.length > 1) {
                const reference = exponentStore.shift();
                exponentStore.forEach((item) => assert.deepStrictEqual(reference, item));
            }
        });
    });
});
