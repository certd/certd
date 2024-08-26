import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import { SshClient } from '../../lib/ssh.js';
import { CertInfo, CertReader } from '@certd/plugin-cert';
import * as fs from 'fs';
import { SshAccess } from '../../access/index.js';

@IsTaskPlugin({
  name: 'uploadCertToHost',
  title: '上传证书到主机',
  group: pluginGroups.host.key,
  desc: '也支持复制证书到本机',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadCertToHostPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '证书保存路径',
    helper: '需要有写入权限，路径要包含证书文件名，文件名不能用*?!等特殊符号',
    component: {
      placeholder: '/root/deploy/nginx/cert.pem',
    },
  })
  crtPath!: string;
  @TaskInput({
    title: '私钥保存路径',
    helper: '需要有写入权限，路径要包含私钥文件名，文件名不能用*?!等特殊符号',
    component: {
      placeholder: '/root/deploy/nginx/cert.key',
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

  @TaskInput({
    title: '主机登录配置',
    helper: 'access授权',
    component: {
      name: 'pi-access-selector',
      type: 'ssh',
    },
    rules: [{ required: false, message: '' }],
  })
  accessId!: string;

  @TaskInput({
    title: '自动创建远程目录',
    helper: '是否自动创建远程目录,如果关闭则你需要自己确保远程目录存在',
    value: true,
    component: {
      name: 'a-switch',
      vModel: 'checked',
    },
  })
  mkdirs = true;

  @TaskInput({
    title: '仅复制到当前主机',
    helper:
      '开启后，将直接复制到当前主机某个目录，不上传到主机，由于是docker启动，实际上是复制到docker容器内的“证书保存路径”，你需要事先在docker-compose.yaml中配置主机目录映射： volumes: /your_target_path:/your_target_path',
    value: false,
    component: {
      name: 'a-switch',
      vModel: 'checked',
    },
  })
  copyToThisHost!: boolean;

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
    const dir = destFile.substring(0, destFile.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.copyFileSync(srcFile, destFile);
  }
  async execute(): Promise<void> {
    const { crtPath, keyPath, cert, accessId } = this;
    const certReader = new CertReader(cert);
    this.logger.info('将证书写入本地缓存文件');
    const saveCrtPath = certReader.saveToFile('crt');
    const saveKeyPath = certReader.saveToFile('key');
    this.logger.info('本地文件写入成功');
    try {
      if (this.copyToThisHost) {
        this.logger.info('复制到目标路径');
        this.copyFile(saveCrtPath, crtPath);
        this.copyFile(saveKeyPath, keyPath);
        this.logger.info('证书复制成功：crtPath=', crtPath, ',keyPath=', keyPath);
      } else {
        if (!accessId) {
          throw new Error('主机登录授权配置不能为空');
        }
        this.logger.info('准备上传文件到服务器');
        const connectConf: SshAccess = await this.accessService.getById(accessId);
        const sshClient = new SshClient(this.logger);
        await sshClient.uploadFiles({
          connectConf,
          transports: [
            {
              localPath: saveCrtPath,
              remotePath: crtPath,
            },
            {
              localPath: saveKeyPath,
              remotePath: keyPath,
            },
          ],
          mkdirs: this.mkdirs,
        });
        this.logger.info('证书上传成功：crtPath=', crtPath, ',keyPath=', keyPath);
      }
    } catch (e) {
      this.logger.error(`上传失败：${e.message}`);
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

new UploadCertToHostPlugin();
