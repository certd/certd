ARG WEKNORA_VERSION=v0.9.0
FROM wechatopenai/weknora-ui:${WEKNORA_VERSION} AS frontend

FROM golang:1.26-bookworm AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /usr/share/nginx/html/ ./web/
RUN test -s web/index.html \
    && printf 'window.__RUNTIME_CONFIG__ = window.__RUNTIME_CONFIG__ || {};\n' > web/config.js \
    && make SKIP_FRONTEND=1 build-lite \
    && bash scripts/copy-licenses.sh /license-bundle

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libgomp1 libsqlite3-0 libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --user-group --home-dir /data --no-create-home weknora \
    && install -d -o weknora -g weknora /data

WORKDIR /app
COPY --from=builder /src/WeKnora-lite ./
COPY --from=builder /src/config/ ./config/
COPY --from=builder /src/migrations/sqlite/ ./migrations/sqlite/
COPY --from=builder /src/web/ ./web/
COPY --from=builder /license-bundle/ ./

ENV HOME=/data \
    GIN_MODE=release \
    LOG_LEVEL=info \
    DB_DRIVER=sqlite \
    DB_PATH=/data/weknora.db \
    RETRIEVE_DRIVER=sqlite \
    STORAGE_TYPE=local \
    LOCAL_STORAGE_BASE_DIR=/data/files \
    STREAM_MANAGER_TYPE=memory \
    WEKNORA_WEB_DIR=/app/web \
    WEKNORA_SANDBOX_MODE=disabled

USER weknora
VOLUME ["/data"]
EXPOSE 8080
ENTRYPOINT ["/app/WeKnora-lite"]
