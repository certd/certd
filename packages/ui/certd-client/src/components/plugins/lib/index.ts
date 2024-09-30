import { request } from "/@/api/service";
export type ComponentPropsType = {
  type: string;
  typeName: string;
  action: string;
  form: any;
  value?: any;
};
export type RequestHandleReq<T = any> = {
  type: string;
  typeName: string;
  action: string;
  data?: any;
  input: T;
};

export async function doRequest(req: RequestHandleReq) {
  const url = req.type === "access" ? "/pi/handle/access" : "/pi/handle/plugin";
  const { typeName, action, data, input } = req;
  const res = await request({
    url,
    method: "post",
    data: {
      typeName,
      action,
      data,
      input
    }
  });
  return res;
}
