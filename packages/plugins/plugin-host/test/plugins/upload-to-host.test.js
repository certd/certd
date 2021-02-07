import pkg from 'chai'
import { UploadCertToHost } from '../../src/plugins/upload-to-host/index.js'
import { Certd } from '@certd/certd'
import { createOptions } from '../../../../../test/options.js'
const { expect } = pkg
describe('PluginUploadToHost', function () {
  it('#execute', async function () {
    this.timeout(10000)
    const options = createOptions()
    options.args = { test: false }
    options.cert.email = 'xiaojunnuo@qq.com'
    options.cert.domains = ['*.docmirror.cn']
    const plugin = new UploadCertToHost(options)
    const certd = new Certd(options)
    const cert = await certd.readCurrentCert()
    const context = {}
    const uploadOpts = {
      cert,
      props: { crtPath: '/root/certd/test/test.crt', keyPath: '/root/certd/test/test.key', accessProvider: 'aliyun-ssh' },
      context
    }
    await plugin.doExecute(uploadOpts)
    console.log('context:', context)

    await plugin.doRollback(uploadOpts)
  })
})
