import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { HuaweiAccess } from '../../access/index.js';
import { CertInfo } from '@certd/plugin-cert';
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from '@certd/plugin-lib';
import { resetLogConfigure } from '@certd/basic';
import { CertApplyPluginNames } from '@certd/plugin-cert';
@IsTaskPlugin({
  name: 'HauweiDeployCertToELB',
  title: '华为云-部署证书至ELB负载均衡',
  icon: 'svg:icon-huawei',
  group: pluginGroups.huawei.key,
  desc: '',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class HauweiDeployCertToELB extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书\n如果你选择使用ccm证书ID，则需要在[域名管理页面右上角开启SCM授权](https://console.huaweicloud.com/cdn/#/cdn/domain)',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];


  @TaskInput({
    title: 'Access授权',
    helper: '华为云授权AccessKeyId、AccessKeySecret',
    component: {
      name: 'access-selector',
      type: 'huawei',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '项目ID',
      helper: '请选择项目',
      typeName: 'HauweiDeployCertToELB',
      action: HauweiDeployCertToELB.prototype.onGetProjectList.name,
      single: true,
    })
  )
  projectId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: 'ELB已有证书',
      helper: '请选择域名或输入域名',
      typeName: 'HauweiDeployCertToELB',
      action: HauweiDeployCertToELB.prototype.onGetCertList.name,
      search: true,
    })
  )
  certIds!: string[];



  async execute(): Promise<void> {
    if (!this.cert) {
      throw new Error('域名证书不能为空');
    }
    this.logger.info('开始部署证书到华为云ELB');
    const { elb, client } = await this.getElbClient();

    for (const certId of this.certIds) {
      this.logger.info('开始更新ELB证书，证书ID：' + certId);
      let request = new elb.UpdateCertificateRequest(certId);

      const certificate = new elb.UpdateCertificateOption()
        .withCertificate(this.cert.crt)
        .withPrivateKey(this.cert.key);
      const body = new elb.UpdateCertificateRequestBody()
        .withCertificate(certificate);
      request.withBody(body);

      await client.updateCertificate(request);
      this.logger.info('更新ELB证书完成，证书ID：' + certId );
      await this.ctx.utils.sleep(2000);
    }

    this.logger.info('更新ELB证书完成');
  }

  async onGetProjectList() {
    const access = await this.getAccess<HuaweiAccess>(this.accessId);
    const projects = await access.getProjectList();
    return projects.map(project => {
      return {
        value: project.id+"_"+project.name,
        label: `${project.name}(${project.id})`,
      };
    });
  }

  async getElbClient() {
    if (!this.projectId) {
      throw new Error('项目ID不能为空');
    }
    const access = await this.getAccess<HuaweiAccess>(this.accessId);
    const { BasicCredentials } = await import('@huaweicloud/huaweicloud-sdk-core');
    const elb = await import('@huaweicloud/huaweicloud-sdk-elb/v3/public-api.js');
    //恢复华为云把log4j的config改了的问题
    resetLogConfigure();
    const projectArr = this.projectId.split("_");
    const projectId = projectArr[0];
    const region = projectArr[1];
    const credentials: any = new BasicCredentials().withAk(access.accessKeyId).withSk(access.accessKeySecret).withProjectId(projectId);
    const client = elb.ElbClient.newBuilder().withCredential(credentials).withEndpoint('https://elb.'+region+'.myhuaweicloud.com').build();
    return {
      client,
      elb,
    };
  }
  async onGetCertList(data: PageSearch) {
    const { client, elb } = await this.getElbClient();

    const request = new elb.ListCertificatesRequest();
    request.limit = 1000;
    if (data.searchKey) {
      request.withDomain([data.searchKey]);
    }
    const result = await client.listCertificates(request);
    if (!result || !result.certificates || result.certificates.length === 0) {
      throw new Error('未找到ELB证书，您可以手动输入');
    }

    const certs = result.certificates.map(cert => {
      return {
        value: cert.id,
        //@ts-ignore
        label: cert.id + '(' + cert.common_name + ')',
        domain: cert.domain.split(','),
      };
    });

    return this.ctx.utils.options.buildGroupOptions(certs, this.certDomains);
  }
}
new HauweiDeployCertToELB();
