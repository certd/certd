import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { CertReader } from "@certd/plugin-lib";
import { SshAccess } from "../../plugin-lib/ssh/ssh-access.js";
import { SshClient } from "../../plugin-lib/ssh/ssh.js";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
@IsTaskPlugin({
  name: "EsxiDeployCert", //这个名字Esxi不要改，兼容用户旧数据，以前写错了
  title: "ESXi-部署证书到ESXi",
  icon: "svg:icon-lucky",
  group: pluginGroups.host.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class EsxiDeployCertPlugin extends AbstractPlusTaskPlugin {
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

  // @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  // certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "主机SSH授权",
    component: {
      name: "access-selector",
      type: "ssh",
    },
    required: true,
  })
  accessId!: string;


  async onInstance() { }

  async execute(): Promise<void> {
    const sshConf = await this.getAccess<SshAccess>(this.accessId);
    const sshClient = new SshClient(this.logger);

    // /etc/vmware/ssl/rui.crt
    // /etc/vmware/ssl/rui.key
    const certReader = new CertReader(this.cert);

    await certReader.readCertFile({
      logger: this.logger,
      handle: async (ctx) => {
        const crtPath = ctx.tmpCrtPath;
        const keyPath = ctx.tmpKeyPath;
        await sshClient.uploadFiles({
          connectConf: sshConf,
          transports: [
            {
              localPath: crtPath,
              remotePath: "/etc/vmware/ssl/rui.crt",
            },
            {
              localPath: keyPath,
              remotePath: "/etc/vmware/ssl/rui.key",
            },
          ],
          mkdirs: true,
        });
      },
    });

    const cmd = `/etc/init.d/hostd restart
/etc/init.d/vpxa restart`

    await sshClient.exec({
      connectConf: sshConf,
      script: cmd,
    });

    this.logger.info(`证书部署完成`);
  }
}

new EsxiDeployCertPlugin();
