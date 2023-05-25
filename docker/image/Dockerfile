FROM registry.cn-shenzhen.aliyuncs.com/handsfree/node:16-alpine
RUN npm install -g yarn && npm install -g cross-env
ADD ./workspace/certd-server/ /app/
WORKDIR /app/
RUN yarn install -P
CMD ["npm","run","start"]



