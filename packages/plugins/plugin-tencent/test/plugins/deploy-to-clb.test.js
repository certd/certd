import pkg from 'chai'
import { DeployCertToTencentCLB } from '../../src/plugins/deploy-to-clb/index.js'
import { Certd } from '@certd/certd'
// eslint-disable-next-line no-unused-vars
import { createOptions } from '../../../../../test/options.js'
import { UploadCertToTencent } from '../../src/plugins/upload-to-tencent/index.js'
const { expect } = pkg
describe('DeployToTencentCLB', function () {
  it('#execute-getClbList', async function () {
    const options = createOptions()
    options.args.test = false
    options.cert.dnsProvider = 'tencent-yonsz'
    const deployPlugin = new DeployCertToTencentCLB(options)
    const props = {
      region: 'ap-guangzhou',
      domain: 'certd-test-no-sni.base.yonsz.net',
      accessProvider: 'tencent-yonsz'
    }
    const accessProvider = deployPlugin.getAccessProvider(props.accessProvider)
    const { region } = props
    const client = deployPlugin.getClient(accessProvider, region)

    const ret = await deployPlugin.getCLBList(client, props)
    expect(ret.length > 0).ok
    console.log('clb count:', ret.length)
  })
  it('#execute-getListenerList', async function () {
    const options = createOptions()
    options.args.test = false
    options.cert.dnsProvider = 'tencent-yonsz'
    const deployPlugin = new DeployCertToTencentCLB(options)
    const props = {
      region: 'ap-guangzhou',
      domain: 'certd-test-no-sni.base.yonsz.net',
      accessProvider: 'tencent-yonsz',
      loadBalancerId: 'lb-59yhe5xo',
      listenerId: 'lbl-1vfwx8dq'
    }
    const accessProvider = deployPlugin.getAccessProvider(props.accessProvider)
    const { region } = props
    const client = deployPlugin.getClient(accessProvider, region)

    const ret = await deployPlugin.getListenerList(client, props.loadBalancerId, [props.listenerId])
    expect(ret.length > 0).ok
    console.log('clb count:', ret.length, ret)
  })

  it('#execute-no-sni-listenerId', async function () {
    this.timeout(10000)
    const options = createOptions()
    options.args.test = false
    options.cert.dnsProvider = 'tencent-yonsz'
    options.cert.email = 'xiaojunnuo@qq.com'
    options.cert.domains = ['*.docmirror.cn']
    const certd = new Certd(options)
    const cert = await certd.readCurrentCert()
    const deployPlugin = new DeployCertToTencentCLB(options)
    const context = {}
    const deployOpts = {
      cert,
      props: {
        region: 'ap-guangzhou',
        loadBalancerId: 'lb-59yhe5xo',
        listenerId: 'lbl-1vfwx8dq',
        accessProvider: 'tencent-yonsz'
      },
      context
    }
    const ret = await deployPlugin.doExecute(deployOpts)
    expect(ret).ok
    console.log('ret:', ret)

    // 删除测试证书
    const uploadPlugin = new UploadCertToTencent(options)
    await uploadPlugin.doRollback(deployOpts)
  })

  it('#execute-sni-listenerId', async function () {
    this.timeout(10000)
    const options = createOptions()
    options.args.test = false
    options.cert.dnsProvider = 'tencent-yonsz'
    const certd = new Certd(options)
    const cert = certd.readCurrentCert('xiaojunnuo@qq.com', ['*.docmirror.cn'])
    const deployPlugin = new DeployCertToTencentCLB(options)
    const context = {}
    const deployOpts = {
      cert,
      props: {
        region: 'ap-guangzhou',
        loadBalancerId: 'lb-59yhe5xo',
        listenerId: 'lbl-akbyf5ac',
        domain: 'certd-test-sni.base.yonsz.net',
        accessProvider: 'tencent-yonsz'
      },
      context
    }
    const ret = await deployPlugin.doExecute(deployOpts)
    console.log('ret:', ret)
    expect(ret).ok
    // 删除测试证书
    const uploadPlugin = new UploadCertToTencent(options)
    await uploadPlugin.doRollback(deployOpts)
  })
})
