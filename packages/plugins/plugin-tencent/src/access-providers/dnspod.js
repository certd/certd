export class DnspodAccessProvider {
  static define () {
    return {
      name: 'dnspod',
      label: 'dnspod',
      desc: '腾讯云的域名解析接口已迁移到dnspod',
      input: {
        id: {
          type: String,
          component: {
            placeholder: 'dnspod接口账户id',
            rules: [{ required: true, message: '该项必填' }]
          }
        },
        token: {
          type: String,
          label: 'token',
          component: {
            placeholder: '开放接口token',
            rules: [{ required: true, message: '该项必填' }]
          }
        }
      }
    }
  }
}
