import { ILogger, sp } from "@certd/pipeline";
import type { CertInfo } from "../cert-plugin/acme.js";
import { CertReader, CertReaderHandleContext } from "../cert-plugin/cert-reader.js";
import path from "path";
import os from "os";
import fs from "fs";

export { CertReader };
export type { CertInfo };

export class CertConverter {
  logger: ILogger;

  constructor(opts: { logger: ILogger }) {
    this.logger = opts.logger;
  }
  async convert(opts: { cert: CertInfo; pfxPassword: string }): Promise<{
    pfxPath: string;
    derPath: string;
  }> {
    const certReader = new CertReader(opts.cert);
    let pfxPath: string;
    let derPath: string;
    const handle = async (ctx: CertReaderHandleContext) => {
      // 调用openssl 转pfx
      pfxPath = await this.convertPfx(ctx, opts.pfxPassword);

      // 转der
      derPath = await this.convertDer(ctx);
    };

    await certReader.readCertFile({ logger: this.logger, handle });

    return {
      pfxPath,
      derPath,
    };
  }

  async exec(cmd: string) {
    await sp.spawn({
      cmd: cmd,
      logger: this.logger,
    });
  }

  private async convertPfx(opts: CertReaderHandleContext, pfxPassword: string) {
    const { tmpCrtPath, tmpKeyPath } = opts;

    const pfxPath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + "", "cert.pfx");

    const dir = path.dirname(pfxPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let passwordArg = "-passout pass:";
    if (pfxPassword) {
      passwordArg = `-password pass:${pfxPassword}`;
    }
    await this.exec(`openssl pkcs12 -export -out ${pfxPath} -inkey ${tmpKeyPath} -in ${tmpCrtPath} ${passwordArg}`);
    return pfxPath;
    // const fileBuffer = fs.readFileSync(pfxPath);
    // this.pfxCert = fileBuffer.toString("base64");
    //
    // const applyTime = new Date().getTime();
    // const filename = reader.buildCertFileName("pfx", applyTime);
    // this.saveFile(filename, fileBuffer);
  }

  private async convertDer(opts: CertReaderHandleContext) {
    const { tmpCrtPath } = opts;
    const derPath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + "", `cert.der`);

    const dir = path.dirname(derPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await this.exec(`openssl x509 -outform der -in ${tmpCrtPath} -out ${derPath}`);

    return derPath;

    // const fileBuffer = fs.readFileSync(derPath);
    // this.derCert = fileBuffer.toString("base64");
    //
    // const applyTime = new Date().getTime();
    // const filename = reader.buildCertFileName("der", applyTime);
    // this.saveFile(filename, fileBuffer);
  }
}
