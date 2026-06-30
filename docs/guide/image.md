# 镜像说明

## 镜像版本说明

| 版本标签 | 基础系统 | OpenJDK | 说明 |
| --- | --- | --- | --- |
| `latest` / `[version]` | Alpine Linux | 有 | **推荐**，默认版本，镜像体积更小，功能完整，支持所有插件 |
| `slim` / `[version]-slim` | Debian slim | 有 | glibc 兼容性更好，适用于依赖 glibc 的特殊场景 |
| `armv7` / `[version]-armv7` | Alpine Linux | 有 | ARMv7 架构专用版本 |

## 国内镜像地址:

* `registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest`
* `registry.cn-shenzhen.aliyuncs.com/handsfree/certd:slim`、`[version]-slim`
* `registry.cn-shenzhen.aliyuncs.com/handsfree/certd:armv7`、`[version]-armv7`

## DockerHub地址：
* `https://hub.docker.com/r/greper/certd`
* `greper/certd:latest`
* `greper/certd:slim`、`greper/certd:[version]-slim`
* `greper/certd:armv7`、`greper/certd:[version]-armv7`

## GitHub Packages地址:
* `ghcr.io/certd/certd:latest`
* `ghcr.io/certd/certd:slim`、`ghcr.io/certd/certd:[version]-slim`
* `ghcr.io/certd/certd:armv7`、`ghcr.io/certd/certd:[version]-armv7`

## 镜像构建公开
镜像构建通过`Actions`自动执行，过程公开透明，请放心使用
* [点我查看镜像构建日志](https://github.com/certd/certd/actions/workflows/build-image.yml)

![](../images/action/action-build.jpg)