import { AbstractTaskPlugin, FileItem, IContext, Step, TaskInput, TaskOutput } from "@certd/pipeline";
import dayjs from "dayjs";
import type { CertInfo } from "./acme.js";
import { CertReader } from "./cert-reader.js";
import JSZip from "jszip";
import { CertConverter } from "./convert.js";
export const EVENT_CERT_APPLY_SUCCESS = "CertApply.success";

export abstract class CertApplyBaseConvertPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "证书域名",
    component: {
      name: "a-select",
      vModel: "value",
      mode: "tags",
      open: false,
      placeholder: "foo.com / *.foo.com / *.bar.com",
      tokenSeparators: [",", " ", "，", "、", "|"],
    },
    rules: [{ type: "domains" }],
    required: true,
    col: {
      span: 24,
    },
    order: -999,
    helper:
      "1、支持多个域名打到一个证书上，例如： foo.com，*.foo.com，*.bar.com\n" +
      "2、子域名被通配符包含的不要填写，例如：www.foo.com已经被*.foo.com包含，不要填写www.foo.com\n" +
      "3、泛域名只能通配*号那一级（*.foo.com的证书不能用于xxx.yyy.foo.com、不能用于foo.com）\n" +
      "4、输入一个，空格之后，再输入下一个 \n" +
      "5、如果设置了子域托管解析（比如免费的二级域名托管在CF或者阿里云），请先[设置托管子域名](#/certd/pipeline/subDomain)",
  })
  domains!: string[];

  @TaskInput({
    title: "证书加密密码",
    component: {
      name: "input-password",
      vModel: "value",
    },
    required: false,
    order: 100,
    helper: "转换成PFX、jks格式证书是否需要加密\njks必须设置密码，不传则默认123456\npfx不传则为空密码",
  })
  pfxPassword!: string;

  @TaskInput({
    title: "PFX证书转换参数",
    value: "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES",
    component: {
      name: "a-auto-complete",
      vModel: "value",
      options: [
        { value: "", label: "兼容 Windows Server 最新" },
        { value: "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES", label: "兼容 Windows Server 2016" },
        { value: "-nomac -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES", label: "兼容 Windows Server 2008" },
      ],
    },
    required: false,
    order: 100,
    helper: "兼容Windows Server各个版本",
  })
  pfxArgs = "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES";

  userContext!: IContext;
  lastStatus!: Step;

  @TaskOutput({
    title: "域名证书",
    type: "cert",
  })
  cert?: CertInfo;

  @TaskOutput({
    title: "域名证书压缩文件",
    type: "certZip",
  })
  certZip?: FileItem;

  async onInstance() {
    this.userContext = this.ctx.userContext;
    this.lastStatus = this.ctx.lastStatus as Step;
    await this.onInit();
  }

  abstract onInit(): Promise<void>;

  //必须output之后执行
  async emitCertApplySuccess() {
    const emitter = this.ctx.emitter;
    const value = {
      cert: this.cert,
      file: this._result.files[0].path,
    };
    await emitter.emit(EVENT_CERT_APPLY_SUCCESS, value);
  }

  async output(certReader: CertReader, isNew: boolean) {
    const cert: CertInfo = certReader.toCertInfo();
    this.cert = cert;

    this._result.pipelineVars.certEffectiveTime = dayjs(certReader.detail.notBefore).valueOf();
    this._result.pipelineVars.certExpiresTime = dayjs(certReader.detail.notAfter).valueOf();
    if (!this._result.pipelinePrivateVars) {
      this._result.pipelinePrivateVars = {};
    }
    this._result.pipelinePrivateVars.cert = cert;

    if (isNew) {
      try {
        const converter = new CertConverter({ logger: this.logger });
        const res = await converter.convert({
          cert,
          pfxPassword: this.pfxPassword,
          pfxArgs: this.pfxArgs,
        });
        if (cert.pfx == null && res.pfx) {
          cert.pfx = res.pfx;
        }

        if (cert.der == null && res.der) {
          cert.der = res.der;
        }

        if (cert.jks == null && res.jks) {
          cert.jks = res.jks;
        }

        if (cert.p7b == null && res.p7b) {
          cert.p7b = res.p7b;
        }

        this.logger.info("转换证书格式成功");
      } catch (e) {
        this.logger.error("转换证书格式失败", e);
      }
    }

    if (isNew) {
      const zipFileName = certReader.buildCertFileName("zip", certReader.detail.notBefore);
      await this.zipCert(cert, zipFileName);
    } else {
      this.extendsFiles();
    }
    this.certZip = this._result.files[0];
  }

  async zipCert(cert: CertInfo, filename: string) {
    const zip = new JSZip();
    zip.file("证书.pem", cert.crt);
    zip.file("私钥.pem", cert.key);
    zip.file("中间证书.pem", cert.ic);
    zip.file("cert.crt", cert.crt);
    zip.file("cert.key", cert.key);
    zip.file("intermediate.crt", cert.ic);
    zip.file("origin.crt", cert.oc);
    zip.file("one.pem", cert.one);
    zip.file("cert.p7b", cert.p7b);
    if (cert.pfx) {
      zip.file("cert.pfx", Buffer.from(cert.pfx, "base64"));
    }
    if (cert.der) {
      zip.file("cert.der", Buffer.from(cert.der, "base64"));
    }
    if (cert.jks) {
      zip.file("cert.jks", Buffer.from(cert.jks, "base64"));
    }

    zip.file(
      "说明.txt",
      `证书文件说明
cert.crt：证书文件，包含证书链，pem格式
cert.key：私钥文件，pem格式
intermediate.crt：中间证书文件，pem格式
origin.crt：原始证书文件，不含证书链，pem格式
one.pem： 证书和私钥简单合并成一个文件，pem格式，crt正文+key正文
cert.pfx：pfx格式证书文件，iis服务器使用
cert.der：der格式证书文件
cert.jks：jks格式证书文件，java服务器使用
    `
    );

    const content = await zip.generateAsync({ type: "nodebuffer" });
    this.saveFile(filename, content);
    this.logger.info(`已保存文件:${filename}`);
  }

  formatCert(pem: string) {
    pem = pem.replace(/\r/g, "");
    pem = pem.replace(/\n\n/g, "\n");
    pem = pem.replace(/\n$/g, "");
    return pem;
  }

  formatCerts(cert: { crt: string; key: string; csr: string }) {
    const newCert: CertInfo = {
      crt: this.formatCert(cert.crt),
      key: this.formatCert(cert.key),
      csr: this.formatCert(cert.csr),
    };
    return newCert;
  }

  async readLastCert(): Promise<CertReader | undefined> {
    const cert = this.lastStatus?.status?.output?.cert;
    if (cert == null) {
      this.logger.info("没有找到上次的证书");
      return undefined;
    }
    return new CertReader(cert);
  }
}
