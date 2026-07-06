import { ILogger, sp, http } from "@certd/basic";
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

  async getJksGoPath(): Promise<string> {
    const osType = process.platform === "win32" ? "windows" : "linux";
    const jksGoDir = path.resolve("./tools/jks-go");
    const JKS_GO_VERSION = process.env.JKS_GO_VERSION || "1.0.0";

    const versionFile = path.join(jksGoDir, "version");
    const finalPath = path.join(jksGoDir, osType === "windows" ? "jks-go.exe" : "jks-go");

    let needDownload = false;
    if (!fs.existsSync(finalPath)) {
      needDownload = true;
    } else if (!fs.existsSync(versionFile)) {
      needDownload = true;
    } else {
      const currentVersion = fs.readFileSync(versionFile, "utf-8").trim();
      if (currentVersion !== JKS_GO_VERSION) {
        this.logger.info(`jks-go版本不匹配,当前版本:${currentVersion},期望版本:${JKS_GO_VERSION},准备重新下载`);
        needDownload = true;
      }
    }

    if (!needDownload) {
      return finalPath;
    }

    if (!fs.existsSync(jksGoDir)) {
      fs.mkdirSync(jksGoDir, { recursive: true });
    }

    const arch = process.arch;
    let platformArch = "amd64";
    if (arch === "arm64") {
      platformArch = "arm64";
    } else if (arch === "arm") {
      platformArch = "arm_armv7";
    }

    let jksGoFileName = `jks-go_${osType}_${platformArch}`;
    if (osType === "windows") {
      jksGoFileName += ".exe";
    }

    const jksGoFilePath = path.join(jksGoDir, jksGoFileName);
    this.logger.info(`jks-go文件不存在或版本不匹配,准备下载:${jksGoFileName}`);
    const downloadUrl = `https://atomgit.com/certd/jks-go/releases/download/v${JKS_GO_VERSION}/${jksGoFileName}`;
    // https://atomgit.com/certd/jks-go/releases/download/v1.0.2/jks-go_linux_amd64
    const response = await http.request({
      url: downloadUrl,
      method: "GET",
      responseType: "arraybuffer",
      logRes: false,
      logParams: false,
      logData: false,
    });

    const buffer = Buffer.from(response);
    fs.writeFileSync(jksGoFilePath, buffer);
    this.logger.info("下载jks-go成功");

    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }
    fs.copyFileSync(jksGoFilePath, finalPath);
    if (osType === "linux") {
      await sp.spawn({
        cmd: `chmod +x ${finalPath}`,
      });
    }

    fs.writeFileSync(versionFile, JKS_GO_VERSION, "utf-8");
    this.logger.info(`jks-go版本已更新为:${JKS_GO_VERSION}`);

    return finalPath;
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
      const { tmpOnePath } = opts;

      const bundlePath = path.join(os.tmpdir(), "/certd/tmp/", randomStr + `_bundle.pem`);
      const dir = path.dirname(bundlePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const crtContent = fs.readFileSync(tmpOnePath);
      fs.writeFileSync(bundlePath, crtContent);

      const jksPath = path.join(os.tmpdir(), "/certd/tmp/", randomStr + `_cert.jks`);

      const jksGoPath = await this.getJksGoPath();
      await this.exec(`${jksGoPath} -importkeystore -srckeystore ${bundlePath} -srcstoretype PEM -destkeystore ${jksPath} -deststorepass "${jksPassword}"`);
      fs.unlinkSync(bundlePath);

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
