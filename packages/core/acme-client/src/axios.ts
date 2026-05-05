// @ts-nocheck
/**
 * Axios instance
 */
import axios from 'axios';
import { parseRetryAfterHeader } from './util.js';
const { AxiosError } = axios;
import {getGlobalAgents, HttpError} from '@certd/basic'
import { log } from './logger.js';
/**
 * Defaults
 */

const instance = axios.create();

/* Default User-Agent */
instance.defaults.headers.common['User-Agent'] = `@certd/acme-client`;

/* Default ACME settings */
instance.defaults.acmeSettings = {
    httpChallengePort: 80,
    httpsChallengePort: 443,
    tlsAlpnChallengePort: 443,

    retryMaxAttempts: 3,
    retryDefaultDelay: 3,
};
// instance.defaults.proxy = {
//     host: '192.168.34.139',
//     port: 10811
// };
/**
 * Explicitly set Node as default HTTP adapter
 *
 * https://github.com/axios/axios/issues/1180
 * https://stackoverflow.com/questions/42677387
 */

instance.defaults.adapter = 'http';

/**
 * Retry requests on server errors or when rate limited
 *
 * https://datatracker.ietf.org/doc/html/rfc8555#section-6.6
 */

function isRetryableError(error) {
    return (error.code !== 'ECONNABORTED')
        && (error.code !== 'ERR_NOCK_NO_MATCH')
        && (!error.response
            || (error.response.status === 429)
            || ((error.response.status >= 500) && (error.response.status <= 599)));
}

/* https://github.com/axios/axios/blob/main/lib/core/settle.js */
function validateStatus(response) {
    if (!response) {
        return new Error('Response is undefined');
    }
    let validator = null;
    if (response.config) {
        validator = response.config.retryValidateStatus;
    }
    if (!response.status || !validator || validator(response.status)) {
        return response;
    }

    const err = new AxiosError(
        `Request failed with status code ${response.status}`,
        (Math.floor(response.status / 100) === 4) ? AxiosError.ERR_BAD_REQUEST : AxiosError.ERR_BAD_RESPONSE,
        response.config,
        response.request,
        response,
    );

    throw new HttpError(err);
}

/* Pass all responses through the error interceptor */
instance.interceptors.request.use((config) => {
    if (!('retryValidateStatus' in config)) {
        config.retryValidateStatus = config.validateStatus;
    }
    config.validateStatus = () => false;

    const agents = getGlobalAgents();
    // if (config.skipSslVerify) {
    //     logger.info('跳过SSL验证');
    //     agents = createAgent({ rejectUnauthorized: false } as any);
    // }
    // delete config.skipSslVerify;
    config.httpsAgent = agents.httpsAgent;
    config.httpAgent = agents.httpAgent;
    config.proxy = false; // 必须 否则还会走一层代理，
    return config;
});

/* Handle request retries if applicable */
instance.interceptors.response.use(null, async (error) => {
    const { config, response } = error;

    if (!config) {
        return Promise.reject(new HttpError(error));
    }

    /* Pick up errors we want to retry */
    if (isRetryableError(error)) {
        const { retryMaxAttempts, retryDefaultDelay } = instance.defaults.acmeSettings;
        config.retryAttempt = ('retryAttempt' in config) ? (config.retryAttempt + 1) : 1;

        if (config.retryAttempt <= retryMaxAttempts) {
            const code = response ? `HTTP ${response.status}` : error.code;
            log(`Caught ${code}, retry attempt ${config.retryAttempt}/${retryMaxAttempts} to URL ${config.url}`);

            const retryAfter = (retryDefaultDelay * config.retryAttempt);
            /* Attempt to parse Retry-After header, fallback to default delay */
            const headerRetryAfter = response ? parseRetryAfterHeader(response.headers['retry-after']) : 0;

            if (headerRetryAfter > 0) {
                const waitMinutes = (headerRetryAfter / 60).toFixed(1);
                log(`Found retry-after response header with value: ${response.headers['retry-after']}, waiting ${waitMinutes} minutes`);
                log(JSON.stringify(response.data));
                return Promise.reject(new HttpError(error));
            }

            log(`waiting ${retryAfter} seconds`);

            /* Wait and retry the request */
            await new Promise((resolve) => { setTimeout(resolve, (retryAfter * 1000)); });
            log(`Retrying request to URL ${config.url}`);
            return instance(config);
        }
    }

    if (!response) {
        return Promise.reject(new HttpError(error));
    }
    /* Validate and return response */
    return validateStatus(response);
});

/**
 * Export instance
 */

export default instance;
