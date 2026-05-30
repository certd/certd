import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { tmpdir } from "node:os";
import fs from "fs";
import { SshAccess, SshClient } from "../../plugin-lib/ssh/index.js";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "QnapDeploy",
  title: "威联通-部署证书到威联通",
  icon: "svg:icon-qnap",
  group: pluginGroups.panel.key,
  desc: "部署证书到qnap",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class QnapDeploy extends AbstractPlusTaskPlugin {
  //证书选择，此项必须要有
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

  //授权选择框
  @TaskInput({
    title: "ssh登录授权",
    helper: "ssh登录授权",
    component: {
      name: "access-selector",
      type: "ssh",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const { cert, accessId } = this;

    if (!accessId) {
      throw new Error("主机登录授权配置不能为空");
    }

    const connectConf = await this.getAccess<SshAccess>(accessId);
    const sshClient = new SshClient(this.logger);
    //合并证书
    const newCert = cert.key + "\n" + cert.crt;
    const tmpCertPath = tmpdir() + "/certd/cert.pem";
    fs.writeFileSync(tmpCertPath, newCert);
    const targetPath = "/etc/stunnel/stunnel.pem";
    this.logger.info(`准备上传证书到服务器:${targetPath}`);

    const transports: any = [];
    transports.push({
      localPath: tmpCertPath,
      remotePath: targetPath,
    });
    this.logger.info("开始上传文件到服务器");
    await sshClient.uploadFiles({
      connectConf,
      transports,
      mkdirs: true,
    });
    this.logger.info("上传文件到服务器成功");
    //重启服务
    const restartCmd = "/bin/bash /etc/init.d/stunnel.sh restart";
    this.logger.info("重启stunnel服务");
    await sshClient.exec({
      connectConf,
      script: [restartCmd],
    });
    this.logger.info("执行成功");
  }
}
new QnapDeploy();
