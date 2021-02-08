import { Executor } from '@certd/executor'
import PluginAliyun from '@certd/plugin-aliyun'
import PluginTencent from '@certd/plugin-tencent'
import PluginHost from '@certd/plugin-host'
import options from './options.json'

// 安装默认插件和授权提供者
PluginAliyun.install()
PluginTencent.install()
PluginHost.install()
const executor = new Executor()
executor.run(options)
