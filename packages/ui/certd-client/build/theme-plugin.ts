/**
 * Vite plugin for website theme color switching
 * https://github.com/anncwb/vite-plugin-theme
 */
import type { Plugin } from "vite";
import path from "path";
import { viteThemePlugin, mixLighten, mixDarken, tinycolor, antdDarkThemePlugin } from "vite-plugin-theme";
import { getThemeColors, generateColors } from "./theme-colors";
import { generateModifyVars } from "./modify-vars";

export function configThemePlugin(isBuild: boolean): Plugin[] {
  const colors = generateColors({
    mixDarken,
    mixLighten,
    tinycolor
  });
  const colorVariables = [...getThemeColors(), ...colors];
  const plugin = [
    viteThemePlugin({
      // resolveSelector: (s) => {
      //   s = s.trim();
      //   switch (s) {
      //     case ".ant-steps-item-process .ant-steps-item-icon > .ant-steps-icon":
      //       return ".ant-steps-item-icon > .ant-steps-icon";
      //     case ".ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)":
      //     case ".ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover":
      //     case ".ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):active":
      //       return s;
      //     case ".ant-steps-item-icon > .ant-steps-icon":
      //       return s;
      //   }
      //   return `[data-theme] ${s}`;
      // },
      resolveSelector: (s) => {
        s = s.trim();
        if (s === ".ant-btn:hover,.ant-btn:focus") {
          // console.log("ssss", s);
          return ".theme-discard-xxxxxxx";
        }
        return s;
      },
      colorVariables
    }),
    antdDarkThemePlugin({
      preloadFiles: [
        path.resolve(process.cwd(), "node_modules/ant-design-vue/dist/antd.less"),
        path.resolve(process.cwd(), "src/style/theme/index.less")
      ],
      filter: (id) => (isBuild ? !id.endsWith("antd.less") : true),
      // extractCss: false,
      darkModifyVars: {
        ...generateModifyVars(true),
        "text-color": "#c9d1d9",
        "text-color-base": "#c9d1d9",
        "component-background": "#151515",
        // black: '#0e1117',
        // #8b949e
        "text-color-secondary": "#8b949e",
        "border-color-base": "#303030",
        // 'border-color-split': '#30363d',
        "item-active-bg": "#111b26",
        "app-content-background": "rgb(255 255 255 / 4%)"
      }
    })
  ];

  return (plugin as unknown) as Plugin[];
}
