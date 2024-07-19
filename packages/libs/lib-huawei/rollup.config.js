const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
//const Typescript = require("rollup-plugin-typescript2");
const Typescript = require("@rollup/plugin-typescript");
const json = require("@rollup/plugin-json");
const terser = require("@rollup/plugin-terser");
module.exports = {
  input: "src/index.ts",
  output: {
    file: "dist/bundle.js",
    format: "cjs",
  },
  plugins: [
    // 解析第三方依赖
    resolve(),
    // 识别 commonjs 模式第三方依赖
    commonjs({
      // dynamicRequireRoot: "../../../../",
      // dynamicRequireTargets: [
      //   // include using a glob pattern (either a string or an array of strings)
      //   "../../../../**/shelljs/src/*",
      // ],
    }),
    Typescript({
      target: "esnext",
      rootDir: "src",
      declaration: true,
      declarationDir: "dist/d",
      exclude: ["./node_modules/**", "./src/**/*.vue"],
      allowSyntheticDefaultImports: true,
    }),
    json(),
    terser(),
  ],
  external: ["vue", "lodash-es", "dayjs", "log4js", "@midwayjs/core", "@certd/pipeline", "axios"],
};
