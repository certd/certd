export type FnThemeTokenName =
  | "colorPrimary"
  | "colorText"
  | "colorTextSecondary"
  | "colorTextTertiary"
  | "colorTextQuaternary"
  | "colorBgBase"
  | "colorBgContainer"
  | "colorBgElevated"
  | "colorFillAlter"
  | "colorFillSecondary"
  | "colorBorder"
  | "colorBorderSecondary"
  | "colorError"
  | "borderRadius"
  | "controlHeight";

export type FnThemeTokens = Partial<Record<FnThemeTokenName, string | number>>;
export type FnThemeStyle = Record<`--fn-${string}`, string>;
