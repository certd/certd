FROM node:20-alpine AS builder
EXPOSE 7001
WORKDIR /workspace/
COPY . /workspace/
RUN npm install -g pnpm

#RUN cd /workspace/certd-client && pnpm install && npm run build
RUN cp /workspace/certd-client/dist/* /workspace/certd-server/public/ -rf
RUN cd /workspace/certd-server && pnpm install && npm run build-on-docker


FROM node:20-alpine
WORKDIR /app/
COPY --from=builder /workspace/certd-server/ /app/
RUN chmod +x /app/tools/linux/*
ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
ENV MIDWAY_SERVER_ENV=production
CMD ["npm", "run","start"]




