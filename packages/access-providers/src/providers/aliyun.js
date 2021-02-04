import _ from 'lodash-es'
export class AliyunAccessProvider{
  static define () {
    return {
      name: 'aliyun',
      label: '阿里云',
      desc: '',
      input: {
        accessKeyId: {
          type: String,
          component: {
            placeholder: 'accessKeyId',
            rules: [{ required: true, message: '必填项' }]
          },
          required: true
        },
        accessKeySecret: {
          type: String,
          component: {
            placeholder: 'accessKeySecret',
            rules: [{ required: true, message: '必填项' }]
          }

        }
      },
      output: {

      }
    }
  }

  constructor () {
  }
}
