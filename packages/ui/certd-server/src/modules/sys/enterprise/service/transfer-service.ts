import { isEnterprise } from "@certd/lib-server";
import { ApplicationContext, IMidwayContainer, Provide, Scope, ScopeEnum } from "@midwayjs/core";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class TransferService {
  @ApplicationContext()
  appCtx: IMidwayContainer;


  async getServices() {
    const getService = async (key: string) => {
      return await this.appCtx.getAsync(key);
    }
    const serviceNames = [
      "pipeline",
      "certInfo",
      "siteInfo",
      "domain",
      "cnameRecord",
      "group",
      "pipelineGroup",
      "notification",
      "subDomain",
      "template",
      "openKey",
      "siteIp",
      "access",
      "history",
      "historyLog",
      "storage",
    ]

    const services: any = {}
    for (const key of serviceNames) {
      services[key] = await getService(`${key}Service`);
    }
    return services;
  }

  /**
   * 获取用户资源
   * @param userId 
   * @returns 
   */
  async getUserResources(userId: number) {

    const query = {
      userId,
    }

    const services = await this.getServices();

    const counts: any = {}
    let totalCount = 0;
    for (const key of Object.keys(services)) {
      const count = await services[key].repository.count({ where: query });
      counts[key] = count;
      totalCount += count;
    }


    return {
      ...counts,
      totalCount,
    }
  }

  async transferAll(userId: number, projectId: number) {

    if (!isEnterprise()) {
      throw new Error('当前非企业模式，不支持资源迁移到项目');
    }
    if (projectId === 0) {
      throw new Error('项目ID不能为0');
    }
    if (userId == null) {
      throw new Error('用户ID不能为空');
    }

    const query = {
      userId,
    }
    const services = await this.getServices();
    for (const key of Object.keys(services)) {
      await services[key].repository.update(query, {
        userId: -1,
        projectId,
      });
    }
  }

}