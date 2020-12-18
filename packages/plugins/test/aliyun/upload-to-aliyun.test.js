import pkg from 'chai'
import { UploadToAliyunPlugin } from '../../src/aliyun/upload-to-aliyun/index.js'
import options from '../options.js'
import { Certd } from '@certd/certd'
const { expect } = pkg
describe('PluginUploadToAliyun', function () {
  it('#execute', async function () {
    const plugin = new UploadToAliyunPlugin()
    const certd = new Certd()
    const cert = certd.readCurrentCert('xiaojunnuo@qq.com', ['*.docmirror.club', 'docmirror.club'])
    const context = {}
    await plugin.execute({
      accessProviders: options.accessProviders,
      cert,
      args: { name: '上传证书到阿里云测试', provider: 'aliyun' },
      context
    })

    console.log('context:', context)
  })
})
