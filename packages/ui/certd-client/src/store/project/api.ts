import { request } from "/src/api/service";

export async function MyProjectList() {
  return await request({
    url: "/enterprise/project/list",
    method: "post",
    data: {},
  });
}
