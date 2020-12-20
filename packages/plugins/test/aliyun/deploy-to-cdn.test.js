import pkg from 'chai'
import { DeployCertToAliyunCDN } from '../../src/aliyun/deploy-to-cdn/index.js'
import options from '../options.js'
import { Certd } from '@certd/certd'
const { expect } = pkg
describe('DeployToAliyunCDN', function () {
  it('#execute', async function () {
    const plugin = new DeployCertToAliyunCDN()
    const certd = new Certd()
    const cert = certd.readCurrentCert('xiaojunnuo@qq.com', ['*.docmirror.cn'])
    const ret = await plugin.execute({
      accessProviders: options.accessProviders,
      cert,
      args: { domainName: 'certd-cdn-upload.docmirror.cn', certName: 'certd部署测试', certType: 'cas', accessProvider: 'aliyun' },
      context: {
        aliyunCertId: '4947435'
      }
    })
    console.log('context:', context)
  })
})
