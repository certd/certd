import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { Constants } from '../../../basic/constants.js';
import {
  accessRegistry,
  AccessRequestHandleContext,
  AccessRequestHandleReq,
  http,
  ITaskPlugin,
  logger,
  mergeUtils,
  pluginRegistry,
  PluginRequestHandleReq,
  TaskInstanceContext,
  utils,
} from '@certd/pipeline';
import { BaseController } from '../../../basic/base-controller.js';
import { AccessService } from '../service/access-service.js';
import { EmailService } from '../../basic/service/email-service.js';

@Provide()
@Controller('/api/pi/handle')
export class HandleController extends BaseController {
  @Inject()
  accessService: AccessService;

  @Inject()
  emailService: EmailService;

  @Post('/access', { summary: Constants.per.authOnly })
  async accessRequest(@Body(ALL) body: AccessRequestHandleReq) {
    const accessItem = accessRegistry.get(body.typeName);
    const accessCls = accessItem.target;
    if (accessCls == null) {
      throw new Error(`access ${body.typeName} not found`);
    }
    //实例化access
    //@ts-ignore
    const access = new accessCls();

    let isNew = true;
    if (body.input.id > 0) {
      const oldEntity = await this.accessService.info(body.input.id);
      if (!oldEntity) {
        isNew = false;
        const param = {
          type: body.typeName,
          setting: JSON.stringify(body.input.access),
        };
        this.accessService.encryptSetting(param, oldEntity);
        body.input.access = JSON.parse(param.setting);
      }
    }
    if (isNew) {
      mergeUtils.merge(access, body.input.access);
    }

    const ctx: AccessRequestHandleContext = {
      http: http,
      logger: logger,
      utils,
    };
    const res = await access.onRequest(body, ctx);

    return this.ok(res);
  }

  @Post('/plugin', { summary: Constants.per.authOnly })
  async pluginRequest(@Body(ALL) body: PluginRequestHandleReq) {
    const pluginDefine = pluginRegistry.get(body.typeName);
    const pluginCls = pluginDefine.target;
    if (pluginCls == null) {
      throw new Error(`plugin ${body.typeName} not found`);
    }
    //实例化access
    //@ts-ignore
    const plugin: PluginRequestHandler = new pluginCls();
    //@ts-ignore
    const instance = plugin as ITaskPlugin;
    //@ts-ignore
    const taskCtx: TaskInstanceContext = {
      pipeline: undefined,
      step: undefined,
      lastStatus: undefined,
      http,
      logger: logger,
      inputChanged: true,
      accessService: this.accessService,
      emailService: this.emailService,
      pipelineContext: undefined,
      userContext: undefined,
      fileStore: undefined,
      signal: undefined,
      // pipelineContext: this.pipelineContext,
      // userContext: this.contextFactory.getContext('user', this.options.userId),
      // fileStore: new FileStore({
      //   scope: this.pipeline.id,
      //   parent: this.runtime.id,
      //   rootDir: this.options.fileRootDir,
      // }),
      // signal: this.abort.signal,
      utils,
    };
    instance.setCtx(taskCtx);
    mergeUtils.merge(plugin, body.input);
    await instance.onInstance();
    const res = await plugin.onRequest(body);

    return this.ok(res);
  }
}
