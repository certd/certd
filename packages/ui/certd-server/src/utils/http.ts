import { utils } from '@certd/pipeline';

export async function request(config: any) {
  try {
    return await utils.http(config);
  } catch (e) {
    const data = e.data || e.response?.data;
    if (data) {
      throw new Error(data.message || data.msg || data.error || data);
    }
    throw e;
  }
}
