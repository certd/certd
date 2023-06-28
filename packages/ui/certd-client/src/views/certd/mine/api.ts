import { request } from "/src/api/service";

export async function getMineInfo() {
  return request({
    url: "/mine/info",
    method: "POST"
  });
}

export async function changePassword(form: any) {
  return request({
    url: "/mine/changePassword",
    method: "POST",
    data: form
  });
}
