import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import { CertInfo, CertReader } from '@certd/plugin-cert';
import * as fs from 'fs';
import { Constants } from '../../../../basic/constants.js';
import path from 'path';

@IsTaskPlugin({
  name: 'CopyToLocal',
  title: '复制到本机',
  icon: 'solar:copy-bold-duotone',
  desc: '【仅管理员使用】实际上是复制证书到docker容器内的某个路径，需要做目录映射到宿主机',
  group: pluginGroups.host.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class CopyCertToLocalPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '证书保存路径',
    helper: '全链证书，路径要包含文件名，文件名不能用*?!等特殊符号' + '\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：./tmp/cert.pem',
    component: {
      placeholder: './tmp/full_chain.pem',
    },
  })
  crtPath!: string;
  @TaskInput({
    title: '私钥保存路径',
    helper: '路径要包含文件名，文件名不能用*?!等特殊符号\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：./tmp/cert.key',
    component: {
      placeholder: './tmp/cert.key',
    },
  })
  keyPath!: string;

  @TaskInput({
    title: '中间证书保存路径',
    helper: '一般情况传上面两个文件就行了，极少数情况需要这个中间证书',
    component: {
      placeholder: '/root/deploy/nginx/intermediate.pem',
    },
  })
  icPath!: string;

  @TaskInput({
    title: 'PFX证书保存路径',
    helper: '用于IIS证书部署，路径要包含文件名，文件名不能用*?!等特殊符号\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：./tmp/cert.pfx',
    component: {
      placeholder: './tmp/cert.pfx',
    },
  })
  pfxPath!: string;

  @TaskInput({
    title: 'DER证书保存路径',
    helper:
      '用户Apache证书部署，路径要包含文件名，文件名不能用*?!等特殊符号\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：./tmp/cert.der\n.der和.cer是相同的东西，改个后缀名即可',
    component: {
      placeholder: './tmp/cert.der 或 ./tmp/cert.cer',
    },
  })
  derPath!: string;

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'pi-output-selector',
      from: ['CertApply', 'CertApplyLego'],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskOutput({
    title: '证书保存路径',
    type: 'HostCrtPath',
  })
  hostCrtPath!: string;

  @TaskOutput({
    title: '私钥保存路径',
    type: 'HostKeyPath',
  })
  hostKeyPath!: string;

  @TaskOutput({
    title: '中间证书保存路径',
    type: 'HostKeyPath',
  })
  hostIcPath!: string;

  @TaskOutput({
    title: 'PFX保存路径',
    type: 'HostPfxPath',
  })
  hostPfxPath!: string;

  @TaskOutput({
    title: 'DER保存路径',
    type: 'HostDerPath',
  })
  hostDerPath!: string;

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
    if (!this.isAdmin()) {
      throw new Error('只有管理员才能运行此任务');
    }

    let { crtPath, keyPath, icPath, pfxPath, derPath } = this;
    const certReader = new CertReader(this.cert);

    const handle = async ({ reader, tmpCrtPath, tmpKeyPath, tmpDerPath, tmpPfxPath, tmpIcPath }) => {
      this.logger.info('复制到目标路径');
      if (crtPath) {
        crtPath = crtPath.startsWith('/') ? crtPath : path.join(Constants.dataDir, crtPath);
        this.copyFile(tmpCrtPath, crtPath);
        this.hostCrtPath = crtPath;
      }
      if (keyPath) {
        keyPath = keyPath.startsWith('/') ? keyPath : path.join(Constants.dataDir, keyPath);
        this.copyFile(tmpKeyPath, keyPath);
        this.hostKeyPath = keyPath;
      }
      if (icPath) {
        icPath = icPath.startsWith('/') ? icPath : path.join(Constants.dataDir, icPath);
        this.copyFile(tmpIcPath, icPath);
        this.hostIcPath = icPath;
      }
      if (pfxPath) {
        pfxPath = pfxPath.startsWith('/') ? pfxPath : path.join(Constants.dataDir, pfxPath);
        this.copyFile(tmpPfxPath, pfxPath);
        this.hostPfxPath = pfxPath;
      }
      if (derPath) {
        derPath = derPath.startsWith('/') ? derPath : path.join(Constants.dataDir, derPath);
        this.copyFile(tmpDerPath, derPath);
        this.hostDerPath = derPath;
      }
      this.logger.info('请注意，如果使用的是相对路径，那么文件就在你的数据库同级目录下，默认是/data/certd/下面');
      this.logger.info(
        '请注意，如果使用的是绝对路径，文件在容器内的目录下，你需要给容器做目录映射才能复制到宿主机，需要在docker-compose.yaml中配置主机目录映射： volumes: /你宿主机的路径:/任务配置的证书路径'
      );
    };

    await certReader.readCertFile({ logger: this.logger, handle });

    this.logger.info('执行完成');
  }
}

new CopyCertToLocalPlugin();
