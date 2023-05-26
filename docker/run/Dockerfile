FROM registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest
EXPOSE 7001
RUN npm run build
#RUN npm install pm2 -g  --registry=https://registry.npmmirror.com
#CMD ["pm2-runtime", "start", "./bootstrap.js","--name", "certd","-i","1","--", "-p", "7001"]
CMD ["npm","run", "start"]



