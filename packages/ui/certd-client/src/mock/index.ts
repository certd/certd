import { mock } from "../api/service";
import * as tools from "../api/tools";
import _ from "lodash-es";
import { utils } from "@fast-crud/fast-crud";
// @ts-ignore
const commonMocks: any = import.meta.glob("./common/mock.*.[j|t]s", { eager: true });
// @ts-ignore
const apiMocks: any = import.meta.glob("../api/modules/*.mock.ts", { eager: true });
// @ts-ignore
const viewMocks: any = import.meta.glob("../views/**/mock.[j|t]s", { eager: true });

const list: any = [];
_.forEach(commonMocks, (value: any) => {
  list.push(value.default);
});
_.forEach(apiMocks, (value: any) => {
  list.push(value.default);
});
_.forEach(viewMocks, (value: any) => {
  list.push(value.default);
});

list.forEach((apiFile: any) => {
  for (const item of apiFile) {
    mock.onAny(new RegExp(item.path)).reply(async (config: any) => {
      utils.logger.debug("------------fake request start -------------");
      utils.logger.debug("request:", config);
      const data = config.data ? JSON.parse(config.data) : {};
      const query = config.url.indexOf("?") >= 0 ? config.url.substring(config.url.indexOf("?") + 1) : undefined;
      const params = config.params || {};
      if (query) {
        const arr = query.split("&");
        for (const item of arr) {
          const kv = item.split("=");
          params[kv[0]] = kv[1];
        }
      }

      const req = {
        body: data,
        params: params
      };
      const ret = await item.handle(req);
      utils.logger.debug("response:", ret);
      utils.logger.debug("------------fake request end-------------");
      if (ret.code === 0) {
        return tools.responseSuccess(ret.data, ret.msg);
      } else {
        return tools.responseError(ret.data, ret.msg, ret.code);
      }
    });
  }
});
