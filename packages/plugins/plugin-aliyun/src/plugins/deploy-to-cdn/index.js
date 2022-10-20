import { AbstractAliyunPlugin } from '../abstract-aliyun.js'
import Core from '@alicloud/pop-core'
import dayjs from 'dayjs'

const define = {
  name: 'deployCertToAliyunCDN',
  title: '部署到阿里云CDN',
  input: {
    domainName: {
      title: 'cdn加速域名',
      component: {
        placeholder: 'cdn加速域名'
      },
      required: true
    },
    certName: {
      title: '证书名称',
      component: {
        placeholder: '上传后将以此名称作为前缀'
      }
    },
    from: {
      value: 'upload',
      title: '证书来源',
      required: true,
      component: {
        placeholder: '证书来源',
        name: 'a-select',
        options: [
          { value: 'upload', label: '直接上传' }
        ]
      }
    },
    accessProvider: {
      label: 'Access提供者',
      type: [String, Object],
      desc: 'access授权',
      component: {
        name: 'access-selector',
        type: 'aliyun'
      },
      required: true
    }
  },
  output: {

  }
}

export class DeployCertToAliyunCDN extends AbstractAliyunPlugin {
  static define () {
    return define
  }

  async execute ({ cert, props, context }) {
    const accessProvider = this.getAccessProvider(props.accessProvider)
    const client = this.getClient(accessProvider)
    const params = this.buildParams(props, context, cert)
    await this.doRequest(client, params)
  }

  getClient (aliyunProvider) {
    return new Core({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: 'https://cdn.aliyuncs.com',
      apiVersion: '2018-05-10'
    })
  }

  buildParams (args, context, cert) {
    const { certName, from, domainName } = args
    const CertName = certName + '-' + dayjs().format('YYYYMMDDHHmmss')

    const params = {
      RegionId: 'cn-hangzhou',
      DomainName: domainName,
      ServerCertificateStatus: 'on',
      CertName: CertName,
      CertType: from,
      ServerCertificate: cert.crt,
      PrivateKey: cert.key
    }
    return params
  }

  async doRequest (client, params) {
    const requestOption = {
      method: 'POST'
    }
    const ret = await client.request('SetDomainServerCertificate', params, requestOption)
    this.checkRet(ret)
    this.logger.info('设置cdn证书成功:', ret.RequestId)
  }
}
