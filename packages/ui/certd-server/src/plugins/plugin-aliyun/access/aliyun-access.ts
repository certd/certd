import { IsAccess, AccessInput } from '@certd/pipeline';

@IsAccess({
  name: 'aliyun',
  title: '阿里云授权',
  desc: '',
})
export class AliyunAccess {
  @AccessInput({
    title: 'accessKeyId',
    component: {
      placeholder: 'accessKeyId',
    },
    helper: '登录阿里云控制台->AccessKey管理页面获取。',
    required: true,
  })
  accessKeyId = '';
  @AccessInput({
    title: 'accessKeySecret',
    component: {
      placeholder: 'accessKeySecret',
    },
    required: true,
    encrypt: true,
    helper: '注意：证书申请需要dns解析权限；其他阿里云插件，需要对应的权限，比如证书上传需要证书管理权限；嫌麻烦就用主账号的全量权限的accessKey',
  })
  accessKeySecret = '';
}

new AliyunAccess();
