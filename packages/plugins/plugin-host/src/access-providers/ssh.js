export class SSHAccessProvider {
  static define () {
    return {
      name: 'ssh',
      label: '主机',
      desc: '',
      input: {
        host: { required: true },
        port: {
          label: '端口',
          type: Number,
          default: '22',
          required: true
        },
        username: {
          default: 'root',
          required: true
        },
        password: { desc: '登录密码' },
        privateKey: {
          desc: '密钥，密码或此项必填一项'
        }
      }
    }
  }
}
