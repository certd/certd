# 开放接口
被动方式对第三方提供证书， 支持根据域名或证书id获取证书。

## 获取keyId和KeySecret

![](./images/1.png)

:::tip

接口key分两种权限范围：
1. 仅开放接口： 仅能访问下面`接口文档`中的接口
2. 用户级别： 可访问Certd所有接口，没有文档，可以在浏览器中F12抓取网络请求参考

:::

## 接口文档

https://apifox.com/apidoc/shared-2e76f8c4-7c58-413b-a32d-a1316529af44/254949529e0


### Token生成方法

header中传入x-certd-token即可调用开放接口   
1、首先从OpenKey页面生成keyId，keySecret；    
2、准备一个content( json字符串)： content={"keyId":keyId, t:时间戳秒数, encrypt:false, signType:"md5"} `// encrypt返回结果是否加密`   
3、将content加上keySecret进行签名： sign = md5(content + keySecret)   
4、然后将content和sign分别base64后用.号连接： x-certd-token = base64(content) +"."+base64(sign)   


### 参数
支持证书id和域名两种方式获取证书。

### 创建新的证书申请
参数`autoApply=true`将在没有证书时自动触发申请证书。申请参数支持另外传入：
- `autoApplyTemplateId`：使用指定 ID 的证书申请参数模版；不传时不使用模版
- `autoApplyParams`：自定义证书申请参数，会与系统默认参数、模版参数合并，并覆盖同名字段

检查逻辑如下：
1. 如果证书仓库里面有，且没有过期，就直接返回证书
2. 如果没有或者已过期，就会去找流水线，有就触发流水线执行
3. 如果没有流水线，就创建一个流水线，触发运行（`注意：需要提前在域名管理中配置好域名校验方式，否则会申请失败`）
4. 再次采用相同参数请求接口，如果在申请过程中，就会提示`正在申请中`，可轮循获取状态，直到证书申请成功。


### SDK
待开发

## 客户端工具

### SSL-Assistant
`SSL Assistant` 是一个基于 Go 语言开发的跨平台证书部署管理助手。    
支持自动扫描主机`Nginx`配置，然后从Certd拉取证书并部署。     
在不想暴露ssh主机密码情况下，该工具非常好用。

开源地址： https://github.com/Youngxj/SSL-Assistant
