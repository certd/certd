import type { FnThemeTokenName, FnThemeTokens } from "./types";

type AntdvThemeTokens = Partial<Record<FnThemeTokenName | "colorTextBase", string | number>>;

export function mapAntdvThemeToFnTokens(tokens: AntdvThemeTokens): FnThemeTokens {
  const fnTokens: FnThemeTokens = {};
  const colorText = tokens.colorTextBase || tokens.colorText;

  if (tokens.colorPrimary) fnTokens.colorPrimary = tokens.colorPrimary;
  if (colorText) fnTokens.colorText = colorText;
  if (tokens.colorTextSecondary) fnTokens.colorTextSecondary = tokens.colorTextSecondary;
  if (tokens.colorTextTertiary) fnTokens.colorTextTertiary = tokens.colorTextTertiary;
  if (tokens.colorTextQuaternary) fnTokens.colorTextQuaternary = tokens.colorTextQuaternary;
  if (tokens.colorBgBase) fnTokens.colorBgBase = tokens.colorBgBase;
  if (tokens.colorBgContainer) fnTokens.colorBgContainer = tokens.colorBgContainer;
  if (tokens.colorBgElevated) fnTokens.colorBgElevated = tokens.colorBgElevated;
  if (tokens.colorFillAlter) fnTokens.colorFillAlter = tokens.colorFillAlter;
  if (tokens.colorFillSecondary) fnTokens.colorFillSecondary = tokens.colorFillSecondary;
  if (tokens.colorBorder) fnTokens.colorBorder = tokens.colorBorder;
  if (tokens.colorBorderSecondary) fnTokens.colorBorderSecondary = tokens.colorBorderSecondary;
  if (tokens.colorError) fnTokens.colorError = tokens.colorError;
  if (tokens.borderRadius) fnTokens.borderRadius = tokens.borderRadius;
  if (tokens.controlHeight) fnTokens.controlHeight = tokens.controlHeight;

  return fnTokens;
}
