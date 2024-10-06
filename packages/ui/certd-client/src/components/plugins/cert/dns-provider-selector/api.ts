import { request } from "/src/api/service";

const apiPrefix = "/pi/dnsProvider";

export async function GetList() {
  return await request({
    url: apiPrefix + "/list",
    method: "post"
  });
}
