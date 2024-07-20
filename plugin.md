# 贡献插件

## 1.本地调试运行

安装依赖包:      
```shell

# 克隆代码
git clone https://github.com/certd/certd

#进入项目目录
cd certd

# 安装依赖
npm install -g pnpm@8.15.7
pnpm install

# 初始化构建
lerna run build
```

启动 server:    
```shell
cd packages/ui/certd-server
npm run dev
```

启动 client:    
```shell
cd packages/ui/certd-client
npm run dev

# 会自动打开浏览器，确认正常运行

```

## 开发插件
进入 `packages/ui/certd-server/src/plugins`

### 1.复制`plugin-demo`目录作为你的插件目录
比如你想做`cloudflare`的插件，那么你可以复制`plugin-demo`目录，将其命名成`plugin-cloudflare`。   
以下均以`plugin-cloudflare`为例进行说明，你需要将其替换成你的插件名称

### 2. access授权
如果这是一个新的平台，它应该有授权方式，比如accessKey accessSecret之类的     
参考`plugin-cloudflare/access.ts` 修改为你要做的平台的`access`
这样用户就可以在`certd`后台中创建这种授权凭证了

### 3. dns-provider
如果域名是这个平台进行解析的，那么你需要实现dns-provider
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
export * from "./plugin-cloudflare"
```

## 重启服务进行调试
刷新浏览器，检查你的插件是否工作正常， 确保能够正常进行证书申请和部署    

## 提交PR
我们将尽快审核PR
