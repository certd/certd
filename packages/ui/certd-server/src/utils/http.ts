import { utils } from '@certd/pipeline';

export async function request(config: any) {
  try {
    return await utils.http(config);
  } catch (e) {
    const data = e.data || e.response?.data;
    if (data) {
      throw new Error(data.message || data.msg || data.error || data);
    }
    if (e.statusText) {
      throw new Error(`请求失败:${e.request?.url}  ${e.status}  ${e.statusText}`);
    }
    throw e;
  }
}
