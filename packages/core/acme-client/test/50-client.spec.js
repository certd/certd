/**
 * ACME client tests
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
const capMetaTosField = !(('ACME_CAP_META_TOS_FIELD' in process.env) && (process.env.ACME_CAP_META_TOS_FIELD === '0'));
const capUpdateAccountKey = !(('ACME_CAP_UPDATE_ACCOUNT_KEY' in process.env) && (process.env.ACME_CAP_UPDATE_ACCOUNT_KEY === '0'));
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

describe('client', () => {
    const testDomain = `${uuid()}.${domainName}`;
    const testDomainAlpn = `${uuid()}.${domainName}`;
    const testDomainWildcard = `*.${testDomain}`;
    const testContact = `mailto:test-${uuid()}@nope.com`;

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
            jwkSpecFn: spec.jwk.rsa,
        },
        ecdsa: {
            createKeyFn: () => acme.crypto.createPrivateEcdsaKey(),
            createKeyAltFns: {
                p384: () => acme.crypto.createPrivateEcdsaKey('P-384'),
                p521: () => acme.crypto.createPrivateEcdsaKey('P-521'),
            },
            jwkSpecFn: spec.jwk.ecdsa,
        },
    }).forEach(([name, { createKeyFn, createKeyAltFns, jwkSpecFn }]) => {
        describe(name, () => {
            let testIssuers;
            let testAccountKey;
            let testAccountSecondaryKey;
            let testClient;
            let testAccount;
            let testAccountUrl;
            let testOrder;
            let testOrderAlpn;
            let testOrderWildcard;
            let testAuthz;
            let testAuthzAlpn;
            let testAuthzWildcard;
            let testChallenge;
            let testChallengeAlpn;
            let testChallengeWildcard;
            let testKeyAuthorization;
            let testKeyAuthorizationAlpn;
            let testKeyAuthorizationWildcard;
            let testCsr;
            let testCsrAlpn;
            let testCsrWildcard;
            let testCertificate;
            let testCertificateAlpn;
            let testCertificateWildcard;

            /**
             * Fixtures
             */

            it('should generate a private key', async () => {
                testAccountKey = await createKeyFn();
                assert.isTrue(Buffer.isBuffer(testAccountKey));
            });

            it('should create a second private key', async () => {
                testAccountSecondaryKey = await createKeyFn();
                assert.isTrue(Buffer.isBuffer(testAccountSecondaryKey));
            });

            it('should generate certificate signing request', async () => {
                [, testCsr] = await acme.crypto.createCsr({ commonName: testDomain }, await createKeyFn());
                [, testCsrAlpn] = await acme.crypto.createCsr({ altNames: [testDomainAlpn] }, await createKeyFn());
                [, testCsrWildcard] = await acme.crypto.createCsr({ altNames: [testDomainWildcard] }, await createKeyFn());
            });

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
             * Initialize clients
             */

            it('should initialize client', () => {
                testClient = new acme.Client({
                    ...clientOpts,
                    accountKey: testAccountKey,
                });
            });

            it('should produce a valid jwk', () => {
                const jwk = testClient.http.getJwk();
                jwkSpecFn(jwk);
            });

            /**
             * Terms of Service
             */

            it('should produce tos url [ACME_CAP_META_TOS_FIELD]', async function () {
                if (!capMetaTosField) {
                    this.skip();
                }

                const tos = await testClient.getTermsOfServiceUrl();
                assert.isString(tos);
            });

            it('should not produce tos url [!ACME_CAP_META_TOS_FIELD]', async function () {
                if (capMetaTosField) {
                    this.skip();
                }

                const tos = await testClient.getTermsOfServiceUrl();
                assert.isNull(tos);
            });

            /**
             * Create account
             */

            it('should refuse account creation without tos [ACME_CAP_META_TOS_FIELD]', async function () {
                if (!capMetaTosField) {
                    this.skip();
                }

                await assert.isRejected(testClient.createAccount());
            });

            it('should refuse account creation without eab [ACME_CAP_EAB_ENABLED]', async function () {
                if (!capEabEnabled) {
                    this.skip();
                }

                const client = new acme.Client({
                    ...clientOpts,
                    accountKey: testAccountKey,
                    externalAccountBinding: null,
                });

                await assert.isRejected(client.createAccount({
                    termsOfServiceAgreed: true,
                }));
            });

            it('should create an account', async () => {
                testAccount = await testClient.createAccount({
                    termsOfServiceAgreed: true,
                });

                spec.rfc8555.account(testAccount);
                assert.strictEqual(testAccount.status, 'valid');
            });

            it('should produce an account url', () => {
                testAccountUrl = testClient.getAccountUrl();
                assert.isString(testAccountUrl);
            });

            /**
             * Create account with alternate key sizes
             */

            Object.entries(createKeyAltFns).forEach(([k, altKeyFn]) => {
                it(`should create account with key=${k}`, async () => {
                    const client = new acme.Client({
                        ...clientOpts,
                        accountKey: await altKeyFn(),
                    });

                    const account = await client.createAccount({
                        termsOfServiceAgreed: true,
                    });

                    spec.rfc8555.account(account);
                    assert.strictEqual(account.status, 'valid');
                });
            });

            /**
             * Find existing account using secondary client
             */

            it('should throw when trying to find account using invalid account key', async () => {
                const client = new acme.Client({
                    ...clientOpts,
                    accountKey: testAccountSecondaryKey,
                });

                await assert.isRejected(client.createAccount({
                    onlyReturnExisting: true,
                }));
            });

            it('should find existing account using account key', async () => {
                const client = new acme.Client({
                    ...clientOpts,
                    accountKey: testAccountKey,
                });

                const account = await client.createAccount({
                    onlyReturnExisting: true,
                });

                spec.rfc8555.account(account);
                assert.strictEqual(account.status, 'valid');
                assert.deepStrictEqual(account.key, testAccount.key);
            });

            /**
             * Account URL
             */

            it('should refuse invalid account url', async () => {
                const client = new acme.Client({
                    ...clientOpts,
                    accountKey: testAccountKey,
                    accountUrl: 'https://acme-staging-v02.api.letsencrypt.org/acme/acct/1',
                });

                await assert.isRejected(client.updateAccount());
            });

            it('should find existing account using account url', async () => {
                const client = new acme.Client({
                    ...clientOpts,
                    accountKey: testAccountKey,
                    accountUrl: testAccountUrl,
                });

                const account = await client.createAccount({
                    onlyReturnExisting: true,
                });

                spec.rfc8555.account(account);
                assert.strictEqual(account.status, 'valid');
                assert.deepStrictEqual(account.key, testAccount.key);
            });

            /**
             * Update account contact info
             */

            it('should update account contact info', async () => {
                const data = { contact: [testContact] };
                const account = await testClient.updateAccount(data);

                spec.rfc8555.account(account);
                assert.strictEqual(account.status, 'valid');
                assert.deepStrictEqual(account.key, testAccount.key);
                assert.isArray(account.contact);
                assert.include(account.contact, testContact);
            });

            /**
             * Change account private key
             */

            it('should change account private key [ACME_CAP_UPDATE_ACCOUNT_KEY]', async function () {
                if (!capUpdateAccountKey) {
                    this.skip();
                }

                await testClient.updateAccountKey(testAccountSecondaryKey);

                const account = await testClient.createAccount({
                    onlyReturnExisting: true,
                });

                spec.rfc8555.account(account);
                assert.strictEqual(account.status, 'valid');
                assert.notDeepEqual(account.key, testAccount.key);
            });

            /**
             * Create new certificate order
             */

            it('should create new order', async () => {
                const data1 = { identifiers: [{ type: 'dns', value: testDomain }] };
                const data2 = { identifiers: [{ type: 'dns', value: testDomainAlpn }] };
                const data3 = { identifiers: [{ type: 'dns', value: testDomainWildcard }] };

                testOrder = await testClient.createOrder(data1);
                testOrderAlpn = await testClient.createOrder(data2);
                testOrderWildcard = await testClient.createOrder(data3);

                [testOrder, testOrderAlpn, testOrderWildcard].forEach((item) => {
                    spec.rfc8555.order(item);
                    assert.strictEqual(item.status, 'pending');
                });
            });

            /**
             * Get status of existing certificate order
             */

            it('should get existing order', async () => {
                await Promise.all([testOrder, testOrderAlpn, testOrderWildcard].map(async (existing) => {
                    const result = await testClient.getOrder(existing);

                    spec.rfc8555.order(result);
                    assert.deepStrictEqual(existing, result);
                }));
            });

            /**
             * Get identifier authorization
             */

            it('should get identifier authorization', async () => {
                const orderAuthzCollection = await testClient.getAuthorizations(testOrder);
                const alpnAuthzCollection = await testClient.getAuthorizations(testOrderAlpn);
                const wildcardAuthzCollection = await testClient.getAuthorizations(testOrderWildcard);

                [orderAuthzCollection, alpnAuthzCollection, wildcardAuthzCollection].forEach((collection) => {
                    assert.isArray(collection);
                    assert.isNotEmpty(collection);

                    collection.forEach((authz) => {
                        spec.rfc8555.authorization(authz);
                        assert.strictEqual(authz.status, 'pending');
                    });
                });

                testAuthz = orderAuthzCollection.pop();
                testAuthzAlpn = alpnAuthzCollection.pop();
                testAuthzWildcard = wildcardAuthzCollection.pop();

                testAuthz.challenges.concat(testAuthzAlpn.challenges).concat(testAuthzWildcard.challenges).forEach((item) => {
                    spec.rfc8555.challenge(item);
                    assert.strictEqual(item.status, 'pending');
                });
            });

            /**
             * Generate challenge key authorization
             */

            it('should get challenge key authorization', async () => {
                testChallenge = testAuthz.challenges.find((c) => (c.type === 'http-01'));
                testChallengeAlpn = testAuthzAlpn.challenges.find((c) => (c.type === 'tls-alpn-01'));
                testChallengeWildcard = testAuthzWildcard.challenges.find((c) => (c.type === 'dns-01'));

                testKeyAuthorization = await testClient.getChallengeKeyAuthorization(testChallenge);
                testKeyAuthorizationAlpn = await testClient.getChallengeKeyAuthorization(testChallengeAlpn);
                testKeyAuthorizationWildcard = await testClient.getChallengeKeyAuthorization(testChallengeWildcard);

                [testKeyAuthorization, testKeyAuthorizationAlpn, testKeyAuthorizationWildcard].forEach((k) => assert.isString(k));
            });

            /**
             * Deactivate identifier authorization
             */

            it('should deactivate identifier authorization', async () => {
                const order = await testClient.createOrder({
                    identifiers: [
                        { type: 'dns', value: `${uuid()}.${domainName}` },
                        { type: 'dns', value: `${uuid()}.${domainName}` },
                    ],
                });

                const authzCollection = await testClient.getAuthorizations(order);

                const results = await Promise.all(authzCollection.map(async (authz) => {
                    spec.rfc8555.authorization(authz);
                    assert.strictEqual(authz.status, 'pending');
                    return testClient.deactivateAuthorization(authz);
                }));

                results.forEach((authz) => {
                    spec.rfc8555.authorization(authz);
                    assert.strictEqual(authz.status, 'deactivated');
                });
            });

            /**
             * Verify satisfied challenge
             */

            it('should verify challenge', async () => {
                await cts.assertHttpChallengeCreateFn(testAuthz, testChallenge, testKeyAuthorization);
                await cts.assertTlsAlpnChallengeCreateFn(testAuthzAlpn, testChallengeAlpn, testKeyAuthorizationAlpn);
                await cts.assertDnsChallengeCreateFn(testAuthzWildcard, testChallengeWildcard, testKeyAuthorizationWildcard);

                await testClient.verifyChallenge(testAuthz, testChallenge);
                await testClient.verifyChallenge(testAuthzAlpn, testChallengeAlpn);
                await testClient.verifyChallenge(testAuthzWildcard, testChallengeWildcard);
            });

            /**
             * Complete challenge
             */

            it('should complete challenge', async () => {
                await Promise.all([testChallenge, testChallengeAlpn, testChallengeWildcard].map(async (challenge) => {
                    const result = await testClient.completeChallenge(challenge);

                    spec.rfc8555.challenge(result);
                    assert.strictEqual(challenge.url, result.url);
                }));
            });

            /**
             * Wait for valid challenge
             */

            it('should wait for valid challenge status', async () => {
                await Promise.all([testChallenge, testChallengeAlpn, testChallengeWildcard].map(async (c) => testClient.waitForValidStatus(c)));
            });

            /**
             * Finalize order
             */

            it('should finalize order', async () => {
                const finalize = await testClient.finalizeOrder(testOrder, testCsr);
                const finalizeAlpn = await testClient.finalizeOrder(testOrderAlpn, testCsrAlpn);
                const finalizeWildcard = await testClient.finalizeOrder(testOrderWildcard, testCsrWildcard);

                [finalize, finalizeAlpn, finalizeWildcard].forEach((f) => spec.rfc8555.order(f));

                assert.strictEqual(testOrder.url, finalize.url);
                assert.strictEqual(testOrderAlpn.url, finalizeAlpn.url);
                assert.strictEqual(testOrderWildcard.url, finalizeWildcard.url);
            });

            /**
             * Wait for valid order
             */

            it('should wait for valid order status', async () => {
                await Promise.all([testOrder, testOrderAlpn, testOrderWildcard].map(async (o) => testClient.waitForValidStatus(o)));
            });

            /**
             * Get certificate
             */

            it('should get certificate', async () => {
                testCertificate = await testClient.getCertificate(testOrder);
                testCertificateAlpn = await testClient.getCertificate(testOrderAlpn);
                testCertificateWildcard = await testClient.getCertificate(testOrderWildcard);

                [testCertificate, testCertificateAlpn, testCertificateWildcard].forEach((cert) => {
                    assert.isString(cert);
                    acme.crypto.readCertificateInfo(cert);
                });
            });

            it('should get alternate certificate chain [ACME_CAP_ALTERNATE_CERT_ROOTS]', async function () {
                if (!capAlternateCertRoots) {
                    this.skip();
                }

                await Promise.all(testIssuers.map(async (issuer) => {
                    const cert = await testClient.getCertificate(testOrder, issuer);
                    const rootCert = acme.crypto.splitPemChain(cert).pop();
                    const info = acme.crypto.readCertificateInfo(rootCert);

                    assert.strictEqual(issuer, info.issuer.commonName);
                }));
            });

            it('should get default chain with invalid preference [ACME_CAP_ALTERNATE_CERT_ROOTS]', async function () {
                if (!capAlternateCertRoots) {
                    this.skip();
                }

                const cert = await testClient.getCertificate(testOrder, uuid());
                const rootCert = acme.crypto.splitPemChain(cert).pop();
                const info = acme.crypto.readCertificateInfo(rootCert);

                assert.strictEqual(testIssuers[0], info.issuer.commonName);
            });

            /**
             * Revoke certificate
             */

            it('should revoke certificate', async () => {
                await testClient.revokeCertificate(testCertificate);
                await testClient.revokeCertificate(testCertificateAlpn, { reason: 0 });
                await testClient.revokeCertificate(testCertificateWildcard, { reason: 4 });
            });

            it('should not allow getting revoked certificate', async () => {
                await assert.isRejected(testClient.getCertificate(testOrder));
                await assert.isRejected(testClient.getCertificate(testOrderAlpn));
                await assert.isRejected(testClient.getCertificate(testOrderWildcard));
            });

            /**
             * Deactivate account
             */

            it('should deactivate account', async () => {
                const data = { status: 'deactivated' };
                const account = await testClient.updateAccount(data);

                spec.rfc8555.account(account);
                assert.strictEqual(account.status, 'deactivated');
            });

            /**
             * Verify that no new orders can be made
             */

            it('should not allow new orders from deactivated account', async () => {
                const data = { identifiers: [{ type: 'dns', value: 'nope.com' }] };
                await assert.isRejected(testClient.createOrder(data));
            });
        });
    });
});
