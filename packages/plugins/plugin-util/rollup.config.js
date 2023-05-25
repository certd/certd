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
      dynamicRequireRoot: "../../../",
      dynamicRequireTargets: [
        // include using a glob pattern (either a string or an array of strings)
        "node_modules/shelljs/src/*",
      ],
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
    "@certd/plugin-util",
    "log4js",
    "@midwayjs/core",
    "@midwayjs/decorator",
    // "kubernetes-client",
  ],
};
