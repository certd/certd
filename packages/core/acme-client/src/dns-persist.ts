// @ts-ignore
import psl from "psl";

export function getDnsPersistIssuer(directoryUrl?: string) {
  if (!directoryUrl) {
    return "letsencrypt.org";
  }

  let directory: URL;
  try {
    directory = new URL(directoryUrl);
  } catch {
    throw new Error(`ACME Directory URL无效，无法生成DNS持久验证Issuer：${directoryUrl}`);
  }

  const issuer = psl.get(directory.hostname);
  if (!issuer) {
    throw new Error(`无法从ACME Directory URL获取可注册主域名：${directory.hostname}`);
  }
  return issuer;
}
