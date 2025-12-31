import { ILogger, sp } from "@certd/basic";
import type { CertInfo } from "./cert-reader.js";
import { CertReader, CertReaderHandleContext } from "./cert-reader.js";
import path from "path";
import os from "os";
import fs from "fs";

export class CertConverter {
  logger: ILogger;

  constructor(opts: { logger: ILogger }) {
    this.logger = opts.logger;
  }
  async convert(opts: { cert: CertInfo; pfxPassword: string; pfxArgs: string }): Promise<{
    pfx: string;
    der: string;
    jks: string;
    p7b: string;
  }> {
    const certReader = new CertReader(opts.cert);
    let pfx: string;
    let der: string;
    let jks: string;
    let p7b: string;
    const handle = async (ctx: CertReaderHandleContext) => {
      // 调用openssl 转pfx
      pfx = await this.convertPfx(ctx, opts.pfxPassword, opts.pfxArgs);

      // 转der
      der = await this.convertDer(ctx);

      jks = await this.convertJks(ctx, opts.pfxPassword);

      p7b = await this.convertP7b(ctx);
    };

    await certReader.readCertFile({ logger: this.logger, handle });

    return {
      pfx,
      der,
      jks,
      p7b,
    };
  }

  async exec(cmd: string) {
    process.env.LANG = "zh_CN.GBK";
    await sp.spawn({
      cmd: cmd,
      logger: this.logger,
    });
  }

  private async convertPfx(opts: CertReaderHandleContext, pfxPassword: string, pfxArgs: string) {
    const { tmpCrtPath, tmpKeyPath } = opts;

    const pfxPath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + "_cert.pfx");

    const dir = path.dirname(pfxPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let passwordArg = "-passout pass:";
    if (pfxPassword) {
      passwordArg = `-password pass:${pfxPassword}`;
    }
    // 兼容server 2016，旧版本不能用sha256
    const oldPfxCmd = `openssl pkcs12 ${pfxArgs} -export -out ${pfxPath} -inkey ${tmpKeyPath} -in ${tmpCrtPath} ${passwordArg}`;
    // const newPfx = `openssl pkcs12 -export -out ${pfxPath} -inkey ${tmpKeyPath} -in ${tmpCrtPath} ${passwordArg}`;
    await this.exec(oldPfxCmd);
    const fileBuffer = fs.readFileSync(pfxPath);
    const pfxCert = fileBuffer.toString("base64");
    fs.unlinkSync(pfxPath);
    return pfxCert;

    //
    // const applyTime = new Date().getTime();
    // const filename = reader.buildCertFileName("pfx", applyTime);
    // this.saveFile(filename, fileBuffer);
  }

  private async convertDer(opts: CertReaderHandleContext) {
    const { tmpCrtPath } = opts;
    const derPath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + `_cert.der`);

    const dir = path.dirname(derPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await this.exec(`openssl x509 -outform der -in ${tmpCrtPath} -out ${derPath}`);
    const fileBuffer = fs.readFileSync(derPath);
    const derCert = fileBuffer.toString("base64");
    fs.unlinkSync(derPath);
    return derCert;
  }

  async convertP7b(opts: CertReaderHandleContext) {
    const { tmpCrtPath } = opts;
    const p7bPath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + `_cert.p7b`);
    const dir = path.dirname(p7bPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    //openssl crl2pkcs7 -nocrl \
    //     -certfile your_domain.crt \
    //     -certfile intermediate.crt \
    //     -out chain.p7b
    await this.exec(`openssl crl2pkcs7 -nocrl -certfile ${tmpCrtPath} -out ${p7bPath}`);
    const fileBuffer = fs.readFileSync(p7bPath);
    const p7bCert = fileBuffer.toString();
    fs.unlinkSync(p7bPath);
    return p7bCert;
  }
  async convertJks(opts: CertReaderHandleContext, pfxPassword = "") {
    const jksPassword = pfxPassword || "123456";
    try {
      const randomStr = Math.floor(Math.random() * 1000000) + "";

      const p12Path = path.join(os.tmpdir(), "/certd/tmp/", randomStr + `_cert.p12`);
      const { tmpCrtPath, tmpKeyPath } = opts;
      let passwordArg = "-passout pass:";
      if (jksPassword) {
        passwordArg = `-password pass:${jksPassword}`;
      }
      await this.exec(`openssl pkcs12 -export -in ${tmpCrtPath} -inkey ${tmpKeyPath} -out ${p12Path} -name certd ${passwordArg}`);

      const jksPath = path.join(os.tmpdir(), "/certd/tmp/", randomStr + `_cert.jks`);
      const dir = path.dirname(jksPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await this.exec(`keytool -importkeystore -srckeystore ${p12Path} -srcstoretype PKCS12 -srcstorepass "${jksPassword}" -destkeystore ${jksPath} -deststoretype PKCS12 -deststorepass "${jksPassword}" `);
      fs.unlinkSync(p12Path);

      const fileBuffer = fs.readFileSync(jksPath);
      const certBase64 = fileBuffer.toString("base64");
      fs.unlinkSync(jksPath);
      return certBase64;
    } catch (e) {
      this.logger.error("转换jks失败", e);
      return;
    }
  }
}
