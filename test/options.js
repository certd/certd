import _ from 'lodash'
import optionsPrivate from './options.private.js'
const defaultOptions = {
  args: {
    forceCert: false, // 强制更新证书
    skipCert: false, // 是否跳过证书申请环节
    forceDeploy: true,
    test: false
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
    dnsProvider: {
      type:'aliyun',
      accessProvider:'aliyun'
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
      disabled: false,
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
            from: 'upload',
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
      disabled: false,
      tasks: [
        {
          taskName: '上传证书到服务器',
          type: 'uploadCertToHost',
          props:{
            accessProvider: 'aliyun-ssh',
            crtPath: '/root/certd-test/cert.pem',
            keyPath: '/root/certd-test/cert.key'
          }
        },
        {
          taskName: '重启linux',
          type: 'hostShellExecute',
          props:{
            accessProvider: 'aliyun-ssh',
            script: ['ls']
          }
        }
      ]
    },
    {
      deployName: '流程4-部署到腾讯云ingress',
      disabled: true,
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
  return  _.cloneDeep(defaultOptions)
}

export function getDnsProviderOptions (options) {
  if(!options){
    options = createOptions()
  }
  return { accessProviders: options.accessProviders, props: options.cert.dnsProvider }
}
