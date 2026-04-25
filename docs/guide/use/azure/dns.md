# Azure 配置

## Access授权配置

1. 登录 Azure 并创建一个资源组 【可选，如果已经有了可以不用创建】
2. 创建一个应用程序
Microsoft Entra ID - 》 应用注册 - 》 新注册
![](./images/access-1.png)
![](./images/access-2.png)

3. 配置授权
![](./images/access-3.png)

4. 点击测试

## Azure DNS 配置

1. 创建一个 DNS 区域(就是一个域名)
![](./images/dns-1.png)
![](./images/dns-2.png)

2. 为这个域名和上面创建的授权应用分配角色
![](./images/dns-3.png)
![](./images/dns-4.png)
![](./images/dns-5.png)

3. 然后就可以给dns区域去申请证书了

