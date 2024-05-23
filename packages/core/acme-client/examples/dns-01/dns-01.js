/**
 * Example using dns-01 challenge to generate certificates
 *
 * NOTE: This example is incomplete as the DNS challenge response implementation
 * will be specific to your DNS providers API.
 *
 * NOTE: This example does not order certificates on-demand, as solving dns-01
 * will likely be too slow for it to make sense. Instead, it orders a wildcard
 * certificate on init before starting the HTTPS server as a demonstration.
 */

const https = require('https');
const acme = require('./../../');

const HTTPS_SERVER_PORT = 443;
const WILDCARD_DOMAIN = 'example.com';

function log(m) {
    process.stdout.write(`${(new Date()).toISOString()} ${m}\n`);
}

/**
 * Main
 */

(async () => {
    try {
        /**
         * Initialize ACME client
         */

        log('Initializing ACME client');
        const client = new acme.Client({
            directoryUrl: acme.directory.letsencrypt.staging,
            accountKey: await acme.crypto.createPrivateKey(),
        });

        /**
         * Order wildcard certificate
         */

        log(`Creating CSR for ${WILDCARD_DOMAIN}`);
        const [key, csr] = await acme.crypto.createCsr({
            altNames: [WILDCARD_DOMAIN, `*.${WILDCARD_DOMAIN}`],
        });

        log(`Ordering certificate for ${WILDCARD_DOMAIN}`);
        const cert = await client.auto({
            csr,
            email: 'test@example.com',
            termsOfServiceAgreed: true,
            challengePriority: ['dns-01'],
            challengeCreateFn: (authz, challenge, keyAuthorization) => {
                /* TODO: Implement this */
                log(`[TODO] Add TXT record key=_acme-challenge.${authz.identifier.value} value=${keyAuthorization}`);
            },
            challengeRemoveFn: (authz, challenge, keyAuthorization) => {
                /* TODO: Implement this */
                log(`[TODO] Remove TXT record key=_acme-challenge.${authz.identifier.value} value=${keyAuthorization}`);
            },
        });

        log(`Certificate for ${WILDCARD_DOMAIN} created successfully`);

        /**
         * HTTPS server
         */

        const requestListener = (req, res) => {
            log(`HTTP 200 ${req.headers.host}${req.url}`);
            res.writeHead(200);
            res.end('Hello world\n');
        };

        const httpsServer = https.createServer({
            key,
            cert,
        }, requestListener);

        httpsServer.listen(HTTPS_SERVER_PORT, () => {
            log(`HTTPS server listening on port ${HTTPS_SERVER_PORT}`);
        });
    }
    catch (e) {
        log(`[FATAL] ${e.message}`);
        process.exit(1);
    }
})();
