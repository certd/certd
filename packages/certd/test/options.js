import _ from 'lodash'
import optionsPrivate from './options.private.js'
const defaultOptions = {
  providers: {
    aliyun: {
      providerType: 'aliyun',
      accessKeyId: '',
      accessKeySecret: ''
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
    domains: ['*.docmirror.cn', 'docmirror.cn'],
    email: 'xiaojunnuo@qq.com',
    challenge: {
      challengeType: 'dns',
      dnsProvider: 'aliyun'
    },
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
      deployName: '流程1-部署到阿里云系列产品',
      tasks: [
        {
          name: '上传证书到云',
          taskType: 'uploadCertToCloud',
          certStore: 'aliyun'
        },
        {
          name: '部署证书到SLB',
          taskType: 'deployCertToAliyunSLB',
          certStore: 'aliyun'
        },
        {
          name: '部署证书到阿里云集群Ingress',
          taskType: 'deployCertToAliyunK8sIngress',
          certStore: 'aliyun'
        }
      ]
    },
    {
      deployName: '流程2-部署到nginx服务器',
      tasks: [
        {
          name: '上传证书到服务器,并重启nginx',
          taskType: 'sshAndExecute',
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
      tasks: [
        {
          name: '触发jenkins任务',
          taskType: 'sshAndExecute',
          ssh: 'myLinux',
          script: 'sudo systemctl restart nginx'
        }
      ]
    }
  ]
}

_.merge(defaultOptions, optionsPrivate)

export default defaultOptions
