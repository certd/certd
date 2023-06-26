FROM registry.cn-shenzhen.aliyuncs.com/greper/node:15.8.0-alpine

WORKDIR /home

COPY . .
# 如果各公司有自己的私有源，可以替换registry地址
#RUN npm install --registry=https://registry.npmmirror.com
RUN npm install -g cnpm
RUN cnpm install
RUN npm run build

CMD ["npm", "run", "online"]
