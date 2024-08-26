import { IsAccess, AccessInput } from '@certd/pipeline';

@IsAccess({
  name: 'dnspod',
  title: 'dnspod',
  desc: '腾讯云的域名解析接口已迁移到dnspod',
})
export class DnspodAccess {
  @AccessInput({
    title: '端点',
    component: {
      placeholder: 'endpoint',
      name: 'a-auto-complete',
      vModel: 'value',
      options: [
        { value: 'https://dnsapi.cn', label: '中国站' },
        { value: 'https://api.dnspod.com', label: '国际站' },
      ],
    },
    rules: [{ required: true, message: '该项必填' }],
  })
  endpoint = '';

  @AccessInput({
    title: 'ID',
    component: {
      placeholder: 'dnspod token 的 id',
    },
    rules: [{ required: true, message: '该项必填' }],
  })
  id = '';

  @AccessInput({
    title: 'token',
    component: {
      placeholder: '开放接口token',
    },
    rules: [{ required: true, message: '该项必填' }],
  })
  token = '';
}

new DnspodAccess();
