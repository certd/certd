FROM registry.cn-shenzhen.aliyuncs.com/handsfree/node:16-alpine
#RUN npm install cross-env -g  --registry=https://registry.npmmirror.com
#RUN npm install pm2 -g  --registry=https://registry.npmmirror.com
#RUN pm2 install pm2-logrotate
ADD ./workspace/certd-server/ /app/
WORKDIR /app/
ENV NODE_ENV production
RUN yarn install -P  --registry=https://registry.npmmirror.com
#CMD ["pm2-runtime", "start", "./bootstrap.js","--name", "certd","-i","1"]
CMD ["npm", "run","start"]




