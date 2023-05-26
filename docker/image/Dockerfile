FROM registry.cn-shenzhen.aliyuncs.com/handsfree/node:16-alpine
EXPOSE 7001
ENV NODE_ENV production
WORKDIR /app/
#RUN npm install cross-env -g  --registry=https://registry.npmmirror.com
#RUN npm install pm2 -g  --registry=https://registry.npmmirror.com
#RUN pm2 install pm2-logrotate
ADD ./workspace/certd-server/ /app/
RUN yarn install -P  --registry=https://registry.npmmirror.com
RUN npm run build
#CMD ["pm2-runtime", "start", "./bootstrap.js","--name", "certd","-i","1"]
CMD ["npm", "run","start"]




