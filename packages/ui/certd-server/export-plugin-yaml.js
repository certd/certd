// 扫描目录，列出文件，然后加载为模块

import path, { join } from "path";
import fs from "fs";
import { pathToFileURL } from "node:url";
import * as yaml from "js-yaml";
import { AbstractTaskPlugin, BaseAccess, BaseNotification} from "@certd/pipeline";
import { BaseAddon} from "@certd/lib-server";

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  const result = [];
  // 扫描目录及子目录
  for (const file of files) {

    const filePath = join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      result.push(...scanDir(filePath));
    } else {
      if (!file.endsWith(".js")) {
        continue;
      }
      result.push(filePath);
    }
  }
  return result
}

export default async function loadModules(dir) {
  const files = scanDir(dir);
  const modules = {}
  for (const file of files) {
    if(file === "dist/plugins/index.js" || file === "dist\\plugins\\index.js"){
      continue
    }
    const content = fs.readFileSync(file, 'utf8')
    if(content.includes(" abstract ")){
      continue
    }
    const lines = content.split('\n')
    let allExport = true
    for (let line of lines) {
      line = line.trim()
      if (!line || line.startsWith("//")) {
        continue
      }
      if(!line.startsWith("export ")){
        allExport = false
        break
      }
    }
    if (allExport) {
      continue
    }
    try {
      // 转换为 file:// URL（Windows 必需）
      const moduleUrl = pathToFileURL(file).href
      const module = await import(moduleUrl)

      // 如果模块有默认导出，优先使用
      modules[file] = module.default || module
    } catch (err) {
      console.error(`加载模块 ${file} 失败:`, err)
    }
  }
  return modules;
}

function isPrototypeOf(value,cls){
  return cls.prototype.isPrototypeOf(value.prototype)
}
async function genMetadata(){
  const modules = await loadModules('./dist/plugins');

  fs.rmSync("./metadata", { recursive: true });
  fs.mkdirSync("./metadata", { recursive: true });
  for (const key in modules) {
    const module = modules[key]
    const entry = Object.entries(module)
    for (const [name, value] of entry) {
      //如果有define属性
      if(value.define){
        //那么就是插件
        let location = key.substring(4)
        location = location.substring(0, location.length - 3)
        location = location.replaceAll("\\","/")
        location += ".js"
        location = `${location}` // 从modules/plugin/plugin-service 加载 ../../plugins目录下的文件

        const pluginDefine = {
          ...value.define
        }
        let subType = ""
        if(pluginDefine.accessType){
          pluginDefine.pluginType = "dnsProvider"
        }else if(isPrototypeOf(value,AbstractTaskPlugin)){
          pluginDefine.pluginType = "deploy"
        }else if(isPrototypeOf(value,BaseNotification)){
          pluginDefine.pluginType = "notification"
        }else if(isPrototypeOf(value,BaseAccess)){
          pluginDefine.pluginType = "access"
        }else if(isPrototypeOf(value,BaseAddon)){
          pluginDefine.pluginType = "addon"
          subType = "_"+pluginDefine.addonType
        }else{
          console.log(`[warning] 未知的插件类型：${pluginDefine.name}`)
        }
        pluginDefine.type = "builtIn"
          
        const filePath = path.join(`./metadata/${pluginDefine.pluginType}${subType}_${pluginDefine.name}.yaml`)

        pluginDefine.scriptFilePath = location
        console.log(location)
        const data  = yaml.dump(pluginDefine)
        fs.writeFileSync(filePath,data ,'utf8')
      }
    }
  }
  process.exit()
}
// import why from 'why-is-node-running'
// setTimeout(() => why(), 100); // 延迟打印原因
genMetadata()

