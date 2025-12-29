
import fs from 'fs'
import childProcess from 'child_process';
import { join } from "path";
function check(){
    const gitAdd =  fs.readFileSync("./node_modules/@lerna-lite/version/dist/lib/git-add.js","utf-8")
    if(gitAdd.indexOf("('git', ['add', '.']") > -1){
        console.log("git-add 已经修改过了")
    }else{
        console.error("git-add 没有修改过")
        throw new Error("git-add 还没修改过")
    }

    //GH_TOKEN
    console.log("检查 GH_TOKEN")
    if(!process.env.GH_TOKEN){
        // setx  /M GH_TOKEN xxxxx
        console.error("GH_TOKEN 未设置")
        throw new Error("GH_TOKEN 未设置")
    }
}

function checkDist(){

  function scanDir(root,excludes,stopDirName = "src"){
    //扫描文件,忽略node_modules
    const files = fs.readdirSync(root)
    const dirs =  []
    for (const file of files) {
      if (excludes.includes(file)) {
        continue;
      }
      const filePath = join(root, file);

      if (!fs.statSync(filePath).isDirectory()) {
        continue;
      }

      if(file === stopDirName){
        dirs.push(filePath)
        continue;
      }

      const res = scanDir(filePath,excludes,stopDirName)
      for (const item of res){
        dirs.push(item)
      }
    }

    return dirs
  }

  const srcDirs = scanDir("./packages",["node_modules",".git","dist","certd-client"],"src")

  console.log("检查dist",srcDirs)

  //检查包含 import xxx from "*/dist/*"
  const hasDistFiles = []
  for (const srcDir of srcDirs) {
    const files = fs.readdirSync(srcDir,{recursive:true})
    for (const file of files) {

      const filePath = join(srcDir, file);
      if(!file.endsWith(".ts")){
        continue;
      }
      const content = fs.readFileSync(filePath,"utf-8")
      const lines = content.split("\n")
      for  (const line of lines) {
        if( line.indexOf("@certd")>-1 &&  line.indexOf("dist") > -1){
          hasDistFiles.push({
            filepath:filePath,
            line: line
          })
          break;
        }
      }
    }
  }

  if(hasDistFiles.length > 0){
    console.error("dist文件被引用")
    console.error(hasDistFiles)
    throw new Error("dist文件被引用")
  } else {
    console.log("dist检查通过 √")
  }


}
checkDist()
check()
