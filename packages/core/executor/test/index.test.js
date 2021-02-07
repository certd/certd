import pkg from 'chai'
import { Executor } from '../src'
import { createOptions } from '../../../../test/options.js'
const { expect } = pkg

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
