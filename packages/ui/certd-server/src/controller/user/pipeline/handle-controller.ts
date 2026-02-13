import {ALL, Body, Controller, Inject, Post, Provide} from '@midwayjs/core';
import {AccessGetter, AccessService, BaseController, Constants} from '@certd/lib-server';
import {
  AccessRequestHandleReq,
  IAccessService,
  ITaskPlugin,
  newAccess,
  newNotification,
  NotificationRequestHandleReq,
  pluginRegistry,
  PluginRequestHandleReq,
  TaskInstanceContext,
} from '@certd/pipeline';
import {EmailService} from '../../../modules/basic/service/email-service.js';
import {http, HttpRequestConfig, logger, mergeUtils, utils} from '@certd/basic';
import {NotificationService} from '../../../modules/pipeline/service/notification-service.js';
import {TaskServiceBuilder} from "../../../modules/pipeline/service/getter/task-service-getter.js";
import { cloneDeep } from 'lodash-es';

@Provide()
@Controller('/api/pi/handle')
export class HandleController extends BaseController {
  @Inject()
  accessService: AccessService;

  @Inject()
  emailService: EmailService;

  @Inject()
  taskServiceBuilder: TaskServiceBuilder;

  @Inject()
  notificationService: NotificationService;

  @Post('/access', { summary: Constants.per.authOnly })
  async accessRequest(@Body(ALL) body: AccessRequestHandleReq) {
    const {projectId,userId} = await this.getProjectUserIdRead()
    let inputAccess = body.input.access;
    if (body.input.id > 0) {
      const oldEntity = await this.accessService.info(body.input.id);
      if (oldEntity) {
        if (oldEntity.userId !== this.getUserId()) {
          throw new Error('access not found');
        }
        if (oldEntity.projectId && oldEntity.projectId !== projectId) {
          throw new Error('access not found');
        }
        const param: any = {
          type: body.typeName,
          setting: JSON.stringify(body.input.access),
        };
        this.accessService.encryptSetting(param, oldEntity);
        inputAccess = this.accessService.decryptAccessEntity(param);
      }
    }
    const accessGetter = new AccessGetter(userId,projectId, this.accessService.getById.bind(this.accessService));
    const access = await newAccess(body.typeName, inputAccess,accessGetter);

    mergeUtils.merge(access, body.input);
    const res = await access.onRequest(body);

    return this.ok(res);
  }

  @Post('/notification', { summary: Constants.per.authOnly })
  async notificationRequest(@Body(ALL) body: NotificationRequestHandleReq) {
    const input = body.input.body;

    const notification = await newNotification(body.typeName, input, {
      http,
      logger,
      utils,
      emailService: this.emailService,
    });

    const res = await notification.onRequest(body);

    return this.ok(res);
  }

  @Post('/plugin', { summary: Constants.per.authOnly })
  async pluginRequest(@Body(ALL) body: PluginRequestHandleReq) {
    const {projectId,userId} = await this.getProjectUserIdRead()
    const pluginDefine = pluginRegistry.get(body.typeName);
    const pluginCls = await pluginDefine.target();
    if (pluginCls == null) {
      throw new Error(`plugin ${body.typeName} not found`);
    }
    //实例化access
    //@ts-ignore
    const plugin: PluginRequestHandler = new pluginCls();
    //@ts-ignore
    const instance = plugin as ITaskPlugin;

    const download = async (config: HttpRequestConfig, savePath: string) => {
      await utils.download({
        http,
        logger,
        config,
        savePath,
      });
    };

    const taskServiceGetter = this.taskServiceBuilder.create({userId,projectId})

    const accessGetter = await taskServiceGetter.get<IAccessService>("accessService")
    //@ts-ignore
    const taskCtx: TaskInstanceContext = {
      pipeline: undefined,
      step: undefined,
      define: cloneDeep( pluginDefine.define),
      lastStatus: undefined,
      http,
      download,
      logger: logger,
      inputChanged: true,
      accessService: accessGetter,
      emailService: this.emailService,
      pipelineContext: undefined,
      userContext: undefined,
      fileStore: undefined,
      signal: undefined,
      user: {id:userId,role:"user"},
      projectId,
      // pipelineContext: this.pipelineContext,
      // userContext: this.contextFactory.getContext('user', this.options.userId),
      // fileStore: new FileStore({
      //   scope: this.pipeline.id,
      //   parent: this.runtime.id,
      //   rootDir: this.options.fileRootDir,
      // }),
      // signal: this.abort.signal,
      utils,
      serviceGetter:taskServiceGetter
    };
    instance.setCtx(taskCtx);
    mergeUtils.merge(plugin, body.input);
    await instance.onInstance();
    const res = await plugin.onRequest(body);

    return this.ok(res);
  }
}
