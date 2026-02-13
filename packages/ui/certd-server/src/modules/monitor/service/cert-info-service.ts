import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { BaseService, CodeException, Constants, PageReq } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Between, IsNull, LessThan, Not, Repository } from "typeorm";
import { CertInfoEntity } from "../entity/cert-info.js";
import { utils } from "@certd/basic";
import { CertInfo, CertReader } from "@certd/plugin-cert";

export type UploadCertReq = {
  id?: number;
  certReader: CertReader;
  fromType?: string;
  userId?: number;
  projectId?: number;
  file?:any
};


@Provide("CertInfoService")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CertInfoService extends BaseService<CertInfoEntity> {
  @InjectEntityModel(CertInfoEntity)
  repository: Repository<CertInfoEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<CertInfoEntity>) {
    return await super.page(pageReq);
  }

  async getUserDomainCount(userId: number) {
    if (!userId) {
      throw new Error('userId is required');
    }
    return await this.repository.sum('domainCount', {
      userId,
    });
  }

  async updateDomains(pipelineId: number, userId: number, domains: string[],fromType?:string) {
    const found = await this.repository.findOne({
      where: {
        pipelineId,
        userId,
      },
    });
    const bean = new CertInfoEntity();
    if (found) {
      //bean
      bean.id = found.id;
    } else {
      //create
      bean.pipelineId = pipelineId;
      bean.userId = userId;
      bean.fromType = fromType
      if (!domains || domains.length === 0) {
        return;
      }
    }

    if (!domains || domains.length === 0) {
      bean.domain = '';
      bean.domains = '';
      bean.domainCount = 0;
    } else {
      bean.domain = domains[0];
      bean.domains = domains.join(',');
      bean.domainCount = domains.length;
    }

    await this.addOrUpdate(bean);
    return bean.id
  }

  async deleteByPipelineId(id: number) {
    if (!id) {
      return;
    }
    await this.repository.delete({
      pipelineId: id,
    });
  }

  async getMatchCertList(params: { domains: string[]; userId: number }) {
    const { domains, userId } = params;
    if (!domains) {
      throw new CodeException({
        ...Constants.res.openCertNotFound,
        message:"域名不能为空"
      });
    }

    const list = await this.find({
      select: {
        id: true,
        domains: true,
        expiresTime:true,
        pipelineId:true,
      },
      where: {
        userId,
      },
      order: {
        id: 'DESC',
      },
    });
    //遍历查找
    return list.filter(item => {
      const itemDomains = item.domains.split(',');
      return utils.domain.match(domains, itemDomains);
    });
  }

  async getCertInfoById(req: { id: number; userId: number,projectId:number,format?:string }) {
    const entity = await this.info(req.id);
    if (!entity || entity.userId !== req.userId ) {
      throw new CodeException(Constants.res.openCertNotFound);
    }
    if (req.projectId && entity.projectId !== req.projectId) {
      throw new CodeException(Constants.res.openCertNotFound);
    }

    if (!entity.certInfo) {
      throw new CodeException(Constants.res.openCertNotReady);
    }
    const certInfo = JSON.parse(entity.certInfo) as CertInfo;
    const certReader = new CertReader(certInfo);
    return {
      ...certReader.toCertInfo(req.format),
      detail: {
        id: entity.id,
        domains: entity.domains.split(','),
        notAfter: certReader.expires,
      },
    };
  }

  async updateCertByPipelineId(pipelineId: number, cert: CertInfo,file?:string,fromType = 'pipeline') {
    const found = await this.repository.findOne({
      where: {
        pipelineId,
      },
    });
    const bean = await this.updateCert({
      id: found?.id,
      certReader: new CertReader(cert),
      fromType,
      file
    });
    return bean;
  }

  private async updateCert(req: UploadCertReq) {
    const bean = new CertInfoEntity();
    const { id, fromType,userId, certReader } = req;
    if (id) {
      bean.id = id;
    } else {
      bean.fromType = fromType;
    }
    const certInfo = certReader.toCertInfo();
    bean.certInfo = JSON.stringify(certInfo);
    bean.applyTime = new Date().getTime();
    const domains = certReader.detail.domains.altNames;
    bean.domains = domains.join(',');
    bean.domain = domains[0];
    bean.domainCount = domains.length;
    bean.effectiveTime = certReader.effective;
    bean.expiresTime = certReader.expires;
    bean.certProvider = certReader.detail.issuer.commonName;
    bean.userId = userId;
    bean.projectId = req.projectId;
    if(req.file){
      bean.certFile = req.file
    }
    await this.addOrUpdate(bean);
    return bean;
  }

  async getByPipelineId(pipelineId: number) {
    return await this.repository.findOne({
      where: {
        pipelineId,
      },
    });
  }

  async count({ userId }: { userId: number }) {
    const total = await this.repository.count({
      where: {
        userId,
        expiresTime: Not(IsNull()),
      },
    });

    const expired = await this.repository.count({
      where: {
        userId,
        expiresTime: LessThan(new Date().getTime()),
      },
    });

    const expiring = await this.repository.count({
      where: {
        userId,
        expiresTime: Between(new Date().getTime(), new Date().getTime() + 15 * 24 * 60 * 60 * 1000),
      },
    });

    const notExpired = total - expired - expiring;
    return {
      total,
      expired,
      expiring,
      notExpired,
    };
  }
}
