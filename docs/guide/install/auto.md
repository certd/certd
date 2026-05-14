
## 自动升级配置

### 1. 方法一：使用watchtower监控自动升级【推荐】

1. 修改docker-compose.yaml文件增加如下配置       
或 [下载完整的自动升级docker-compose.yaml配置](https://gitee.com/certd/certd/raw/v2/docker/auto/docker-compose.yaml)
```yaml
services:
  certd:
     # 镜像                                                  #  ↓↓↓↓↓ ---- 镜像版本号 这里要保持为latest
    image: registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest
    ... # 这里是你原来的docker-compose.yaml配置

    # ↓↓↓↓ ---------------------------------------------------------  增加一个标签，表示certd需要自动升级
    labels:
      com.centurylinklabs.watchtower.enable: "true"

#         ↓↓↓↓ ---------------------------------------------------------  自动升级watchtower配置，注意：上面certd的版本号要保持为latest
  certd-updater:  # 添加 Watchtower 服务
    image: containrrr/watchtower:latest
    container_name: certd-updater
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    # 配置 自动更新
    environment:
      - WATCHTOWER_CLEANUP=true            # 自动清理旧版本容器
      - WATCHTOWER_INCLUDE_STOPPED=false   # 不更新已停止的容器
      - WATCHTOWER_LABEL_ENABLE=true       # 根据容器标签进行更新
      - WATCHTOWER_POLL_INTERVAL=600       # 每 10 分钟检查一次更新

```

2. 重启certd容器
```shell
cd certd
docker compose down
docker compose up -d
```


### 2. 方法二：使用Certd版本监控功能【不太稳定】

1. 选择Github-检查Release版本插件
![](./images/github-release.png)
按如下图填写配置
![](./images/github-release-2.png)


2. 检测到新版本后执行宿主机升级命令：

```shell
# 拉取最新镜像
docker pull registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest
# 升级容器命令， 替换成你自己的certd更新命令
export RESTART_CERT='sleep 10; cd ~/deploy/certd/ ; docker compose down; docker compose up -d'
# 构造一个脚本10s后在后台执行，避免容器销毁时执行太快，导致流水线任务无法结束
nohup sh -c '$RESTART_CERT' >/dev/null  2>&1 & echo '10秒后重启' && exit
```