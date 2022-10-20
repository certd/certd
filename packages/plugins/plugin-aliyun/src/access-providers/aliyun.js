export class AliyunAccessProvider {
  static define () {
    return {
      name: 'aliyun',
      label: '阿里云',
      desc: '',
      input: {
        accessKeyId: {
          component: {
            placeholder: 'accessKeyId'
          },
          rules: [{ required: true, message: '必填项' }]
        },
        accessKeySecret: {
          component: {
            placeholder: 'accessKeySecret'
          },
          rules: [{ required: true, message: '必填项' }]

        }
      },
      output: {

      }
    }
  }
}
