# 贡献插件

## 1.复制demo作为你的根目录
比如你想做cloudflare的插件，那么你可以复制demo目录，将其命名成cloudflare。

## 2. access授权
如果这是一个新的平台，它应该有授权方式，比如accessKey accessSecret之类的     
参考`demo/access.ts` 修改为你要做的平台的`access`
这样用户就可以在certd后台中创建这种授权凭证了

## 3. dns-provider
如果域名是这个平台进行解析的，那么你需要实现dns-provider
参考`demo/dns-provider.ts` 修改为你要做的平台的`dns-provider`

## 4. deploy-plugin
如果这个平台有需要部署证书的地方     
参考`demo/deploy-plugin.ts` 修改为你要做的平台的`deploy-plugin`

