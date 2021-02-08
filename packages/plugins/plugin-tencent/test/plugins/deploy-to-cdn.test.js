import pkg from 'chai'
import { DeployCertToTencentCDN } from '../../src/plugins/deploy-to-cdn/index.js'
import { Certd } from '@certd/certd'
import { UploadCertToTencent } from '../../src/plugins/upload-to-tencent/index.js'
import { createOptions } from '../../../../../test/options.js'
const { expect } = pkg
describe('DeployToTencentCDN', function () {
  it('#execute-from-store', async function () {
    const options = createOptions()
    options.args.test = false
    const certd = new Certd(options)
    const cert = await certd.readCurrentCert('xiaojunnuo@qq.com', ['*.docmirror.cn'])
    const context = {}
    const uploadPlugin = new UploadCertToTencent(options)
    const uploadOptions = {
      cert,
      props: { name: 'certd部署测试', accessProvider: 'tencent' },
      context
    }
    await uploadPlugin.doExecute(uploadOptions)

    const deployPlugin = new DeployCertToTencentCDN(options)
    const deployOpts = {
      cert,
      props: { domainName: 'tentcent-certd.docmirror.cn', certName: 'certd部署测试', accessProvider: 'tencent' },
      context
    }
    await deployPlugin.doExecute(deployOpts)
    console.log('context:', context)
    expect(context.tencentCertId).ok

    await uploadPlugin.doRollback(uploadOptions)
  })
  it('#execute-upload', async function () {
    const options = createOptions()
    options.args.test = false
    options.cert.email = 'xiaojunnuo@qq.com'
    options.cert.domains = ['*.docmirror.cn']
    const plugin = new DeployCertToTencentCDN(options)
    const certd = new Certd(options)
    const cert = await certd.readCurrentCert()
    const context = {}
    const deployOpts = {
      cert,
      props: { domainName: 'tentcent-certd.docmirror.cn', accessProvider: 'tencent' },
      context
    }
    const ret = await plugin.doExecute(deployOpts)
    console.log('context:', context, ret)
    expect(context).be.empty
  })
})
