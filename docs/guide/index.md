# Certd

Certd 是一款开源、免费、全自动申请和部署更新SSL证书的工具。       
后缀d取自linux守护进程的命名风格，意为证书守护进程。

关键字：证书自动申请、证书自动更新、证书自动续期、证书自动续签、证书管理工具


| 官方开源地址： | |
| ---- | ---- |
| [Github](https://github.com/certd/certd)| ![](https://img.shields.io/github/stars/certd/certd?logo=github)      |    
| [Gitee](https://gitee.com/certd/certd)  | ![](https://gitee.com/certd/certd/badge/star.svg?theme=dark)        |
| [AtomGit](https://atomgit.com/certd/certd) |![](https://atomgit.com/certd/certd/star/badge.svg)        |


![首页](../images/start/home.png)

![](../images/start/first.png)

## 1、关于证书续期
>* 实际上没有办法不改变证书文件本身情况下直接续期或者续签。
>* 我们所说的续期，其实就是按照全套流程重新申请一份新证书，然后重新部署上去。
>* 免费证书过期时间90天，以后可能还会缩短，所以自动化部署必不可少


## 2、项目特性
本项目不仅支持证书申请过程自动化，还可以自动化部署更新证书，让你的证书永不过期。

* 全自动申请证书（支持所有注册商注册的域名，支持DNS-01、HTTP-01、CNAME代理等多种域名验证方式）
* 全自动部署更新证书（目前支持部署到主机、阿里云、腾讯云等100+部署插件）
* 支持通配符域名/泛域名，支持多个域名打到一个证书上，支持pem、pfx、der、jks等多种证书格式
* 邮件通知、webhook通知、企微、钉钉、飞书、anpush等多种通知方式
* 私有化部署，数据保存本地，安装升级非常简单快捷
* 镜像由Github Actions构建，过程公开透明
* 授权加密，站点隐藏，2FA，密码防爆破等多重安全保障
* 支持SQLite，PostgreSQL、MySQL多种数据库
* 开放接口支持
* 站点证书监控
* 多用户管理


  ![](../images/intro/intro.svg)


