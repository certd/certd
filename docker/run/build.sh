#!/bin/bash
set -e
if $CERTD_VERSION; then
    echo "CERTD_VERSION is set = $CERTD_VERSION"
    version=$CERTD_VERSION
else
    echo "CERTD_VERSION is not set"
    echo "请先输入一个版本号(如 1.0.6)："
    read version
fi

echo "您输入的版本号是： $version"
export TAG="$version"
sudo -E docker compose up -d
