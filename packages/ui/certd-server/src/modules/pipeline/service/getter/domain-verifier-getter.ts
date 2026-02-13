import {DomainVerifiers, IDomainVerifierGetter} from "@certd/plugin-cert";
import {DomainService} from "../../../cert/service/domain-service.js";

export class DomainVerifierGetter implements IDomainVerifierGetter {
  private userId: number;
  private projectId: number;
  private domainService: DomainService;

  constructor(userId: number, projectId: number, domainService: DomainService) {
    this.userId = userId;
    this.projectId = projectId;
    this.domainService = domainService;
  }

  async getVerifiers(domains: string[]): Promise<DomainVerifiers>{
    return await this.domainService.getDomainVerifiers(this.userId,this.projectId,domains);
  }

}
