# 二级子域名托管

当 `apps.example.com` 通过 NS 委派给独立 DNS 服务商，或注册商提供了单独管理的免费子域名时，需要让 Certd 把这个子域名识别为独立 DNS 区域。

1. 在 DNS 服务商确认独立区域已创建，父区域的 NS 委派已生效。阿里云用户可参考 [阿里云子域名托管说明](https://help.aliyun.com/zh/dns/pubz-subdomain-management)。
2. 在 Certd 的 **设置 → 子域名托管设置** 新增 `apps.example.com` 并启用。例子中，申请 `api.apps.example.com` 时会使用 `apps.example.com` 对应的 DNS 区域。
3. 如果使用 **自动选择**，在 **设置 → 域名管理** 为托管的子域名配置 DNS 提供商和实际控制该区域的授权。

![子域名托管设置入口](./images/subdomain1.png)

![添加独立托管的子域名](./images/subdomain2.png)

多个同层的免费子域名分别是独立区域时，可以用通配符登记。例如，`*.hosting.example.com` 会把 `my.hosting.example.com` 识别为独立区域，其下的 `api.my.hosting.example.com` 也使用这个区域。

如果在创建流水线后才修改子域名托管，请重新编辑证书申请任务的验证配置。已有 CNAME 记录提示主域名不一致时，重置记录状态并重新验证。详见 [CNAME 代理排错](../../feature/cname/index.md#排查验证失败)。
