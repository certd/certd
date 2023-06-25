import { request } from "/@/api/service";
const apiPrefix = "/basic/email";

export async function TestSend(receiver: string) {
  await request({
    url: apiPrefix + "/test",
    method: "post",
    data: {
      receiver
    }
  });
}
