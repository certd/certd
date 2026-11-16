import "./tokens.css";
import type { CSSProperties } from "vue";
import type { FnThemeStyle, FnThemeTokens } from "./types";

export type { FnThemeTokenName, FnThemeStyle, FnThemeTokens } from "./types";
export { mapAntdvThemeToFnTokens } from "./antdv/antdv";
export { useAntdvTheme } from "./antdv/use-antdv-theme";
export { mapNaiveThemeToFnTokens, type NaiveThemeTokens } from "./naive/naive";
export { useNaiveTheme } from "./naive/use-naive-theme";

export function createFnThemeStyle(tokens: FnThemeTokens): FnThemeStyle {
  const style: FnThemeStyle = {};
  for (const [name, value] of Object.entries(tokens)) {
    if (value !== undefined) {
      style[`--fn-${toKebabCase(name)}`] = typeof value === "number" ? `${value}px` : value;
    }
  }
  return style;
}

export function applyFnThemeTokens(tokens: FnThemeTokens, target: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(createFnThemeStyle(tokens))) {
    target.style.setProperty(name, value);
  }
}

export function toFnThemeStyle(tokens: FnThemeTokens): CSSProperties {
  return createFnThemeStyle(tokens) as CSSProperties;
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`);
}
