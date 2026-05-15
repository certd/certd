import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { PipelineService } from '../../pipeline/service/pipeline-service.js';
import { CertInfoService } from '../../monitor/service/cert-info-service.js';
import { IUsedCountService } from '@certd/commercial-core';
import { SiteInfoService } from '../../monitor/service/site-info-service.js';

@Provide('myCountService')
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class MyCountService implements IUsedCountService {
  @Inject()
  pipelineService: PipelineService;

  @Inject()
  certInfoService: CertInfoService;
  @Inject()
  siteInfoService: SiteInfoService;

  async getUsedCount(userId: number) {
    if (!userId) {
      throw new Error('userId is required');
    }
    const pipelineCountUsed = await this.pipelineService.getUserPipelineCount(userId);
    const domainCountUsed = await this.certInfoService.getUserDomainCount(userId);
    const wildcardDomainCountUsed = await this.certInfoService.getUserWildcardDomainCount(userId);
    const monitorCountUsed = await this.siteInfoService.getUserMonitorCount(userId);
    return {
      pipelineCountUsed,
      domainCountUsed,
      wildcardDomainCountUsed,
      monitorCountUsed,
    };
  }
}
