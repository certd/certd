/**
 * Assertions
 */

const { assert } = require('chai');

const spec = {};
module.exports = spec;

/**
 * ACME
 */

spec.rfc8555 = {};

spec.rfc8555.account = (obj) => {
    assert.isObject(obj);

    assert.isString(obj.status);
    assert.include(['valid', 'deactivated', 'revoked'], obj.status);

    assert.isString(obj.orders);

    if ('contact' in obj) {
        assert.isArray(obj.contact);
        obj.contact.forEach((c) => assert.isString(c));
    }

    if ('termsOfServiceAgreed' in obj) {
        assert.isBoolean(obj.termsOfServiceAgreed);
    }

    if ('externalAccountBinding' in obj) {
        assert.isObject(obj.externalAccountBinding);
    }
};

spec.rfc8555.order = (obj) => {
    assert.isObject(obj);

    assert.isString(obj.status);
    assert.include(['pending', 'ready', 'processing', 'valid', 'invalid'], obj.status);

    assert.isArray(obj.identifiers);
    obj.identifiers.forEach((i) => spec.rfc8555.identifier(i));

    assert.isArray(obj.authorizations);
    obj.authorizations.forEach((a) => assert.isString(a));

    assert.isString(obj.finalize);

    if ('expires' in obj) {
        assert.isString(obj.expires);
    }

    if ('notBefore' in obj) {
        assert.isString(obj.notBefore);
    }

    if ('notAfter' in obj) {
        assert.isString(obj.notAfter);
    }

    if ('error' in obj) {
        assert.isObject(obj.error);
    }

    if ('certificate' in obj) {
        assert.isString(obj.certificate);
    }

    /* Augmentations */
    assert.isString(obj.url);
};

spec.rfc8555.authorization = (obj) => {
    assert.isObject(obj);

    spec.rfc8555.identifier(obj.identifier);

    assert.isString(obj.status);
    assert.include(['pending', 'valid', 'invalid', 'deactivated', 'expires', 'revoked'], obj.status);

    assert.isArray(obj.challenges);
    obj.challenges.forEach((c) => spec.rfc8555.challenge(c));

    if ('expires' in obj) {
        assert.isString(obj.expires);
    }

    if ('wildcard' in obj) {
        assert.isBoolean(obj.wildcard);
    }

    /* Augmentations */
    assert.isString(obj.url);
};

spec.rfc8555.identifier = (obj) => {
    assert.isObject(obj);
    assert.isString(obj.type);
    assert.isString(obj.value);
};

spec.rfc8555.challenge = (obj) => {
    assert.isObject(obj);
    assert.isString(obj.type);
    assert.isString(obj.url);

    assert.isString(obj.status);
    assert.include(['pending', 'processing', 'valid', 'invalid'], obj.status);

    if ('validated' in obj) {
        assert.isString(obj.validated);
    }

    if ('error' in obj) {
        assert.isObject(obj.error);
    }
};

/**
 * Crypto
 */

spec.crypto = {};

spec.crypto.csrDomains = (obj) => {
    assert.isObject(obj);

    assert.isDefined(obj.commonName);
    assert.isArray(obj.altNames);
    obj.altNames.forEach((a) => assert.isString(a));
};

spec.crypto.certificateInfo = (obj) => {
    assert.isObject(obj);

    assert.isObject(obj.issuer);
    assert.isDefined(obj.issuer.commonName);

    assert.isObject(obj.domains);
    assert.isDefined(obj.domains.commonName);
    assert.isArray(obj.domains.altNames);
    obj.domains.altNames.forEach((a) => assert.isString(a));

    assert.strictEqual(Object.prototype.toString.call(obj.notBefore), '[object Date]');
    assert.strictEqual(Object.prototype.toString.call(obj.notAfter), '[object Date]');
};

/**
 * JWK
 */

spec.jwk = {};

spec.jwk.rsa = (obj) => {
    assert.isObject(obj);
    assert.isString(obj.e);
    assert.isString(obj.kty);
    assert.isString(obj.n);

    assert.strictEqual(obj.e, 'AQAB');
    assert.strictEqual(obj.kty, 'RSA');
};

spec.jwk.ecdsa = (obj) => {
    assert.isObject(obj);
    assert.isString(obj.crv);
    assert.isString(obj.kty);
    assert.isString(obj.x);
    assert.isString(obj.y);

    assert.strictEqual(obj.kty, 'EC');
};
