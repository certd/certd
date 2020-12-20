import pkg from 'chai'
import { UploadCertToAliyun } from '../../src/aliyun/upload-to-aliyun/index.js'
import options from '../options.js'
import { Certd } from '@certd/certd'
const { expect } = pkg
describe('PluginUploadToAliyun', function () {
  it('#execute', async function () {
    const plugin = new UploadCertToAliyun()
    const certd = new Certd()
    const cert = certd.readCurrentCert('xiaojunnuo@qq.com', ['_.docmirror.cn'])
    const context = {}
    await plugin.execute({
      accessProviders: options.accessProviders,
      cert,
      context,
      args: { name: 'certd部署测试', provider: 'aliyun' }
    })

    console.log('context:', context)
  })
})
