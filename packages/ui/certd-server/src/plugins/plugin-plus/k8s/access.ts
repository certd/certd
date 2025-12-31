import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

@IsAccess({
  name: "k8s",
  title: "k8s授权",
  desc: "",
  icon: "mdi:kubernetes",
})
export class K8sAccess extends BaseAccess {
  @AccessInput({
    title: "kubeconfig",
    component: {
      name: "a-textarea",
      vModel: "value",
      placeholder: "kubeconfig",
    },
    required: true,
    encrypt: true,
  })
  kubeconfig = "";

  @AccessInput({
    title: "忽略证书校验",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    required: false,
    encrypt: false,
  })
  skipTLSVerify: boolean;
}

new K8sAccess();
