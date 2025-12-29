#
set -e

# 设置SUDO命令
if [[ "$(uname -s)" =~ ^MINGW || "$(uname -s)" =~ ^CYGWIN || "$(uname -s)" =~ ^MSYS ]]; then
    SUDO_CMD=""
    SUDO_CMD_E=""
else
    SUDO_CMD="sudo"
    SUDO_CMD_E="sudo -E"
fi

# echo "即将删除packages下除ui之外的其他目录，按y确认（如果您没有修改过源码，按y即可）"
# read -p "y/n: " confirm
# if [ $confirm != "y" ]; then
#   echo "取消操作"
#   exit 1
# fi
# find ./packages -mindepth 1 -maxdepth 1 -type d ! -name 'ui' -exec rm -rf {} +
# echo "删除成功"
echo "修改 pnpm-workspace.yaml"
cat > pnpm-workspace.yaml << EOF
packages:
  - 'packages/ui/certd-server'
EOF


# 检查输入是否正确 循环输入
while true; do
  echo "是否后台运行(第一次运行建议选择n，调试没有问题之后，重新运行，选择y)"
  read -p "y/n: " confirmNohup
  # 校验输入是否正确
  if [ $confirmNohup != "y" ] && [ $confirmNohup != "n" ]; then
    echo "输入错误"
  else
    break
  fi
done


echo "安装pnpm, 前提是已经安装了nodejs"
$SUDO_CMD npm install -g pnpm --registry https://registry.npmmirror.com
echo "安装依赖"
$SUDO_CMD pnpm install --registry https://registry.npmmirror.com


# 获取版本号
version=$(node --experimental-json-modules ./scripts/version.js)
echo "当前版本号为: $version"

echo "开始构建"
cd packages/ui/certd-server
echo "构建certd-server"
$SUDO_CMD_E pnpm run build
echo "构建完成"


echo "下载前端ui"
# 如果zip有了就不下载
if [ -f ui-$version.zip ]; then
  echo "ui-$version.zip 已经存在，不需要下载"
else
  # 下载之前清理一下
  rm -rf ui-*.zip
  # https://atomgit.com/certd/certd/releases/download/v1.37.16/ui-1.37.16.zip
  # 判断是否下载失败
  wget https://atomgit.com/certd/certd/releases/download/v$version/ui-$version.zip
# 覆盖解压缩
unzip -o ui-$version.zip -d ./public

echo "启动服务"

# 前台运行
if [ $confirmNohup != "y" ]; then
  echo "当前运行模式为前台运行，ctrl+c或者关闭ssh将会停止运行"
  $SUDO_CMD pnpm run start
else
  echo "当前运行模式为后台运行，可以通过tail -f ./certd.log 命令查看日志"
  nohup $SUDO_CMD pnpm run start > certd.log &
fi


