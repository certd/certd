const nodeHttp = require('node:http');
const https = require('node:https');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { log } = require('./logger');

function createAgent(opts = {}) {
    let httpAgent;
    let
        httpsAgent;
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    if (httpProxy) {
        log(`acme use httpProxy:${httpProxy}`);
        httpAgent = new HttpProxyAgent(httpProxy, opts);
    }
    else {
        httpAgent = new nodeHttp.Agent(opts);
    }
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    if (httpsProxy) {
        log(`acme use httpsProxy:${httpsProxy}`);
        httpsAgent = new HttpsProxyAgent(httpsProxy, opts);
    }
    else {
        httpsAgent = new https.Agent(opts);
    }
    return {
        httpAgent,
        httpsAgent,
    };
}

let defaultAgents = createAgent();

function getGlobalAgents() {
    return defaultAgents;
}

function setGlobalProxy(opts) {
    log('acme setGlobalProxy:', opts);
    if (opts.httpProxy) {
        process.env.HTTP_PROXY = opts.httpProxy;
    }
    if (opts.httpsProxy) {
        process.env.HTTPS_PROXY = opts.httpsProxy;
    }

    defaultAgents = createAgent();
}

class HttpError extends Error {
    constructor(error) {
        super(error || error.message);
        if (!error) {
            return;
        }

        if (error.message.indexOf('ssl3_get_record:wrong version number') >= 0) {
            this.message = 'http协议错误，服务端要求http协议，请检查是否使用了https请求';
        }

        this.name = error.name;
        this.code = error.code;
        this.cause = error.cause;

        if (error.response) {
            this.status = error.response.status;
            this.statusText = error.response.statusText;
            this.response = {
                data: error.response.data,
            };
        }

        let url = '';
        if (error.config) {
            this.request = {
                baseURL: error.config.baseURL,
                url: error.config.url,
                method: error.config.method,
                params: error.config.params,
                data: error.config.data,
            };
            url = error.config.baseURL + error.config.url;
        }
        if (url) {
            this.message = `${this.message}:${url}`;
        }

        delete error.response;
        delete error.config;
        delete error.request;
        // logger.error(error);
    }
}

module.exports = {
    setGlobalProxy,
    createAgent,
    getGlobalAgents,
    HttpError,
};
