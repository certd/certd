const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
//const Typescript = require("rollup-plugin-typescript2");
const Typescript = require("@rollup/plugin-typescript");
const json = require("@rollup/plugin-json");
const terser = require("@rollup/plugin-terser");
const dynamicImportVars =require ('@rollup/plugin-dynamic-import-vars');
const replace =require( '@rollup/plugin-replace')
const path = require("path")
const fs  = require("fs")
function dynamicImport(directory) {

  function readFilesRecursively(directory) {
    let filePaths = [];
    const files = fs.readdirSync(directory);
    files.forEach(file => {

      const filePath = directory+"/"+file;
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        filePaths = filePaths.concat(readFilesRecursively(filePath)); // Recursively read subdirectory and concatenate the results
      } else if(filePath.endsWith(".ts")) {
        filePaths.push(filePath); // Add file path to the array
      }
    });
    return filePaths;
  }

  const files = readFilesRecursively(directory);
  console.log("files",files)

  return files.filter(file=>file.indexOf("/index.ts")<0).map(file => `import './${file}';`).join('\n');
}


module.exports = {
  input: "./src/index.ts",
  output: {
    file: "dist/bundle.js",
    format: "cjs",
  },
  plugins: [

    // 解析第三方依赖
    resolve(),
    // 识别 commonjs 模式第三方依赖
    commonjs(),
    Typescript({
      target: "esnext",
      rootDir: "src",
      declaration: true,
      declarationDir: "dist/d",
      exclude: ["./node_modules/**", "./src/**/*.vue","./dist/**"],
      allowSyntheticDefaultImports: true,
    }),
    dynamicImportVars({
      // options
    }),
    replace({
      'DYNAMIC_IMPORT_SCRIPT': dynamicImport("./src") // 替换成你的目录路径
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
  ],
};
