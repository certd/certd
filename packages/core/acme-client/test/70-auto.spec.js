/**
 * ACME client.auto tests
 */

const { randomUUID: uuid } = require('crypto');
const { assert } = require('chai');
const cts = require('./challtestsrv');
const getCertIssuers = require('./get-cert-issuers');
const spec = require('./spec');
const acme = require('./../');

const domainName = process.env.ACME_DOMAIN_NAME || 'example.com';
const directoryUrl = process.env.ACME_DIRECTORY_URL || acme.directory.letsencrypt.staging;
const capEabEnabled = (('ACME_CAP_EAB_ENABLED' in process.env) && (process.env.ACME_CAP_EAB_ENABLED === '1'));
const capAlternateCertRoots = !(('ACME_CAP_ALTERNATE_CERT_ROOTS' in process.env) && (process.env.ACME_CAP_ALTERNATE_CERT_ROOTS === '0'));

const clientOpts = {
    directoryUrl,
    backoffAttempts: 5,
    backoffMin: 1000,
    backoffMax: 5000,
};

if (capEabEnabled && process.env.ACME_EAB_KID && process.env.ACME_EAB_HMAC_KEY) {
    clientOpts.externalAccountBinding = {
        kid: process.env.ACME_EAB_KID,
        hmacKey: process.env.ACME_EAB_HMAC_KEY,
    };
}

describe('client.auto', () => {
    const testDomain = `${uuid()}.${domainName}`;
    const testHttpDomain = `${uuid()}.${domainName}`;
    const testHttpsDomain = `${uuid()}.${domainName}`;
    const testDnsDomain = `${uuid()}.${domainName}`;
    const testAlpnDomain = `${uuid()}.${domainName}`;
    const testWildcardDomain = `${uuid()}.${domainName}`;

    const testSanDomains = [
        `${uuid()}.${domainName}`,
        `${uuid()}.${domainName}`,
        `${uuid()}.${domainName}`,
    ];

    /**
     * Pebble CTS required
     */

    before(function () {
        if (!cts.isEnabled()) {
            this.skip();
        }
    });

    /**
     * Key types
     */

    Object.entries({
        rsa: {
            createKeyFn: () => acme.crypto.createPrivateRsaKey(),
            createKeyAltFns: {
                s1024: () => acme.crypto.createPrivateRsaKey(1024),
                s4096: () => acme.crypto.createPrivateRsaKey(4096),
            },
        },
        ecdsa: {
            createKeyFn: () => acme.crypto.createPrivateEcdsaKey(),
            createKeyAltFns: {
                p384: () => acme.crypto.createPrivateEcdsaKey('P-384'),
                p521: () => acme.crypto.createPrivateEcdsaKey('P-521'),
            },
        },
    }).forEach(([name, { createKeyFn, createKeyAltFns }]) => {
        describe(name, () => {
            let testIssuers;
            let testClient;
            let testCertificate;
            let testSanCertificate;
            let testWildcardCertificate;

            /**
             * Fixtures
             */

            it('should resolve certificate issuers [ACME_CAP_ALTERNATE_CERT_ROOTS]', async function () {
                if (!capAlternateCertRoots) {
                    this.skip();
                }

                testIssuers = await getCertIssuers();

                assert.isArray(testIssuers);
                assert.isTrue(testIssuers.length > 1);

                testIssuers.forEach((i) => {
                    assert.isString(i);
                    assert.strictEqual(1, testIssuers.filter((c) => (c === i)).length);
                });
            });

            /**
             * Initialize client
             */

            it('should initialize client', async () => {
                testClient = new acme.Client({
                    ...clientOpts,
                    accountKey: await createKeyFn(),
                });
            });

            /**
             * Invalid challenge response
             */

            it('should throw on invalid challenge response', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: `${uuid()}.${domainName}`,
                }, await createKeyFn());

                await assert.isRejected(testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.challengeNoopFn,
                    challengeRemoveFn: cts.challengeNoopFn,
                }), /^authorization not found/i);
            });

            it('should throw on invalid challenge response with opts.skipChallengeVerification=true', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: `${uuid()}.${domainName}`,
                }, await createKeyFn());

                await assert.isRejected(testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    skipChallengeVerification: true,
                    challengeCreateFn: cts.challengeNoopFn,
                    challengeRemoveFn: cts.challengeNoopFn,
                }));
            });

            /**
             * Challenge function exceptions
             */

            it('should throw on challengeCreate exception', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: `${uuid()}.${domainName}`,
                }, await createKeyFn());

                await assert.isRejected(testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.challengeThrowFn,
                    challengeRemoveFn: cts.challengeNoopFn,
                }), /^oops$/);
            });

            it('should not throw on challengeRemove exception', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: `${uuid()}.${domainName}`,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.challengeCreateFn,
                    challengeRemoveFn: cts.challengeThrowFn,
                });

                assert.isString(cert);
            });

            it('should settle all challenges before rejecting', async () => {
                const results = [];
                const [, csr] = await acme.crypto.createCsr({
                    commonName: `${uuid()}.${domainName}`,
                    altNames: [
                        `${uuid()}.${domainName}`,
                        `${uuid()}.${domainName}`,
                        `${uuid()}.${domainName}`,
                        `${uuid()}.${domainName}`,
                    ],
                }, await createKeyFn());

                await assert.isRejected(testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: async (...args) => {
                        if ([0, 1, 2].includes(results.length)) {
                            results.push(false);
                            throw new Error('oops');
                        }

                        await new Promise((resolve) => { setTimeout(resolve, 500); });
                        results.push(true);
                        return cts.challengeCreateFn(...args);
                    },
                    challengeRemoveFn: cts.challengeRemoveFn,
                }));

                assert.strictEqual(results.length, 5);
                assert.deepStrictEqual(results, [false, false, false, true, true]);
            });

            /**
             * Order certificates
             */

            it('should order certificate', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: testDomain,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.challengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                });

                assert.isString(cert);
                testCertificate = cert;
            });

            it('should order certificate using http-01', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: testHttpDomain,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.assertHttpChallengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                    challengePriority: ['http-01'],
                });

                assert.isString(cert);
            });

            it('should order certificate using https-01', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: testHttpsDomain,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.assertHttpsChallengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                    challengePriority: ['http-01'],
                });

                assert.isString(cert);
            });

            it('should order certificate using dns-01', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: testDnsDomain,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.assertDnsChallengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                    challengePriority: ['dns-01'],
                });

                assert.isString(cert);
            });

            it('should order certificate using tls-alpn-01', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: testAlpnDomain,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.assertTlsAlpnChallengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                    challengePriority: ['tls-alpn-01'],
                });

                assert.isString(cert);
            });

            it('should order san certificate', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    altNames: testSanDomains,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.challengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                });

                assert.isString(cert);
                testSanCertificate = cert;
            });

            it('should order wildcard certificate', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    altNames: [testWildcardDomain, `*.${testWildcardDomain}`],
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    challengeCreateFn: cts.challengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                });

                assert.isString(cert);
                testWildcardCertificate = cert;
            });

            it('should order certificate with opts.skipChallengeVerification=true', async () => {
                const [, csr] = await acme.crypto.createCsr({
                    commonName: `${uuid()}.${domainName}`,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    skipChallengeVerification: true,
                    challengeCreateFn: cts.challengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                });

                assert.isString(cert);
            });

            it('should order alternate certificate chain [ACME_CAP_ALTERNATE_CERT_ROOTS]', async function () {
                if (!capAlternateCertRoots) {
                    this.skip();
                }

                await Promise.all(testIssuers.map(async (issuer) => {
                    const [, csr] = await acme.crypto.createCsr({
                        commonName: `${uuid()}.${domainName}`,
                    }, await createKeyFn());

                    const cert = await testClient.auto({
                        csr,
                        termsOfServiceAgreed: true,
                        preferredChain: issuer,
                        challengeCreateFn: cts.challengeCreateFn,
                        challengeRemoveFn: cts.challengeRemoveFn,
                    });

                    const rootCert = acme.crypto.splitPemChain(cert).pop();
                    const info = acme.crypto.readCertificateInfo(rootCert);

                    assert.strictEqual(issuer, info.issuer.commonName);
                }));
            });

            it('should get default chain with invalid preference [ACME_CAP_ALTERNATE_CERT_ROOTS]', async function () {
                if (!capAlternateCertRoots) {
                    this.skip();
                }

                const [, csr] = await acme.crypto.createCsr({
                    commonName: `${uuid()}.${domainName}`,
                }, await createKeyFn());

                const cert = await testClient.auto({
                    csr,
                    termsOfServiceAgreed: true,
                    preferredChain: uuid(),
                    challengeCreateFn: cts.challengeCreateFn,
                    challengeRemoveFn: cts.challengeRemoveFn,
                });

                const rootCert = acme.crypto.splitPemChain(cert).pop();
                const info = acme.crypto.readCertificateInfo(rootCert);

                assert.strictEqual(testIssuers[0], info.issuer.commonName);
            });

            /**
             * Order certificate with alternate key sizes
             */

            Object.entries(createKeyAltFns).forEach(([k, altKeyFn]) => {
                it(`should order certificate with key=${k}`, async () => {
                    const [, csr] = await acme.crypto.createCsr({
                        commonName: testDomain,
                    }, await altKeyFn());

                    const cert = await testClient.auto({
                        csr,
                        termsOfServiceAgreed: true,
                        challengeCreateFn: cts.challengeCreateFn,
                        challengeRemoveFn: cts.challengeRemoveFn,
                    });

                    assert.isString(cert);
                });
            });

            /**
             * Read certificates
             */

            it('should read certificate info', () => {
                const info = acme.crypto.readCertificateInfo(testCertificate);

                spec.crypto.certificateInfo(info);
                assert.isNull(info.domains.commonName);
                assert.deepStrictEqual(info.domains.altNames, [testDomain]);
            });

            it('should read san certificate info', () => {
                const info = acme.crypto.readCertificateInfo(testSanCertificate);

                spec.crypto.certificateInfo(info);
                assert.isNull(info.domains.commonName);
                assert.deepStrictEqual(info.domains.altNames, testSanDomains);
            });

            it('should read wildcard certificate info', () => {
                const info = acme.crypto.readCertificateInfo(testWildcardCertificate);

                spec.crypto.certificateInfo(info);
                assert.isNull(info.domains.commonName);
                assert.deepStrictEqual(info.domains.altNames, [testWildcardDomain, `*.${testWildcardDomain}`]);
            });
        });
    });
});
