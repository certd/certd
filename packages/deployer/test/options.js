import _ from 'lodash'
import optionsPrivate from '../../../test/options.private.js'
const defaultOptions = {
  accessProviders: {
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
    domains: ['*.docmirror.club', 'docmirror.xyz'],
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
          type: 'uploadCertToAliyun',
          certStore: 'aliyun'
        },
        { // CDN、SCDN、DCDN和负载均衡（SLB）
          name: '部署证书到SLB',
          type: 'deployCertToAliyunSLB',
          certStore: 'aliyun'
        },
        {
          name: '部署证书到阿里云集群Ingress',
          type: 'deployCertToAliyunK8sIngress',
          certStore: 'aliyun'
        }
      ]
    },
    {
      deployName: '流程2-部署到nginx服务器',
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

export default defaultOptions
