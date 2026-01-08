import { request } from "/src/api/service";

const apiPrefix = "/pi/pipeline";

export async function RefreshWebhookKey(form: any) {
  return await request({
    url: apiPrefix + "/refreshWebhookKey",
    method: "post",
    data: form,
  });
}
