import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import visualizer from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { createHtmlPlugin } from "vite-plugin-html";
import { loadEnv } from "vite";
import * as path from "path";
import DefineOptions from "unplugin-vue-define-options/vite";
import { theme } from "ant-design-vue";
const { defaultAlgorithm, defaultSeed } = theme;
const mapToken = defaultAlgorithm(defaultSeed);
// import WindiCSS from "vite-plugin-windicss";
// import { generateModifyVars } from "./build/modify-vars";
// import { configThemePlugin } from "./build/theme-plugin";
// import OptimizationPersist from "vite-plugin-optimize-persist";
// https://vitejs.dev/config/
// 增加环境变量 _
process.env.VITE_APP_VERSION = require("./package.json").version;
process.env.VITE_APP_BUILD_TIME = require("dayjs")().format("YYYY-M-D HH:mm:ss");
import * as https from "node:https";

export default (req: any) => {
  const { command, mode } = req;
  console.log("args", command, mode);
  const env = loadEnv(mode, process.cwd());
  const devServerFs: any = {};
  const devAlias: any[] = [];
  const base = "./";
  // if (mode.startsWith("dev")) {
  //   base = "/certd";
  // }
  return {
    base: base,
    plugins: [
      DefineOptions(),
      vueJsx(),
      vue(),
      createHtmlPlugin({
        inject: {
          data: {
            title: env.VITE_APP_TITLE,
            projectPath: env.VITE_APP_PROJECT_PATH,
            version: env.VITE_APP_VERSION,
          },
        },
      }),
      // 压缩build后的代码
      viteCompression(),
      //主题色替换
      //...configThemePlugin(true),
      // viteThemePlugin({
      //   // Match the color to be modified
      //   colorVariables: ["#1890ff", "#40a9ff"]
      // }),
      // windicss tailwindcss
      // WindiCSS()
    ],
    esbuild: {
      drop: command === "build" ? ["debugger"] : [],
      pure: ["console.log", "debugger"],
      jsxFactory: "h",
      jsxFragment: "Fragment",
    },
    resolve: {
      alias: [...devAlias, { find: "/@", replacement: path.resolve("./src") }, { find: "/#", replacement: path.resolve("./types") }],
      dedupe: ["vue"],
    },
    optimizeDeps: {
      include: ["ant-design-vue"],
    },
    build: {
      rollupOptions: {
        plugins: [visualizer()],
      },
      minify: "esbuild",
    },
    css: {
      preprocessorOptions: {
        less: {
          // 修改默认主题颜色，配置less变量
          // modifyVars: generateModifyVars(),
          javascriptEnabled: true,
          modifyVars: mapToken,
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3008,
      fs: devServerFs,
      allowedHosts: ["localhost", "127.0.0.1", "yfy.docmirror.cn", "docmirror.top", "*", "local.dev"],
      proxy: {
        // with options
        "/api": {
          //配套后端 https://github.com/fast-crud/fs-server-js
          target: "http://127.0.0.1:7001",
          //忽略证书
          // agent: new https.Agent({ rejectUnauthorized: false }),
        },
        "/certd/api": {
          //配套后端 https://github.com/fast-crud/fs-server-js
          target: "http://127.0.0.1:7001/api",
          rewrite: (path: any) => path.replace(/^\/certd\/api/, ""),
          //忽略证书
          // agent: new https.Agent({ rejectUnauthorized: false }),
        },
      },
    },
  };
};
