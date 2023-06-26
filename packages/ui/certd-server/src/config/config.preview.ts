import { MidwayConfig } from '@midwayjs/core';
import { load } from './loader';
import _ from 'lodash';

const preview = {
  /**
   * 演示环境
   */
  preview: {
    enabled: true,
  },
} as MidwayConfig;

_.merge(preview, load('preview'));

export default preview;
