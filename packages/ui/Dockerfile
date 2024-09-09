FROM node:18-alpine AS builder
EXPOSE 7001
WORKDIR /workspace/
COPY . /workspace/
# armv7 目前只能用node18， pnpm9不支持node18,所以pnpm只能用8.15.7版本
# https://github.com/nodejs/docker-node/issues/1946
RUN npm install -g pnpm@8.15.7

#RUN cd /workspace/certd-client && pnpm install && npm run build
RUN cp /workspace/certd-client/dist/* /workspace/certd-server/public/ -rf
RUN cd /workspace/certd-server && pnpm install && npm run build-on-docker


FROM node:18-alpine
RUN apk add --no-cache openssl
WORKDIR /app/
COPY --from=builder /workspace/certd-server/ /app/
RUN chmod +x /app/tools/linux/*
ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
ENV MIDWAY_SERVER_ENV=production
CMD ["npm", "run","start"]




