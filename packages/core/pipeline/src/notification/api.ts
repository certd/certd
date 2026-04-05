import { PluginRequestHandleReq } from "../plugin";
import { Registrable } from "../registry/index.js";
import { FormItemProps, HistoryResult, Pipeline } from "../dt/index.js";
import { HttpClient, ILogger, utils } from "@certd/basic";
import * as _ from "lodash-es";
import { IEmailService } from "../service/index.js";

export type NotificationBody = {
  userId?: number;
  projectId?: number;
  title: string;
  content: string;
  pipeline?: Pipeline;
  pipelineId?: number;
  result?: HistoryResult;
  historyId?: number;
  errorMessage?: string;
  url?: string;
  notificationType?: string;
  attachments?: any[];
  pipelineResult?: string;
  pipelineTitle?: string;
  errors?: string;
  [key: string]: any; // 其他templateData
};

export type NotificationRequestHandleReqInput<T = any> = {
  id?: number;
  title?: string;
  access: T;
};

export type NotificationRequestHandleReq<T = any> = PluginRequestHandleReq<NotificationRequestHandleReqInput<T>>;

export type NotificationInputDefine = FormItemProps & {
  title: string;
  required?: boolean;
  encrypt?: boolean;
};
export type NotificationDefine = Registrable & {
  needPlus?: boolean;
  input?: {
    [key: string]: NotificationInputDefine;
  };
};

export type NotificationInstanceConfig = {
  id: number;
  type: string;
  name: string;
  userId: number;
  setting: {
    [key: string]: any;
  };
};

export type NotificationSendReq = {
  id?: number;
  useDefault?: boolean;
  useEmail?: boolean;
  emailAddress?: string;
  logger: ILogger;
  body: NotificationBody;
};
export interface INotificationService {
  getById(id: number): Promise<NotificationInstanceConfig>;
  getDefault(): Promise<NotificationInstanceConfig>;
  send(req: NotificationSendReq): Promise<void>;
}

export interface INotification {
  ctx: NotificationContext;
  [key: string]: any;
}

export type NotificationContext = {
  http: HttpClient;
  logger: ILogger;
  utils: typeof utils;
  emailService: IEmailService;
};

export abstract class BaseNotification implements INotification {
  define!: NotificationDefine;
  ctx!: NotificationContext;
  http!: HttpClient;
  logger!: ILogger;

  async doSend(body: NotificationBody) {
    return await this.send(body);
  }
  abstract send(body: NotificationBody): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onInstance() {}
  setCtx(ctx: NotificationContext) {
    this.ctx = ctx;
    this.http = ctx.http;
    this.logger = ctx.logger;
  }
  setDefine = (define: NotificationDefine) => {
    this.define = define;
  };

  async onRequest(req: NotificationRequestHandleReq) {
    if (!req.action) {
      throw new Error("action is required");
    }

    let methodName = req.action;
    if (!req.action.startsWith("on")) {
      methodName = `on${_.upperFirst(req.action)}`;
    }

    // @ts-ignore
    const method = this[methodName];
    if (method) {
      // @ts-ignore
      return await this[methodName](req.data);
    }
    throw new Error(`action ${req.action} not found`);
  }

  async onTestRequest() {
    return await this.doSend({
      userId: 0,
      title: "【标题】测试通知【*.foo.com】，标题长度测试、测试、测试",
      content: `测试通知
域名测试: *.foo.com
换行测试
(括号测试)
<尖括号测试>
[中括号测试]
      `,
      pipeline: {
        id: 1,
        title: "证书申请成功【测试流水线】",
      } as any,
      pipelineId: 1,
      historyId: 1,
      url: "https://certd.docmirror.cn",
    });
  }
}
