import { MidwayConfig } from '@midwayjs/core';

export default {
  typeorm: {
    dataSource: {
      default: {
        synchronize: true, // 如果第一次使用，不存在表，有同步的需求可以写 true
      },
    },
  },
} as MidwayConfig;
