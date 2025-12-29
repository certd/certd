FROM node:22-alpine AS builder

RUN apk add build-base
RUN wget -O - https://github.com/jemalloc/jemalloc/releases/download/5.3.0/jemalloc-5.3.0.tar.bz2 | tar -xj && \
    cd jemalloc-5.3.0 && \
    ./configure && \
    make && \
    make install