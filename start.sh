
echo "删除packages下除ui之外的其他目录"
rm -rf packages/!(ui)

echo "安装pnpm 8.15.7, 前提是已经安装了nodejs"
npm install -g pnpm@8.15.7
echo "安装依赖"
pnpm install

echo "开始构建"
echo "构建certd-client"
cd packages/ui/certd-client
npm run build
cp -r dist ../certd-server

echo "构建certd-server"
cd ../certd-server
npm run build
echo "构建完成"
echo "启动服务"
npm run start


