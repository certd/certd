import { MidwayConfig } from '@midwayjs/core';
import { load } from './loader';
import _ from 'lodash';
const production = {
  /**
   * 演示环境
   */
  preview: {
    enabled: false,
  },
} as MidwayConfig;

_.merge(production, load('production'));

export default production;
