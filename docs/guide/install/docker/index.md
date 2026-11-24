# Docker方式部署

## 一、安装

### 镜像版本选择

在 Compose 中将镜像地址与标签用冒号连接，例如 `certd/certd:stable`。

| 仓库 | 镜像地址 |
| --- | --- |
| 阿里云 | `registry.cn-shenzhen.aliyuncs.com/certd/certd` |
| Docker Hub | `certd/certd` |
| GitHub Container Registry | `ghcr.io/certd/certd` |

| 标签 | 用途 |
| --- | --- |
| `stable` | Alpine 稳定通道，适合生产环境 |
| `latest` | Alpine 预览通道，可试用新功能 |
| `slim-stable` / `slim` | Debian slim 的稳定／预览通道，适合需要 glibc 兼容性的环境 |
| `armv7` | 32 位 ARMv7 专用通道 |

需要固定版本时，可使用发行版对应的版本号，或其 `-slim`、`-armv7` 标签。[镜像说明](../../image.md)

最新版本号：
![GitHub release (latest by date)](https://img.shields.io/github/v/release/certd/certd?label=Latest%20Release&sort=semver)


### 一键脚本安装（推荐）

如果您的服务器未安装 Docker，该脚本会自动为您安装 Docker 和 Docker Compose，并启动 Certd 容器。

```bash
curl -fsSL https://gitee.com/certd/certd/raw/v2/docker/run/install.sh | bash
```

> 支持 Ubuntu、Debian、CentOS、Rocky Linux、AlmaLinux 等主流发行版。    
> docker-compose文件目录：`/opt/certd` ，升级时需要先进入此目录
> 运行时数据默认保存路径：`/data/certd` ，可使用参数指定：`-p /data/certd` 
   


###  手动安装

#### 1. 环境准备

1.1  准备一台云服务器

* 【阿里云】云服务器2核2G，新老用户同享，99元/年，续费同价！【 [立即购买](https://www.aliyun.com/benefit?scm=20140722.M_10244282._.V_1&source=5176.11533457&userCode=qya11txb )】
* 【腾讯云】云服务器2核2G，新老用户同享，99元/年，续费同价！【 [立即购买](https://cloud.tencent.com/act/cps/redirect?redirect=6094&cps_key=b3ef73330335d7a6efa4a4bbeeb6b2c9&from=console)】

1.2 安装docker、docker-compose 

https://docs.docker.com/engine/install/ 

选择对应的操作系统，按照官方文档执行命令即可

### 2. 部署certd容器

```bash
# 随便创建一个目录
mkdir /opt/certd
# 进入目录
cd /opt/certd
# 下载docker-compose.yaml文件，或者手动下载放到certd目录下
wget https://gitee.com/certd/certd/raw/v2/docker/run/docker-compose.yaml

# 可以根据需要修改里面的配置
# 1.修改镜像版本号【可选】
# 2.配置数据保存路径【可选】
# 3.修改端口号【可选】
vi docker-compose.yaml # 【可选】

# 启动certd
docker compose up -d

```

> [手动下载docker-compose.yaml ](https://gitee.com/certd/certd/raw/v2/docker/run/docker-compose.yaml)   
> 当前版本号： ![](https://img.shields.io/npm/v/%40certd%2Fpipeline)  

> 如果提示 没有docker compose命令,请安装docker-compose   
> https://docs.docker.com/compose/install/linux/   

::: tip
默认安装使用SQLite数据库，如果需要使用MySQL、PostgreSQL数据库，请参考[多数据库支持](../database.md)
:::

### 3. 访问测试

http://your_server_ip:7001   
https://your_server_ip:7002   
默认账号密码：admin/123456     
记得修改密码  


## 二、升级Certd

::: warning   
如果您是第一次升级certd版本，切记切记先备份一下数据    
```
# 查看/opt/certd/docker-compose.yaml配置
- /data/certd:/app/data   # 请务必确保 /app/data 这个路径没有改动，固定写死
```
:::


### 如果使用固定版本号
1. 修改`docker-compose.yaml`中的镜像版本号
2. 运行`docker compose up -d` 即可

### 如果使用滚动标签

在 Compose 文件目录运行以下命令。Compose 会根据当前 `image` 拉取配置的稳定或预览通道。

```shell
cd /opt/certd
docker compose pull certd
docker compose up -d
docker compose logs --tail 100 certd
```

升级后确认能登录、查看流水线和证书。需要长时间追踪更新时可使用[自动升级](../auto.md)。跨版本升级前请看[重要兼容变化](../upgrade.md#重要兼容变化)。

## 三、数据备份
> 数据默认存在`/data/certd`目录下，不用担心数据丢失   
> 建议配置一条[数据库备份流水线](../../use/backup/) 自动备份

### SQLite 写入错误排查

如果升级或迁移时日志出现 `SQLITE_IOERR_WRITE` 或 `SqliteError: disk I/O error`，先检查宿主机磁盘空间、`/data/certd` 的目录权限、容器挂载是否为可写，以及宿主机文件系统和 Docker 存储是否正常。当前代码只能根据错误码给出兼容性提示，无法判断根因，也不保证更换镜像能解决。

在确认数据目录可写并已完成备份后，可用同一 Certd 版本的 `slim` 标签做兼容性对照测试。固定版本时使用对应的 `[version]-slim` 标签。测试前确认新容器继续挂载同一个 `/app/data`，不要用空数据目录启动来代替验证。若错误仍存在，保留完整日志并继续排查磁盘、权限和文件系统。

## 四、备份恢复

将备份的`db.sqlite`及同目录下的其他文件一起覆盖到原来的位置，重启certd即可
