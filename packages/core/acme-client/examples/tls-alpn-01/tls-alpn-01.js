/**
 * Example using tls-alpn-01 challenge to generate certificates on-demand
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const tls = require('tls');
const acme = require('./../../');

const HTTPS_SERVER_PORT = 4443;
const ALPN_RESPONDER_PORT = 4444;
const VALID_DOMAINS = ['example.com', 'example.org'];
const FALLBACK_KEY = fs.readFileSync(path.join(__dirname, '..', 'fallback.key'));
const FALLBACK_CERT = fs.readFileSync(path.join(__dirname, '..', 'fallback.crt'));

const pendingDomains = {};
const alpnResponses = {};
const certificateStore = {};

function log(m) {
    process.stdout.write(`${(new Date()).toISOString()} ${m}\n`);
}

/**
 * On-demand certificate generation using tls-alpn-01
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
        challengePriority: ['tls-alpn-01'],
        challengeCreateFn: async (authz, challenge, keyAuthorization) => {
            alpnResponses[authz.identifier.value] = await acme.crypto.createAlpnCertificate(authz, keyAuthorization);
        },
        challengeRemoveFn: (authz) => {
            delete alpnResponses[authz.identifier.value];
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
         * ALPN responder
         */

        const alpnResponder = https.createServer({
            /* Fallback cert */
            key: FALLBACK_KEY,
            cert: FALLBACK_CERT,

            /* Allow acme-tls/1 ALPN protocol */
            ALPNProtocols: ['acme-tls/1'],

            /* Serve ALPN certificate based on servername */
            SNICallback: async (servername, cb) => {
                try {
                    log(`Handling ALPN SNI request for ${servername}`);
                    if (!Object.keys(alpnResponses).includes(servername)) {
                        throw new Error(`No ALPN certificate found for ${servername}`);
                    }

                    /* Serve ALPN challenge response */
                    log(`Found ALPN certificate for ${servername}, serving secure context`);
                    cb(null, tls.createSecureContext({
                        key: alpnResponses[servername][0],
                        cert: alpnResponses[servername][1],
                    }));
                }
                catch (e) {
                    log(`[ERROR] ${e.message}`);
                    cb(e.message);
                }
            },
        });

        /* Terminate once TLS handshake has been established */
        alpnResponder.on('secureConnection', (socket) => {
            socket.end();
        });

        alpnResponder.listen(ALPN_RESPONDER_PORT, () => {
            log(`ALPN responder listening on port ${ALPN_RESPONDER_PORT}`);
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
            /* Fallback cert */
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
