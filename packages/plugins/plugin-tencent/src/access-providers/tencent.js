export class TencentAccessProvider {
  static define () {
    return {
      name: 'tencent',
      label: '腾讯云',
      input: {
        secretId: {
          component: {
            placeholder: 'secretId'
          },
          rules: [{ required: true, message: '该项必填' }]
        },
        secretKey: {
          component: {
            placeholder: 'secretKey'
          },
          rules: [{ required: true, message: '该项必填' }]
        }
      }
    }
  }
}
