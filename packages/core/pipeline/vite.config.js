import { defineConfig } from "vite";
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
        typescript({
          target: "esnext",
          rootDir: "src",
          declaration: true,
          declarationDir: "dist/d",
          exclude: ["./node_modules/**", "./src/**/*.vue"],
          allowSyntheticDefaultImports: true,
        }),
      ],
      external: ["vue", "lodash", "dayjs", "@fast-crud/fast-crud"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: "Vue",
          lodash: "_",
          dayjs: "dayjs",
          "@fast-crud/fast-crud": "FastCrud",
        },
      },
    },
  },
});
