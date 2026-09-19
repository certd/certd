/// <reference types="mocha" />

import assert from "node:assert/strict";

import { WangsuAccess } from "./access.js";

/**
 * 按前端 useReference 的方式执行字段上的 mergeScript：
 * new Function("ctx", script) 拿到 { show }，再用假的 ctx.compute 立刻求值。
 * 这样可以直接验证「渲染该字段时表单显现/隐藏」的结果，不需要跑前端。
 */
function evaluateShow(mergeScript: string, authType?: string) {
  const computedGetters: Array<(context: any) => boolean> = [];
  const ctx = {
    compute: (getter: (context: any) => boolean) => {
      computedGetters.push(getter);
      return getter;
    },
    asyncCompute: () => undefined,
    computed: () => undefined,
  };

  const script = new Function("ctx", mergeScript);
  script(ctx);
  assert.equal(computedGetters.length, 1, "mergeScript 里应当有且只有一个 ctx.compute");

  // 前端 compute 回调收到的 scope 里带 form，access 授权下字段值在 form.access
  const form = { access: { authType } };
  return computedGetters[0]({ form });
}

function getInputDefine(key: string): any {
  const define = (WangsuAccess as any).define;
  return define.input[key];
}

describe("网宿授权表单按鉴权方式显隐字段", () => {
  it("ApiKey 方式：显示 API账号名/API Key，隐藏 accessKeyId/accessKeySecret", () => {
    assert.equal(evaluateShow(getInputDefine("apiUser").mergeScript, "apikey"), true);
    assert.equal(evaluateShow(getInputDefine("apiKey").mergeScript, "apikey"), true);
    assert.equal(evaluateShow(getInputDefine("accessKeyId").mergeScript, "apikey"), false);
    assert.equal(evaluateShow(getInputDefine("accessKeySecret").mergeScript, "apikey"), false);
  });

  it("AccessKey 方式：显示 accessKeyId/accessKeySecret，隐藏 API账号名/API Key", () => {
    assert.equal(evaluateShow(getInputDefine("accessKeyId").mergeScript, "aksk"), true);
    assert.equal(evaluateShow(getInputDefine("accessKeySecret").mergeScript, "aksk"), true);
    assert.equal(evaluateShow(getInputDefine("apiUser").mergeScript, "aksk"), false);
    assert.equal(evaluateShow(getInputDefine("apiKey").mergeScript, "aksk"), false);
  });

  it("旧数据没有 authType 时按 AccessKey 方式显示，保证老授权还能编辑保存", () => {
    assert.equal(evaluateShow(getInputDefine("accessKeyId").mergeScript, undefined), true);
    assert.equal(evaluateShow(getInputDefine("accessKeySecret").mergeScript, undefined), true);
    assert.equal(evaluateShow(getInputDefine("apiUser").mergeScript, undefined), false);
    assert.equal(evaluateShow(getInputDefine("apiKey").mergeScript, undefined), false);
  });

  it("条件必须写在 ctx.compute 回调里，跟随 form.access.authType 重新计算", () => {
    const { mergeScript } = getInputDefine("apiKey");
    // 同一个 show 函数，传入不同 authType 得到不同结果，说明显隐是在运行时算的
    const show = (new Function("ctx", mergeScript) as any)({
      compute: (getter: any) => getter,
      asyncCompute: () => undefined,
      computed: () => undefined,
    }).show;

    assert.equal(show({ form: { access: { authType: "aksk" } } }), false);
    assert.equal(show({ form: { access: { authType: "apikey" } } }), true);
  });
});
