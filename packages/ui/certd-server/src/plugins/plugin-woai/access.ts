import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';

@IsAccess({
  name: 'woai',
  title: '我爱云授权',
  desc: '我爱云CDN',
})
export class WoaiAccess extends BaseAccess {
  @AccessInput({
    title: '账号',
    component: {
      placeholder: '我爱云的账号',
    },
    required: true,
  })
  username = '';
  @AccessInput({
    title: '密码',
    component: {
      placeholder: '我爱云的密码',
    },
    required: true,
    encrypt: true,
  })
  password = '';
}

new WoaiAccess();
