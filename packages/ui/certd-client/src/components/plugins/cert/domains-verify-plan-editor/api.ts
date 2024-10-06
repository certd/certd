import { request } from "/src/api/service";

const apiPrefix = "/cname/record";

export type CnameRecord = {
  id: number;
  status: string;
};

export async function GetList() {
  return await request({
    url: apiPrefix + "/list",
    method: "post"
  });
}

export async function GetByDomain(domain: string) {
  return await request({
    url: apiPrefix + "/getByDomain",
    method: "post",
    data: {
      domain,
      createOnNotFound: true
    }
  });
}
