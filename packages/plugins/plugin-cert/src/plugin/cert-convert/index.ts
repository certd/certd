import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, sp, TaskInput, TaskOutput } from "@certd/pipeline";
import type { CertInfo } from "../cert-plugin/acme.js";
import { CertReader, CertReaderHandleContext } from "../cert-plugin/cert-reader.js";
import path from "path";
import os from "os";
import fs from "fs";

export { CertReader };
export type { CertInfo };

@IsTaskPlugin({
  name: "CertConvert",
  title: "证书转换器",
  group: pluginGroups.cert.key,
  desc: "转换为pfx、der等证书格式",
  default: {
    input: {
      renewDays: 20,
      forceUpdate: false,
    },
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
})
export class CertConvertPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "pi-output-selector",
      from: "CertApply",
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput({
    title: "PFX证书密码",
    helper: "不填则没有密码",
    component: {
      name: "a-input-password",
      vModel: "value",
    },
    required: false,
  })
  pfxPassword!: string;

  @TaskInput({
    title: "输出PFX",
    value:true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    required: true,
  })
  pfxEnabled: boolean = true;


  @TaskInput({
    title: "输出DER",
    value:true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    required: true,
  })
  derEnabled: boolean = true;



  @TaskOutput({
    title: "pfx格式证书",
    type: "PfxCert",
  })
  pfxCert?: string;

  @TaskOutput({
    title: "der格式证书",
    type: "DerCert",
  })
  derCert?: string;

  async onInit() {}

  async execute(): Promise<void> {
    const certReader = new CertReader(this.cert);

    const handle = async (opts: CertReaderHandleContext) => {
      if(this.pfxEnabled){
        // 调用openssl 转pfx
        await this.convertPfx(opts);
      }else{
        this.logger.info("pfx证书已禁用");
      }
    
      if(this.pfxEnabled){
        // 转der
        await this.convertDer(opts);
      }else{
        this.logger.info("der证书已禁用");
      }
    };

    await certReader.readCertFile({ logger: this.logger, handle });
  }

  async exec(cmd: string) {
    await sp.spawn({
      cmd: cmd,
      logger: this.logger,
    });
  }

  private async convertPfx(opts: CertReaderHandleContext) {
    const { reader, tmpCrtPath, tmpKeyPath } = opts;

    const pfxPath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + "", "cert.pfx");

    const dir = path.dirname(pfxPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let passwordArg = "-passout pass:";
    if (this.pfxPassword) {
      passwordArg = `-password pass:${this.pfxPassword}`;
    }
    await this.exec(`openssl pkcs12 -export -out ${pfxPath} -inkey ${tmpKeyPath} -in ${tmpCrtPath} ${passwordArg}`);
    this.pfxCert = pfxPath;
    
    const applyTime = new Date().getTime();
    const filename = reader.buildCertFileName("pfx", applyTime);
    const fileBuffer = fs.readFileSync(pfxPath);
    this.saveFile(filename, fileBuffer);
  }

  private async convertDer(opts: CertReaderHandleContext) {
    const { reader, tmpCrtPath } = opts;
    const derPath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + "", `cert.der`);

    const dir = path.dirname(derPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }


    await this.exec(`openssl x509 -outform der -in ${tmpCrtPath} -out ${derPath}`);
    this.derCert = derPath;

    const applyTime = new Date().getTime();
    const filename = reader.buildCertFileName("der", applyTime);
    const fileBuffer = fs.readFileSync(derPath);
    this.saveFile(filename, fileBuffer);
  }
}

new CertConvertPlugin();
