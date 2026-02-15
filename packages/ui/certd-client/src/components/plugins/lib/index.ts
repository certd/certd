import { request } from "/@/api/service";
export type ComponentPropsType = {
  type?: string;
  typeName?: string;
  action: string;
  form?: any;
  value?: any;
};
export type RequestHandleReq<T = any> = {
  type: string;
  typeName: string;
  action: string;
  data?: any;
  input: T;
  record?: any;
};

export async function doRequest(req: RequestHandleReq, opts: any = {}) {
  const url = `/pi/handle/${req.type}`;
  const { typeName, action, data, input, record } = req;
  const res = await request({
    url,
    method: "post",
    data: {
      typeName,
      action,
      data,
      input,
      record,
    },
    ...opts,
  });
  return res;
}
