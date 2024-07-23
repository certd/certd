FROM node:18-alpine as builder
EXPOSE 7001
WORKDIR /workspace/
COPY . /workspace/
RUN npm install -g pnpm@8.15.7

RUN cd /workspace/certd-client && pnpm install && npm run build
RUN cd /workspace/certd-server && pnpm install && npm run build-on-docker

RUN cp /workspace/certd-client/dist/* /workspace/certd-server/public/ -rf


FROM node:18-alpine
WORKDIR /app/
COPY --from=builder /workspace/certd-server/ /app/
ENV TZ Asia/Shanghai
ENV NODE_ENV production
ENV MIDWAY_SERVER_ENV production
CMD ["npm", "run","start"]




