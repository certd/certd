import pkg from 'chai'
import options from './options.js'
import { Executor } from '../src/index.js'
const { expect } = pkg

describe('AutoDeploy', function () {
  it('#run', async function () {
    const executor = new Executor()
    const ret = await executor.run(options)
    expect(ret).ok
    expect(ret.cert).ok
  })
  it('#forceCert', async function () {
    const executor = new Executor()
    const ret = await executor.run(options, { forceCert: true, forceDeploy: false })
    expect(ret).ok
    expect(ret.cert).ok
  })
  it('#forceDeploy', async function () {
    const executor = new Executor()
    const ret = await executor.run(options, { forceCert: false, forceDeploy: true })
    expect(ret).ok
    expect(ret.cert).ok
  })
})
