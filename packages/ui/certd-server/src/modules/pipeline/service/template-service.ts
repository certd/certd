import {Inject, Provide, Scope, ScopeEnum} from '@midwayjs/core';
import {BaseService, SysSettingsService} from '@certd/lib-server';
import {InjectEntityModel} from '@midwayjs/typeorm';
import {In, Repository} from 'typeorm';
import {TemplateEntity} from '../entity/template.js';
import {PipelineService} from './pipeline-service.js';
import {cloneDeep} from "lodash-es";
import {PipelineEntity} from "../entity/pipeline.js";
import {Pipeline} from "@certd/pipeline";

@Provide()
@Scope(ScopeEnum.Request, {allowDowngrade: true})
export class TemplateService extends BaseService<TemplateEntity> {
  @InjectEntityModel(TemplateEntity)
  repository: Repository<TemplateEntity>;

  @Inject()
  pipelineService: PipelineService;

  @Inject()
  sysSettingsService: SysSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(param: any) {
    const pipelineId = param.pipelineId;
    delete param.pipelineId;

    const pipelineEntity = await this.pipelineService.info(pipelineId);
    if (!pipelineEntity) {
      throw new Error('pipeline not found');
    }
    if (pipelineEntity.userId !== param.userId) {
      throw new Error('permission denied');
    }


    let template = null
    await this.transaction(async (tx: any) => {

      template = await tx.getRepository(TemplateEntity).save(param);
      let newPipeline = cloneDeep(pipelineEntity)
      //创建pipeline模版
      newPipeline.id = undefined;
      newPipeline.title = template.title + "模版流水线"
      newPipeline.templateId = template.id
      newPipeline.isTemplate = true
      newPipeline.userId = template.userId

      const pipelineJson: Pipeline = JSON.parse(newPipeline.content)
      delete pipelineJson.triggers
      pipelineJson.userId = template.userId
      pipelineJson.title = newPipeline.title
      newPipeline.content = JSON.stringify(pipelineJson)
      newPipeline = await tx.getRepository(PipelineEntity).save(newPipeline)

      const update: any = {}
      update.id = template.id
      update.pipelineId = newPipeline.id
      await tx.getRepository(TemplateEntity).save(update)
    })

    return template

  }

  async detail(id: number, userId: number,projectId?:number) {
    const info = await this.info(id)
    if (!info) {
      throw new Error('模板不存在');
    }
    if (info.userId !== userId) {
      throw new Error('无权限');
    }
    if (projectId && info.projectId !== projectId) {
      throw new Error('无权限');
    }
    let pipeline = null
    if (info.pipelineId) {
      const pipelineEntity = await this.pipelineService.info(info.pipelineId);
      pipeline = JSON.parse(pipelineEntity.content)
    }


    return {
      template: info,
      pipeline,
    }
  }

  async batchDelete(ids: number[], userId: number,projectId?:number) {

    const where: any = {
      id: In(ids),
    }
    if (userId != null) {
      where.userId = userId
    }
    if (projectId) {
      where.projectId = projectId
    }
    const list = await this.getRepository().find({where})
    ids = list.map(item => item.id)
    const pipelineIds = list.map(item => item.pipelineId)
    await this.delete(ids);
    await this.pipelineService.batchDelete(pipelineIds, userId, projectId)
  }

  async createPipelineByTemplate(body: PipelineEntity) {
    const templateId = body.templateId;
    const template = await this.info(templateId);

    if (!template && template.userId !== body.userId) {
      throw new Error('模板不存在');
    }

    const tempPipeline = await this.pipelineService.info(template.pipelineId)

    const newPipeline = {
      type: tempPipeline.type,
      from : "template",
      keepHistoryCount: tempPipeline.keepHistoryCount,
      ... body,
    }

    await this.pipelineService.save(newPipeline)

    return newPipeline
  }
}

