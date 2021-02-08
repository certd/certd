import pkg from 'chai'
import PluginTencent from '../../src/index.js'
import { createOptions } from '../../../../../test/options.js'
import { Certd } from '@certd/certd'
const { expect } = pkg

// 安装默认插件和授权提供者
PluginTencent.install()
describe('DnspodDnsProvider', function () {
  it('#申请证书', async function () {
    this.timeout(300000)
    const options = createOptions()
    options.cert.domains = ['*.certd.xyz', '*.test.certd.xyz', '*.base.certd.xyz', 'certd.xyz']
    options.cert.dnsProvider = {
      type: 'dnspod',
      accessProvider: 'dnspod'
    }
    options.args = { forceCert: true }
    const certd = new Certd(options)
    const cert = await certd.certApply()
    expect(cert).ok
    expect(cert.crt).ok
    expect(cert.key).ok
    expect(cert.detail).ok
    expect(cert.expires).ok
  })
})
