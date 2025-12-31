import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import {
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine,
} from "@certd/plugin-lib";
import { SshAccess } from "../plugin-lib/ssh/ssh-access.js";
import { SshClient } from "../plugin-lib/ssh/ssh.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "FnOSDeployToNAS",
  title: "飞牛NAS-部署证书",
  icon: "svg:icon-fnos",
  //插件分组
  group: pluginGroups.panel.key,
  needPlus: false,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
//类名规范，跟上面插件名称（name）一致
export class FnOSDeployToNAS extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames]
    }
    // required: true, // 必填
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "飞牛SSH授权",
    component: {
      name: "access-selector",
      type: "ssh" //固定授权类型
    },
    helper:"请先配置sudo免密：\nsudo visudo\n#在文件最后一行增加以下内容，需要将username替换成自己的用户名\nusername ALL=(ALL) NOPASSWD: NOPASSWD: ALL\nctrl+x 保存退出",
    required: true //必填
  })
  accessId!: string;



  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书Id",
      helper: "面板证书请选择fnOS，其他FTP、webdav等证书请选择已使用，可多选（如果证书域名都匹配的话）",
      action: FnOSDeployToNAS.prototype.onGetCertList.name
    })
  )
  certList!: number[];

  //插件实例化时执行的方法
  async onInstance() {
  }

  //插件执行方法
  async execute(): Promise<void> {
    const access: SshAccess = await this.getAccess<SshAccess>(this.accessId);

    const client = new SshClient(this.logger);

    //复制证书
    const list = await this.doGetCertList()

    const certReader = new CertReader(this.cert);
    const expiresAt = certReader.expires;
    const validFrom = certReader.detail.notBefore.getTime()
    for (const target of this.certList) {
      this.logger.info(`----------- 准备部署：${target}`);
      let found = false
      for (const item of list) {
        if (item.sum === target) {
          this.logger.info(`----------- 找到证书,开始部署：${item.sum},${item.domain}`)
          const certPath = item.certificate;
          const keyPath = item.privateKey;
          const certDir = keyPath.substring(0, keyPath.lastIndexOf("/"));
          const fullchainPath = certDir+ "/fullchain.crt"
          const caPath = certDir+ "/issuer_certificate.crt"
          const cmd = `
sudo tee ${certPath} > /dev/null <<'EOF'
${this.cert.crt}
EOF
sudo tee ${keyPath} > /dev/null <<'EOF'
${this.cert.key}
EOF
sudo tee ${fullchainPath} > /dev/null <<'EOF'
${this.cert.crt}
EOF
sudo tee ${caPath} > /dev/null <<'EOF'
${this.cert.ic}
EOF

sudo chmod 0755 "${certDir}/" -R

sudo -u postgres psql -d trim_connect -c "UPDATE cert SET  valid_to=${expiresAt},valid_from=${validFrom} WHERE private_key='${item.privateKey}'"

`
          const res = await client.exec({
          connectConf: access,
          script: cmd
        });
          if (res.indexOf("Permission denied") > -1){
              this.logger.error("权限不足，请先配置 sudo 免密")
          }
          found = true
          break
        }
      }
      if (!found) {
        throw new Error(`没有找到证书：${target}，请修改任务重新选择证书id`);
      }
    }


    this.logger.info("证书已上传，准备重启...");


    const restartCmd= `
echo "正在重启相关服务..."
sudo systemctl restart webdav.service
sudo systemctl restart smbftpd.service
sudo systemctl restart trim_nginx.service
echo "服务重启完成！"
`
    await client.exec({
      connectConf: access,
      script: restartCmd
    });

    this.logger.info("部署完成");
  }

  async doGetCertList(){
    const access: SshAccess = await this.getAccess<SshAccess>(this.accessId);
    const client = new SshClient(this.logger);

    /**
     * :/usr/trim/etc$ cat network_cert_all.conf | jq .
     */
    const sslListCmd = "cat /usr/trim/etc/network_cert_all.conf | jq ."

    const res:string = await client.exec({
      connectConf: access,
      script: sslListCmd
    });
    let list = []
    try{
      list = JSON.parse(res.trim())
    }catch (e){
      throw new Error(`证书列表解析失败：${res}`)
    }

    if (!list || list.length === 0) {
      throw new Error("没有找到证书，请先在证书管理页面上传一次证书");
    }
    return list
  }

  async onGetCertList() {

    const list = await this.doGetCertList()

    const options = list.map((item: any) => {
      return {
        label: `${item.domain}<${item.used?'已使用':"未使用"}-${item.sum}>`,
        value: item.sum,
        domain: item.san
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new FnOSDeployToNAS();
