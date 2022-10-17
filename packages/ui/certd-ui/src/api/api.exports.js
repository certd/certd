import { request } from "./service";
import _ from "lodash-es";
function arrayToMap(arr) {
  if (arr && arr instanceof Array) {
    const map = {};
    _.forEach(arr, (item) => {
      map[item.key] = item;
    });
    return map;
  }
  return arr;
}

function transfer(options) {
  options.accessProviders = arrayToMap(options.accessProviders);
}
export default {
  exportsToZip(options) {
    transfer(options);
    return request({
      url: "/exports/toZip",
      data: { options },
      method: "post",
      responseType: "blob" // 重点在于配置responseType: 'blob'
    }).then((res) => {
      console.log("res", res);
      const filename = decodeURI(res.headers["content-disposition"].replace("attachment;filename=", "")); // 由后端设置下载文件名
      const blob = new Blob([res.data], { type: "application/zip" });
      const a = document.createElement("a");
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      const body = document.getElementsByTagName("body")[0];
      body.appendChild(a);
      a.click();
      body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }
};
