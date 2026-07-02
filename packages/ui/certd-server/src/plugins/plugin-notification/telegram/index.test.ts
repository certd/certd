/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { TelegramNotification } from "./index.js";

describe("TelegramNotification.replaceText", () => {
  let notification: TelegramNotification;

  beforeEach(() => {
    notification = new TelegramNotification();
  });

  it("转义横杠字符 -", () => {
    const result = notification.replaceText("defense-gameliti-one");
    assert.equal(result, "defense\\-gameliti\\-one");
  });

  it("转义下划线 _", () => {
    const result = notification.replaceText("hello_world");
    assert.equal(result, "hello\\_world");
  });

  it("转义星号 *", () => {
    const result = notification.replaceText("*bold text*");
    assert.equal(result, "\\*bold text\\*");
  });

  it("转义方括号 []", () => {
    const result = notification.replaceText("[link]");
    assert.equal(result, "\\[link\\]");
  });

  it("转义圆括号 ()", () => {
    const result = notification.replaceText("(url)");
    assert.equal(result, "\\(url\\)");
  });

  it("转义波浪号 ~", () => {
    const result = notification.replaceText("~strike~");
    assert.equal(result, "\\~strike\\~");
  });

  it("转义反引号 `", () => {
    const result = notification.replaceText("`code`");
    assert.equal(result, "\\`code\\`");
  });

  it("转义大于号 >", () => {
    const result = notification.replaceText(">quote");
    assert.equal(result, "\\>quote");
  });

  it("转义井号 #", () => {
    const result = notification.replaceText("#hashtag");
    assert.equal(result, "\\#hashtag");
  });

  it("转义加号 +", () => {
    const result = notification.replaceText("+1");
    assert.equal(result, "\\+1");
  });

  it("转义等号 =", () => {
    const result = notification.replaceText("a=b");
    assert.equal(result, "a\\=b");
  });

  it("转义竖线 |", () => {
    const result = notification.replaceText("a|b");
    assert.equal(result, "a\\|b");
  });

  it("转义花括号 {}", () => {
    const result = notification.replaceText("{key: value}");
    assert.equal(result, "\\{key: value\\}");
  });

  it("转义点号 .", () => {
    const result = notification.replaceText("example.com");
    assert.equal(result, "example\\.com");
  });

  it("转义感叹号 !", () => {
    const result = notification.replaceText("!important");
    assert.equal(result, "\\!important");
  });

  it("转义反斜杠 \\", () => {
    const result = notification.replaceText("path\\to\\file");
    assert.equal(result, "path\\\\to\\\\file");
  });

  it("普通文本不做修改", () => {
    const result = notification.replaceText("Hello World 123");
    assert.equal(result, "Hello World 123");
  });

  it("空字符串返回空字符串", () => {
    const result = notification.replaceText("");
    assert.equal(result, "");
  });

  it("混合多种特殊字符全部正确转义", () => {
    const input = "_*[]()~`>#+-=|{}.!\\";
    const result = notification.replaceText(input);
    assert.equal(result, "\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!\\\\");
  });

  it("域名中的点号和横杠都被转义", () => {
    const result = notification.replaceText("sub-domain.example.com");
    assert.equal(result, "sub\\-domain\\.example\\.com");
  });
});
