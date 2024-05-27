import { AccessInput, IAccess, IsAccess } from '@certd/pipeline';

@IsAccess({
  name: 'ssh',
  title: '主机登录授权',
  desc: '',
  input: {},
})
export class SshAccess implements IAccess {
  @AccessInput({
    title: '主机地址',
    component: {
      placeholder: '主机域名或IP地址',
    },
    required: true,
  })
  host!: string;
  @AccessInput({
    title: '端口',
    value: '22',
    component: {
      placeholder: '22',
    },
    rules: [{ required: true, message: '此项必填' }],
  })
  port!: string;
  @AccessInput({
    title: '用户名',
    value: 'root',
    rules: [{ required: true, message: '此项必填' }],
  })
  username!: string;
  @AccessInput({
    title: '密码',
    component: {
      name: 'a-input-password',
      vModel: 'value',
    },
    helper: '登录密码或密钥必填一项',
  })
  password!: string;
  @AccessInput({
    title: '密钥',
    helper: '密钥或密码必填一项',
    component: {
      name: 'a-textarea',
      vModel: 'value',
    },
  })
  privateKey!: string;
}

new SshAccess();
