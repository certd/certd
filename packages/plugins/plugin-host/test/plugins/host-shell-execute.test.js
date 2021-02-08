import pkg from 'chai'
import { HostShellExecute } from '../../src/plugins/host-shell-execute/index.js'
import { Certd } from '@certd/certd'
import { createOptions } from '../../../../../test/options.js'
const { expect } = pkg
describe('HostShellExecute', function () {
  it('#execute', async function () {
    this.timeout(10000)
    const options = createOptions()
    options.args = { test: false }
    options.cert.email = 'xiaojunnuo@qq.com'
    options.cert.domains = ['*.docmirror.cn']
    const plugin = new HostShellExecute(options)
    const certd = new Certd(options)
    const cert = await certd.readCurrentCert()
    const context = {}
    const uploadOpts = {
      cert,
      props: { script: ['ls ', 'ls '], accessProvider: 'aliyun-ssh' },
      context
    }
    const ret = await plugin.doExecute(uploadOpts)
    expect(ret).ok
    console.log('-----' + JSON.stringify(ret))

    await plugin.doRollback(uploadOpts)
  })
})
