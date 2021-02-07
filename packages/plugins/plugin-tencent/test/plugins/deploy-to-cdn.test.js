import pkg from 'chai'
import { DeployCertToTencentCDN } from '../../src/plugins/deploy-to-cdn'
import { Certd } from '@certd/certd'
import { UploadCertToTencent } from '../../src/plugins/upload-to-tencent'
import { createOptions } from '../../../../../test/options.js'
const { expect } = pkg
describe('DeployToTencentCDN', function () {
  it('#execute-from-store', async function () {
    const options = createOptions()
    options.args.test = false
    const certd = new Certd(options)
    const cert = certd.readCurrentCert('xiaojunnuo@qq.com', ['*.docmirror.cn'])
    const context = {}
    const uploadPlugin = new UploadCertToTencent()
    const uploadOptions = {
      accessProviders: options.accessProviders,
      cert,
      props: { name: 'certd部署测试', accessProvider: 'tencent' },
      context
    }
    await uploadPlugin.doExecute(uploadOptions)

    const deployPlugin = new DeployCertToTencentCDN()
    const deployOpts = {
      accessProviders: options.accessProviders,
      cert,
      props: { domainName: 'tentcent-certd.docmirror.cn', certName: 'certd部署测试', accessProvider: 'tencent' },
      context
    }
    const ret = await deployPlugin.doExecute(deployOpts)
    expect(ret).ok
    console.log('context:', context)

    await uploadPlugin.doRollback(uploadOptions)
  })
  it('#execute-upload', async function () {
    const options = createOptions()
    options.args.test = false
    options.cert.email = 'xiaojunnuo@qq.com'
    options.cert.domains = ['*.docmirror.cn']
    const plugin = new DeployCertToTencentCDN()
    const certd = new Certd(options)
    const cert = await certd.readCurrentCert()
    const context = {}
    const deployOpts = {
      accessProviders: options.accessProviders,
      cert,
      props: { domainName: 'tentcent-certd.docmirror.cn', accessProvider: 'tencent' },
      context
    }
    const ret = await plugin.doExecute(deployOpts)
    console.log('context:', context, ret)
  })
})
