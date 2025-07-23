import { request } from "/src/api/service";

export interface RegisterReq {
  username: string;
  password: string;
  confirmPassword: string;
}
/**
 * @description: Login interface parameters
 */
export interface LoginReq {
  username: string;
  password: string;
}

export interface SmsLoginReq {
  mobile: string;
  phoneCode: string;
  smsCode: string;
  randomStr: string;
}

export interface ForgotPasswordReq {
  forgotPasswordType: string;
  input: string;
  randomStr: string;
  imgCode: string;
  validateCode: string;

  password: string;
  confirmPassword: string;
}

export interface UserInfoRes {
  id: string | number;
  username: string;
  nickName: string;
  avatar?: string;
  roleIds: number[];
  isWeak?: boolean;
  validTime?: number;
  status?: number;
}

export interface LoginRes {
  token: string;
  expire: number;
}

export async function register(user: RegisterReq): Promise<UserInfoRes> {
  return await request({
    url: "/register",
    method: "post",
    data: user,
  });
}
export async function forgotPassword(data: ForgotPasswordReq): Promise<any> {
  return await request({
    url: "/forgotPassword",
    method: "post",
    data: data,
  });
}
export async function logout() {
  return await request({
    url: "/logout",
    method: "post",
  });
}

export async function login(data: LoginReq): Promise<LoginRes> {
  //如果开启了登录与权限模块，则真实登录
  return await request({
    url: "/login",
    method: "post",
    data,
  });
}

export async function loginBySms(data: SmsLoginReq): Promise<LoginRes> {
  //如果开启了登录与权限模块，则真实登录
  return await request({
    url: "/loginBySms",
    method: "post",
    data,
  });
}

export async function mine(): Promise<UserInfoRes> {
  return await request({
    url: "/mine/info",
    method: "post",
  });
}

export async function loginByTwoFactor(data: any) {
  return await request({
    url: "/loginByTwoFactor",
    method: "post",
    data,
  });
}
