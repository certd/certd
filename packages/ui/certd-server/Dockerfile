FROM registry.cn-shenzhen.aliyuncs.com/greper/node:15.8.0-alpine

WORKDIR /home

COPY . .
# 如果各公司有自己的私有源，可以替换registry地址
#RUN npm install --registry=https://registry.npmmirror.com
RUN npm install -g cnpm
RUN cnpm install
RUN npm run build:preview

# 如果端口更换，这边可以更新一下
EXPOSE 7001

CMD ["npm", "run", "online:preview"]
