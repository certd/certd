export * from "./util.request.js";
export * from "./util.env.js";
export * from "./util.log.js";
export * from "./util.file.js";
export * from "./util.sp.js";
export * from "./util.promise.js";
export * from "./util.hash.js";
export * from "./util.merge.js";
export * from "./util.cache.js";
export * from "./util.string.js";
export * from "./util.lock.js";
export * from "./util.mitter.js";
export * from "./util.id.js";
export * from "./util.domain.js";
export * from "./util.amount.js";
import { stringUtils } from "./util.string.js";
import sleep from "./util.sleep.js";
import { http, download } from "./util.request.js";

import { mergeUtils } from "./util.merge.js";
import { sp } from "./util.sp.js";
import { hashUtils } from "./util.hash.js";
import { promises } from "./util.promise.js";
import { fileUtils } from "./util.file.js";
import { cache } from "./util.cache.js";
import dayjs from "dayjs";
import { domainUtils } from "./util.domain.js";
export * from "./util.domain.js";
import { optionsUtils } from "./util.options.js";
export * from "./util.options.js";
import { amountUtils } from "./util.amount.js";
export * from "./util.amount.js";
import { nanoid } from "nanoid";
import * as id from "./util.id.js";
import { locker } from "./util.lock.js";
import { mitter } from "./util.mitter.js";

import * as request from "./util.request.js";
export * from "./util.cache.js";

export * from "./util.id.js";

export const utils = {
  sleep,
  http,
  download,
  sp,
  hash: hashUtils,
  promises,
  file: fileUtils,
  mergeUtils,
  cache,
  nanoid,
  id,
  dayjs,
  domain: domainUtils,
  options: optionsUtils,
  string: stringUtils,
  locker,
  mitter,
  amount: amountUtils,
  //废弃
  request,
};
