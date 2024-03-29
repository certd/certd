#!/bin/bash
set -e
# 判断$CERTD_VERSION 是否存在
if [ -n "$CERTD_VERSION" ]; then
    echo "CERTD_VERSION is set = $CERTD_VERSION"
else
    echo "CERTD_VERSION is not set"
    echo "请先输入一个版本号(如 1.0.6)："
    read CERTD_VERSION
fi

echo "您输入的版本号是： $CERTD_VERSION"
sudo -E docker compose up -d
