import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import { SshClient } from '../../lib/ssh.js';
import { CertInfo, CertReader, CertReaderHandleContext } from '@certd/plugin-cert';
import * as fs from 'fs';
import { SshAccess } from '../../access/index.js';

@IsTaskPlugin({
  name: 'uploadCertToHost',
  title: '上传证书到主机',
  icon: 'line-md:uploading-loop',
  group: pluginGroups.host.key,
  desc: '支持上传完成后执行脚本命令',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadCertToHostPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: 'PEM证书保存路径',
    helper: '需要有写入权限，路径要包含证书文件名，文件名不能用*?!等特殊符号，例如：/tmp/cert.pem',
    component: {
      placeholder: '/root/deploy/nginx/cert.pem',
    },
  })
  crtPath!: string;
  @TaskInput({
    title: '私钥保存路径',
    helper: '需要有写入权限，路径要包含私钥文件名，文件名不能用*?!等特殊符号，例如：/tmp/cert.key',
    component: {
      placeholder: '/root/deploy/nginx/cert.key',
    },
  })
  keyPath!: string;

  @TaskInput({
    title: '中间证书保存路径',
    helper: '需要有写入权限，路径要包含私钥文件名，文件名不能用*?!等特殊符号，例如：/tmp/intermediate.crt',
    component: {
      placeholder: '/root/deploy/nginx/intermediate.crt',
    },
  })
  icPath!: string;

  @TaskInput({
    title: 'PFX证书保存路径',
    helper: '用于IIS证书部署，需要有写入权限，路径要包含私钥文件名，文件名不能用*?!等特殊符号，例如：/tmp/cert.pfx',
    component: {
      placeholder: '/root/deploy/nginx/cert.pfx',
    },
  })
  pfxPath!: string;

  @TaskInput({
    title: 'DER证书保存路径',
    helper: '用于Apache证书部署，需要有写入权限，路径要包含私钥文件名，文件名不能用*?!等特殊符号，例如：/tmp/cert.der',
    component: {
      placeholder: '/root/deploy/nginx/cert.der',
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
    title: 'shell脚本命令',
    component: {
      name: 'a-textarea',
      vModel: 'value',
      rows: 6,
    },
    helper: '上传后执行脚本命令，不填则不执行\n注意：如果目标主机是windows，且终端是cmd，系统会自动将多行命令通过“&&”连接成一行',
    required: false,
  })
  script!: string;

  @TaskInput({
    title: '仅复制到当前主机',
    helper:
      '注意：本配置即将废弃\n' +
      '开启后，将直接复制到当前主机某个目录，不上传到主机，由于是docker启动，实际上是复制到docker容器内的“证书保存路径”\n' +
      '你需要事先在docker-compose.yaml中配置主机目录映射： volumes: /your_target_path:/your_target_path',
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

  @TaskOutput({
    title: '中间证书保存路径',
  })
  hostIcPath!: string;
  @TaskOutput({
    title: 'PFX保存路径',
  })
  hostPfxPath!: string;

  @TaskOutput({
    title: 'DER保存路径',
  })
  hostDerPath!: string;

  async onInstance() {}

  copyFile(srcFile: string, destFile: string) {
    if (!srcFile || !destFile) {
      this.logger.warn(`srcFile:${srcFile} 或 destFile:${destFile} 为空，不复制`);
      return;
    }
    const dir = destFile.substring(0, destFile.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.copyFileSync(srcFile, destFile);
    this.logger.info(`复制文件：${srcFile} => ${destFile}`);
  }
  async execute(): Promise<void> {
    const { crtPath, keyPath, cert, accessId } = this;
    const certReader = new CertReader(cert);
    const connectConf: SshAccess = await this.accessService.getById(accessId);
    const sshClient = new SshClient(this.logger);

    const handle = async (opts: CertReaderHandleContext) => {
      const { tmpCrtPath, tmpKeyPath, tmpDerPath, tmpPfxPath, tmpIcPath } = opts;
      if (this.copyToThisHost) {
        this.logger.info('复制到目标路径');
        this.copyFile(tmpCrtPath, crtPath);
        this.copyFile(tmpKeyPath, keyPath);
        this.copyFile(tmpIcPath, this.icPath);
        this.copyFile(tmpPfxPath, this.pfxPath);
        this.copyFile(tmpDerPath, this.derPath);
      } else {
        if (!accessId) {
          throw new Error('主机登录授权配置不能为空');
        }
        this.logger.info('准备上传文件到服务器');

        const transports: any = [];
        if (crtPath) {
          transports.push({
            localPath: tmpCrtPath,
            remotePath: crtPath,
          });
          this.logger.info(`上传证书到主机：${crtPath}`);
        }
        if (keyPath) {
          transports.push({
            localPath: tmpKeyPath,
            remotePath: keyPath,
          });
          this.logger.info(`上传私钥到主机：${keyPath}`);
        }
        if (this.icPath) {
          transports.push({
            localPath: tmpIcPath,
            remotePath: this.icPath,
          });
          this.logger.info(`上传中间证书到主机：${this.icPath}`);
        }
        if (this.pfxPath) {
          transports.push({
            localPath: tmpPfxPath,
            remotePath: this.pfxPath,
          });
          this.logger.info(`上传PFX证书到主机：${this.pfxPath}`);
        }
        if (this.derPath) {
          transports.push({
            localPath: tmpDerPath,
            remotePath: this.derPath,
          });
          this.logger.info(`上传DER证书到主机：${this.derPath}`);
        }
        this.logger.info('开始上传文件到服务器');
        await sshClient.uploadFiles({
          connectConf,
          transports,
          mkdirs: this.mkdirs,
        });
        this.logger.info('上传文件到服务器成功');
        //输出
        this.hostCrtPath = crtPath;
        this.hostKeyPath = keyPath;
        this.hostIcPath = this.icPath;
        this.hostPfxPath = this.pfxPath;
        this.hostDerPath = this.derPath;
      }
    };
    await certReader.readCertFile({
      logger: this.logger,
      handle,
    });

    if (this.script && this.script?.trim()) {
      this.logger.info('执行脚本命令');
      const scripts = this.script.split('\n');
      await sshClient.exec({
        connectConf,
        script: scripts,
      });
    }
  }
}

new UploadCertToHostPlugin();
