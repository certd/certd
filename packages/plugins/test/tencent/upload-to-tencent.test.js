import pkg from 'chai'
import { UploadCertToTencent } from '../../src/tencent/upload-to-tencent/index.js'
import { Certd } from '@certd/certd'
import { createOptions } from '../../../../test/options.js'
const { expect } = pkg
describe('PluginUploadToTencent', function () {
  it('#execute', async function () {
    const options = createOptions()
    const plugin = new UploadCertToTencent()
    options.args = { test: false }
    const certd = new Certd(options)
    const cert = certd.readCurrentCert('xiaojunnuo@qq.com', ['*.docmirror.cn'])
    const context = {}
    const uploadOpts = {
      accessProviders: options.accessProviders,
      cert,
      props: { name: 'certd部署测试', accessProvider: 'tencent' },
      context
    }
    await plugin.doExecute(uploadOpts)
    console.log('context:', context)

    await plugin.doRollback(uploadOpts)
  })
})
