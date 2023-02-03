import { defineConfig } from "vite";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "pipeline",
    },
    rollupOptions: {
      external: ["vue", "lodash-es", "dayjs", "@fast-crud/fast-crud", "log4js", "lodash", "@certd/pipeline"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: "Vue",
          "lodash-es": "_",
          lodash: "_",
          dayjs: "dayjs",
          "@fast-crud/fast-crud": "FastCrud",
          log4js: "log4js",
          "@certd/pipeline": "pipeline",
        },
      },
    },
  },
});
