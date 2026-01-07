import fs from 'fs';
//瘦身
const filePath = './node_modules/typeorm/platform/PlatformTools.js';
const find = `const cli_highlight_1 = require("cli-highlight");`;
const rep = 'const cli_highlight_1 ={highlight: (str) => { return str }};';

// 在 filePath 找到 find那一行 用 rep 替换
function slimming(filePath, find, rep) {
  fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(find, rep);
    fs.writeFile(filePath, result, 'utf8', function (err) {
      if (err) return console.log(err);
    });
  });
}
slimming(filePath, find, rep);

slimming("./tsconfig.json",`"sourceMap": true,`, `"sourceMap": false,`)
