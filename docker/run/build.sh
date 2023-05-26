#!/bin/bash

echo "请先输入一个版本号(如 1.0.6)："
read version
echo "您输入的版本号是： $version"
export TAG="$version"
sudo -E docker compose up -d
