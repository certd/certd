import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { Constants } from '../../../basic/constants.js';
import {
  AccessRequestHandleReq,
  http,
  ITaskPlugin,
  logger,
  mergeUtils,
  newAccess,
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
    let inputAccess = body.input.access;
    if (body.input.id > 0) {
      const oldEntity = await this.accessService.info(body.input.id);
      if (oldEntity) {
        const param: any = {
          type: body.typeName,
          setting: JSON.stringify(body.input.access),
        };
        this.accessService.encryptSetting(param, oldEntity);
        inputAccess = this.accessService.decryptAccessEntity(param);
      }
    }

    const access = newAccess(body.typeName, inputAccess);

    const res = await access.onRequest(body);

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
