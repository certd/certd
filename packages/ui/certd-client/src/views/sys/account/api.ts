import { request } from "/@/api/service";

export function PreBindUser(userId: number) {
  request({
    url: "/sys/account/preBindUser",
    method: "post",
    data: { userId }
  });
}
