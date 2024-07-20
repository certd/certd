FROM registry.cn-shenzhen.aliyuncs.com/handsfree/node:18-alpine
EXPOSE 7001
ENV NODE_ENV production
ENV MIDWAY_SERVER_ENV production
WORKDIR /app/
RUN npm install -g pnpm
#RUN npm install cross-env -g  --registry=https://registry.npmmirror.com
#RUN npm install pm2 -g  --registry=https://registry.npmmirror.com
#RUN pm2 install pm2-logrotate
ADD ./workspace/certd-server/ /app/
RUN sed -i "s/workspace://g" "/app/package.json"
RUN pnpm install --production  --registry=https://registry.npmmirror.com
#RUN yarn install --production
RUN npm run build
#CMD ["pm2-runtime", "start", "./bootstrap.js","--name", "certd","-i","1"]
CMD ["npm", "run","start"]




