import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import visualizer from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import * as path from "path";
// import { generateModifyVars } from "./build/modify-vars";
// import { configThemePlugin } from "./build/theme-plugin";
// import OptimizationPersist from "vite-plugin-optimize-persist";
// import PkgConfig from "vite-plugin-package-config";
// https://vitejs.dev/config/
// 增加环境变量 _
process.env.VITE_APP_VERSION = require("./package.json").version;
process.env.VITE_APP_BUILD_TIME = require("dayjs")().format("YYYY-M-D HH:mm:ss");

export default ({ command, mode }) => {
  console.log("args", command, mode);

  const devServerFs: any = {};
  const devAlias: any[] = [];
  return {
    base: "/",
    plugins: [
      vueJsx(),
      vue(),
      // 压缩build后的代码
      viteCompression()
    ],
    esbuild: {
      // pure: ["console.log", "debugger"],
      jsxFactory: "h",
      jsxFragment: "Fragment"
    },
    resolve: {
      alias: [
        ...devAlias,
        { find: "/@", replacement: path.resolve("./src") },
        { find: "/#", replacement: path.resolve("./types") }
      ],
      dedupe: ["vue"]
    },
    build: {
      rollupOptions: {
        plugins: [visualizer()]
      }
    },
    css: {
      preprocessorOptions: {
        less: {
          // 修改默认主题颜色，配置less变量
          // modifyVars: generateModifyVars(),
          javascriptEnabled: true
        }
      }
    },
    server: {
      fs: devServerFs,
      proxy: {
        // with options
        "/api": {
          //配套后端 https://github.com/fast-crud/fs-server-js
          target: "http://127.0.0.1:3000"
        }
      }
    }
  };
};
