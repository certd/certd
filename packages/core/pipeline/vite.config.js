import { defineConfig } from "vite";
import visualizer from "rollup-plugin-visualizer";
import typescript from "@rollup/plugin-typescript";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    target: "es2015",
    lib: {
      entry: "src/index.ts",
      name: "CertdPipeline",
    },
    rollupOptions: {
      plugins: [
        visualizer(),
        typescript({
          target: "es2015",
          rootDir: "src",
          declaration: true,
          declarationDir: "dist/d",
          exclude: ["./node_modules/**", "./src/**/*.vue"],
          allowSyntheticDefaultImports: true,
        }),
      ],
      external: [
        "vue",
        "lodash",
        "dayjs",
        "@certd/acme-client",
        "@certd/plugin-cert",
        "@certd/plugin-aliyun",
        "@certd/plugin-tencent",
        "@certd/plugin-huawei",
        "@certd/plugin-host",
        "@certd/plugin-tencent",
        "@certd/plugin-util",
        "log4js",
        "@midwayjs/core",
        "@midwayjs/decorator",
      ],
      output: {
        globals: {
          vue: "Vue",
          lodash: "_",
          dayjs: "dayjs",
          "@certd/plugin-cert": "CertdPluginCert",
          "@certd/acme-client": "CertdAcmeClient",
          "@certd/plugin-aliyun": "CertdPluginAliyun",
          "@certd/plugin-host": "CertdPluginHost",
          "@certd/plugin-huawei": "CertdPluginHuawei",
          "@certd/plugin-util": "CertdPluginUtil",
          log4js: "log4js",
          "@midwayjs/core": "MidwayjsCore",
          "@midwayjs/decorator": "MidwayjsDecorator",
        },
      },
    },
  },
});
