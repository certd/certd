FROM node:22-trixie-slim AS builder

# RUN apk add build-base
# RUN wget -O - https://github.com/jemalloc/jemalloc/releases/download/5.3.0/jemalloc-5.3.0.tar.bz2 | tar -xj && \
#     cd jemalloc-5.3.0 && \
#     ./configure && \
#     make && \
#     make install


WORKDIR /workspace/
COPY . /workspace/
# pnpm v11打包会报错（[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts），暂时固定10.33.4版本。
# https://pnpm.io/zh/migration
RUN npm install -g pnpm@10.33.4

#RUN cd /workspace/certd-client && pnpm install && npm run build
RUN cp /workspace/certd-client/dist/* /workspace/certd-server/public/ -rf
RUN cd /workspace/certd-server && pnpm install && npm run build-on-docker

# RUN cd /workspace/certd-server && \
#     pnpm install --ignore-scripts && \
#     yes | pnpm approve-builds && \
#     pnpm rebuild && \
#     npm run build-on-docker


FROM node:22-trixie-slim
EXPOSE 7001
EXPOSE 7002

# 安装jemalloc内存分配器，优化内存占用 -- 基本没用，反而更高了
# COPY --from=builder /usr/local/lib/libjemalloc.so.2 /usr/local/lib/
# ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so.2


# RUN apk add --no-cache openssl
# RUN apk add --no-cache openjdk8
# RUN apk add --no-cache gcompat

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
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
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app/

ENV TERM xterm
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
        echo "Unsupported architecture: $ARCH"; \
    fi

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
ENV MIDWAY_SERVER_ENV=production

COPY --from=builder /workspace/certd-server/ /app/
COPY ./patch/ssh2/*.js /app/node_modules/.pnpm/node_modules/ssh2/lib/protocol/
CMD ["node", "--optimize-for-size", "./bootstrap.js"]




