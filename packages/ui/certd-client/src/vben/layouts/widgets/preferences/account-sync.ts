import { message as antdMessage } from "ant-design-vue";

import { $t, loadLocaleMessages } from "/@/locales";
import { updatePreferences } from "/@/vben/preferences";

import { PreferencesSettingsGet, PreferencesSettingsSave } from "./api";

const PREFERENCES_KNOWN_KEYS = ["app", "theme", "logo", "sidebar", "header", "tabbar", "breadcrumb", "navigation", "widget", "footer", "copyright", "shortcutKeys", "transition"];

export function isPreferencesPayload(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return PREFERENCES_KNOWN_KEYS.some(key => Object.prototype.hasOwnProperty.call(value, key));
}

/** 保存到账号：允许空对象（重置后的默认偏好） */
export function isPreferencesSavePayload(value: unknown): value is Record<string, any> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value as Record<string, any>);
  if (keys.length === 0) {
    return true;
  }
  return isPreferencesPayload(value);
}

export async function applyPreferencesFromAccount(data: Record<string, any>) {
  updatePreferences(data);
  if (data.app?.locale) {
    await loadLocaleMessages(data.app.locale);
  }
}

/**
 * 登录后从账号加载偏好并应用到本地；
 * - null / {}：账号无有效配置（含保存为空），默认继续使用本地偏好
 */
export async function loadPreferencesFromAccount() {
  const data = await PreferencesSettingsGet();
  if (data == null) {
    return false;
  }
  if (typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  // 保存为空时，后续拉取到空数据后默认从本地读取，不覆盖本地
  if (Object.keys(data).length === 0) {
    return false;
  }
  if (!isPreferencesPayload(data)) {
    return false;
  }
  await applyPreferencesFromAccount(data);
  return true;
}

export async function savePreferencesToAccount(preferencesPayload: Record<string, any> | null | undefined) {
  const payload = preferencesPayload && typeof preferencesPayload === "object" ? preferencesPayload : {};
  if (!isPreferencesSavePayload(payload)) {
    throw new Error("invalid preferences payload");
  }
  await PreferencesSettingsSave(payload);
  antdMessage.success($t("preferences.saveToAccountSuccess"));
}
