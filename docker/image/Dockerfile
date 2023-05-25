FROM node:18.16.0-slim
RUN npm install -g pnpm
ADD ./workspace/certd-server/package.json /app/
WORKDIR /app/
pnpm install -P

ADD ./workspace/certd-server/ /app/
CMD ["npm","run","start"]



