import pkg from 'chai'
import { Certd } from '../../src/index.js'
import { createOptions } from '../../../../test/options.js'
const { expect } = pkg
describe('DnspodDnsProvider', function () {
  it('#申请证书', async function () {
    this.timeout(300000)
    const options = createOptions()
    options.cert.domains = ['*.certd.xyz', '*.test.certd.xyz', '*.base.certd.xyz', 'certd.xyz']
    options.cert.dnsProvider = 'dnspod'
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
