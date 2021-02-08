import _ from 'lodash-es'
import optionsPrivate from '../../../test/options.private.mjs'
const defaultOptions = {
  version: '1.0.0',
  args: {
    directory: 'test',
    dry: false
  },
  accessProviders: {
    aliyun: {
      providerType: 'aliyun',
      accessKeyId: '',
      accessKeySecret: ''
    },
    myLinux: {
      providerType: 'SSH',
      username: 'xxx',
      password: 'xxx',
      host: '1111.com',
      port: 22,
      publicKey: ''
    }
  },
  cert: {
    domains: ['*.docmirror.club', 'docmirror.club'],
    email: 'xiaojunnuo@qq.com',
    dnsProvider: { type: 'aliyun', accessProvider: 'aliyun' },
    certProvider: 'letsencrypt',
    csrInfo: {
      country: 'CN',
      state: 'GuangDong',
      locality: 'ShengZhen',
      organization: 'CertD Org.',
      organizationUnit: 'IT Department',
      emailAddress: 'xiaojunnuo@qq.com'
    }
  }
}

_.merge(defaultOptions, optionsPrivate)

export default defaultOptions
