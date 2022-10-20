export class SSHAccessProvider {
  static define () {
    return {
      name: 'ssh',
      label: '主机',
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
          helper: '密钥，密码或此项必填一项'
        }
      }
    }
  }
}
