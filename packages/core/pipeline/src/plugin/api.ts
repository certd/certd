import { domainUtils, HttpClient, HttpRequestConfig, ILogger, logger, utils } from "@certd/basic";
import dayjs from "dayjs";
import { cloneDeep, upperFirst } from "lodash-es";
import { accessRegistry, IAccessService } from "../access/index.js";
import { PageSearch } from "../context/index.js";
import { FileStore } from "../core/file-store.js";
import { CancelError, IContext, RunHistory, RunnableCollection } from "../core/index.js";
import { FileItem, FormItemProps, Pipeline, Runnable, Step } from "../dt/index.js";
import { INotificationService } from "../notification/index.js";
import { Registrable } from "../registry/index.js";
import { IPluginConfigService } from "../service/config.js";
import { TaskEmitter } from "../service/emit.js";
import { ICnameProxyService, IEmailService, IServiceGetter, IUrlService } from "../service/index.js";

export type PluginRequestHandleReq<T = any> = {
  typeName: string;
  action: string;
  input: T;
  data: any;
  record: { id: number; type: string; title: string };
  fromType?: "sys" | "user"; // sys、user
};

export type UserInfo = {
  role: "admin" | "user";
  id: any;
};
export enum ContextScope {
  global,
  pipeline,
  runtime,
}

export type TaskOutputDefine = {
  title: string;
  value?: any;
  type?: string;
};

export type TaskInputDefine = {
  required?: boolean;
  isSys?: boolean;
} & FormItemProps;

export type PluginDefine = Registrable & {
  default?: any;
  group?: string;
  icon?: string;
  input?: {
    [key: string]: TaskInputDefine;
  };
  output?: {
    [key: string]: TaskOutputDefine;
  };

  shortcut?: {
    [key: string]: {
      title: string;
      icon: string;
      action: string;
      form: any;
    };
  };
  onlyAdmin?: boolean;
  needPlus?: boolean;
  showRunStrategy?: boolean;
  runStrategy?: any;
  pluginType?: string; //类型
  type?: string; //来源
};

export type ITaskPlugin = {
  onInstance(): Promise<void>;
  execute(): Promise<void | string>;
  onRequest(req: PluginRequestHandleReq<any>): Promise<any>;
  [key: string]: any;
};

export type TaskResult = {
  clearLastStatus?: boolean;
  files?: FileItem[];
  pipelineVars: Record<string, any>;
  pipelinePrivateVars?: Record<string, any>;
};

export type CertTargetItem = {
  value: string;
  label: string;
  domain: string | string[];
};
export type TaskInstanceContext = {
  //流水线定义
  pipeline: Pipeline;
  //运行时历史
  runtime: RunHistory;
  //步骤定义
  step: Step;
  define: PluginDefine;
  //日志
  logger: ILogger;
  //当前步骤输入参数跟上一次执行比较是否有变化
  inputChanged: boolean;
  //授权获取服务
  accessService: IAccessService;
  //邮件服务
  emailService: IEmailService;
  //cname记录服务
  cnameProxyService: ICnameProxyService;
  //插件配置服务
  pluginConfigService: IPluginConfigService;
  //通知服务
  notificationService: INotificationService;
  //url构建
  urlService: IUrlService;
  //流水线上下文
  pipelineContext: IContext;
  //用户上下文
  userContext: IContext;
  //http请求客户端
  http: HttpClient;
  //下载文件方法
  download: (config: HttpRequestConfig, savePath: string) => Promise<void>;
  //文件存储
  fileStore: FileStore;
  //上一次执行结果状态
  lastStatus?: Runnable;
  //用户取消信号
  signal: AbortSignal;
  //工具类
  utils: typeof utils;
  //用户信息
  user: UserInfo;

  //项目id
  projectId?: number;

  emitter: TaskEmitter;

  //service 容器
  serviceGetter?: IServiceGetter;
};

export abstract class AbstractTaskPlugin implements ITaskPlugin {
  _result: TaskResult = { clearLastStatus: false, files: [], pipelineVars: {}, pipelinePrivateVars: {} };
  ctx!: TaskInstanceContext;
  logger!: ILogger;
  http!: HttpClient;
  accessService!: IAccessService;

  clearLastStatus() {
    this._result.clearLastStatus = true;
  }

  getFiles() {
    return this._result.files;
  }

  checkSignal() {
    if (this.ctx.signal && this.ctx.signal.aborted) {
      throw new CancelError("用户取消");
    }
  }

  setCtx(ctx: TaskInstanceContext) {
    this.ctx = ctx;
    this.logger = ctx.logger;
    this.accessService = ctx.accessService;
    this.http = ctx.http;
    // 将证书加入secret
    // @ts-ignore
    if (this.cert && this.cert.crt && this.cert.key) {
      //有证书
      // @ts-ignore
      const cert: any = this.cert;
      this.registerSecret(cert.crt);
      this.registerSecret(cert.key);
      this.registerSecret(cert.one);
    }

    if (this.ctx?.define?.onlyAdmin) {
      this.checkAdmin();
    }
  }

  async getAccess<T = any>(accessId: string | number, isCommon = false) {
    if (accessId == null) {
      throw new Error("您还没有配置授权");
    }
    let res: any = null;
    if (isCommon) {
      res = await this.ctx.accessService.getCommonById(accessId);
    } else {
      res = await this.ctx.accessService.getById(accessId);
    }
    if (res == null) {
      throw new Error("授权不存在，可能已被删除，请前往任务配置里面重新选择授权");
    }
    res.ctx.logger = this.logger;
    res.ctx.http = this.http;
    // @ts-ignore
    if (this.logger?.addSecret) {
      // 隐藏加密信息，不在日志中输出
      const type = res._type;
      const plugin = accessRegistry.get(type);
      const define = plugin.define;
      // @ts-ignore
      const input = define.input;
      for (const key in input) {
        if (input[key].encrypt && res[key] != null) {
          // @ts-ignore
          this.logger.addSecret(res[key]);
        }
      }
    }

    return res as T;
  }

  registerSecret(value: string) {
    // @ts-ignore
    if (this.logger?.addSecret) {
      // @ts-ignore
      this.logger.addSecret(value);
    }
  }

  randomFileId() {
    return Math.random().toString(36).substring(2, 9);
  }
  saveFile(filename: string, file: Buffer) {
    const filePath = this.ctx.fileStore.writeFile(filename, file);
    logger.info(`saveFile:${filePath}`);
    this._result.files?.push({
      id: this.randomFileId(),
      filename,
      path: filePath,
    });
  }

  extendsFiles() {
    if (this._result.files == null) {
      this._result.files = [];
    }
    this._result.files.push(...(this.ctx.lastStatus?.status?.files || []));
  }

  get pipeline() {
    return this.ctx.pipeline;
  }

  get step() {
    return this.ctx.step;
  }

  async onInstance(): Promise<void> {
    return;
  }

  abstract execute(): Promise<void | string>;

  appendTimeSuffix(name?: string) {
    return utils.string.appendTimeSuffix(name);
  }

  buildCertName(domain: string, prefix = "") {
    domain = domain.replaceAll("*", "_").replaceAll(".", "_");
    return `${prefix}_${domain}_${dayjs().format("YYYYMMDDHHmmssSSS")}`;
  }

  async onRequest(req: PluginRequestHandleReq<any>) {
    if (!req.action) {
      throw new Error("action is required");
    }

    let methodName = req.action;
    if (!req.action.startsWith("on")) {
      methodName = `on${upperFirst(req.action)}`;
    }

    // @ts-ignore
    const method = this[methodName];
    if (method) {
      // @ts-ignore
      return await this[methodName](req.data);
    }
    throw new Error(`action ${req.action} not found`);
  }

  isAdmin() {
    return this.ctx.user.role === "admin";
  }

  checkAdmin() {
    if (!this.isAdmin()) {
      throw new Error("只有“管理员”或“系统级项目”才有权限运行此插件任务");
    }
  }

  getStepFromPipeline(stepId: string) {
    let found: any = null;
    RunnableCollection.each(this.ctx.pipeline.stages, step => {
      if (step.id === stepId) {
        found = step;
        return;
      }
    });
    return found;
  }

  getStepIdFromRefInput(ref = ".") {
    return ref.split(".")[1];
  }

  buildDomainGroupOptions(options: any[], domains: string[]) {
    return utils.options.buildGroupOptions(options, domains);
  }

  getLastStatus(): Runnable {
    return this.ctx.lastStatus || ({} as any);
  }

  getLastOutput(key: string) {
    return this.getLastStatus().status?.output?.[key];
  }

  isDomainMatched(domainList: string | string[], certDomains: string[]): boolean {
    const matched = domainUtils.match(domainList, certDomains);
    return matched;
  }

  isNotChanged() {
    const lastResult = this.ctx?.lastStatus?.status?.status;
    return !this.ctx.inputChanged && lastResult === "success";
  }

  async getAutoMatchedTargets(req: {
    targetName: string;
    certDomains: string[];
    pageSize: number;
    getDeployTargetList: (req: PageSearch) => Promise<{ list: CertTargetItem[]; total: number }>;
  }): Promise<CertTargetItem[]> {
    const matchedDomains: CertTargetItem[] = [];
    let pageNo = 1;
    const { certDomains } = req;

    const pageSize = req.pageSize || 100;
    while (true) {
      const result = await req.getDeployTargetList({
        pageNo,
        pageSize,
      });
      const pageData = result.list;
      this.logger.info(`获取到 ${pageData.length} 个 ${req.targetName}`);

      if (!pageData || pageData.length === 0) {
        break;
      }

      for (const item of pageData) {
        const domainName = item.domain;
        if (this.isDomainMatched(domainName, certDomains)) {
          matchedDomains.push(item);
        }
      }

      const totalCount = result.total || 0;
      if (pageNo * pageSize >= totalCount || matchedDomains.length == 0) {
        break;
      }

      pageNo++;
    }

    return matchedDomains;
  }

  async autoMatchedDeploy(req: {
    targetName: string;
    getCertDomains: () => Promise<string[]>;
    uploadCert: () => Promise<any>;
    deployOne: (req: { target: CertTargetItem; cert: any }) => Promise<void>;
    getDeployTargetList: (req: PageSearch) => Promise<{ list: CertTargetItem[]; total: number }>;
  }): Promise<{ result: string; deployedList: string[] }> {
    this.logger.info("证书匹配模式部署");
    const certDomains = await req.getCertDomains();
    const certTargetList = await this.getAutoMatchedTargets({
      targetName: req.targetName,
      pageSize: 200,
      certDomains,
      getDeployTargetList: req.getDeployTargetList,
    });
    if (certTargetList.length === 0) {
      this.logger.warn(`未找到匹配的${req.targetName}`);
      return { result: "skip", deployedList: [] };
    }
    this.logger.info(`找到 ${certTargetList.length} 个匹配的${req.targetName}`);

    //开始部署，检查是否已经部署过
    const deployedList = cloneDeep(this.getLastStatus()?.status?.output?.deployedList || []);
    const unDeployedTargets = certTargetList.filter(item => !deployedList.includes(item.value));
    const count = unDeployedTargets.length;
    const deployedCount = certTargetList.length - count;
    if (deployedCount > 0) {
      this.logger.info(`跳过 ${deployedCount} 个已部署过的${req.targetName}`);
    }
    this.logger.info(`需要部署 ${count} 个${req.targetName}`);
    if (count === 0) {
      return { result: "skip", deployedList };
    }
    this.logger.info(`开始部署`);
    const aliCrtId = await req.uploadCert();
    for (const target of unDeployedTargets) {
      await req.deployOne({
        cert: aliCrtId,
        target,
      });
      deployedList.push(target.value);
    }
    this.logger.info(`本次成功部署 ${count} 个${req.targetName}`);
    return { result: "success", deployedList };
  }
}

export type OutputVO = {
  key: string;
  title: string;
  value: any;
};
