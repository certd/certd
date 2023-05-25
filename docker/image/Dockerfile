FROM registry.cn-shenzhen.aliyuncs.com/handsfree/node:18-alpine
RUN npm install -g pnpm
ADD ./workspace/certd-server/package.json /app/
WORKDIR /app/
pnpm install -P

ADD ./workspace/certd-server/ /app/
CMD ["npm","run","start"]



