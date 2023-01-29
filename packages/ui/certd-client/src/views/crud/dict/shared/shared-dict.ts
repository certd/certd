import { dict, utils } from "@fast-crud/fast-crud";
import * as api from "./manager/api";
export const statusDict = dict({
  value: "name",
  async getData() {
    const res = await api.GetList({ query: {}, sort: {}, page: { limit: 9999 } });
    utils.logger.debug("status dict first loaded", res.records);
    return res.records;
  }
});
