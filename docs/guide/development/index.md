# 本地开发
欢迎贡献插件

建议nodejs版本 `20.x` 及以上

## 一、本地调试运行

### 克隆代码
```shell

# 克隆代码
git clone https://github.com/certd/certd --depth=1

#进入项目目录
cd certd

```

### 修改pnpm-workspace.yaml文件
重要：否则无法正确加载专业版的access和plugin
```yaml
# pnpm-workspace.yaml
packages:
   - 'packages/**'  # <--------------注释掉这一行，PR时不要提交此修改
   - 'packages/ui/**'
```

### 安装依赖和初始化:
```shell
# 安装pnpm，如果提示npm命令不存在，就需要先安装nodejs
npm install -g pnpm--registry=https://registry.npmmirror.com

# 使用国内镜像源，如果有代理，就不需要
pnpm config set registry https://registry.npmmirror.com
# 安装依赖
pnpm install

# 初始化构建
pnpm init
```

### lib包编译:
将packages下面依赖的包都编译一遍，并监听改动。
```shell
pnpm dev
```

### 启动 server:
启动server
```shell
cd packages/ui/certd-server
pnpm dev
```

### 启动 client:
启动前端
```shell
cd packages/ui/certd-client
pnpm dev

# 会自动打开浏览器，确认正常运行

```

## 二、开发插件
进入 `packages/ui/certd-server/src/plugins`

### 1.复制`plugin-demo`目录作为你的插件目录
比如你想做`cloudflare`的插件，那么你可以复制`plugin-demo`目录，将其命名成`plugin-cloudflare`。   
以下均以`plugin-cloudflare`为例进行说明，你需要将其替换成你的插件名称

### 2. access授权
如果这是一个新的平台，它应该有授权方式，比如accessKey accessSecret之类的     
参考`plugin-cloudflare/access.ts` 修改为你要做的平台的`access`
这样用户就可以在`certd`后台中创建这种授权凭证了

### 3. dns-provider
如果域名是这个平台进行解析的，那么你需要实现dns-provider，（申请证书需要）    
参考`plugin-cloudflare/dns-provider.ts` 修改为你要做的平台的`dns-provider`

### 4. plugin-deploy
如果这个平台有需要部署证书的地方     
参考`plugin-cloudflare/plugins/plugin-deploy-to-xx.ts` 修改为你要做的平台的`plugin-deploy-to-xx`

### 5. 增加导入
在`plugin-cloudflare/index.ts`中增加你的插件的`import`
```ts
export * from './dns-provider'
export * from './access'
export * from './plugins/plugin-deploy-to-xx'
````

在`./src/plugins/index.ts`中增加`import`

```ts
export * from "./plugin-cloudflare.js"
```

### 6. 重启服务进行调试
刷新浏览器，检查你的插件是否工作正常， 确保能够正常进行证书申请和部署

## 三、提交PR
我们将尽快审核PR

## 四、 注意事项
### 1.  如何让任务报错停止

```js
// 抛出异常即可使任务停止，否则会判定为成功
throw new Error("错误信息")
```


## 五、贡献插件送激活码

- PR要求，插件功能完整，代码规范
- PR通过后，联系我们，送您一个半年期专业版激活码