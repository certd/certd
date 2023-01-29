// import { getThemeVariables } from "ant-design-vue/dist/theme";
// import path from "path";
// const resolve = path.resolve;
export function generateModifyVars(dark = false) {
  //const modifyVars = getThemeVariables({ dark });
  // const vars = `${resolve("src/style/theme/index.less")}`;
  return {
    //...modifyVars
    // hack: `true; @import (reference) "${vars}";`
  };
}
