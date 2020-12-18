import pkg from 'chai'
import options from './options.js'
import Deployer from '../src/index.js'
const { expect } = pkg
describe('AutoDeploy', function () {
  it('#run', async function () {
    const deploy = new Deployer()
    const ret = deploy.run(options)
    expect(ret).ok
    expect(ret.cert).ok
    expect(ret.AliyunCertId).ok
  })
})
