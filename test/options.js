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
      deployName: '流程1-部署到阿里云系列产品',
      disabled: true,
      tasks: [
        {
          taskName: '上传证书到云',
          type: 'uploadCertToAliyun',
          props:{
            accessProvider: 'aliyun'
          }
        },
        { // CDN、SCDN、DCDN和负载均衡（SLB）
          taskName: '部署证书到CDN',
          type: 'deployCertToAliyunCDN',
          props:{
            domainName: 'certd-cdn-upload.docmirror.cn',
            certName: 'certd部署测试(upload)',
            certType: 'upload',
            accessProvider: 'aliyun'
          }
        }
        // {
        //   name: '部署证书到阿里云集群Ingress',
        //   type: 'deployCertToAliyunK8sIngress',
        //   accessProvider: 'aliyun'
        // }
      ]
    },
    {
      deployName: '流程2-部署到nginx服务器',
      disabled: true,
      tasks: [
        {
          taskName: '上传证书到服务器,并重启nginx',
          type: 'sshAndExecute',
          props:{
            accessProvider: 'myLinux',
            upload: [
              { from: '{certPath}', to: '/xxx/xxx/xxx.cert.pem' },
              { from: '{keyPath}', to: '/xxx/xxx/xxx.key' }
            ],
            script: 'sudo systemctl restart nginx'
          }
        }
      ]
    },
    {
      deployName: '流程3-触发jenkins任务',
      disabled: true,
      tasks: [
        {
          taskName: '触发jenkins任务',
          type: 'sshAndExecute',
          props:{
            accessProvider: 'myLinux',
            script: 'sudo systemctl restart nginx'
          }
        }
      ]
    },
    {
      deployName: '流程4-部署到腾讯云ingress',
      tasks: [
        {
          taskName: '上传到腾讯云',
          type: 'uploadCertToTencent',
          props:{
            accessProvider: 'tencent-yonsz'
          }
        },
        {
          taskName: '部署到TKE-ingress',
          type: 'deployCertToTencentTKEIngress',
          props:{
            clusterId:'cls-6lbj1vee',
            ingressName:'ingress-base',
            secretName:'certd-base-yonsz-net-hnuzjrzf',
            accessProvider: 'tencent-yonsz'
          }
        }
      ]
    }
  ]
}

_.merge(defaultOptions, optionsPrivate)

export function createOptions(){
  return _.cloneDeep(defaultOptions)
}
