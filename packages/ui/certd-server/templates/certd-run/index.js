import { Executor } from '@certd/executor'
import PluginAliyun from '@certd/plugin-aliyun'
import PluginTencent from '@certd/plugin-tencent'
import PluginHost from '@certd/plugin-host'

// import options
import { createRequire } from 'module'

// 安装默认插件和授权提供者
PluginAliyun.install()
PluginTencent.install()
PluginHost.install()
const require = createRequire(import.meta.url)
const options = require('./options.json')

// 开始执行
const executor = new Executor()
await executor.run(options)
