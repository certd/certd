/**
 * Example of acme.Client API
 */

const acme = require('./../');

function log(m) {
    process.stdout.write(`${m}\n`);
}

/**
 * Function used to satisfy an ACME challenge
 *
 * @param {object} authz Authorization object
 * @param {object} challenge Selected challenge
 * @param {string} keyAuthorization Authorization key
 * @returns {Promise}
 */

async function challengeCreateFn(authz, challenge, keyAuthorization) {
    /* Do something here */
    log(JSON.stringify(authz));
    log(JSON.stringify(challenge));
    log(keyAuthorization);
}

/**
 * Function used to remove an ACME challenge response
 *
 * @param {object} authz Authorization object
 * @param {object} challenge Selected challenge
 * @returns {Promise}
 */

async function challengeRemoveFn(authz, challenge, keyAuthorization) {
    /* Do something here */
    log(JSON.stringify(authz));
    log(JSON.stringify(challenge));
    log(keyAuthorization);
}

/**
 * Main
 */

module.exports = async () => {
    /* Init client */
    const client = new acme.Client({
        directoryUrl: acme.directory.letsencrypt.staging,
        accountKey: await acme.crypto.createPrivateKey(),
    });

    /* Register account */
    await client.createAccount({
        termsOfServiceAgreed: true,
        contact: ['mailto:test@example.com'],
    });

    /* Place new order */
    const order = await client.createOrder({
        identifiers: [
            { type: 'dns', value: 'example.com' },
            { type: 'dns', value: '*.example.com' },
        ],
    });

    /**
     * authorizations / client.getAuthorizations(order);
     * An array with one item per DNS name in the certificate order.
     * All items require at least one satisfied challenge before order can be completed.
     */

    const authorizations = await client.getAuthorizations(order);

    const promises = authorizations.map(async (authz) => {
        let challengeCompleted = false;

        try {
            /**
             * challenges / authz.challenges
             * An array of all available challenge types for a single DNS name.
             * One of these challenges needs to be satisfied.
             */

            const { challenges } = authz;

            /* Just select any challenge */
            const challenge = challenges.pop();
            const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

            try {
                /* Satisfy challenge */
                await challengeCreateFn(authz, challenge, keyAuthorization);

                /* Verify that challenge is satisfied */
                await client.verifyChallenge(authz, challenge);

                /* Notify ACME provider that challenge is satisfied */
                await client.completeChallenge(challenge);
                challengeCompleted = true;

                /* Wait for ACME provider to respond with valid status */
                await client.waitForValidStatus(challenge);
            }
            finally {
                /* Clean up challenge response */
                try {
                    await challengeRemoveFn(authz, challenge, keyAuthorization);
                }
                catch (e) {
                    /**
                     * Catch errors thrown by challengeRemoveFn() so the order can
                     * be finalized, even though something went wrong during cleanup
                     */
                }
            }
        }
        catch (e) {
            /* Deactivate pending authz when unable to complete challenge */
            if (!challengeCompleted) {
                try {
                    await client.deactivateAuthorization(authz);
                }
                catch (f) {
                    /* Catch and suppress deactivateAuthorization() errors */
                }
            }

            throw e;
        }
    });

    /* Wait for challenges to complete */
    await Promise.all(promises);

    /* Finalize order */
    const [key, csr] = await acme.crypto.createCsr({
        altNames: ['example.com', '*.example.com'],
    });

    const finalized = await client.finalizeOrder(order, csr);
    const cert = await client.getCertificate(finalized);

    /* Done */
    log(`CSR:\n${csr.toString()}`);
    log(`Private key:\n${key.toString()}`);
    log(`Certificate:\n${cert.toString()}`);
};
