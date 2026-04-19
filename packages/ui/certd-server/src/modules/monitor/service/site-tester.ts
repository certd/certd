import { logger, safePromise, utils } from "@certd/basic";
import { merge } from "lodash-es";
import https from "https";
import { PeerCertificate } from "tls";
import {DnsCustom} from "./dns-custom.js";

export type SiteTestReq = {
  host: string; // 只用域名部分
  port?: number;
  method?: string;
  retryTimes?: number;
  ipAddress?: string;

  customDns?: DnsCustom;
};

export type SiteTestRes = {
  certificate?: PeerCertificate;
};

export class SiteTester {
  async test(req: SiteTestReq): Promise<SiteTestRes> {
    const req_ = {...req}
    delete req_.customDns
    logger.info("测试站点:", JSON.stringify(req_));
    const maxRetryTimes = req.retryTimes == null ? 3 : req.retryTimes;
    let tryCount = 0;
    let result: SiteTestRes = {};
    while (true) {
      try {
        result = await this.doTestOnce(req);
        return result;
      } catch (e) {
        tryCount++;
        if (tryCount > maxRetryTimes) {
          logger.error(`测试站点出错，已超过最大重试次数（${maxRetryTimes}）`, e.message);
          throw e;
        }
        //指数退避
        const time = 2 ** tryCount;
        logger.error(`测试站点出错，${time}s后重试(${tryCount}/${maxRetryTimes})`, e);
        await utils.sleep(time * 1000);
      }
    }
  }

  async doTestOnce(req: SiteTestReq): Promise<SiteTestRes> {
    const options: any = merge(
      {
        port: 443,
        method: "GET",
        rejectUnauthorized: false
      },
      req
    );

    let customLookup = null
    if (req.ipAddress) {
      //使用固定的ip
      const ipAddress = req.ipAddress;
      options.headers = {
        host: options.host,
        //sni
        servername: options.host
      };
      options.host = ipAddress;
    }else if (req.customDns ) {
      // 非ip address 请求时
      const customDns = req.customDns
      customLookup = async (hostname:string, options:any, callback)=> {
        console.log(hostname, options);

        // { family: undefined, hints: 0, all: true }
        const res = await customDns.lookup(hostname, options)
        console.log("custom lookup res:",res)
        if (!res || res.length === 0) {
          callback(new Error("没有解析到IP"));
        }
        callback(null, res);
      }
    }

    const agentOptions:any = { keepAlive: false };
    if (customLookup) {
      agentOptions.lookup = customLookup
    }
    options.agent = new https.Agent(agentOptions);

    // 创建 HTTPS 请求
    const requestPromise = safePromise((resolve, reject) => {
      const req = https.request(options, res => {
        // // 获取证书
        // // @ts-ignore
        // const certificate = res.socket.getPeerCertificate();
        // // logger.info('证书信息', certificate);
        // if (certificate.subject == null) {
        //   logger.warn("证书信息为空");
        //   resolve({
        //     certificate: null
        //   });
        // }
        // resolve({
        //   certificate
        // });
        res.socket.end();
        // 关闭响应
        res.destroy();
      });

      // ✅ 关键：在 'socket' 事件中获取证书（握手完成后立即执行）
      req.on('socket', (socket:any) => {
        socket.on('secureConnect', () => {
          // TLS握手完成，证书已经可用
          const certificate = socket.getPeerCertificate();
          if (certificate.subject) {
            logger.info('证书获取成功', certificate.subject);
            resolve({
              certificate
            });
          }
        });
      });

      req.on("error", e => {
        reject(e);
      });
      req.end();
    });

    return await requestPromise;
  }
}

export const siteTester = new SiteTester();
