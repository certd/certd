const PREFERENCES_KNOWN_KEYS = [
  "app",
  "theme",
  "logo",
  "sidebar",
  "header",
  "tabbar",
  "breadcrumb",
  "navigation",
  "widget",
  "footer",
  "copyright",
  "shortcutKeys",
  "transition",
];

/**
 * 解析用户偏好设置 payload。
 * 兼容 `{ preferences: {...} }` 与直接传偏好对象两种格式。
 * 空对象 `{}` 表示已重置为默认偏好，视为合法。
 */
export function parseUserPreferencesPayload(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, any>;
  const preferences =
    raw.preferences != null && typeof raw.preferences === "object" && !Array.isArray(raw.preferences)
      ? (raw.preferences as Record<string, any>)
      : raw;
  const preferenceKeys = Object.keys(preferences);
  // 空对象表示重置后的默认偏好
  if (preferenceKeys.length === 0) {
    return {};
  }
  const hasKnownKey = PREFERENCES_KNOWN_KEYS.some(key => Object.prototype.hasOwnProperty.call(preferences, key));
  if (!hasKnownKey) {
    return null;
  }
  return preferences;
}
