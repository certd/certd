import * as cert from "@certd/plugin-cert";
import * as aliyun from "@certd/plugin-aliyun";
import * as tencent from "@certd/plugin-tencent";
import * as host from "@certd/plugin-host";
import * as huawei from "@certd/plugin-huawei";

function register(exports: any) {
  for (const key in exports) {
    const value = exports[key];
    console.log("value");
  }
}
register(cert);
register(aliyun);
register(tencent);
register(host);
register(huawei);

export * from "@certd/plugin-cert";
export * from "@certd/plugin-aliyun";
export * from "@certd/plugin-tencent";
export * from "@certd/plugin-host";
export * from "@certd/plugin-huawei";
