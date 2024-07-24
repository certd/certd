import { MidwayConfig } from '@midwayjs/core';
import { mergeConfig } from './loader.js';

const preview = {
  /**
   * 演示环境
   */
  preview: {
    enabled: true,
  },
  typeorm: {
    dataSource: {
      default: {
        logging: false,
      },
    },
  },
} as MidwayConfig;

mergeConfig(preview, 'preview');
export default preview;
