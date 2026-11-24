# Docker 自动升级

Watchtower 可定期检查带有指定标签的 Docker 容器镜像。升级前先备份 Certd 的整个数据目录，并选择适合站点的发布通道。生产站点通常固定使用 `stable` 标签。

## 配置 Compose

在 Certd 服务使用的 `docker-compose.yaml` 中设置镜像地址和 Watchtower 标签，再添加更新服务。以下示例从阿里云仓库拉取稳定版：

```yaml
services:
  certd:
    image: registry.cn-shenzhen.aliyuncs.com/certd/certd:stable
    container_name: certd
    restart: unless-stopped
    labels:
      com.centurylinklabs.watchtower.enable: "true"
    volumes:
      - /data/certd:/app/data
    ports:
      - "7001:7001"
      - "7002:7002"

  certd-updater:
    image: containrrr/watchtower:latest
    container_name: certd-updater
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_INCLUDE_STOPPED: "false"
      WATCHTOWER_LABEL_ENABLE: "true"
      WATCHTOWER_POLL_INTERVAL: "600"
```

保留现有 `certd` 服务的其它环境变量和卷，只需核对镜像、标签和更新服务。挂载 `/var/run/docker.sock` 使更新服务可以管理 Docker 容器，仅在信任该配置及运行镜像来源时启用。

配置完成后，从 Certd Compose 文件所在目录运行：

```sh
docker compose up -d
docker compose ps
```

检查 Certd 和 Watchtower 容器均正常运行。Watchtower 每 10 分钟检查带有更新标签的服务。

## 验证升级

从 Certd 容器日志确认启动完成，再登录检查流水线、证书仓库和站点监控。实际执行流水线前确认部署目标与通知配置。具体升级兼容项见[版本升级](./upgrade.md)，数据恢复见[数据库备份](../use/backup/)。

希望先人工检查变更时，使用[Docker 手动升级步骤](./docker/index.md#二、升级certd)，并为服务指定固定版本标签。
