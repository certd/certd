// @ts-nocheck
/**
 * ACME HTTP client
 */
import { createHmac, createSign, constants } from 'crypto';
const { RSA_PKCS1_PADDING } = constants;
import axios from './axios.js';
import { log } from './logger.js';
import { getJwk } from './crypto/index.js';

/**
 * ACME HTTP client
 *
 * @class
 * @param {string} directoryUrl ACME directory URL
 * @param {buffer} accountKey PEM encoded account private key
 * @param {object} [opts.externalAccountBinding]
 * @param {string} [opts.externalAccountBinding.kid] External account binding KID
 * @param {string} [opts.externalAccountBinding.hmacKey] External account binding HMAC key
 */

class HttpClient {
    constructor(directoryUrl, accountKey, externalAccountBinding = {}, urlMapping = {}, logger, cacheNonce= false, extraHeaders = {}, options = {}) {
        this.directoryUrl = directoryUrl;
        this.accountKey = accountKey;
        this.externalAccountBinding = externalAccountBinding;

        this.maxBadNonceRetries = 5;
        this.jwk = null;

        this.directoryCache = null;
        this.directoryMaxAge = 86400;
        this.directoryTimestamp = 0;
        this.urlMapping = urlMapping;
        this.log = logger ? logger.info.bind(logger) : log;
        this.nonces = [];
        this.cacheNonce = cacheNonce;
        // 每个请求附加的自定义头（如本地ACME内部凭证），调用方头优先
        this.extraHeaders = extraHeaders || {};
        // 公共ACME Client兼容性开关：默认严格（同源+不跟随重定向），第三方ACME可按需显式放宽
        this.strictResourceOrigin = options.strictResourceOrigin !== false;
        this.maxRedirects = options.maxRedirects;
    }

    pushNonce(nonce) {
        if (!this.cacheNonce || !nonce) {
            return;
        }
        this.nonces.push({
            nonce,
            expires: Date.now() + 30*1000,
        });
    }
    popNonce() {
        while (true) {
            if (this.nonces.length === 0) {
                return null;
            }
            const item = this.nonces.shift();
            if (!item) {
                return null;
            }
            if (item.expires < Date.now()) {
                continue;
            }
            return item.nonce;
        }
    }

    /**
     * HTTP request
     *
     * @param {string} url HTTP URL
     * @param {string} method HTTP method
     * @param {object} [opts] Request options
     * @returns {Promise<object>} HTTP response
     */

    async request(url, method, opts = {}) {
        // 仅替换实际传输地址；signedRequest 已在映射前用 ACME 原始 URL 生成 JWS，协议要求两者保持一致。
        const mappedUrl = this.mapUrl(url);
        if (mappedUrl != null) {
            this.log(`use reverse proxy: ${mappedUrl}`);
            url = mappedUrl;
        }
        opts.url = url;
        opts.method = method;
        opts.validateStatus = null;

        /* Headers */
        if (typeof opts.headers === 'undefined') {
            opts.headers = {};
        }
        // 内部凭证头仅发往与目录同源的可信目标：经代理映射转发的跨源请求不附加，未匹配映射的跨源目标也不附加
        opts.headers = { ...(this.isSameOriginAsDirectory(url) ? this.extraHeaders : {}), ...opts.headers };

        opts.headers['Content-Type'] = 'application/jose+json';

        /* 重定向策略：默认0（不跟随），可由 acmeSettings.maxRedirects 覆盖以兼容依赖跳转的第三方ACME */
        if (opts.maxRedirects == null) {
            opts.maxRedirects = this.maxRedirects ?? axios.defaults.acmeSettings?.maxRedirects ?? 0;
        }
        // 携带内部凭证头（如x-certd-acme-token）的请求禁止跟随重定向，防止凭证经跨源重定向泄漏到非授权目标
        if (Object.keys(this.extraHeaders || {}).length > 0 && this.isSameOriginAsDirectory(url)) {
            opts.maxRedirects = 0;
        }

        /* Request */
        this.log(`HTTP request: ${method} ${url}`);
        const resp = await axios.request(opts);

        this.log(`RESP ${resp.status} ${method} ${url}`);

        const nonce = resp.headers['replay-nonce'];
        if (nonce) {
            //如果有nonce
            this.pushNonce(nonce);
        }

        return resp;
    }

    /**
     * Get ACME provider directory
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.1.1
     *
     * @returns {Promise<object>} ACME directory contents
     */

    async getDirectory() {
        const now = Math.floor(Date.now() / 1000);
        const age = (now - this.directoryTimestamp);

        if (!this.directoryCache || (age > this.directoryMaxAge)) {
            this.log(`Refreshing ACME directory, age: ${age}`);
            const resp = await this.request(this.directoryUrl, 'get');

            if (resp.status >= 400) {
                throw new Error(`Attempting to read ACME directory returned error ${resp.status}: ${this.directoryUrl}`);
            }

            if (!resp.data) {
                throw new Error('Attempting to read ACME directory returned no data');
            }

            this.directoryCache = resp.data;
            this.directoryTimestamp = now;
        }

        return this.directoryCache;
    }

    /**
     * Get JSON Web Key
     *
     * @returns {object} JSON Web Key
     */

    getJwk() {
        if (!this.jwk) {
            this.jwk = getJwk(this.accountKey);
        }

        return this.jwk;
    }

    /**
     * Get nonce from directory API endpoint
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-7.2
     *
     * @returns {Promise<string>} Nonce
     */

    async getNonce() {

        //尝试从队列中pop一个nonce
        const nonce = this.popNonce();
        if (nonce) {
            return nonce;
        }

        const url = await this.getResourceUrl('newNonce');
        const resp = await this.request(url, 'head');

        if (!resp.headers['replay-nonce']) {
            throw new Error('Failed to get nonce from ACME provider');
        }

        if (this.cacheNonce) {
            return this.popNonce();
        }
        return resp.headers['replay-nonce'];
       
    }

    /**
     * Get URL for a directory resource
     *
     * @param {string} resource API resource name
     * @returns {Promise<string>} URL
     */

    async getResourceUrl(resource) {
        const dir = await this.getDirectory();

        if (!dir[resource]) {
            throw new Error(`Unable to locate API resource URL in ACME directory: "${resource}"，获取ACME接口地址信息失败，可能网络不稳定或该证书颁发机构服务器崩溃，目录地址：${this.directoryUrl}，请测试地址是否可以正常访问并显示json格式的URL地址列表`);
        }

        const resourceUrl = dir[resource];
        this.assertResourceSameOrigin(resource, resourceUrl);
        return resourceUrl;
    }

    /**
     * 出站策略：目录返回的资源URL须与管理员配置的目录地址同源，
     * 防止被篡改/恶意的目录把携带账户密钥签名的请求引导至其它主机（凭证外泄/SSRF）。
     * 仅当资源URL确实匹配可信反向代理映射规则时才允许跨源；未匹配映射仍执行同源检查，
     * 避免“开启映射即整体放行”把内部凭证头发往非预期主机。
     */
    assertResourceSameOrigin(resource, resourceUrl) {
        if (this.strictResourceOrigin === false) {
            return;
        }
        if (this.matchesMapping(resourceUrl)) {
            return;
        }
        if (!this.isSameOriginAsDirectory(resourceUrl)) {
            throw new Error(`ACME目录资源「${resource}」与目录地址不同源，已拒绝出站：${resourceUrl}`);
        }
    }

    /**
     * 严格URL映射：用标准URL解析器比较origin（协议+主机+端口），路径按边界前缀匹配，
     * 不以字符串包含关系判断（避免可信关键字出现在恶意URL的query/path中误命中）。
     * 命中返回映射后的URL，未命中返回null。映射后目标由调用方重新校验。
     */
    mapUrl(url) {
        if (!(this.urlMapping && this.urlMapping.enabled && this.urlMapping.mappings)) {
            return null;
        }
        let target;
        try {
            target = new URL(url);
        } catch {
            return null;
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const key in this.urlMapping.mappings) {
            const value = this.urlMapping.mappings[key];
            let keyUrl;
            let valueUrl;
            try {
                keyUrl = new URL(key);
                valueUrl = new URL(value);
            } catch {
                continue;
            }
            if (target.origin !== keyUrl.origin) {
                continue;
            }
            const keyPath = keyUrl.pathname;
            if (keyPath !== "/" && target.pathname !== keyPath && !target.pathname.startsWith(keyPath + "/")) {
                continue;
            }
            const mapped = new URL(target.toString());
            mapped.protocol = valueUrl.protocol;
            mapped.host = valueUrl.host;
            if (keyPath !== "/") {
                mapped.pathname = valueUrl.pathname.replace(/\/+$/, "") + target.pathname.slice(keyPath.length);
            }
            return mapped.toString();
        }
        return null;
    }

    /** 资源URL是否命中可信反向代理映射规则（严格origin+路径边界）。 */
    matchesMapping(url) {
        return this.mapUrl(url) != null;
    }

    /** 目标URL是否与目录地址同源（非法URL视为不同源）。 */
    isSameOriginAsDirectory(url) {
        try {
            return new URL(url).origin === new URL(this.directoryUrl).origin;
        } catch {
            return false;
        }
    }

    /**
     * Get directory meta field
     *
     * @param {string} field Meta field name
     * @returns {Promise<string|null>} Meta field value
     */

    async getMetaField(field) {
        const dir = await this.getDirectory();

        if (('meta' in dir) && (field in dir.meta)) {
            return dir.meta[field];
        }

        return null;
    }

    /**
     * Prepare HTTP request body for signature
     *
     * @param {string} alg JWS algorithm
     * @param {string} url Request URL
     * @param {object} [payload] Request payload
     * @param {object} [opts]
     * @param {string} [opts.nonce] JWS anti-replay nonce
     * @param {string} [opts.kid] JWS KID
     * @returns {object} Signed HTTP request body
     */

    prepareSignedBody(alg, url, payload = null, { nonce = null, kid = null } = {}) {
        const header = { alg, url };

        /* Nonce */
        if (nonce) {
            this.log(`Using nonce: ${nonce}`);
            header.nonce = nonce;
        }

        /* KID or JWK */
        if (kid) {
            header.kid = kid;
        }
        else {
            header.jwk = this.getJwk();
        }

        /* Body */
        return {
            payload: payload ? Buffer.from(JSON.stringify(payload)).toString('base64url') : '',
            protected: Buffer.from(JSON.stringify(header)).toString('base64url'),
        };
    }

    /**
     * Create JWS HTTP request body using HMAC
     *
     * @param {string} hmacKey HMAC key
     * @param {string} url Request URL
     * @param {object} [payload] Request payload
     * @param {object} [opts]
     * @param {string} [opts.nonce] JWS anti-replay nonce
     * @param {string} [opts.kid] JWS KID
     * @returns {object} Signed HMAC request body
     */

    createSignedHmacBody(hmacKey, url, payload = null, { nonce = null, kid = null } = {}) {
        const result = this.prepareSignedBody('HS256', url, payload, { nonce, kid });

        /* Signature */
        const signer = createHmac('SHA256', Buffer.from(hmacKey, 'base64')).update(`${result.protected}.${result.payload}`, 'utf8');
        result.signature = signer.digest().toString('base64url');

        return result;
    }

    /**
     * Create JWS HTTP request body using RSA or ECC
     *
     * https://datatracker.ietf.org/doc/html/rfc7515
     *
     * @param {string} url Request URL
     * @param {object} [payload] Request payload
     * @param {object} [opts]
     * @param {string} [opts.nonce] JWS nonce
     * @param {string} [opts.kid] JWS KID
     * @returns {object} JWS request body
     */

    createSignedBody(url, payload = null, { nonce = null, kid = null } = {}) {
        const jwk = this.getJwk();
        let headerAlg = 'RS256';
        let signerAlg = 'SHA256';

        /* https://datatracker.ietf.org/doc/html/rfc7518#section-3.1 */
        if (jwk.crv && (jwk.kty === 'EC')) {
            headerAlg = 'ES256';

            if (jwk.crv === 'P-384') {
                headerAlg = 'ES384';
                signerAlg = 'SHA384';
            }
            else if (jwk.crv === 'P-521') {
                headerAlg = 'ES512';
                signerAlg = 'SHA512';
            }
        }

        /* Prepare body and signer */
        const result = this.prepareSignedBody(headerAlg, url, payload, { nonce, kid });
        const signer = createSign(signerAlg).update(`${result.protected}.${result.payload}`, 'utf8');

        /* Signature - https://stackoverflow.com/questions/39554165 */
        result.signature = signer.sign({
            key: this.accountKey,
            padding: RSA_PKCS1_PADDING,
            dsaEncoding: 'ieee-p1363',
        }, 'base64url');

        return result;
    }

    /**
     * Signed HTTP request
     *
     * https://datatracker.ietf.org/doc/html/rfc8555#section-6.2
     *
     * @param {string} url Request URL
     * @param {object} payload Request payload
     * @param {object} [opts]
     * @param {string} [opts.kid] JWS KID
     * @param {string} [opts.nonce] JWS anti-replay nonce
     * @param {boolean} [opts.includeExternalAccountBinding] Include EAB in request
     * @param {number} [attempts] Request attempt counter
     * @returns {Promise<object>} HTTP response
     */

    async signedRequest(url, payload, { kid = null, nonce = null, includeExternalAccountBinding = false } = {}, attempts = 0) {
        if (!nonce) {
            nonce = await this.getNonce();
        }

        /* External account binding */
        if (includeExternalAccountBinding && this.externalAccountBinding) {
            if (this.externalAccountBinding.kid && this.externalAccountBinding.hmacKey) {
                const jwk = this.getJwk();
                const eabKid = this.externalAccountBinding.kid;
                const eabHmacKey = this.externalAccountBinding.hmacKey;

                payload.externalAccountBinding = this.createSignedHmacBody(eabHmacKey, url, jwk, { kid: eabKid });
            }
        }

        /* Sign body and send request */
        const data = this.createSignedBody(url, payload, { nonce, kid });
        const resp = await this.request(url, 'post', { data });

        /* Retry on bad nonce - https://datatracker.ietf.org/doc/html/rfc8555#section-6.5 */
        if (resp.data && resp.data.type && (resp.status === 400) && (resp.data.type === 'urn:ietf:params:acme:error:badNonce') && (attempts < this.maxBadNonceRetries)) {
            nonce = resp.headers['replay-nonce'] || null;
            attempts += 1;

            this.log(`Caught invalid nonce error, retrying (${attempts}/${this.maxBadNonceRetries}) signed request to: ${url}`);
            return this.signedRequest(url, payload, { kid, nonce, includeExternalAccountBinding }, attempts);
        }

        /* Return response */
        return resp;
    }
}

/* Export client */
export default HttpClient;
