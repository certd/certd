import _ from "lodash-es";
import { HttpClient, ILogger } from "../utils";

export type PluginRequest = {
  type: "plugin" | "access";
  typeName: string;
  action: string;
  input: any;
  data: any;
};

export type RequestHandleContext = {
  http: HttpClient;
  logger: ILogger;
};

export class RequestHandler {
  async onRequest(req: PluginRequest, ctx: RequestHandleContext) {
    if (!req.action) {
      throw new Error("action is required");
    }

    const methodName = `on${_.upperFirst(req.action)}`;

    // @ts-ignore
    const method = this[methodName];
    if (method) {
      // @ts-ignore
      return await this[methodName](req.data, ctx);
    }
    throw new Error(`action ${req.action} not found`);
  }
}
