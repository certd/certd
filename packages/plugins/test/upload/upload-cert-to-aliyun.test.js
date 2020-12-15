import pkg from 'chai'
import UploadCertToAliyun from '../../src/upload/upload-cert-to-aliyun/index.js'
import options from '../options'
import Certd from '@certd/certd'
const { expect } = pkg
describe('PluginUploadCertToAliyun', function () {
  it('#execute', function () {
    const plugin = new UploadCertToAliyun()
    const certd = new Certd()
    const cert = certd.readCurrentCert('xiaojunnuo@qq.com', ['*.docmirror.cn'])
    plugin.execute({
      providers: options.providers,
      cert,
      args: { name: '上传证书到阿里云', provider: 'aliyun' }
    })
  })
})
