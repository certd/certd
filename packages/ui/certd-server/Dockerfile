FROM node:15.8.0-alpine3.12
ENV TZ=Asia/Shanghai
EXPOSE 3000
ADD ./* /app/
ENTRYPOINT node /app/bin/www.js
