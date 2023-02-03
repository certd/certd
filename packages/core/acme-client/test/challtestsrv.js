/**
 * Pebble Challenge Test Server integration
 */

const { assert } = require('chai');
const axios = require('./../src/axios');

const apiBaseUrl = process.env.ACME_CHALLTESTSRV_URL || null;


/**
 * Send request
 */

async function request(apiPath, data = {}) {
    if (!apiBaseUrl) {
        throw new Error('No Pebble Challenge Test Server URL found');
    }

    await axios.request({
        url: `${apiBaseUrl}/${apiPath}`,
        method: 'post',
        data
    });

    return true;
}


/**
 * State
 */

exports.isEnabled = () => !!apiBaseUrl;


/**
 * DNS
 */

exports.addDnsARecord = async (host, addresses) => request('add-a', { host, addresses });
exports.setDnsCnameRecord = async (host, target) => request('set-cname', { host, target });


/**
 * Challenge response
 */

async function addHttp01ChallengeResponse(token, content) {
    return request('add-http01', { token, content });
}

async function addDns01ChallengeResponse(host, value) {
    return request('set-txt', { host, value });
}

exports.addHttp01ChallengeResponse = addHttp01ChallengeResponse;
exports.addDns01ChallengeResponse = addDns01ChallengeResponse;


/**
 * Challenge response mock functions
 */

async function assertHttpChallengeCreateFn(authz, challenge, keyAuthorization) {
    assert.strictEqual(challenge.type, 'http-01');
    return addHttp01ChallengeResponse(challenge.token, keyAuthorization);
}

async function assertDnsChallengeCreateFn(authz, challenge, keyAuthorization) {
    assert.strictEqual(challenge.type, 'dns-01');
    return addDns01ChallengeResponse(`_acme-challenge.${authz.identifier.value}.`, keyAuthorization);
}

async function challengeCreateFn(authz, challenge, keyAuthorization) {
    if (challenge.type === 'http-01') {
        return assertHttpChallengeCreateFn(authz, challenge, keyAuthorization);
    }

    if (challenge.type === 'dns-01') {
        return assertDnsChallengeCreateFn(authz, challenge, keyAuthorization);
    }

    throw new Error(`Unsupported challenge type ${challenge.type}`);
}

exports.challengeRemoveFn = async () => true;
exports.challengeNoopFn = async () => true;
exports.challengeThrowFn = async () => { throw new Error('oops'); };

exports.assertHttpChallengeCreateFn = assertHttpChallengeCreateFn;
exports.assertDnsChallengeCreateFn = assertDnsChallengeCreateFn;
exports.challengeCreateFn = challengeCreateFn;
