import { request } from "/@/api/service";

export async function PreBindUser(userId: number) {
  await request({
    url: "/sys/account/preBindUser",
    method: "post",
    data: { userId }
  });
}

export async function BindUser(userId: number) {
  await request({
    url: "/sys/account/bindUser",
    method: "post",
    data: { userId }
  });
}

export async function UnbindUser(userId: number) {
  await request({
    url: "/sys/account/unbindUser",
    method: "post",
    data: { userId }
  });
}

export async function UpdateLicense(data: any) {
  await request({
    url: "/sys/account/updateLicense",
    method: "post",
    data
  });
}
