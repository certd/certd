/**
 * Example of acme.Client.auto()
 */

// const fs = require('fs').promises;
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
    log('Triggered challengeCreateFn()');

    /* http-01 */
    if (challenge.type === 'http-01') {
        const filePath = `/var/www/html/.well-known/acme-challenge/${challenge.token}`;
        const fileContents = keyAuthorization;

        log(`Creating challenge response for ${authz.identifier.value} at path: ${filePath}`);

        /* Replace this */
        log(`Would write "${fileContents}" to path "${filePath}"`);
        // await fs.writeFile(filePath, fileContents);
    }

    /* dns-01 */
    else if (challenge.type === 'dns-01') {
        const dnsRecord = `_acme-challenge.${authz.identifier.value}`;
        const recordValue = keyAuthorization;

        log(`Creating TXT record for ${authz.identifier.value}: ${dnsRecord}`);

        /* Replace this */
        log(`Would create TXT record "${dnsRecord}" with value "${recordValue}"`);
        // await dnsProvider.createRecord(dnsRecord, 'TXT', recordValue);
    }
}

/**
 * Function used to remove an ACME challenge response
 *
 * @param {object} authz Authorization object
 * @param {object} challenge Selected challenge
 * @param {string} keyAuthorization Authorization key
 * @returns {Promise}
 */

async function challengeRemoveFn(authz, challenge, keyAuthorization) {
    log('Triggered challengeRemoveFn()');

    /* http-01 */
    if (challenge.type === 'http-01') {
        const filePath = `/var/www/html/.well-known/acme-challenge/${challenge.token}`;

        log(`Removing challenge response for ${authz.identifier.value} at path: ${filePath}`);

        /* Replace this */
        log(`Would remove file on path "${filePath}"`);
        // await fs.unlink(filePath);
    }

    /* dns-01 */
    else if (challenge.type === 'dns-01') {
        const dnsRecord = `_acme-challenge.${authz.identifier.value}`;
        const recordValue = keyAuthorization;

        log(`Removing TXT record for ${authz.identifier.value}: ${dnsRecord}`);

        /* Replace this */
        log(`Would remove TXT record "${dnsRecord}" with value "${recordValue}"`);
        // await dnsProvider.removeRecord(dnsRecord, 'TXT', recordValue);
    }
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

    /* Create CSR */
    const [key, csr] = await acme.crypto.createCsr({
        altNames: ['example.com'],
    });

    /* Certificate */
    const cert = await client.auto({
        csr,
        email: 'test@example.com',
        termsOfServiceAgreed: true,
        challengeCreateFn,
        challengeRemoveFn,
    });

    /* Done */
    log(`CSR:\n${csr.toString()}`);
    log(`Private key:\n${key.toString()}`);
    log(`Certificate:\n${cert.toString()}`);
};
