import assert from "node:assert/strict";
import { replaceCronTime } from "./cron-random-time.js";

describe("replaceCronTime", () => {
  it("保留每周/每月等日期参数，只替换时分秒", () => {
    assert.equal(replaceCronTime("0 0 3 * * 1", "15 30 5"), "15 30 5 * * 1");
    assert.equal(replaceCronTime("0 0 3 15 * *", "59 1 23"), "59 1 23 15 * *");
    assert.equal(replaceCronTime("0 0 3 ? * MON", "0 10 6"), "0 10 6 ? * MON");
  });

  it("支持5字段cron并保留日期参数", () => {
    assert.equal(replaceCronTime("0 3 * * 1", "45 30 5"), "30 5 * * 1");
  });

  it("无效cron回退为每日随机时间", () => {
    assert.equal(replaceCronTime("invalid", "1 2 3"), "1 2 3 * * *");
    assert.equal(replaceCronTime("", "1 2 3"), "1 2 3 * * *");
  });
});
