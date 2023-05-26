FROM registry.cn-shenzhen.aliyuncs.com/handsfree/node:16-alpine
RUN npm install -g cross-env  --registry=https://registry.npmmirror.com
ADD ./workspace/certd-server/ /app/
WORKDIR /app/
RUN yarn install -P  --registry=https://registry.npmmirror.com
CMD ["npm","run","start"]



