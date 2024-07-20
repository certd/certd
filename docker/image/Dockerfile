FROM registry.cn-shenzhen.aliyuncs.com/handsfree/node:18-alpine
EXPOSE 7001
ENV NODE_ENV production
ENV MIDWAY_SERVER_ENV production
WORKDIR /app/
ENV node_sqlite3_binary_host_mirror https://registry.npmmirror.com/-/binary/sqlite3
RUN npm install -g pnpm@8.15.7 --registry=https://registry.npmmirror.com
RUN npm install -g mwtsc --registry=https://registry.npmmirror.com
RUN pnpm config set registry https://registry.npmmirror.com/

#RUN npm install cross-env -g  --registry=https://registry.npmmirror.com
#RUN npm install pm2 -g  --registry=https://registry.npmmirror.com
#RUN pm2 install pm2-logrotate
ADD ./workspace/certd-server/ /app/
RUN sed -i "s/workspace://g" "/app/package.json"
#RUN yarn install  --registry=https://registry.npmmirror.com
#RUN yarn install --production
RUN pnpm install
RUN node ./before-build.js
RUN npm run build
#CMD ["pm2-runtime", "start", "./bootstrap.js","--name", "certd","-i","1"]
CMD ["npm", "run","start"]




