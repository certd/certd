export const Constants = {
  res: {
    error: {
      code: 1,
      message: 'error',
    },
    success: {
      code: 0,
      message: 'success',
    },
    validation: {
      code: 10,
      message: '参数错误',
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
