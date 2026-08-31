# Docker方式部署

## 一、安装

### 镜像版本选择

Certd 提供多种 Docker 镜像版本，您可以根据需要选择：

#### 1. 镜像地址格式：

```
registry.cn-shenzhen.aliyuncs.com/certd/certd:[version-][system-][latest/stable]  
------------ ↑ 镜像地址 ------------- ↑ 镜像名 -- ↑指定版本- ↑基础系统- ↑最新版本类型             
```
#### 2. 版本标签：

**最新版本标签：**

| 版本 | 标签 | 说明 |
| --- | --- | --- |
| 最新预览版【默认】 | `certd:latest` | 指向最新开发版本，包含最新功能，但稳定性不如稳定版  | 
| 最新稳定版 | `certd:stable` | 指向经过充分测试的生产就绪版本，推荐生产环境使用  |  

**系统分支版本：**

> 根据基础镜像不同，分为如下三个分支版本，没有特殊需求选择默认的即可（他们功能是一样的）

| 系统版本 | 版本标签 |  基础系统 | 说明 | 稳定版标签 | 指定版本 |
| --- | --- | --- | --- | --- | --- | 
| alpine【默认】 | `certd:latest` |  Alpine Linux | 默认版本，镜像体积小，支持x86、ARM架构  | `certd:stable` | `certd:1.43.0` |
| slim | `certd:slim` |  Debian slim | 基于glibc，dns解析兼容性好 | `certd:slim-stable` | `certd:1.43.0-slim` |
| armv7 | `certd:armv7` |  Alpine Linux | ARMv7 架构专用版本 | `certd:armv7-stable` | `certd:1.43.0-armv7` |

#### 3. 镜像地址：

| 镜像仓库 | 最新预览版  | slim版 | armv7版 | 
| --- | --- | --- | 
| 阿里云【默认】 | `registry.cn-shenzhen.aliyuncs.com/certd/certd:latest` | `certd:slim` | `certd:armv7` |
| Docker Hub | `certd/certd:latest` | `certd:slim` | `certd:armv7` |
| GitHub Packages | `ghcr.io/certd/certd:latest` | `certd:slim` | `certd:armv7` |

> 1. 后面的各个版本省略了镜像地址，使用时需要将镜像地址拼接完整。
> 2. 如果您不确定使用哪个版本，请使用默认的 `certd:latest` 版本。

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

### 如果使用`latest`版本
```shell
cd /opt/certd
#重新拉取镜像
docker pull registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest
# 重新启动容器
docker compose down
docker compose up -d
```
## 三、数据备份
> 数据默认存在`/data/certd`目录下，不用担心数据丢失   
> 建议配置一条[数据库备份流水线](../../use/backup/) 自动备份

## 四、备份恢复

将备份的`db.sqlite`及同目录下的其他文件一起覆盖到原来的位置，重启certd即可