import assert from "node:assert/strict";
import { applyRandomTimeToTriggers, replaceCronTime } from "./cron-random-time.js";

describe("replaceCronTime", () => {
  it("保留每周/每月等日期参数，只替换时分秒", () => {
    assert.equal(replaceCronTime("0 0 3 * * 1", "15 30 5"), "15 30 5 * * 1");
    assert.equal(replaceCronTime("0 0 3 15 * *", "59 1 23"), "59 1 23 15 * *");
    assert.equal(replaceCronTime("0 0 3 ? * MON", "0 10 6"), "0 10 6 ? * MON");
  });

  it("支持5字段cron并保留日期参数，秒数不生效", () => {
    assert.equal(replaceCronTime("0 3 * * 1", "45 30 5"), "30 5 * * 1");
  });

  it("保留L、#等特殊日期字段", () => {
    assert.equal(replaceCronTime("0 0 3 L * *", "45 30 5"), "45 30 5 L * *");
    assert.equal(replaceCronTime("0 0 3 ? * MON#2", "45 30 5"), "45 30 5 ? * MON#2");
  });

  it("支持标准调度宏并按原频率替换时间", () => {
    assert.equal(replaceCronTime("@weekly", "1 2 3"), "1 2 3 * * 0");
    assert.equal(replaceCronTime("@monthly", "1 2 3"), "1 2 3 1 * *");
    assert.equal(replaceCronTime("@yearly", "1 2 3"), "1 2 3 1 1 *");
    assert.equal(replaceCronTime("@daily", "1 2 3"), "1 2 3 * * *");
  });

  it("拒绝宏、非法格式和无效表达式，不静默改成每日任务", () => {
    assert.throws(() => replaceCronTime("@hourly", "1 2 3"), /不适用于每日随机时间/);
    assert.throws(() => replaceCronTime("@unknown", "1 2 3"), /不支持的Cron宏/);
    assert.throws(() => replaceCronTime("@constructor", "1 2 3"), /不支持的Cron宏/);
    assert.throws(() => replaceCronTime("@toString", "1 2 3"), /不支持的Cron宏/);
    assert.throws(() => replaceCronTime("@__proto__", "1 2 3"), /不支持的Cron宏/);
    assert.throws(() => replaceCronTime("invalid", "1 2 3"), /仅支持5或6字段/);
    assert.throws(() => replaceCronTime("99 99 99 * * *", "1 2 3"), /Cron表达式无效/);
    assert.throws(() => replaceCronTime("", "1 2 3"), /缺少Cron表达式/);
    assert.throws(() => replaceCronTime("0 0 3 * * *", "60 2 3"), /超出范围/);
    assert.throws(() => replaceCronTime("0 0 3 * * *", "a b c"), /随机时间格式错误/);
  });
});

describe("applyRandomTimeToTriggers", () => {
  it("没有timer时新增每日timer，不修改其他触发器", () => {
    const webhook = { id: "w", type: "webhook" };
    const result = applyRandomTimeToTriggers([webhook], "1 2 3", "new-timer");
    assert.equal(result.length, 2);
    assert.deepEqual(result[0], webhook);
    assert.equal(result[1].id, "new-timer");
    assert.equal(result[1].props.cron, "1 2 3 * * *");
  });

  it("多个timer统一时间但保留各自日期规则和非timer触发器", () => {
    const triggers = [
      { id: "w", type: "webhook" },
      { id: "t1", type: "timer", props: { cron: "0 0 3 * * 1" } },
      { id: "t2", type: "timer", props: { cron: "0 0 4 15 * *" } },
    ];
    const result = applyRandomTimeToTriggers(triggers, "5 6 7", "new-timer");
    assert.equal(result.length, 3);
    assert.equal(result[0].id, "w");
    assert.equal(result[1].props.cron, "5 6 7 * * 1");
    assert.equal(result[2].props.cron, "5 6 7 15 * *");
  });

  it("存在空Cron的timer时拒绝修改，不追加新timer", () => {
    const triggers = [{ id: "t1", type: "timer", props: { cron: "" } }];
    assert.throws(() => applyRandomTimeToTriggers(triggers, "1 2 3", "new-timer"), /缺少Cron表达式/);
  });

  it("缺少props或cron为空的timer会被识别并拒绝", () => {
    assert.throws(() => applyRandomTimeToTriggers([{ id: "t1", type: "timer" }], "1 2 3", "new-timer"), /缺少Cron表达式/);
    assert.throws(() => applyRandomTimeToTriggers([{ id: "t1", type: "timer", props: {} }], "1 2 3", "new-timer"), /缺少Cron表达式/);
  });

  it("triggers为空时新增每日timer", () => {
    assert.equal(applyRandomTimeToTriggers(undefined as any, "1 2 3", "new-timer").length, 1);
    assert.equal(applyRandomTimeToTriggers(null as any, "1 2 3", "new-timer").length, 1);
    assert.equal(applyRandomTimeToTriggers([], "1 2 3", "new-timer").length, 1);
  });

  it("多个timer中任意一个Cron无效时不修改原始数组", () => {
    const triggers = [
      { id: "t1", type: "timer", props: { cron: "0 0 3 * * 1" } },
      { id: "t2", type: "timer", props: { cron: "invalid" } },
    ];
    const snapshot = JSON.parse(JSON.stringify(triggers));
    assert.throws(() => applyRandomTimeToTriggers(triggers, "1 2 3", "new-timer"), /Cron/);
    assert.deepEqual(triggers, snapshot);
  });

});
