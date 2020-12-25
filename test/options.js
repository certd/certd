import _ from 'lodash'
import optionsPrivate from './options.private.js'
const defaultOptions = {
  args: {
    forceCert: false, // 强制更新证书
    skipCert: false, // 是否跳过证书申请环节
    forceDeploy: false,
    test: true
  },
  accessProviders: {
    aliyun: {
      providerType: 'aliyun',
      accessKeyId: '',
      accessKeySecret: ''
    },
    dnspod: {
      providerType: 'dnspod',
      id: '',
      token: ''
    },
    tencent: {
      providerType: 'tencent',
      secretId: '',
      secretKey: ''
    },
    myLinux: {
      providerType: 'SSH',
      username: 'xxx',
      password: 'xxx',
      host: '1111.com',
      port: 22,
      publicKey: ''
    }
  },
  cert: {
    domains: ['*.docmirror.cn'],
    email: 'xiaojunnuo@qq.com',
    dnsProvider: 'aliyun',
    csrInfo: {
      country: 'CN',
      state: 'GuangDong',
      locality: 'ShengZhen',
      organization: 'CertD Org.',
      organizationUnit: 'IT Department',
      emailAddress: 'xiaojunnuo@qq.com'
    }
  },
  deploy: [
    {
      name: '流程1-部署到阿里云系列产品',
      disabled: true,
      tasks: [
        {
          name: '上传证书到云',
          type: 'uploadCertToAliyun',
          accessProvider: 'aliyun'
        },
        { // CDN、SCDN、DCDN和负载均衡（SLB）
          name: '部署证书到CDN',
          type: 'deployCertToAliyunCDN',
          domainName: 'certd-cdn-upload.docmirror.cn',
          certName: 'certd部署测试(upload)',
          certType: 'upload',
          accessProvider: 'aliyun'
        }
        // {
        //   name: '部署证书到阿里云集群Ingress',
        //   type: 'deployCertToAliyunK8sIngress',
        //   accessProvider: 'aliyun'
        // }
      ]
    },
    {
      name: '流程2-部署到nginx服务器',
      disabled: true,
      tasks: [
        {
          name: '上传证书到服务器,并重启nginx',
          type: 'sshAndExecute',
          ssh: 'myLinux',
          upload: [
            { from: '{certPath}', to: '/xxx/xxx/xxx.cert.pem' },
            { from: '{keyPath}', to: '/xxx/xxx/xxx.key' }
          ],
          script: 'sudo systemctl restart nginx'
        }
      ]
    },
    {
      deployName: '流程3-触发jenkins任务',
      disabled: true,
      tasks: [
        {
          name: '触发jenkins任务',
          type: 'sshAndExecute',
          ssh: 'myLinux',
          script: 'sudo systemctl restart nginx'
        }
      ]
    }
  ]
}

_.merge(defaultOptions, optionsPrivate)

export function createOptions(){
  return _.cloneDeep(defaultOptions)
}
