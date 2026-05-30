// 转换单个插件为 YAML 配置的技能脚本

import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'node:url';
import * as yaml from 'js-yaml';
import { AbstractTaskPlugin, BaseAccess, BaseNotification } from '@certd/pipeline';
import { BaseAddon } from '@certd/lib-server';

/**
 * 检查对象是否是指定类的原型
 */
function isPrototypeOf(value, cls) {
  return cls.prototype.isPrototypeOf(value.prototype);
}

/**
 * 加载单个插件模块
 */
async function loadSingleModule(filePath) {
  try {
    // 转换为 file:// URL（Windows 必需）
    const moduleUrl = pathToFileURL(filePath).href;
    const module = await import(moduleUrl);
    return module.default || module;
  } catch (err) {
    console.error(`加载模块 ${filePath} 失败:`, err);
    return null;
  }
}

/**
 * 分析单个插件并生成 YAML 配置
 */
async function convertSinglePlugin(pluginPath) {
  console.log(`开始转换插件: ${pluginPath}`);

  // 加载插件模块
  const module = await loadSingleModule(pluginPath);
  if (!module) {
    console.error('加载插件失败，退出');
    return;
  }

  // 处理模块中的所有导出
  const entry = Object.entries(module);
  if (entry.length === 0) {
    console.error('插件模块没有导出任何内容');
    return;
  }

  console.log(`插件模块导出了 ${entry.length} 个对象: ${entry.map(([name]) => name).join(', ')}`);

  // 处理每个导出的对象
  for (const [name, value] of entry) {
    // 检查是否是插件（有 define 属性）
    if (!value.define) {
      console.log(`跳过非插件对象: ${name}`);
      continue;
    }

    console.log(`处理插件: ${name}`);

    // 构建插件定义
    const pluginDefine = {
      ...value.define,
    };

    let subType = '';

    // 确定插件类型
    if (pluginDefine.accessType) {
      pluginDefine.pluginType = 'dnsProvider';
    } else if (isPrototypeOf(value, AbstractTaskPlugin)) {
      pluginDefine.pluginType = 'deploy';
    } else if (isPrototypeOf(value, BaseNotification)) {
      pluginDefine.pluginType = 'notification';
    } else if (isPrototypeOf(value, BaseAccess)) {
      pluginDefine.pluginType = 'access';
    } else if (isPrototypeOf(value, BaseAddon)) {
      pluginDefine.pluginType = 'addon';
      subType = '_' + (pluginDefine.addonType || '');
    } else {
      console.log(`[warning] 未知的插件类型：${pluginDefine.name}`);
      continue;
    }

    pluginDefine.type = 'builtIn';

    // 计算脚本文件路径
    const relativePath = path.relative(process.cwd(), pluginPath);
    const scriptFilePath = relativePath.replace(/\\/g, '/').replace(/\.js$/, '.js');
    pluginDefine.scriptFilePath = scriptFilePath;

    console.log(`插件类型: ${pluginDefine.pluginType}`);
    console.log(`脚本路径: ${scriptFilePath}`);

    // 生成 YAML 配置
    const yamlContent = yaml.dump(pluginDefine);
    console.log('\n生成的 YAML 配置:');
    console.log(yamlContent);

    // 可选：保存到文件
    const outputDir = './metadata';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFileName = `${pluginDefine.pluginType}${subType}_${pluginDefine.name}.yaml`;
    const outputPath = path.join(outputDir, outputFileName);

    fs.writeFileSync(outputPath, yamlContent, 'utf8');
    console.log(`\nYAML 配置已保存到: ${outputPath}`);

    return pluginDefine;
  }

  console.error('未找到有效的插件定义');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('请指定插件文件路径');
    console.log('用法: node convert-plugin-to-yaml.js <插件文件路径>');
    process.exit(1);
  }

  const pluginPath = args[0];

  if (!fs.existsSync(pluginPath)) {
    console.error(`插件文件不存在: ${pluginPath}`);
    process.exit(1);
  }

  try {
    await convertSinglePlugin(pluginPath);
    console.log('\n插件转换完成!');
  } catch (error) {
    console.error('转换过程中出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

// 导出函数，以便其他模块使用
export { convertSinglePlugin, loadSingleModule, isPrototypeOf };
