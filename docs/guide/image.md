# 镜像说明

在 Docker Compose 中填写完整的 `仓库地址:标签`。例如使用 Docker Hub 稳定通道时，填写 `certd/certd:stable`。

| 仓库 | 镜像地址 |
| --- | --- |
| 阿里云 | `registry.cn-shenzhen.aliyuncs.com/certd/certd` |
| Docker Hub | `certd/certd` |
| GitHub Container Registry | `ghcr.io/certd/certd` |

| 标签 | 基础系统和用途 |
| --- | --- |
| `stable` / `latest` | Alpine，分别为稳定和预览通道 |
| `slim-stable` / `slim` | Debian slim，分别为稳定和预览通道，适合需要 glibc 的环境 |
| `armv7` | 32 位 ARMv7，使用 Alpine |

固定版本可使用发布版本号，或其 `-slim`、`-armv7` 变体。历史 Compose 文件可能引用 `greper/certd` 或阿里云 `handsfree/certd`，更新镜像地址时请保留原有数据目录挂载。[Docker 安装和升级](./install/docker/) · [公开构建记录](https://github.com/certd/certd/actions/workflows/build-image.yml)
