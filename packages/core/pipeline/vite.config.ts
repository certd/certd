import { defineConfig } from "vite";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "pipeline",
    },
  },
});
