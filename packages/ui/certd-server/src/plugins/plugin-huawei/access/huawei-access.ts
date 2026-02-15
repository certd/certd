import { resetLogConfigure } from '@certd/basic';
import { IsAccess, AccessInput, BaseAccess } from '@certd/pipeline';

@IsAccess({
  name: 'huawei',
  title: '华为云授权',
  desc: '',
  icon: 'svg:icon-huawei',
  order: 0,
})
export class HuaweiAccess extends BaseAccess {
  @AccessInput({
    title: 'accessKeyId',
    component: {
      placeholder: 'accessKeyId',
    },
    helper: '证书申请需要有dns解析权限，前往[我的凭证-访问密钥](https://console.huaweicloud.com/iam/?region=cn-east-3#/mine/accessKey)获取',
    required: true,
  })
  accessKeyId = '';
  @AccessInput({
    title: 'accessKeySecret',
    component: {
      placeholder: 'accessKeySecret',
    },
    required: true,
    encrypt: true,
  })
  accessKeySecret = '';



  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  accessToken: { expiresAt: number, token: string }

  async onTestRequest() {
    await this.getProjectList();
    return "ok"
  }


  async getProjectList() {
    const endpoint = "https://iam.cn-north-4.myhuaweicloud.com";

    const { BasicCredentials } = await import('@huaweicloud/huaweicloud-sdk-core');
    const iam = await import('@huaweicloud/huaweicloud-sdk-iam/v3/public-api.js');
    //恢复华为云把log4j的config改了的问题
    resetLogConfigure();
    const credentials: any = new BasicCredentials().withAk(this.accessKeyId).withSk(this.accessKeySecret)


    const client = iam.IamClient.newBuilder()
      .withCredential(credentials)
      .withEndpoint(endpoint)
      .build();
    const request = new iam.KeystoneListAuthProjectsRequest();
    const result = await client.keystoneListAuthProjects(request);
    return result.projects;
  }
}

new HuaweiAccess();
