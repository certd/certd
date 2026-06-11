// @ts-nocheck
/**
 * ACME auto helper
 */
import { readCsrDomains } from "./crypto/index.js";
import { wait } from "./wait.js";
import { CancelError } from "./error.js";
import { domainUtils } from '@certd/basic';




const defaultOpts = {
    csr: null,
    email: null,
    preferredChain: null,
    termsOfServiceAgreed: false,
    skipChallengeVerification: false,
    challengePriority: ["http-01", "dns-01"],
    challengeCreateFn: async () => {
        throw new Error("Missing challengeCreateFn()");
    },
    challengeRemoveFn: async () => {
        throw new Error("Missing challengeRemoveFn()");
    },
    waitDnsDiffuseTime: 30,
};

/**
 * ACME client auto mode
 *
 * @param {AcmeClient} client ACME client
 * @param {object} userOpts Options
 * @returns {Promise<buffer>} Certificate
 */

export default async (client, userOpts) => {
    const opts = { ...defaultOpts, ...userOpts };
    const accountPayload = { termsOfServiceAgreed: opts.termsOfServiceAgreed };

    if (!Buffer.isBuffer(opts.csr)) {
        opts.csr = Buffer.from(opts.csr);
    }

    if (opts.email) {
        accountPayload.contact = [`mailto:${opts.email}`];
    }
    if (opts.externalAccountBinding) {
        accountPayload.externalAccountBinding = opts.externalAccountBinding;
    }

    const log = (...args)=>{
        return client.logger.info(...args);
    }
    /**
     * Register account
     */

    log("[auto] Checking account");

    try {
        client.getAccountUrl();
        log("[auto] Account URL already exists, skipping account registration（ 证书申请账户已存在，跳过注册 ）");
    } catch (e) {
        log("[auto] Registering account （注册证书申请账户）");
        await client.createAccount(accountPayload);
    }

    /**
     * Parse domains from CSR
     */

    log("[auto] Parsing domains from Certificate Signing Request");
    const { commonName, altNames } = readCsrDomains(opts.csr);
    const uniqueDomains = Array.from(new Set([commonName].concat(altNames).filter((d) => d)));

    log(`[auto] Resolved ${uniqueDomains.length} unique domains from parsing the Certificate Signing Request`);

    /**
     * Place order
     */

    log("[auto] Placing new certificate order with ACME provider");

    let hasIp = false
    const orderPayload = { identifiers: uniqueDomains.map((d) =>{
        // 判断是否为IP（v4或v6），否则按域名处理
        const type = domainUtils.isIp(d) ? 'ip' : 'dns';
        if(type === 'ip'){
            hasIp = true
        }
        return { type, value: d }
    }) };
    if (opts.profile && client.sslProvider.startsWith("letsencrypt") ){
        orderPayload.profile = opts.profile;
        if(hasIp){
            orderPayload.profile = "shortlived"
        }
    }
    const order = await client.createOrder(orderPayload);
    const authorizations = await client.getAuthorizations(order);

    log(`[auto] Placed certificate order successfully, received ${authorizations.length} identity authorizations`);

    /**
     * Resolve and satisfy challenges
     */

    log("[auto] Resolving and satisfying authorization challenges");

    const clearTasks = [];
    const localVerifyTasks = [];
    const completeChallengeTasks = [];

    const challengeFunc = async (authz) => {
        const d = authz.identifier.value;
        let challengeCompleted = false;

        /* Skip authz that already has valid status */
        if (authz.status === "valid") {
            log(`[auto] [${d}] Authorization already has valid status, no need to complete challenges`);
            return;
        }

        const keyAuthorizationGetter = async (challenge) => {
            return await client.getChallengeKeyAuthorization(challenge);
        };

        async function deactivateAuth(e) {
            log(`[auto] [${d}] Unable to complete challenge: ${e.message}`);
            try {
                log(`[auto] [${d}] Deactivating failed authorization`);
                await client.deactivateAuthorization(authz);
            } catch (f) {
                /* Suppress deactivateAuthorization() errors */
                log(`[auto] [${d}] Authorization deactivation threw error: ${f.message}`);
            }
        }

        log(`[auto] [${d}] Trigger challengeCreateFn()`);
        try {
            const { recordReq, recordRes, dnsProvider, challenge, keyAuthorization ,httpUploader} = await opts.challengeCreateFn(authz, keyAuthorizationGetter);
            clearTasks.push(async () => {
                /* Trigger challengeRemoveFn(), suppress errors */
                log(`[auto] [${d}] Trigger challengeRemoveFn()`);
                try {
                    await opts.challengeRemoveFn(authz, challenge, keyAuthorization, recordReq, recordRes, dnsProvider,httpUploader);
                } catch (e) {
                    log(`[auto] [${d}] challengeRemoveFn threw error: ${e.message}`);
                }
            });

            localVerifyTasks.push(async () => {
                /* Challenge verification */
                log(`[auto] [${d}] 开始本地验证, type = ${challenge.type}`);
                try {
                    await client.verifyChallenge(authz, challenge);
                } catch (e) {
                    log(`[auto] [${d}] 本地验证失败，尝试请求ACME提供商获取状态: ${e.message}`);
                }
            });

            completeChallengeTasks.push(async () => {
                /* Complete challenge and wait for valid status */
                log(`[auto] [${d}] 请求ACME提供商完成验证`);
                try{
                    await client.completeChallenge(challenge);
                }catch (e) {
                    await deactivateAuth(e);
                    e.message = `[${d}] ${e.message || "completeChallenge error"}`;
                    throw e;
                }
                challengeCompleted = true;
                log(`[auto] [${d}] 等待返回valid状态`);
                await client.waitForValidStatus(authz,d);
            });


        } catch (e) {
            log(`[auto] [${d}] challengeCreateFn threw error: ${e.message || e}`);
            await deactivateAuth(e);
            e.message = `[${d}] ${e.message || "challengeCreateFn error"}`;
            throw e;
        }

    };
    const domainSets = [];

    authorizations.forEach((authz) => {
        const d = authz.identifier.value;
        log(`authorization:domain = ${d}, value = ${JSON.stringify(authz)}`);

        if (authz.status === "valid") {
            log(`[auto] [${d}] Authorization already has valid status, no need to complete challenges`);
            return;
        }
        let setd = false;
        // eslint-disable-next-line no-restricted-syntax
        for (const group of domainSets) {
            if (!group[d]) {
                group[d] = authz;
                setd = true;
                break;
            }
        }
        if (!setd) {
            const group = {};
            group[d] = authz;
            domainSets.push(group);
        }
    });

    // log(`domainSets:${JSON.stringify(domainSets)}`);

    const allChallengePromises = [];
    // eslint-disable-next-line no-restricted-syntax
    const challengePromises = [];
    allChallengePromises.push(challengePromises);
    for (const domainSet of domainSets) {
        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (const domain in domainSet) {
            const authz = domainSet[domain];
            challengePromises.push(async () => {
                log(`[auto] [${domain}] Starting challenge`);
                await challengeFunc(authz);
            });
        }
    }

    log(`[auto] challengeGroups:${allChallengePromises.length}`);

    async function runAllPromise(tasks) {
        let promise = Promise.resolve();
        tasks.forEach((task) => {
            promise = promise.then(task);
        });
        return promise;
    }

    async function runPromisePa(tasks, waitTime = 8000) {
        const results = [];
        let j = 0
        // eslint-disable-next-line no-await-in-loop,no-restricted-syntax
        for (const task of tasks) {
            j++
            log(`开始第${j}个任务`);
            results.push(task());
            // eslint-disable-next-line no-await-in-loop
            log(`wait ${Math.floor(waitTime/1000)}s`)
            await wait(waitTime);
        }
        return Promise.all(results);
    }

    log(`开始challenge，共${allChallengePromises.length}组`);
    let i = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const challengePromises of allChallengePromises) {
        i += 1;
        log(`开始第${i}组`);
        if (opts.signal && opts.signal.aborted) {
            throw new CancelError("用户取消");
        }

        const waitDnsDiffuseTime = opts.waitDnsDiffuseTime || 30;
        try {
            // eslint-disable-next-line no-await-in-loop
            await runPromisePa(challengePromises);
            if (opts.skipChallengeVerification === true) {
                log(`跳过本地验证（skipChallengeVerification=true），等待 60s`);
                await wait(60 * 1000);
            } else {
                log("开始本地校验")
                await runPromisePa(localVerifyTasks, 1000);
                log(`本地校验完成，等待${waitDnsDiffuseTime}s`)
                await wait(waitDnsDiffuseTime * 1000)
            }

            log("开始向提供商请求检查验证");
            await runPromisePa(completeChallengeTasks, 1000);
        } catch (e) {
            log(`证书申请失败${e.message}`);
            throw e;
        } finally {
            // letsencrypt 如果同时检出两个TXT记录，会以第一个为准，就会校验失败，所以需要提前删除
            // zerossl 此方式测试无问题
            log(`清理challenge痕迹，length:${clearTasks.length}`);
            try {
                // eslint-disable-next-line no-await-in-loop
                await runAllPromise(clearTasks);
            } catch (e) {
                log("清理challenge失败");
                log(e);
            }
        }
    }


    log("challenge结束");

    // log('[auto] Waiting for challenge valid status');
    // await Promise.all(challengePromises);
    /**
     * Finalize order and download certificate
     */

    log("[auto] Finalizing order and downloading certificate");
    const finalized = await client.finalizeOrder(order, opts.csr);
    const res = await client.getCertificate(finalized, opts.preferredChain);
    return res;
    // try {
    //     await Promise.allSettled(challengePromises);
    // }
    // finally {
    //     log('清理challenge');
    //     await Promise.allSettled(clearTasks);
    // }
};
