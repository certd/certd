import type { FnThemeTokens } from "./types";

export interface NaiveThemeTokens {
  common?: {
    primaryColor?: string;
    textColorBase?: string;
    textColor1?: string;
    textColor2?: string;
    textColor3?: string;
    bodyColor?: string;
    cardColor?: string;
    modalColor?: string;
    tableColor?: string;
    tableHeaderColor?: string;
    tableColorHover?: string;
    borderColor?: string;
    borderRadius?: string;
    heightMedium?: string;
    errorColor?: string;
  };
  DataTable?: {
    thColor?: string;
    tdColor?: string;
    tdColorHover?: string;
    borderColor?: string;
    thTextColor?: string;
    tdTextColor?: string;
  };
}

export function mapNaiveThemeToFnTokens(theme: NaiveThemeTokens): FnThemeTokens {
  const common = theme.common || {};
  const dataTable = theme.DataTable || {};
  const tokens: FnThemeTokens = {};

  if (common.primaryColor) tokens.colorPrimary = common.primaryColor;
  if (dataTable.tdTextColor || common.textColorBase || common.textColor1) tokens.colorText = dataTable.tdTextColor || common.textColorBase || common.textColor1;
  if (common.textColor2) tokens.colorTextSecondary = common.textColor2;
  if (common.textColor3) tokens.colorTextTertiary = common.textColor3;
  if (common.bodyColor) tokens.colorBgBase = common.bodyColor;
  if (dataTable.tdColor || common.tableColor || common.cardColor) tokens.colorBgContainer = dataTable.tdColor || common.tableColor || common.cardColor;
  if (common.modalColor) tokens.colorBgElevated = common.modalColor;
  if (dataTable.thColor || common.tableHeaderColor) tokens.colorFillAlter = dataTable.thColor || common.tableHeaderColor;
  if (dataTable.tdColorHover || common.tableColorHover) tokens.colorFillSecondary = dataTable.tdColorHover || common.tableColorHover;
  if (dataTable.thTextColor) tokens.colorTextSecondary = dataTable.thTextColor;
  if (dataTable.borderColor || common.borderColor) tokens.colorBorder = dataTable.borderColor || common.borderColor;
  if (common.borderColor) tokens.colorBorderSecondary = common.borderColor;
  if (common.errorColor) tokens.colorError = common.errorColor;
  if (common.borderRadius) tokens.borderRadius = common.borderRadius;
  if (common.heightMedium) tokens.controlHeight = common.heightMedium;

  return tokens;
}
