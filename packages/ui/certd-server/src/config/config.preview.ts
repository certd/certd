import { MidwayConfig } from '@midwayjs/core';
import { mergeConfig } from './loader';

const preview = {
  /**
   * 演示环境
   */
  preview: {
    enabled: true,
  },
} as MidwayConfig;

mergeConfig(preview, 'preview');
export default preview;
