const WebFramework = require('@midwayjs/koa').Framework;
const web = new WebFramework().configure({
  port: 7001,
});

const DirectoryFileDetector = require( "@midwayjs/core").DirectoryFileDetector;

const baseDir = process.cwd()
const pipelineDir = baseDir +"./node_modules/@certd/pipeline"
const customFileDetector = new DirectoryFileDetector({loadDir:[baseDir,pipelineDir]})

const { Bootstrap } = require('@midwayjs/bootstrap');
Bootstrap.load(web).configure({
  moduleDetector:customFileDetector
}).run();
