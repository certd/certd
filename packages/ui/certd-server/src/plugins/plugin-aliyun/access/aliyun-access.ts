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
    helper: '注意：证书申请，需要dns解析权限；其他阿里云插件，也需要对应的权限，比如证书上传需要证书管理权限',
    required: true,
  })
  accessKeyId = '';
  @AccessInput({
    title: 'accessKeySecret',
    component: {
      placeholder: 'accessKeySecret',
    },
    required: true,
  })
  accessKeySecret = '';
}

new AliyunAccess();
