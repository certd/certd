import { AbstractPlugin } from '../../abstract-plugin/index.js'
import Core from '@alicloud/pop-core'
import dayjs from 'dayjs'
export class UploadCertToAliyunPlugin extends AbstractPlugin {
  getClient (aliyunProvider) {
    this.client = new Core({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: 'https://alidns.aliyuncs.com',
      apiVersion: '2015-01-09'
    })
  }

  async execute ({ providers, cert, args, context }) {
    const { name, provider } = args
    const certName = name + '-' + dayjs().format('YYYYMMDDHHmmss')
    const params = {
      RegionId: 'cn-hangzhou',
      Name: certName,
      Cert: cert.crt.toString(),
      Key: cert.key.toString()
    }

    const requestOption = {
      method: 'POST'
    }

    const client = this.getClient(providers[provider])
    const ret = await client.request('CreateUserCertificate', params, requestOption)

    context.AliyunCertId = ret.CertId
  }
}
