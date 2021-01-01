import pkg from 'chai'
import { UploadCertToAliyun } from '../../src/aliyun/upload-to-aliyun/index.js'
import { Certd } from '@certd/certd'
import { createOptions } from '../../../../test/options.js'
const { expect } = pkg
describe('PluginUploadToAliyun', function () {
  it('#execute', async function () {
    this.timeout(5000)
    const options = createOptions()
    options.cert.email = 'xiaojunnuo@qq.com'
    options.cert.domains = ['_.docmirror.cn']
    const plugin = new UploadCertToAliyun()
    const certd = new Certd(options)
    const cert = await certd.readCurrentCert()
    const context = {}
    const deployOpts = {
      accessProviders: options.accessProviders,
      cert,
      props: { accessProvider: 'aliyun' },
      context
    }
    await plugin.doExecute(deployOpts)
    console.log('context:', context)

    //  await plugin.sleep(1000)
    // await plugin.rollback(deployOpts)
  })
})
