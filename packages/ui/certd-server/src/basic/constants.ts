export const Constants = {
  dataDir: './data',
  role: {
    defaultUser: 3,
  },
  per: {
    //无需登录
    guest: '_guest_',
    //无需登录
    anonymous: '_guest_',
    //仅需要登录
    authOnly: '_authOnly_',
    //仅需要登录
    loginOnly: '_authOnly_',
  },
  res: {
    serverError(message: string) {
      return {
        code: 1,
        message,
      };
    },
    error: {
      code: 1,
      message: 'Internal server error',
    },
    success: {
      code: 0,
      message: 'success',
    },
    validation: {
      code: 10,
      message: '参数错误',
    },
    needvip: {
      code: 88,
      message: '需要VIP',
    },
    auth: {
      code: 401,
      message: '您还未登录或token已过期',
    },
    permission: {
      code: 402,
      message: '您没有权限',
    },
    preview: {
      code: 10001,
      message: '对不起，预览环境不允许修改此数据',
    },
  },
};
