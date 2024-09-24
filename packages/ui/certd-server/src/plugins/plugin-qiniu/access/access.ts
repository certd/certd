import { AccessInput, IAccess, IsAccess } from '@certd/pipeline';

@IsAccess({
  name: 'qiniu',
  title: '七牛云授权',
  desc: '',
  input: {},
})
export class QiniuAccess implements IAccess {
  @AccessInput({
    title: 'AccessKey',
    rules: [{ required: true, message: '此项必填' }],
    helper: 'AK，前往[密钥管理](https://portal.qiniu.com/developer/user/key)获取',
  })
  accessKey!: string;
  @AccessInput({
    title: 'SecretKey',
    encrypt: true,
    helper: 'SK',
  })
  secretKey!: string;
}

new QiniuAccess();
