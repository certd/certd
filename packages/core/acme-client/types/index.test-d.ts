/**
 * acme-client type definition tests
 */

import * as acme from 'acme-client';

(async () => {
    /* Client */
    const accountKey = await acme.crypto.createPrivateKey();

    const client = new acme.Client({
        accountKey,
        directoryUrl: acme.directory.letsencrypt.staging
    });

    /* Account */
    await client.createAccount({
        termsOfServiceAgreed: true,
        contact: ['mailto:test@example.com']
    });

    /* Order */
    const order = await client.createOrder({
        identifiers: [
            { type: 'dns', value: 'example.com' },
            { type: 'dns', value: '*.example.com' },
        ]
    });

    await client.getOrder(order);

    /* Authorizations / Challenges */
    const authorizations = await client.getAuthorizations(order);
    const authorization = authorizations[0];
    const challenge = authorization.challenges[0];

    await client.getChallengeKeyAuthorization(challenge);
    await client.verifyChallenge(authorization, challenge);
    await client.completeChallenge(challenge);
    await client.waitForValidStatus(challenge);

    /* Finalize */
    const [certKey, certCsr] = await acme.crypto.createCsr({
        commonName: 'example.com',
        altNames: ['example.com', '*.example.com']
    });

    await client.finalizeOrder(order, certCsr);
    await client.getCertificate(order);
    await client.getCertificate(order, 'DST Root CA X3');

    /* Auto */
    await client.auto({
        csr: certCsr,
        challengeCreateFn: async (authz, challenge, keyAuthorization) => {},
        challengeRemoveFn: async (authz, challenge, keyAuthorization) => {}
    });

    await client.auto({
        csr: certCsr,
        email: 'test@example.com',
        termsOfServiceAgreed: false,
        skipChallengeVerification: false,
        challengePriority: ['http-01', 'dns-01'],
        preferredChain: 'DST Root CA X3',
        challengeCreateFn: async (authz, challenge, keyAuthorization) => {},
        challengeRemoveFn: async (authz, challenge, keyAuthorization) => {}
    });
})();
