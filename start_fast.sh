#
set -e

# 设置SUDO命令
if [[ "$(uname -s)" =~ ^MINGW || "$(uname -s)" =~ ^CYGWIN || "$(uname -s)" =~ ^MSYS || "$(id -u)" == "0" ]]; then
    SUDO_CMD=""
    SUDO_CMD_E=""
else
    SUDO_CMD="sudo"
    SUDO_CMD_E="sudo -E"
fi

echo "启动服务"
echo "当前运行模式为后台运行，可以通过tail -f ./certd.log 命令查看日志"
nohup $SUDO_CMD pnpm run start > certd.log &


