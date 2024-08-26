import { IsAccess, AccessInput } from '@certd/pipeline';

@IsAccess({
  name: 'k8s',
  title: 'k8s授权',
  desc: '',
})
export class K8sAccess {
  @AccessInput({
    title: 'kubeconfig',
    component: {
      name: 'a-textarea',
      vModel: 'value',
      placeholder: 'kubeconfig',
    },
    required: true,
  })
  kubeconfig = '';
}

new K8sAccess();
