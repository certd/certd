import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import { CertInfo, CertReader, CertReaderHandleContext } from '@certd/plugin-cert';
import dayjs from 'dayjs';
import { SshAccess, SshClient } from '../../../plugin-lib/ssh/index.js';
import { CertApplyPluginNames} from '@certd/plugin-cert';
@IsTaskPlugin({
  name: 'uploadCertToHost',
  title: '主机-部署证书到SSH主机',
  icon: 'line-md:uploading-loop',
  group: pluginGroups.host.key,
  desc: '上传证书到主机覆盖原来的证书文件，然后自动执行部署脚本命令使证书生效',
  order: 1,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadCertToHostPlugin extends AbstractTaskPlugin {
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

  @TaskInput({
    title: '证书格式',
    helper: '要部署的证书格式，支持pem/crt、pfx、der、jks、p7b\n你原来的证书是哪种格式就选择哪种',
    component: {
      name: 'a-select',
      options: [
        { value: 'pem', label: 'pem/crt，用于Nginx等大部分应用，证书和私钥2个文件' },
        { value: 'pfx', label: 'pfx，一般用于IIS' },
        { value: 'der', label: 'der，一般用于Apache' },
        { value: 'jks', label: 'jks，一般用于JAVA应用' },
        { value: 'one', label: '证书私钥一体，crt+key简单合并为一个pem文件' },
        { value: 'p7b', label: 'p7b格式' },
      ],
    },
    required: true,
  })
  certType!: string;

  @TaskInput({
    title: '证书保存路径',
    helper: '填写应用原本的证书保存路径，路径要包含证书文件名，例如：/tmp/cert.pem',
    component: {
      placeholder: '/root/deploy/nginx/full_chain.pem',
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem';
        })
      }
    `,
    required: true,
    rules: [{ type: 'filepath' }],
  })
  crtPath!: string;
  @TaskInput({
    title: '私钥保存路径',
    helper: '原本的私钥保存路径，需要有写入权限，路径要包含私钥文件名，例如：/tmp/cert.key',
    component: {
      placeholder: '/root/deploy/nginx/cert.key',
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem' || form.certType === 'p7b' ;
        })
      }
    `,
    required: true,
    rules: [{ type: 'filepath' }],
  })
  keyPath!: string;

  @TaskInput({
    title: '中间证书保存路径',
    helper: '路径要包含文件名，一般情况传上面两个文件即可，极少数情况需要这个中间证书',
    component: {
      placeholder: '/root/deploy/nginx/intermediate.pem',
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem';
        })
      }
    `,
    rules: [{ type: 'filepath' }],
  })
  icPath!: string;

  @TaskInput({
    title: 'PFX证书保存路径',
    helper: '填写应用原本的证书保存路径，路径要包含证书文件名，例如：D:\\iis\\cert.pfx',
    component: {
      placeholder: 'D:\\iis\\cert.pfx',
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pfx';
        })
      }
    `,
    required: true,
    rules: [{ type: 'filepath' }],
  })
  pfxPath!: string;

  @TaskInput({
    title: 'DER证书保存路径',
    helper: '填写应用原本的证书保存路径，路径要包含证书文件名，例如：/tmp/cert.der',
    component: {
      placeholder: '/root/deploy/apache/cert.der',
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'der';
        })
      }
    `,
    required: true,
    rules: [{ type: 'filepath' }],
  })
  derPath!: string;

  @TaskInput({
    title: 'jks证书保存路径',
    helper: '填写应用原本的证书保存路径，路径要包含证书文件名，例如：/tmp/cert.jks',
    component: {
      placeholder: '/root/deploy/java_app/cert.jks',
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'jks';
        })
      }
    `,
    required: true,
    rules: [{ type: 'filepath' }],
  })
  jksPath!: string;

  @TaskInput({
    title: '一体证书保存路径',
    helper: '填写应用原本的证书保存路径，路径要包含证书文件名，例如：/tmp/crt_key.pem',
    component: {
      placeholder: '/root/deploy/app/crt_key.pem',
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'one';
        })
      }
    `,
    required: true,
    rules: [{ type: 'filepath' }],
  })
  onePath!: string;

  @TaskInput({
    title: 'p7b证书保存路径',
    helper: '填写应用原本的证书保存路径，路径要包含证书文件名，例如：/tmp/domain_cert.p7b',
    component: {
      placeholder: '/root/deploy/app/domain_cert.p7b',
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'p7b';
        })
      }
    `,
    required: true,
    rules: [{ type: 'filepath' }],
  })
  p7bPath!: string;

  @TaskInput({
    title: '主机登录配置',
    helper: 'access授权',
    component: {
      name: 'access-selector',
      type: 'ssh',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '上传方式',
    helper: '支持sftp或者scp\n需要有写入权限，如果没有，须先将证书上传到有权限的目录，再通过后置命令复制到目标路径',
    value:"sftp",
    component: {
      name: 'a-select',
      options: [
        { value: 'sftp', label: 'sftp' },
        { value: 'scp', label: 'scp' },
      ],
    },
    required: true,
  })
  uploadType: string = 'sftp';

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
    title: '前置命令',
    component: {
      name: 'a-textarea',
      vModel: 'value',
      rows: 3,
      placeholder: 'mkdir /app/ssl',
    },
    helper: '上传前执行脚本命令，做上传前的准备工作',
    required: false,
  })
  scriptPre!: string;

  @TaskInput({
    title: '后置命令',
    component: {
      name: 'a-textarea',
      vModel: 'value',
      rows: 5,
      placeholder: 'systemctl restart nginx ',
    },
    helper: '上传后执行脚本命令，让证书生效（比如重启nginx），不填则不执行\n注意：sudo需要配置免密，不要使用-i这种交互式命令\n注意：如果目标主机是windows，且终端是cmd，系统会自动将多行命令通过“&&”连接成一行',
    required: false,
  })
  script!: string;

  @TaskInput({
    title: '注入环境变量',
    value: false,
    component: {
      name: 'a-switch',
      vModel: 'checked',
    },
    helper: '是否将证书域名、路径等信息注入脚本执行环境变量中，具体的变量名称，可以运行后从日志中查看',
    required: false,
  })
  injectEnv!: string;

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
  @TaskOutput({
    title: 'jks保存路径',
  })
  hostJksPath!: string;

  @TaskOutput({
    title: '一体证书保存路径',
  })
  hostOnePath!: string;

  @TaskOutput({
    title: 'p7b证书保存路径',
  })
  hostP7bPath!: string;

  async onInstance() {}


  async execute(): Promise<void> {
    const { cert, accessId } = this;
    let { crtPath, keyPath, icPath, pfxPath, derPath, jksPath, onePath,p7bPath } = this;
    const certReader = new CertReader(cert);

    const executeCmd = async ( script:string)=> {
      if (script && script?.trim()) {
        const connectConf: SshAccess = await this.getAccess(accessId);
        const sshClient = new SshClient(this.logger);
        this.logger.info('执行脚本命令');

        //环境变量
        const env = {};
        if (this.injectEnv) {
          const domains = certReader.getAllDomains();
          for (let i = 0; i < domains.length; i++) {
            env[`CERT_DOMAIN_${i}`] = domains[i];
          }
          //环境变量必须是string
          env['CERT_EXPIRES'] = "" + dayjs(certReader.getCrtDetail().expires).unix();

          env['HOST_CRT_PATH'] = this.hostCrtPath || '';
          env['HOST_KEY_PATH'] = this.hostKeyPath || '';
          env['HOST_IC_PATH'] = this.hostIcPath || '';
          env['HOST_PFX_PATH'] = this.hostPfxPath || '';
          env['HOST_DER_PATH'] = this.hostDerPath || '';
          env['HOST_JKS_PATH'] = this.hostJksPath || '';
          env['HOST_ONE_PATH'] = this.hostOnePath || '';
          env['HOST_P7B_PATH'] = this.hostOnePath || '';
        }

        const scripts = script.split('\n');
        await sshClient.exec({
          connectConf,
          script: scripts,
          env,
        });
      }
    }

    const handle = async (opts: CertReaderHandleContext) => {
      const { tmpCrtPath, tmpKeyPath, tmpDerPath, tmpJksPath, tmpPfxPath, tmpIcPath, tmpOnePath ,tmpP7bPath} = opts;

      if (accessId == null) {
        this.logger.error('复制到当前主机功能已迁移到 “复制到本机”插件，请换成复制到本机插件');
        return;
      }
      const connectConf: SshAccess = await this.getAccess(accessId);
      const sshClient = new SshClient(this.logger);

      if (!accessId) {
        throw new Error('主机登录授权配置不能为空');
      }
      this.logger.info('准备上传文件到服务器');

      const transports: any = [];
      if (crtPath) {
        crtPath = crtPath.trim();
        transports.push({
          localPath: tmpCrtPath,
          remotePath: crtPath,
        });
        this.logger.info(`上传证书到主机：${crtPath}`);
      }
      if (keyPath) {
        keyPath = keyPath.trim();
        transports.push({
          localPath: tmpKeyPath,
          remotePath: keyPath,
        });
        this.logger.info(`上传私钥到主机：${keyPath}`);
      }
      if (icPath) {
        icPath = icPath.trim();
        transports.push({
          localPath: tmpIcPath,
          remotePath: icPath,
        });
        this.logger.info(`上传中间证书到主机：${icPath}`);
      }
      if (pfxPath) {
        pfxPath = pfxPath.trim();
        transports.push({
          localPath: tmpPfxPath,
          remotePath: pfxPath,
        });
        this.logger.info(`上传PFX证书到主机：${pfxPath}`);
      }
      if (derPath) {
        derPath = derPath.trim();
        transports.push({
          localPath: tmpDerPath,
          remotePath: derPath,
        });
        this.logger.info(`上传DER证书到主机：${derPath}`);
      }
      if (this.jksPath) {
        jksPath = jksPath.trim();
        transports.push({
          localPath: tmpJksPath,
          remotePath: jksPath,
        });
        this.logger.info(`上传jks证书到主机：${jksPath}`);
      }

      if (this.onePath) {
        this.logger.info(`上传一体证书到主机：${this.onePath}`);
        onePath = this.onePath.trim();
        transports.push({
          localPath: tmpOnePath,
          remotePath: this.onePath,
        });
      }
      if (this.p7bPath) {
        this.logger.info(`上传p7b证书到主机：${this.p7bPath}`);
        p7bPath = this.p7bPath.trim();
        transports.push({
          localPath: tmpP7bPath,
          remotePath: this.p7bPath,
        });
      }

      this.logger.info('开始上传文件到服务器');
      await sshClient.uploadFiles({
        connectConf,
        transports,
        mkdirs: this.mkdirs,
        uploadType: this.uploadType,
      });

      this.logger.info('上传文件到服务器成功');
      //输出
      this.hostCrtPath = crtPath;
      this.hostKeyPath = keyPath;
      this.hostIcPath = icPath;
      this.hostPfxPath = pfxPath;
      this.hostDerPath = derPath;
      this.hostJksPath = jksPath;
      this.hostOnePath = onePath;
      this.hostP7bPath = p7bPath;
    };

    //执行前置命令
    await executeCmd(this.scriptPre);

    //上传文件
    await certReader.readCertFile({
      logger: this.logger,
      handle,
    });

    //执行后置命令
    await executeCmd(this.script);
  }
}

new UploadCertToHostPlugin();
