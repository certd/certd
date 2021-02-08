import pkg from 'chai'
import { createOptions } from '../../../../../test/options.js'
import { Certd } from '@certd/certd'
import PluginAliyun from '../../src/index.js'

// 安装默认插件和授权提供者
PluginAliyun.install()
const { expect } = pkg
describe('AliyunDnsProvider', function () {
  it('#申请证书-aliyun', async function () {
    this.timeout(300000)
    const options = createOptions()
    options.args = { forceCert: true, test: false }
    const certd = new Certd(options)
    const cert = await certd.certApply()
    expect(cert).ok
    expect(cert.crt).ok
    expect(cert.key).ok
    expect(cert.detail).ok
    expect(cert.expires).ok
  })
})
