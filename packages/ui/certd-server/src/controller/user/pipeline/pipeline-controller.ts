import { Constants, CrudController, SysSettingsService } from "@certd/lib-server";
import { isPlus } from "@certd/plus-core";
import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { ApiProperty, ApiTags } from "@midwayjs/swagger";
import { SiteInfoService } from "../../../modules/monitor/index.js";
import { HistoryService } from "../../../modules/pipeline/service/history-service.js";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { AuthService } from "../../../modules/sys/authority/service/auth-service.js";
import { PipelineEntity } from "../../../modules/pipeline/entity/pipeline.js";

const pipelineExample = `
// 流水线配置示例，实际传送时要去掉注释
{
  "title": "handsfree.work证书自动化", //标题
  "runnableType": "pipeline", //类型，固定为pipeline
  "projectId": 1, // 项目ID， 未开启企业模式，无需传递
  "type": "cert", // 流水线类型，cert：证书自动化, custom ：自定义流水线
  "from": "", // 来源，cert：证书自动化, upload ：证书托管
  "stages": [  //流水线阶段，多个阶段串行执行
    {
      "id": "edKopnpp2wvOCQ2vkV8Ii" // 阶段ID， 由客户端生成，流水线内部全局唯一即可
      "title": "证书申请阶段", //阶段标题
      "runnableType": "stage", // 类型标识
      "tasks": [ // 任务列表，多个任务并行执行
        {
          "id": "Lb8I7Dj10cGh6gqIIkmKv" // 任务ID， 由客户端生成，流水线内部全局唯一即可
          "title": "证书申请任务", // 任务标题
          "runnableType": "task", // 类型标识
          "steps": [ // 步骤列表，同一个任务下的多个步骤串行执行
            {
              "id": "zc8X1L2f0N0KgbrqFU3gz" // 步骤ID， 由客户端生成，流水线内部全局唯一即可
              "type": "CertApply", // 插件类型
              "title": "申请证书", // 步骤标题
              "runnableType": "step", // 类型标识
              "input": { //输入参数 ，根据插件的配置有不同的参数，具体参数建议通过浏览器F12进行查看
                "renewDays": 20,
              },
              "strategy": { // 策略
                "runStrategy": 0 // 运行策略，0：正常执行，1：成功后跳过
              },
            }
          ],
        }
      ],
    }
  ],
  "triggers": [ // 触发器配置
    {
      "id": "pt3865qfIAkULBS5sOQf7", // 触发器ID， 由客户端生成，流水线内部全局唯一即可
      "title": "定时触发",
      "type": "timer", // 触发器类型，timer：定时触发
      "props": {
        "cron": "0 34 5 * * *" // 定时表达式
      },
    }
  ],
  "notifications": [ // 通知配置
    {
      "id": "5pb1gZTnDEjdHkR5tDd6g" // 通知ID， 由客户端生成，流水线内部全局唯一即可
      "title": "使用默认通知",// 通知标题
      "type": "custom", // 通知类型，固定为custom 
      "when": [ // 触发条件，error：错误时触发，turnToSuccess：失败转成功后触发，success： 成功时触发
        "error",
        "turnToSuccess"
      ],
      "notificationId": 0, // 通知ID， 0为使用默认通知
    }
  ],
}`;

export class PipelineSaveDTO {
  @ApiProperty({ description: "Id，修改时必传" })
  id: number;
  userId: number;
  @ApiProperty({ description: "标题" })
  title: string;
  @ApiProperty({ description: "流水线详细配置，json格式的字符串", example: pipelineExample })
  content: string;

  @ApiProperty({ description: "保留历史版本数量" })
  keepHistoryCount: number;
  @ApiProperty({ description: "分组ID" })
  groupId: number;
  @ApiProperty({ description: "备注" })
  remark: string;
  @ApiProperty({ description: "状态" })
  status: string;
  @ApiProperty({ description: "是否禁用" })
  disabled: boolean;
  @ApiProperty({ description: "类型" })
  type: string;
  webhookKey: string;
  @ApiProperty({ description: "来源" })
  from: string;
  @ApiProperty({ description: "排序" })
  order: number;
  @ApiProperty({ description: "项目ID" })
  projectId: number;
  @ApiProperty({ description: "流水线有效期，单位秒" })
  validTime: number;
  @ApiProperty({ description: "是否增加证书监控" })
  addToMonitorEnabled: boolean;
  @ApiProperty({ description: "增加证书监控的域名，逗号分隔" })
  addToMonitorDomains: string;
}

/**
 * 证书
 */
@Provide()
@ApiTags(["pipeline"])
@Controller("/api/pi/pipeline")
export class PipelineController extends CrudController<PipelineService> {
  @Inject()
  service: PipelineService;
  @Inject()
  historyService: HistoryService;
  @Inject()
  authService: AuthService;
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  siteInfoService: SiteInfoService;

  getService() {
    return this.service;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询流水线分页列表" })
  async page(@Body(ALL) body) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const publicSettings = await this.sysSettingsService.getPublicSettings();

    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query.projectId = projectId;
    let onlyOther = false;
    if (isAdmin) {
      if (publicSettings.managerOtherUserPipeline) {
        //管理员管理 其他用户
        if (body.query.userId === -1) {
          //如果只查询其他用户
          onlyOther = true;
          delete body.query.userId;
        }
      } else {
        body.query.userId = userId;
      }
    } else {
      body.query.userId = userId;
    }

    const title = body.query.title;
    delete body.query.title;

    const buildQuery = qb => {
      if (title) {
        qb.andWhere("(title like :title or content like :content)", { title: `%${title}%`, content: `%${title}%` });
      }
      if (onlyOther) {
        qb.andWhere("user_id  != :userId", { userId: this.getUserId() });
      }
    };
    if (!body.sort || !body.sort?.prop) {
      body.sort = { prop: "order", asc: false };
    }

    const pageRet = await this.getService().page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery,
    });
    return this.ok(pageRet);
  }

  @Post("/getSimpleByIds", { description: Constants.per.authOnly, summary: "根据ID列表获取流水线简单信息" })
  async getSimpleById(@Body(ALL) body) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const ret = await this.getService().getSimplePipelines(body.ids, userId, projectId);
    return this.ok(ret);
  }

  @Post("/add", { description: Constants.per.authOnly })
  async add(@Body(ALL) bean: PipelineEntity) {
    return await this.save(bean as any);
  }

  @Post("/update", { description: Constants.per.authOnly })
  async update(@Body(ALL) bean: PipelineEntity) {
    await this.checkOwner(this.getService(), bean.id, "write", true);
    await this.service.update(bean as any);
    return this.ok({});
  }

  @Post("/save", { description: Constants.per.authOnly, summary: "新增/更新流水线" })
  async save(@Body() bean: PipelineSaveDTO) {
    const { userId, projectId } = await this.getProjectUserIdWrite();
    if (bean.id > 0) {
      const { userId, projectId } = await this.checkOwner(this.getService(), bean.id, "write", true);
      bean.userId = userId;
      bean.projectId = projectId;
    } else {
      bean.userId = userId;
      bean.projectId = projectId;
    }

    if (!this.isAdmin()) {
      // 非管理员用户 不允许设置流水线有效期
      delete bean.validTime;
    }

    const { version } = await this.service.save(bean as any);
    //是否增加证书监控
    if (bean.addToMonitorEnabled && bean.addToMonitorDomains) {
      const sysPublicSettings = await this.sysSettingsService.getPublicSettings();
      if (isPlus() && sysPublicSettings.certDomainAddToMonitorEnabled) {
        //增加证书监控
        await this.siteInfoService.doImport({
          text: bean.addToMonitorDomains,
          userId: userId,
          projectId: projectId,
        });
      }
    }
    return this.ok({ id: bean.id, version: version });
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除流水线" })
  async delete(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "write", true);
    await this.service.delete(id);
    return this.ok({});
  }

  @Post("/disabled", { description: Constants.per.authOnly, summary: "禁用流水线" })
  async disabled(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id, "write", true);
    delete bean.userId;
    delete bean.projectId;
    await this.service.disabled(bean.id, bean.disabled);
    return this.ok({});
  }

  @Post("/detail", { description: Constants.per.authOnly, summary: "查询流水线详情" })
  async detail(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "read", true);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post("/trigger", { description: Constants.per.authOnly, summary: "触发流水线执行" })
  async trigger(@Query("id") id: number, @Query("stepId") stepId?: string) {
    await this.checkOwner(this.getService(), id, "write", true);
    await this.service.trigger(id, stepId, true);
    return this.ok({});
  }

  @Post("/cancel", { description: Constants.per.authOnly, summary: "取消流水线执行" })
  async cancel(@Query("historyId") historyId: number) {
    await this.checkOwner(this.historyService, historyId, "write", true);
    await this.service.cancel(historyId);
    return this.ok({});
  }

  @Post("/count", { description: Constants.per.authOnly, summary: "查询流水线数量" })
  async count() {
    const { userId } = await this.getProjectUserIdRead();
    const count = await this.service.count({ userId: userId });
    return this.ok({ count });
  }

  private async checkPermissionCall(callback: any) {
    const { projectId, userId: uid } = await this.getProjectUserIdWrite();
    let userId = uid;
    if (projectId) {
      return await callback({ userId, projectId });
    }
    const isAdmin = await this.authService.isAdmin(this.ctx);
    userId = isAdmin ? undefined : userId;
    return await callback({ userId });
  }

  @Post("/batchDelete", { description: Constants.per.authOnly, summary: "批量删除流水线" })
  async batchDelete(@Body("ids") ids: number[]) {
    // let { projectId ,userId} = await this.getProjectUserIdWrite()
    // if(projectId){
    //   await this.service.batchDelete(ids, null,projectId);
    //   return this.ok({});
    // }
    // const isAdmin = await this.authService.isAdmin(this.ctx);
    // userId = isAdmin ? undefined : userId;
    // await this.service.batchDelete(ids, userId);
    // return this.ok({});
    await this.checkPermissionCall(async ({ userId, projectId }) => {
      await this.service.batchDelete(ids, userId, projectId);
    });
    return this.ok({});
  }

  @Post("/batchUpdateGroup", { description: Constants.per.authOnly, summary: "批量更新流水线分组" })
  async batchUpdateGroup(@Body("ids") ids: number[], @Body("groupId") groupId: number) {
    // let { projectId ,userId} = await this.getProjectUserIdWrite()
    // if(projectId){
    //   await this.service.batchUpdateGroup(ids, groupId, null,projectId);
    //   return this.ok({});
    // }

    // const isAdmin = await this.authService.isAdmin(this.ctx);
    // userId = isAdmin ? undefined : this.getUserId();
    // await this.service.batchUpdateGroup(ids, groupId, userId);
    await this.checkPermissionCall(async ({ userId, projectId }) => {
      await this.service.batchUpdateGroup(ids, groupId, userId, projectId);
    });
    return this.ok({});
  }

  @Post("/batchUpdateTrigger", { description: Constants.per.authOnly, summary: "批量更新流水线触发器" })
  async batchUpdateTrigger(@Body("ids") ids: number[], @Body("trigger") trigger: any) {
    // let { projectId ,userId} = await this.getProjectUserIdWrite()
    // if(projectId){
    //  await this.service.batchUpdateTrigger(ids, trigger, null,projectId);
    //   return this.ok({});
    // }

    // const isAdmin = await this.authService.isAdmin(this.ctx);
    // userId = isAdmin ? undefined : this.getUserId();
    // await this.service.batchUpdateTrigger(ids, trigger, userId);
    await this.checkPermissionCall(async ({ userId, projectId }) => {
      await this.service.batchUpdateTrigger(ids, trigger, userId, projectId);
    });
    return this.ok({});
  }

  @Post("/batchUpdateNotification", { description: Constants.per.authOnly, summary: "批量更新流水线通知" })
  async batchUpdateNotification(@Body("ids") ids: number[], @Body("notification") notification: any) {
    // const isAdmin = await this.authService.isAdmin(this.ctx);
    // const userId = isAdmin ? undefined : this.getUserId();
    // await this.service.batchUpdateNotifications(ids, notification, userId);
    await this.checkPermissionCall(async ({ userId, projectId }) => {
      await this.service.batchUpdateNotifications(ids, notification, userId, projectId);
    });
    return this.ok({});
  }

  @Post("/batchUpdateCertApplyOptions", { description: Constants.per.authOnly, summary: "批量更新证书申请任务配置" })
  async batchUpdateCertApplyOptions(@Body("ids") ids: number[], @Body("options") options: any) {
    await this.checkPermissionCall(async ({ userId, projectId }) => {
      await this.service.batchUpdateCertApplyOptions(ids, options, userId, projectId);
    });
    return this.ok({});
  }

  @Post("/batchRerun", { description: Constants.per.authOnly, summary: "批量重新运行流水线" })
  async batchRerun(@Body("ids") ids: number[], @Body("force") force: boolean) {
    await this.checkPermissionCall(async ({ userId, projectId }) => {
      await this.service.batchRerun(ids, force, userId, projectId);
    });
    return this.ok({});
  }

  @Post("/batchTransfer", { description: Constants.per.authOnly, summary: "批量迁移流水线" })
  async batchTransfer(@Body("ids") ids: number[], @Body("toProjectId") toProjectId: number) {
    await this.checkPermissionCall(async ({}) => {
      await this.service.batchTransfer(ids, toProjectId);
    });
    return this.ok({});
  }

  @Post("/refreshWebhookKey", { description: Constants.per.authOnly, summary: "刷新Webhook密钥" })
  async refreshWebhookKey(@Body("id") id: number) {
    await this.checkOwner(this.getService(), id, "write", true);
    const res = await this.service.refreshWebhookKey(id);
    return this.ok({
      webhookKey: res,
    });
  }
}
