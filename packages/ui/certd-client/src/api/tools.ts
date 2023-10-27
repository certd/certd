/**
 * @description 安全地解析 json 字符串
 * @param {String} jsonString 需要解析的 json 字符串
 * @param {String} defaultValue 默认值
 */
import { uiContext } from "@fast-crud/fast-crud";

export function parse(jsonString = "{}", defaultValue = {}) {
  let result = defaultValue;
  try {
    result = JSON.parse(jsonString);
  } catch (error) {
    console.log(error);
  }
  return result;
}

/**
 * @description 接口请求返回
 * @param {Any} data 返回值
 * @param {String} msg 状态信息
 * @param {Number} code 状态码
 */
export function response(data = {}, msg = "", code = 0) {
  return [200, { code, msg, data }];
}

/**
 * @description 接口请求返回 正确返回
 * @param {Any} data 返回值
 * @param {String} msg 状态信息
 */
export function responseSuccess(data = {}, msg = "成功") {
  return response(data, msg);
}

/**
 * @description 接口请求返回 错误返回
 * @param {Any} data 返回值
 * @param {String} msg 状态信息
 * @param {Number} code 状态码
 */
export function responseError(data = {}, msg = "请求失败", code = 500) {
  return response(data, msg, code);
}

/**
 * @description 记录和显示错误
 * @param {Error} error 错误对象
 */
export function errorLog(error: any) {
  // 打印到控制台
  console.error("errorLog", error);
  let message = error.message;
  if (error.response?.data?.message) {
    message = error.response.data.message;
  }
  // 显示提示
  uiContext.get().notification.error({ message });
}

/**
 * @description 创建一个错误
 * @param {String} msg 错误信息
 */
export function errorCreate(msg: string) {
  const err = new Error(msg);
  console.error("errorCreate", err);
  uiContext.get().notification.error({ message: err.message });
  throw err;
}
