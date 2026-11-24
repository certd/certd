# 阿里云相关

## 获取订阅证书与部署

### 获取阿里云订阅证书

1. 创建「获取阿里云订阅证书」任务，选择阿里云授权和证书 API 版本。
2. API 1.0 填证书订单 ID，API 2.0 选择订阅实例 ID。V2 会查询当前证书并在需要续期时提交申请。
3. 设置到期前更新天数，把任务输出的「域名证书」连接到后续部署任务。

### 部署到 CDN 和 DCDN

插件的 **域名匹配模式** 有两种。手动选择时，在域名列表选择目标加速域名；按证书匹配时，Certd 查询与证书 SAN 域名匹配的加速域名，每次运行会再次查询，因此可发现新增域名。按证书匹配需使用支持此功能的申请任务证书输出。

### 部署到 ESA

在「阿里云-部署至ESA」任务中选择模式。**边缘证书**发布到站点边缘节点，**SaaS 证书**发布到所选 SaaS 域名；SaaS 模式必须只选一个站点并选择域名。

免费证书数量限制按站点检查 CAS 证书。如果现存数量达到限制，任务会删除最早创建的一张后部署新证书，并不会只寻找已过期证书。使用两张证书轮换时，限制设为 2 前必须先为新证书预留空位，避免删除仍在使用的证书。


## 阿里云客户端请求超时配置

配置环境变量
```shell
# docker-compose.yaml
environment:
  - ALIYUN_CLIENT_CONNECT_TIMEOUT=16000 # 连接超时，单位毫秒
  - ALIYUN_CLIENT_READ_TIMEOUT=16000 #读取数据超时，单位毫秒

```


## 阿里云Access权限设置


* 申请证书 ：`AliyunDNSFullAccess`
* 上传证书到阿里云： `AliyunYundunCertFullAccess`
* 部署证书到OSS: `AliyunYundunCertFullAccess`、`AliyunOSSFullAccess`
* 部署证书到CDN: `AliyunYundunCertFullAccess`、`AliyunCDNFullAccess`
* 部署证书到DCDN： `AliyunYundunCertFullAccess`、`AliyunDCDNFullAccess`
