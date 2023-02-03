import { request } from "/src/api/service";
import { RunHistory } from "/@/views/certd/pipeline/pipeline/type";

const apiPrefix = "/pi/history";

export async function GetList(query) {
  const list = await request({
    url: apiPrefix + "/list",
    method: "post",
    data: query
  });
  for (const item of list) {
    if (item.pipeline) {
      item.pipeline = JSON.parse(item.pipeline);
    }
  }
  console.log("history", list);
  return list;
}

export async function GetDetail(query): Promise<RunHistory> {
  const detail = await request({
    url: apiPrefix + "/detail",
    method: "post",
    params: query
  });

  const pipeline = JSON.parse(detail.history?.pipeline || "{}");
  const logs = JSON.parse(detail.log?.logs || "{}");
  return {
    id: detail.history.id,
    pipeline,
    logs
  } as RunHistory;
}
