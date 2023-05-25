FROM registry.cn-shenzhen.aliyuncs.com/handsfree/node:16-alpine
RUN npm install -g pnpm && npm install -g cross-env
ADD ./workspace/certd-server/ /app/
WORKDIR /app/
RUN pnpm install -P
CMD ["npm","run","start"]



