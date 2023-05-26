FROM registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest
RUN npm install pm2 -g  --registry=https://registry.npmmirror.com
CMD ["pm2-runtime", "start", "./bootstrap.js","--name", "certd","-i","1"]




