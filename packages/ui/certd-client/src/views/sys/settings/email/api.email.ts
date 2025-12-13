import { request } from "/src/api/service";
const apiPrefix = "/mine/email";
const apiSettingPrefix = "/sys/settings";

export async function TestSend(receiver: string) {
  await request({
    url: apiPrefix + "/test",
    method: "post",
    data: {
      receiver,
    },
  });
}

export async function GetEmailTemplates() {
  return await request({
    url: apiSettingPrefix + "/getEmailTemplates",
    method: "post",
  });
}
