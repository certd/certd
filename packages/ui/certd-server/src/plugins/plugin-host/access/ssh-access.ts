import { AccessInput, IAccess, IsAccess } from '@certd/pipeline';
import { ConnectConfig } from 'ssh2';

@IsAccess({
  name: 'ssh',
  title: '主机登录授权',
  desc: '',
  input: {},
})
export class SshAccess implements IAccess, ConnectConfig {
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
      name: 'a-input-number',
      placeholder: '22',
    },
    rules: [{ required: true, message: '此项必填' }],
  })
  port!: number;
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
    title: '私钥登录',
    helper: '私钥或密码必填一项',
    component: {
      name: 'a-textarea',
      vModel: 'value',
    },
  })
  privateKey!: string;

  @AccessInput({
    title: '私钥密码',
    helper: '如果你的私钥有密码的话',
    component: {
      name: 'a-input-password',
      vModel: 'value',
    },
  })
  passphrase!: string;
}

new SshAccess();
