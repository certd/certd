import { CertInfo, CertReader, ICertInfoGetter } from "@certd/plugin-lib";
import { CertInfoService } from "../../../monitor/index.js";

export class CertInfoGetter implements ICertInfoGetter {
  userId: number;
  projectId: number;
  certInfoService: CertInfoService;
  constructor(userId: number, projectId: number, certInfoService: CertInfoService) {
    this.userId = userId;
    this.projectId = projectId;
    this.certInfoService = certInfoService;
  }
  async getByPipelineId(pipelineId: number): Promise<CertInfo> {
    if (!pipelineId) {
      throw new Error(`流水线id不能为空`);
    }
    const query: any = {
      pipelineId,
      userId: this.userId,
    };
    if (this.projectId) {
      query.projectId = this.projectId;
    }
    const entity = await this.certInfoService.findOne({
      where: query,
    });
    if (!entity || !entity.certInfo) {
      throw new Error(`流水线(${pipelineId})还未生成证书，请先运行一次流水线`);
    }
    return new CertReader(JSON.parse(entity.certInfo)).cert;
  }
}
