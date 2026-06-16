# 根据目标平台选择基础镜像：amd64/arm64 用 trixie-slim，arm/v7 没有 trixie-slim 发布，回退到 alpine
FROM --platform=linux/amd64 node:22-trixie-slim AS base-amd64
FROM --platform=linux/arm64 node:22-trixie-slim AS base-arm64
FROM --platform=linux/arm/v7 node:22-alpine AS base-arm-v7

FROM base-${TARGETARCH}${TARGETVARIANT:+-}${TARGETVARIANT} AS builder

WORKDIR /workspace/
COPY . /workspace/
# pnpm v11打包会报错（[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts），暂时固定10.33.4版本。
# https://pnpm.io/zh/migration
RUN npm install -g pnpm@10.33.4

RUN cp /workspace/certd-client/dist/* /workspace/certd-server/public/ -rf
RUN cd /workspace/certd-server && pnpm install && npm run build-on-docker


FROM base-${TARGETARCH}${TARGETVARIANT:+-}${TARGETVARIANT}
EXPOSE 7001
EXPOSE 7002

# 根据基础镜像发行版选择包管理器
# trixie-slim -> apt-get, alpine -> apk
RUN if [ -f /etc/debian_version ]; then \
        apt-get update \
        && apt-get install -y --no-install-recommends \
            ca-certificates \
            gnupg \
            wget \
            openssl \
            netcat-openbsd \
            iputils-ping \
            dnsutils \
            iproute2 \
        && wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | tee /usr/share/keyrings/adoptium.gpg > /dev/null \
        && echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" | tee /etc/apt/sources.list.d/adoptium.list \
        && apt-get update \
        && apt-get install -y --no-install-recommends temurin-8-jre \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*; \
    elif [ -f /etc/alpine-release ]; then \
        apk add --no-cache \
            openssl \
            openjdk8-jre; \
    else \
        echo "Unsupported base image"; exit 1; \
    fi

WORKDIR /app/

ENV TERM=xterm
ENV LEGO_VERSION=4.30.1
ENV LEGO_DOWNLOAD_DIR=/app/tools/lego

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

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
ENV MIDWAY_SERVER_ENV=production

COPY --from=builder /workspace/certd-server/ /app/
COPY ./patch/ssh2/*.js /app/node_modules/.pnpm/node_modules/ssh2/lib/protocol/
CMD ["node", "--optimize-for-size", "./bootstrap.js"]
