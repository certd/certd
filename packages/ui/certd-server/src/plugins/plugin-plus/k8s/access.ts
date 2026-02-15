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



  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {

    const k8sClient = await this.getK8sClient()
    await k8sClient.getSecrets({
      namespace: "default",
    })
    return "ok";
  } 

  async getK8sClient() {
    const sdk = await import("@certd/lib-k8s");
    const K8sClient = sdk.K8sClient;

    const k8sClient = new K8sClient({
      kubeConfigStr: this.kubeconfig,
      logger: this.ctx.logger,
      skipTLSVerify: this.skipTLSVerify,
    });
    return k8sClient;
  }

}

new K8sAccess();
