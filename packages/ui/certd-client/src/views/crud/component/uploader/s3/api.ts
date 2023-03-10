import { requestForMock } from "/src/api/service";
import { generateUrls } from "/@/views/crud/component/uploader/s3/s3-server";
const request = requestForMock;
const apiPrefix = "/mock/S3Uploader";
export function GetList(query: any) {
  return request({
    url: apiPrefix + "/page",
    method: "get",
    data: query
  });
}

export function AddObj(obj: any) {
  return request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj
  });
}

export function UpdateObj(obj: any) {
  return request({
    url: apiPrefix + "/update",
    method: "post",
    data: obj
  });
}

export function DelObj(id: any) {
  return request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id }
  });
}

export function GetObj(id: any) {
  return request({
    url: apiPrefix + "/info",
    method: "get",
    params: { id }
  });
}

/**
 * 向后端请求获取预签名url
 * @param bucket
 * @param key
 * @constructor
 */
export async function GetSignedUrl(bucket: string, key: string) {
  return await generateUrls(bucket, key);
}
