ARG base_type=alpine

# 根据 base_type 参数选择基础镜像系列
FROM --platform=linux/amd64 node:22-alpine AS base-amd64-alpine
FROM --platform=linux/arm64 node:22-alpine AS base-arm64-alpine
FROM --platform=linux/arm/v7 node:22-alpine AS base-arm-v7-alpine

FROM --platform=linux/amd64 node:22-trixie-slim AS base-amd64-slim
FROM --platform=linux/arm64 node:22-trixie-slim AS base-arm64-slim
FROM --platform=linux/arm/v7 node:22-alpine AS base-arm-v7-slim

FROM base-${TARGETARCH}${TARGETVARIANT:+-}${TARGETVARIANT}-${base_type} AS builder

WORKDIR /workspace/
COPY . /workspace/
# pnpm v11打包会报错（[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts），暂时固定10.33.4版本。
# https://pnpm.io/zh/migration
RUN npm install -g pnpm@10.33.4

RUN cp /workspace/certd-client/dist/* /workspace/certd-server/public/ -rf
RUN cd /workspace/certd-server && pnpm install && npm run build-on-docker
RUN rm -rf /workspace/certd-server/node_modules

ARG base_type=alpine

# ------------------------------------------------------------------
# 构建生产环境镜像
# ------------------------------------------------------------------
FROM base-${TARGETARCH}${TARGETVARIANT:+-}${TARGETVARIANT}-${base_type}
EXPOSE 7001
EXPOSE 7002

ARG base_type=alpine

# 根据基础镜像发行版选择包管理器
# trixie-slim -> apt-get, alpine -> apk
RUN if [ -f /etc/debian_version ]; then \
        apt-get update \
        && apt-get install -y --no-install-recommends \
            ca-certificates \
            wget \
            openssl \
            netcat-openbsd \
            iputils-ping \
            dnsutils \
            iproute2 \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*; \
    elif [ -f /etc/alpine-release ]; then \
        apk add --no-cache openssl wget ca-certificates; \
    else \
        echo "Unsupported base image"; exit 1; \
    fi

WORKDIR /app/

ENV TERM=xterm
ENV LEGO_VERSION=4.30.1
ENV LEGO_DOWNLOAD_DIR=/app/tools/lego

ENV JKS_GO_VERSION=1.0.3
ENV JKS_GO_DOWNLOAD_DIR=/app/tools/jks-go

ENV ALIYUN_CLIENT_CONNECT_TIMEOUT=10000
ENV ALIYUN_CLIENT_READ_TIMEOUT=20000

RUN mkdir -p $LEGO_DOWNLOAD_DIR

# 根据架构下载不同的文件
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        wget -O $LEGO_DOWNLOAD_DIR/lego_v${LEGO_VERSION}_linux_amd64.tar.gz https://github.com/go-acme/lego/releases/download/v${LEGO_VERSION}/lego_v${LEGO_VERSION}_linux_amd64.tar.gz; \
    elif [ "$ARCH" = "aarch64" ]; then \
        wget -O $LEGO_DOWNLOAD_DIR/lego_v${LEGO_VERSION}_linux_arm64.tar.gz https://github.com/go-acme/lego/releases/download/v${LEGO_VERSION}/lego_v${LEGO_VERSION}_linux_arm64.tar.gz; \
    else \
        # armv7 不支持lego 不要再尝试了
        echo "Unsupported architecture: $ARCH"; \
    fi

RUN mkdir -p $JKS_GO_DOWNLOAD_DIR

# 根据架构下载jks-go
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        wget -O $JKS_GO_DOWNLOAD_DIR/jks-go_linux_amd64 https://github.com/certd/jks-go/releases/download/v${JKS_GO_VERSION}/jks-go_linux_amd64 && \
        chmod +x $JKS_GO_DOWNLOAD_DIR/jks-go_linux_amd64 && \
        ln -s $JKS_GO_DOWNLOAD_DIR/jks-go_linux_amd64 /usr/local/bin/jks-go; \
    elif [ "$ARCH" = "aarch64" ]; then \
        wget -O $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm64 https://github.com/certd/jks-go/releases/download/v${JKS_GO_VERSION}/jks-go_linux_arm64 && \
        chmod +x $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm64 && \
        ln -s $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm64 /usr/local/bin/jks-go; \
    elif [ "$ARCH" = "armv7l" ]; then \
        wget -O $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm_armv7 https://github.com/certd/jks-go/releases/download/v${JKS_GO_VERSION}/jks-go_linux_arm_armv7 && \
        chmod +x $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm_armv7 && \
        ln -s $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm_armv7 /usr/local/bin/jks-go; \
    else \
        echo "Unsupported architecture: $ARCH"; \
    fi

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
ENV certd_release_mode=latest
ENV MIDWAY_SERVER_ENV=production

RUN npm install -g pnpm@10.33.4


COPY --from=builder /workspace/certd-server/ /app/
RUN pnpm install --production
COPY ./patch/ssh2/*.js /app/node_modules/.pnpm/node_modules/ssh2/lib/protocol/
CMD ["node", "--optimize-for-size", "./bootstrap.js"]
