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
      external: ["vue", "lodash", "dayjs", "@fast-crud/fast-crud"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: "Vue",
          "lodash": "_",
          dayjs: "dayjs",
          "@fast-crud/fast-crud": "FastCrud",
        },
      },
    },
  },
});
