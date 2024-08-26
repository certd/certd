import { IsAccess, AccessInput } from '@certd/pipeline';

@IsAccess({
  name: 'tencent',
  title: '腾讯云',
})
export class TencentAccess {
  @AccessInput({
    title: 'secretId',
    helper: '使用对应的插件需要有对应的权限，比如上传证书，需要证书管理权限;部署到clb需要clb相关权限',
    component: {
      placeholder: 'secretId',
    },
    rules: [{ required: true, message: '该项必填' }],
  })
  secretId = '';
  @AccessInput({
    title: 'secretKey',
    component: {
      placeholder: 'secretKey',
    },
    rules: [{ required: true, message: '该项必填' }],
  })
  secretKey = '';
}
