import { request } from "/src/api/service";

const apiPrefix = "/oauth";

export async function OauthLogin(type: string, forType?: string, from?: string, subtype?: string) {
  return await request({
    url: apiPrefix + `/login`,
    method: "post",
    data: {
      type,
      forType: forType || "login",
      from: from || "web",
      subtype,
    },
  });
}

export async function OauthToken(type: string, validationCode: string) {
  return await request({
    url: apiPrefix + `/token`,
    method: "post",
    data: {
      type,
      validationCode,
    },
  });
}

export async function AutoRegister(type: string, code: string) {
  return await request({
    url: apiPrefix + `/autoRegister`,
    method: "post",
    data: {
      validationCode: code,
      type,
    },
  });
}

export async function BindUser(code: string) {
  return await request({
    url: apiPrefix + `/bind`,
    method: "post",
    data: {
      validationCode: code,
    },
  });
}

export async function GetOauthProviders() {
  return await request({
    url: apiPrefix + "/providers",
    method: "post",
  });
}
