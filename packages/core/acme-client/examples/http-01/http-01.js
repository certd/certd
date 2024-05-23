/**
 * Example using http-01 challenge to generate certificates on-demand
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const tls = require('tls');
const acme = require('./../../');

const HTTP_SERVER_PORT = 80;
const HTTPS_SERVER_PORT = 443;
const VALID_DOMAINS = ['example.com', 'example.org'];
const FALLBACK_KEY = fs.readFileSync(path.join(__dirname, '..', 'fallback.key'));
const FALLBACK_CERT = fs.readFileSync(path.join(__dirname, '..', 'fallback.crt'));

const pendingDomains = {};
const challengeResponses = {};
const certificateStore = {};

function log(m) {
    process.stdout.write(`${(new Date()).toISOString()} ${m}\n`);
}

/**
 * On-demand certificate generation using http-01
 */

async function getCertOnDemand(client, servername, attempt = 0) {
    /* Invalid domain */
    if (!VALID_DOMAINS.includes(servername)) {
        throw new Error(`Invalid domain: ${servername}`);
    }

    /* Certificate exists */
    if (servername in certificateStore) {
        return certificateStore[servername];
    }

    /* Waiting on certificate order to go through */
    if (servername in pendingDomains) {
        if (attempt >= 10) {
            throw new Error(`Gave up waiting on certificate for ${servername}`);
        }

        await new Promise((resolve) => { setTimeout(resolve, 1000); });
        return getCertOnDemand(client, servername, (attempt + 1));
    }

    /* Create CSR */
    log(`Creating CSR for ${servername}`);
    const [key, csr] = await acme.crypto.createCsr({
        altNames: [servername],
    });

    /* Order certificate */
    log(`Ordering certificate for ${servername}`);
    const cert = await client.auto({
        csr,
        email: 'test@example.com',
        termsOfServiceAgreed: true,
        challengePriority: ['http-01'],
        challengeCreateFn: (authz, challenge, keyAuthorization) => {
            challengeResponses[challenge.token] = keyAuthorization;
        },
        challengeRemoveFn: (authz, challenge) => {
            delete challengeResponses[challenge.token];
        },
    });

    /* Done, store certificate */
    log(`Certificate for ${servername} created successfully`);
    certificateStore[servername] = [key, cert];
    delete pendingDomains[servername];
    return certificateStore[servername];
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
         * HTTP server
         */

        const httpServer = http.createServer((req, res) => {
            if (req.url.match(/\/\.well-known\/acme-challenge\/.+/)) {
                const token = req.url.split('/').pop();
                log(`Received challenge request for token=${token}`);

                /* ACME challenge response */
                if (token in challengeResponses) {
                    log(`Serving challenge response HTTP 200 token=${token}`);
                    res.writeHead(200);
                    res.end(challengeResponses[token]);
                    return;
                }

                /* Challenge response not found */
                log(`Oops, challenge response not found for token=${token}`);
                res.writeHead(404);
                res.end();
                return;
            }

            /* HTTP 302 redirect */
            log(`HTTP 302 ${req.headers.host}${req.url}`);
            res.writeHead(302, { Location: `https://${req.headers.host}${req.url}` });
            res.end();
        });

        httpServer.listen(HTTP_SERVER_PORT, () => {
            log(`HTTP server listening on port ${HTTP_SERVER_PORT}`);
        });

        /**
         * HTTPS server
         */

        const requestListener = (req, res) => {
            log(`HTTP 200 ${req.headers.host}${req.url}`);
            res.writeHead(200);
            res.end('Hello world\n');
        };

        const httpsServer = https.createServer({
            /* Fallback certificate */
            key: FALLBACK_KEY,
            cert: FALLBACK_CERT,

            /* Serve certificate based on servername */
            SNICallback: async (servername, cb) => {
                try {
                    log(`Handling SNI request for ${servername}`);
                    const [key, cert] = await getCertOnDemand(client, servername);

                    log(`Found certificate for ${servername}, serving secure context`);
                    cb(null, tls.createSecureContext({ key, cert }));
                }
                catch (e) {
                    log(`[ERROR] ${e.message}`);
                    cb(e.message);
                }
            },
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
