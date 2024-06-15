// 获取框架
const WebFramework = require('@midwayjs/koa').Framework;
const { Bootstrap } = require('@midwayjs/bootstrap');

const DirectoryFileDetector = require('@midwayjs/core').DirectoryFileDetector;

const baseDir = process.cwd();
const pipelineDir = baseDir + './node_modules/@certd/pipeline';
const customFileDetector = new DirectoryFileDetector({
  loadDir: [baseDir, pipelineDir],
});

module.exports = async () => {
  // 加载框架并执行
  await Bootstrap.configure({
    moduleDetector: customFileDetector,
  }).run();
  // 获取依赖注入容器
  const container = Bootstrap.getApplicationContext();
  // 获取 koa framework
  const framework = container.get(WebFramework);
  // 返回 app 对象
  return framework.getApplication();
};
