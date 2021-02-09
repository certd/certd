# CertD

CertD 是一个帮助你全自动申请和部署SSL证书的工具。       
后缀D取自linux守护进程的命名风格，意为证书守护进程。    

## 特性
本项目不仅支持证书申请过程自动化，还可以自动化部署证书，让你的证书永不过期。     

* 全自动申请证书
* 全自动部署证书（目前支持服务器上传部署、阿里云、腾讯云等）
* 可与CI/DI工具结合使用

## 免费证书申请说明
* 本项目ssl证书提供商为letencrypt
* 申请过程遵循acme协议
* 需要验证域名所有权，一般有两种方式（目前本项目仅支持dns-01）      
  * http-01： 在网站根目录下放置一份txt文件     
  * dns-01： 需要给域名添加txt解析记录，泛域名只能用这种方式   
* 证书续期：
  * 实际上acme并没有续期概念。
  * 我们所说的续期，其实就是按照全套流程重新申请一份新证书。
* 免费证书过期时间90天，以后可能还会缩短，所以自动化部署必不可少



## 快速开始
本案例演示，如何配置自动申请证书，并部署到阿里云CDN，然后快要到期前自动更新证书并重新部署    


1. 环境准备   
安装[nodejs](https://nodejs.org/zh-cn/)


2. 生成node项目

  通过ui生成： https://certd.docmirror.cn/
  

4. 运行
```
node index.js
```
5. 执行效果
生成的证书默认会存储在 `${home}/.certd/${email}/certs/${domain}/current`目录下 
```
[2021-01-08T16:15:04.681] [INFO] certd - 任务完成
[2021-01-08T16:15:04.681] [INFO] certd - ---------------------------任务结果总览--------------------------
[2021-01-08T16:15:04.682] [INFO] certd - 【更新证书】---------------------------------------	[success] 
  证书申请成功
[2021-01-08T16:15:04.682] [INFO] certd - 【流程1-部署到阿里云CDN】----------------------------	[success]  	执行成功
[2021-01-08T16:15:04.682] [INFO] certd -    └【上传到阿里云】--------------------------------	[success]  	执行成功
[2021-01-08T16:15:04.682] [INFO] certd -    └【部署证书到CDN】-------------------------------	[success]  	执行成功
```
6. 证书续期    
实际上没有证书续期的概念，只有重新生成一份新的证书，然后重新部署证书    
所以每天定时运行即可，当证书过期日前20天时，会重新申请新的证书，然后执行部署任务。     

7. 其他说明    
证书的部署任务执行后会记录执行结果，已经成功过的不会重复执行     
所以当你临时需要将证书部署到其他地方时，直接追加部署任务，然后再次运行即可

## CI/DI集成与自动续期重新部署
集成前，将以上代码提交到内网git仓库，或者私有git仓库（由于包含敏感信息，不要提交到公开git仓库）

### jenkins任务
1. 创建任务     
选择构建自由风格的任务     

2. 配置git    
配置cert-run的git地址     

3. 构建触发器    
配置 `H 3 * * *` ，每天凌晨3点-4点执行一次

4. 构建环境    
勾选 `Provide Node & npm bin/ folder to PATH`，提供nodejs运行环境     
如果没有此选项，需要jenkins安装`nodejs`插件

5. 构建    
执行shell
```
npm install --production   #执行过一次之后，就可以注释掉，加快执行速度
npm run post
```
6. 构建后操作     
邮件通知   
配置你的邮箱地址，可以在执行失败时收到邮件通知。


## API
先列个提纲，待完善

参数示例参考：https://gitee.com/certd/certd/blob/master/test/options.js

### 授权提供者
用于dns验证接口调用
#### aliyun

#### dnspod

### deploy插件
部署任务插件
#### 阿里云
##### 上传到阿里云
type = uploadCertToAliyun
##### 部署到阿里云DNS
type = deployCertToAliyunCDN

##### 部署到阿里云CLB
type = deployCertToAliyunCLB

#### 腾讯云
##### 上传到腾讯云
type = uploadCertToTencent

##### 部署到腾讯云DNS
type = deployCertToTencentDNS

##### 部署到腾讯云CLB
type = deployCertToTencentCLB

##### 部署到腾讯云TKE-ingress
type = deployCertToTencentTKEIngress


### 更多部署插件
等你来提需求
