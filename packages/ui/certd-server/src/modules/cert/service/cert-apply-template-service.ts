import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { BaseService, ValidateException } from "@certd/lib-server";
import { Repository } from "typeorm";
import { CertApplyTemplateEntity } from "../entity/cert-apply-template.js";
import { CertApplyTemplateParams, pickCertApplyCustomParams, pickCertApplyTemplateParams } from "./cert-apply-template-fields.js";

export type ResolveApplyTemplateReq = {
  userId: number;
  projectId?: number;
  templateId?: number;
  params?: CertApplyTemplateParams;
};

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CertApplyTemplateService extends BaseService<CertApplyTemplateEntity> {
  @InjectEntityModel(CertApplyTemplateEntity)
  repository: Repository<CertApplyTemplateEntity>;

  getRepository(): Repository<CertApplyTemplateEntity> {
    return this.repository;
  }

  async add(param: any) {
    param.content = this.stringifyContent(param.content);
    const res = await super.add(param);
    if (param.isDefault) {
      await this.setDefault(res.id, param.userId, param.projectId);
    }
    return res;
  }

  async update(param: any) {
    if (param.content != null) {
      param.content = this.stringifyContent(param.content);
    }
    await super.update(param);
    if (param.isDefault === true) {
      const entity = await this.info(param.id);
      await this.setDefault(param.id, entity.userId, entity.projectId);
    }
  }

  async setDefault(id: number, userId: number, projectId?: number) {
    const entity = await this.getTemplateById(id, userId, projectId);
    if (entity.disabled) {
      throw new ValidateException("禁用的模版不能设为默认");
    }
    await this.repository.update({ userId, projectId }, { isDefault: false });
    await this.repository.update({ id: entity.id, userId, projectId }, { isDefault: true });
    return entity;
  }

  async getDefault(userId: number, projectId?: number) {
    return await this.repository.findOne({
      where: {
        userId,
        projectId,
        isDefault: true,
        disabled: false,
      },
    });
  }

  async resolveApplyParams(req: ResolveApplyTemplateReq) {
    const templateParams = await this.getTemplateParams(req);
    const customParams = pickCertApplyCustomParams(req.params || {});
    return {
      ...templateParams,
      ...customParams,
    };
  }

  private async getTemplateParams(req: ResolveApplyTemplateReq) {
    if (!req.templateId) {
      return {};
    }
    const template = await this.getTemplateById(req.templateId, req.userId, req.projectId);
    if (!template) {
      return {};
    }
    return this.parseContent(template.content);
  }

  private async getTemplateById(id: number, userId: number, projectId?: number) {
    const template = await this.repository.findOne({
      where: {
        id,
        userId,
        projectId,
      },
    });
    if (!template) {
      throw new ValidateException("证书申请参数模版不存在");
    }
    return template;
  }

  private stringifyContent(content: any) {
    const params = this.parseContent(content);
    return JSON.stringify(params);
  }

  private parseContent(content: any) {
    if (!content) {
      return {};
    }
    const raw = typeof content === "string" ? JSON.parse(content) : content;
    return pickCertApplyTemplateParams(raw);
  }
}
