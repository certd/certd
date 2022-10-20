export class SSHAccessProvider {
  static define () {
    return {
      name: 'ssh',
      title: '主机',
      desc: '',
      input: {
        host: { rules: [{ required: true, message: '此项必填' }] },
        port: {
          title: '端口',
          value: '22',
          rules: [{ required: true, message: '此项必填' }]
        },
        username: {
          value: 'root',
          rules: [{ required: true, message: '此项必填' }]
        },
        password: { helper: '登录密码' },
        privateKey: {
          title: '密钥',
          helper: '密钥或密码必填一项'
        }
      }
    }
  }
}
