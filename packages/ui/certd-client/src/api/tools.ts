/**
 * @description 安全地解析 json 字符串
 * @param {String} jsonString 需要解析的 json 字符串
 * @param {String} defaultValue 默认值
 */
import { uiContext } from "@fast-crud/fast-crud";
import { CodeError } from "/@/api/service";

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
 * @param {String} message 状态信息
 * @param {Number} code 状态码
 */
export function response(data = {}, message = "", code = 0) {
  return [200, { code, message, data }];
}

/**
 * @description 接口请求返回 正确返回
 * @param {Any} data 返回值
 * @param {String} message 状态信息
 */
export function responseSuccess(data = {}, message = "成功") {
  return response(data, message);
}

/**
 * @description 接口请求返回 错误返回
 * @param {Any} data 返回值
 * @param {String} message 状态信息
 * @param {Number} code 状态码
 */
export function responseError(data = {}, message = "请求失败", code = 500) {
  return response(data, message, code);
}

/**
 * @description 记录和显示错误
 * @param {Error} error 错误对象
 */
export function errorLog(error: any, notify = true) {
  // 打印到控制台
  console.error("errorLog", error);
  let message = error.message;
  if (error.response?.data?.message) {
    message = error.response.data.message;
  }
  if (message.indexOf("ssl3_get_record:wrong version number") >= 0) {
    message = "http协议错误，服务端要求http协议，请检查是否使用了https请求";
  }
  if (notify) {
    // 显示提示
    uiContext.get().notification.error({ message });
  }
}

/**
 * @description 创建一个错误
 */
export function errorCreate(msg: string, notify = true, data?: any) {
  const err = new CodeError(msg, data?.code || 1, data?.data);
  console.error("errorCreate", err);
  if (notify) {
    uiContext.get().notification.error({ message: err.message });
  }

  throw err;
}
