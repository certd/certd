# Docker方式部署

## 一、安装

### 1. 环境准备

1.1  准备一台云服务器

* 【阿里云】云服务器2核2G，新老用户同享，99元/年，续费同价！【 [立即购买](https://www.aliyun.com/benefit?scm=20140722.M_10244282._.V_1&source=5176.11533457&userCode=qya11txb )】
* 【腾讯云】云服务器2核2G，新老用户同享，99元/年，续费同价！【 [立即购买](https://cloud.tencent.com/act/cps/redirect?redirect=6094&cps_key=b3ef73330335d7a6efa4a4bbeeb6b2c9&from=console)】

1.2 安装docker、docker-compose 

https://docs.docker.com/engine/install/ 

选择对应的操作系统，按照官方文档执行命令即可

### 2. 部署certd容器

```bash
# 随便创建一个目录
mkdir certd
# 进入目录
cd certd
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
> 然后使用 `docker-compose up -d` 启动

### 3. 访问测试

http://your_server_ip:7001    
默认账号密码：admin/123456    
记得修改密码


## 二、升级

### 如果使用固定版本号
1. 修改`docker-compose.yaml`中的镜像版本号
2. 运行`docker compose up -d` 即可

### 如果使用`latest`版本
```shell
#重新拉取镜像
docker pull registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest
# 重新启动容器
docker compose down
docker compose up -d
```

> 数据默认存在`/data/certd`目录下，不用担心数据丢失   
> 建议配置一条[数据库备份流水线](../../use/backup/) 自动备份
