import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import { CertInfo, CertReader } from '@certd/plugin-cert';
import * as fs from 'fs';
import { Constants } from '../../../../basic/constants.js';
import path from 'path';

@IsTaskPlugin({
  name: 'CopyToLocal',
  title: '复制到本机',
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
    helper: '需要有写入权限，路径要包含证书文件名，文件名不能用*?!等特殊符号\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：./tmp/cert.pem',
    component: {
      placeholder: './tmp/cert.pem',
    },
  })
  crtPath!: string;
  @TaskInput({
    title: '私钥保存路径',
    helper: '需要有写入权限，路径要包含私钥文件名，文件名不能用*?!等特殊符号\n推荐使用相对路径，将写入与数据库同级目录，无需映射，例如：./tmp/cert.key',
    component: {
      placeholder: './tmp/cert.key',
    },
  })
  keyPath!: string;
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'pi-output-selector',
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskOutput({
    title: '证书保存路径',
  })
  hostCrtPath!: string;

  @TaskOutput({
    title: '私钥保存路径',
  })
  hostKeyPath!: string;

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
    let { crtPath, keyPath } = this;
    const certReader = new CertReader(this.cert);
    this.logger.info('将证书写入本地缓存文件');
    const saveCrtPath = certReader.saveToFile('crt');
    const saveKeyPath = certReader.saveToFile('key');
    this.logger.info('本地文件写入成功');
    try {
      this.logger.info('复制到目标路径');

      crtPath = crtPath.startsWith('/') ? crtPath : path.join(Constants.dataDir, crtPath);
      keyPath = keyPath.startsWith('/') ? keyPath : path.join(Constants.dataDir, keyPath);
      // crtPath = path.resolve(crtPath);
      // keyPath = path.resolve(keyPath);
      this.copyFile(saveCrtPath, crtPath);
      this.copyFile(saveKeyPath, keyPath);
      this.logger.info('证书复制成功：crtPath=', crtPath, ',keyPath=', keyPath);
      this.logger.info('请注意，如果使用的是相对路径，那么文件就在你的数据库同级目录下，默认是/data/certd/下面');
      this.logger.info('请注意，如果使用的是绝对路径，文件在容器内的目录下，你需要给容器做目录映射才能复制到宿主机');
    } catch (e) {
      this.logger.error(`复制失败：${e.message}`);
      throw e;
    } finally {
      //删除临时文件
      this.logger.info('删除临时文件');
      fs.unlinkSync(saveCrtPath);
      fs.unlinkSync(saveKeyPath);
    }
    this.logger.info('执行完成');
    //输出
    this.hostCrtPath = crtPath;
    this.hostKeyPath = keyPath;
  }
}

new CopyCertToLocalPlugin();
