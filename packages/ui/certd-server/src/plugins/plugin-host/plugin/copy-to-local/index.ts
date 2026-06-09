import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import * as fs from "fs";
import path from "path";
import { CertApplyPluginNames } from "@certd/plugin-cert";
const dataDir = "./data";
@IsTaskPlugin({
  name: "CopyToLocal",
  title: "主机-复制到本机",
  icon: "solar:copy-bold-duotone",
  desc: "【仅管理员使用】实际上是复制证书到docker容器内的某个路径，需要做目录映射到宿主机",
  group: pluginGroups.host.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class CopyCertToLocalPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput({
    title: "证书类型",
    helper: "要部署的证书格式，支持pem、pfx、der、jks格式",
    component: {
      name: "a-select",
      options: [
        { value: "pem", label: "pem(crt)，用于Nginx等大部分应用" },
        { value: "pfx", label: "pfx，一般用于IIS" },
        { value: "der", label: "der，一般用于Apache" },
        { value: "jks", label: "jks，一般用于JAVA应用" },
      ],
    },
    required: true,
  })
  certType!: string;

  @TaskInput({
    title: "证书保存路径",
    helper: "全链证书，路径要包含文件名" + "\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：tmp/cert.pem",
    component: {
      placeholder: "tmp/full_chain.pem",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  crtPath!: string;
  @TaskInput({
    title: "私钥保存路径",
    helper: "路径要包含文件名\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：tmp/cert.key",
    component: {
      placeholder: "tmp/cert.key",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  keyPath!: string;

  @TaskInput({
    title: "中间证书保存路径",
    helper: "路径要包含文件名，一般情况传上面两个文件就行了，极少数情况需要这个中间证书",
    component: {
      placeholder: "/root/deploy/nginx/intermediate.pem",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem';
        })
      }
    `,
    rules: [{ type: "filepath" }],
  })
  icPath!: string;

  @TaskInput({
    title: "PFX证书保存路径",
    helper: "用于IIS证书部署，路径要包含文件名\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：tmp/cert.pfx",
    component: {
      placeholder: "tmp/cert.pfx",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pfx';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  pfxPath!: string;

  @TaskInput({
    title: "DER证书保存路径",
    helper: "用于Apache证书部署，路径要包含文件名\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：tmp/cert.der\n.der和.cer是相同的东西，改个后缀名即可",
    component: {
      placeholder: "tmp/cert.der 或 tmp/cert.cer",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'der';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  derPath!: string;

  @TaskInput({
    title: "jks证书保存路径",
    helper: "用于java，路径要包含文件名，例如：tmp/cert.jks",
    component: {
      placeholder: "tmp/cert.jks",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'jks';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  jksPath!: string;

  @TaskOutput({
    title: "证书保存路径",
    type: "HostCrtPath",
  })
  hostCrtPath!: string;

  @TaskOutput({
    title: "私钥保存路径",
    type: "HostKeyPath",
  })
  hostKeyPath!: string;

  @TaskOutput({
    title: "中间证书保存路径",
    type: "HostKeyPath",
  })
  hostIcPath!: string;

  @TaskOutput({
    title: "PFX保存路径",
    type: "HostPfxPath",
  })
  hostPfxPath!: string;

  @TaskOutput({
    title: "DER保存路径",
    type: "HostDerPath",
  })
  hostDerPath!: string;

  @TaskOutput({
    title: "jks保存路径",
    type: "HostJksPath",
  })
  hostJksPath!: string;

  async onInstance() {}

  copyFile(srcFile: string, destFile: string) {
    this.logger.info(`复制文件：${srcFile} => ${destFile}`);
    const dir = path.dirname(destFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.copyFileSync(srcFile, destFile);
  }
  async execute(): Promise<void> {
    this.checkAdmin();

    let { crtPath, keyPath, icPath, pfxPath, derPath, jksPath } = this;
    const certReader = new CertReader(this.cert);

    const handle = async ({ reader, tmpCrtPath, tmpKeyPath, tmpDerPath, tmpPfxPath, tmpIcPath, tmpJksPath }) => {
      this.logger.info("复制到目标路径");
      if (crtPath) {
        crtPath = crtPath.trim();
        crtPath = crtPath.startsWith("/") ? crtPath : path.join(dataDir, crtPath);
        this.copyFile(tmpCrtPath, crtPath);
        this.hostCrtPath = crtPath;
      }
      if (keyPath) {
        keyPath = keyPath.trim();
        keyPath = keyPath.startsWith("/") ? keyPath : path.join(dataDir, keyPath);
        this.copyFile(tmpKeyPath, keyPath);
        this.hostKeyPath = keyPath;
      }
      if (icPath) {
        icPath = icPath.trim();
        icPath = icPath.startsWith("/") ? icPath : path.join(dataDir, icPath);
        this.copyFile(tmpIcPath, icPath);
        this.hostIcPath = icPath;
      }
      if (pfxPath) {
        pfxPath = pfxPath.trim();
        pfxPath = pfxPath.startsWith("/") ? pfxPath : path.join(dataDir, pfxPath);
        this.copyFile(tmpPfxPath, pfxPath);
        this.hostPfxPath = pfxPath;
      }
      if (derPath) {
        derPath = derPath.trim();
        derPath = derPath.startsWith("/") ? derPath : path.join(dataDir, derPath);
        this.copyFile(tmpDerPath, derPath);
        this.hostDerPath = derPath;
      }
      if (jksPath) {
        jksPath = jksPath.trim();
        jksPath = jksPath.startsWith("/") ? jksPath : path.join(dataDir, jksPath);
        this.copyFile(tmpJksPath, jksPath);
        this.hostJksPath = jksPath;
      }
      this.logger.info("请注意，如果使用的是相对路径，那么文件就在你的数据库同级目录下，默认是/data/certd/下面");
      this.logger.info("请注意，如果使用的是绝对路径，文件在容器内的目录下，你需要给容器做目录映射才能复制到宿主机，需要在docker-compose.yaml中配置主机目录映射： volumes: /你宿主机的路径:/任务配置的证书路径");
    };

    await certReader.readCertFile({ logger: this.logger, handle });

    this.logger.info("执行完成");
  }
}

new CopyCertToLocalPlugin();
