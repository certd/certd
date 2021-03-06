import pkg from 'chai'
import { Executor } from '../src/index.js'
import { createOptions } from '../../../../test/options.js'
import PluginAliyun from '@certd/plugin-aliyun'
import PluginTencent from '@certd/plugin-tencent'
import PluginHost from '@certd/plugin-host'
const { expect } = pkg

// 安装默认插件和授权提供者
PluginAliyun.install()
PluginTencent.install()
PluginHost.install()

describe('AutoDeploy', function () {
  it('#run', async function () {
    this.timeout(120000)
    const options = createOptions()
    const executor = new Executor()
    const ret = await executor.run(options)
    expect(ret).ok
    expect(ret.cert).ok
  })
  it('#forceCert', async function () {
    this.timeout(120000)
    const executor = new Executor()
    const options = createOptions()
    options.args.forceCert = true
    options.args.forceDeploy = true

    const ret = await executor.run(options)
    expect(ret).ok
    expect(ret.cert).ok
  })
  it('#forceDeploy', async function () {
    this.timeout(120000)
    const executor = new Executor()
    const options = createOptions()
    const ret = await executor.run(options, { forceCert: false, forceDeploy: true, forceRedeploy: true })
    expect(ret).ok
    expect(ret.cert).ok
  })
})
