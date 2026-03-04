import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { httpsServer } from '../../modules/auto/https/server.js';
import { RestartCertdPlugin } from './plugin-restart.js';
import path from 'path';
import fs from 'fs';
import { CertApplyPluginNames, CertInfo, CertReader } from '@certd/plugin-lib';

@IsTaskPlugin({
  name: 'DeployToCertd',
  title: '部署证书到Certd本身',
  icon: 'mdi:restart',
  desc: '【仅管理员可用】 部署证书到 certd的https服务，用于更新 Certd 的 ssl 证书，建议将此任务放在流水线的最后一步',
  group: pluginGroups.admin.key,
  onlyAdmin: true,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployToCertdPlugin extends AbstractTaskPlugin {

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;
  async onInstance() { }
  async execute(): Promise<void> {
    this.checkAdmin();

    //部署证书
    let crtPath = "ssl/cert.crt";
    let keyPath = "ssl/cert.key";

    const certReader = new CertReader(this.cert);
    const dataDir = "./data";
    const handle = async ({ tmpCrtPath, tmpKeyPath, }) => {
      this.logger.info('复制到目标路径');
      if (crtPath) {
        crtPath = crtPath.startsWith('/') ? crtPath : path.join(dataDir, crtPath);
        this.copyFile(tmpCrtPath, crtPath);
      }
      if (keyPath) {
        keyPath = keyPath.trim();
        keyPath = keyPath.startsWith('/') ? keyPath : path.join(dataDir, keyPath);
        this.copyFile(tmpKeyPath, keyPath);
      }
    };

    await certReader.readCertFile({ logger: this.logger, handle });
    this.logger.info(`证书已部署到 ${crtPath} 和 ${keyPath}`);


    this.logger.info('Certd https server 将在 30 秒后重启');
    await this.ctx.utils.sleep(30000);
    await httpsServer.restart();
  }

  copyFile(srcFile: string, destFile: string) {
    this.logger.info(`复制文件：${srcFile} => ${destFile}`);
    const dir = path.dirname(destFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.copyFileSync(srcFile, destFile);
  }
}
new RestartCertdPlugin();
