FROM registry.cn-shenzhen.aliyuncs.com/greper/node:15.8.0-alpine
ENV TZ=Asia/Shanghai
EXPOSE 3000
ADD ./ /app/
RUN cd /app/ && ls
ENTRYPOINT node /app/bin/www.js
