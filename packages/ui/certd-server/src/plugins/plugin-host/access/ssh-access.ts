import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';
import { ConnectConfig } from 'ssh2';

@IsAccess({
  name: 'ssh',
  title: '主机登录授权',
  desc: '',
  input: {},
})
export class SshAccess extends BaseAccess implements ConnectConfig {
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
    value: 22,
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
    encrypt: true,
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
    encrypt: true,
  })
  privateKey!: string;

  @AccessInput({
    title: '私钥密码',
    helper: '如果你的私钥有密码的话',
    component: {
      name: 'a-input-password',
      vModel: 'value',
    },
    encrypt: true,
  })
  passphrase!: string;

  @AccessInput({
    title: 'socks代理',
    helper: 'socks代理配置，格式：socks5://user:password@host:port',
    component: {
      name: 'a-input',
      vModel: 'value',
      placeholder: 'socks5://user:password@host:port',
    },
    encrypt: false,
  })
  socksProxy!: string;

  @AccessInput({
    title: '是否Windows',
    helper: '如果是Windows主机，请勾选此项\n并且需要windows[安装OpenSSH](https://gitee.com/certd/certd/blob/v2/doc/host/host.md)',
    component: {
      name: 'a-switch',
      vModel: 'checked',
    },
  })
  windows = false;

  @AccessInput({
    title: '命令编码',
    helper: '如果是Windows主机，且出现乱码了，请尝试设置为GBK',
    component: {
      name: 'a-select',
      vModel: 'value',
      options: [
        { value: '', label: '默认' },
        { value: 'GBK', label: 'GBK' },
        { value: 'UTF8', label: 'UTF-8' },
      ],
    },
  })
  encoding: string;
}

new SshAccess();
