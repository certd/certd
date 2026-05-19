# 常见问题


## 1. 是否支持IP证书

因为ACME协议不支持IP证书，所以certd目前也不支持IP证书


## 2. 建议设置多长时间运行一次流水线
建议每天运行一次，检查证书过期时间
当证书没过期时，自动跳过部署
当证书到期前35天（创建流水线时可以修改），将会自动重新申请证书，自动部署


## 3. too many certificates 错误
当出现如下报错时，说明相同的域名短时间内申请超过5次
解决方案：可以加多一个子域名，重新执行就可以规避次错误
```
"detail": too many certificates (5) already issued for this exact set of idantifiers in the last 168hm0s
```

## 4. ssl.com报错  CAA record does not include ssl.com which is required to issue the certificate
ssl.com申请证书要求必须设置CAA记录，表示允许ssl.com为该域名颁发证书
请按如下格式添加CAA记录

| 示例    | 类型  | 域名前缀 | flag      | tag    | 值                    |
|-------|-----| -- |-----------|--------|----------------------|
| 顶级域名  | CAA | @ | 0         | issue  |  "ssl.com"  （注意有双引号） |
| 一级泛域名 | CAA | * | 0         | issue/issuewild | "ssl.com" |
| 固定子域名 | CAA | sub |  0         | issue  |"ssl.com" |

## 5. address family not supported
启动时出现此错误，是由于您的服务器不支持绑定ipv6地址

请配置环境变量 certd_koa_hostname=0.0.0.0

在docker-compose.yml中添加如下配置

```yaml
service:
  certd:
    environment:
      certd_koa_hostname: 0.0.0.0
```

## 6. DNS记录问题

1. DNS 不要设置CAA记录，删除即可

2. DNSSEC相关报错，DNSSEC管理中删除即可

3. DNS 有其他平台申请过的_acme-challenge记录，删除即可


## 7. DNS problem: NXDOMAIN looking up TXT for  _acme-challenge.xxx 
`
DNS problem: NXDOMAIN looking up TXT for  _acme-challenge.xxxxx - check that a DNS record exists for this domain
`
证书颁发机构向域名ns查询TXT验证记录失败，有以下几种可能
1、域名的ns服务器修改成别的了，但申请证书时的DNS提供商选择错误（检查确认，配置正确的DNS提供商）
2、证书颁发机构与ns域名服务器之间访问不通，无法查询到TXT记录（尝试更换证书颁发机构）
3、ns服务商解析值生效慢（尝试修改证书申请任务里面的等待生效时长600-1000s）

## 8. 同一份证书上传多次的问题
同一份证书在阿里云、腾讯云中上传多次，[请使用证书复用功能](../use/pretask/index.md)，避免重复上传。