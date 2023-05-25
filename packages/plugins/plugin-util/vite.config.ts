import { defineConfig } from "vite";
import visualizer from "rollup-plugin-visualizer";
import typescript from "@rollup/plugin-typescript";
// https://vitejs.dev/config/

export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "pipeline",
    },
    rollupOptions: {
      plugins: [
        // @ts-ignore
        visualizer(),
        // @ts-ignore
        typescript({
          target: "esnext",
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
        "@certd/pipeline",
        "@certd/plugin-cert",
        "@certd/plugin-aliyun",
        "@certd/plugin-tencent",
        "@certd/plugin-huawei",
        "@certd/plugin-host",
        "@certd/plugin-tencent",
        "log4js",
        "@midwayjs/core",
        "@midwayjs/decorator",
        "kubernetes-client",
      ],
      output: {
        globals: {
          vue: "Vue",
          lodash: "_",
          dayjs: "dayjs",
          "@certd/plugin-cert": "CertdPluginCert",
          "@certd/acme-client": "CertdAcmeClient",
          "@certd/pipeline": "CertdPluginPipeline",
          "@certd/plugin-aliyun": "CertdPluginAliyun",
          "@certd/plugin-host": "CertdPluginHost",
          "@certd/plugin-huawei": "CertdPluginHuawei",
          log4js: "log4js",
          "@midwayjs/core": "MidwayjsCore",
          "@midwayjs/decorator": "MidwayjsDecorator",
          "kubernetes-client": "kubernetesClient",
        },
      },
    },
  },
});
