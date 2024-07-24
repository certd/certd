import { MidwayConfig } from '@midwayjs/core';
import { mergeConfig } from './loader.js';

const production = {
  /**
   * 演示环境
   */
  preview: {
    enabled: false,
  },
  typeorm: {
    dataSource: {
      default: {
        logging: false,
      },
    },
  },
} as MidwayConfig;

mergeConfig(production, 'production');
export default production;
