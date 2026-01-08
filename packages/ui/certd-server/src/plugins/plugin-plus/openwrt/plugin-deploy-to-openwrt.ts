import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AbstractPlusTaskPlugin, CertReader } from "@certd/plugin-lib";
import { SshAccess } from "../../plugin-lib/ssh/ssh-access.js";
import { SshClient } from "../../plugin-lib/ssh/ssh.js";
@IsTaskPlugin({
  name: "OpenwrtDeployCert",
  title: "Openwrt-部署证书到Openwrt",
  icon: "svg:icon-lucky",
  group: pluginGroups.host.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class OpenwrtDeployCertPlugin extends AbstractPlusTaskPlugin {
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
        sshClient.uploadFiles({
          connectConf: sshConf,
          transports: [
            {
              localPath: crtPath,
              remotePath: "/etc/uhttpd.crt",
            },
            {
              localPath: keyPath,
              remotePath: "/etc/uhttpd.key",
            },
          ],
          mkdirs: true,
        });
      },
    });

    this.logger.info(`证书上传完成，准备重启uhttpd生效`);
    const cmd = `/etc/init.d/uhttpd restart`

    await sshClient.exec({
      connectConf: sshConf,
      script: cmd,
    });

    this.logger.info(`证书部署完成`);
  }
}

new OpenwrtDeployCertPlugin();
