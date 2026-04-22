#!/bin/bash
set -e

CERTD_VERSION="${CERTD_VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/opt/certd}"
COMPOSE_FILE_URL="https://gitee.com/certd/certd/raw/v2/docker/run/docker-compose.yaml"
COMPOSE_FILE="$INSTALL_DIR/docker-compose.yaml"

DOCKER_MIRROR="https://mirrors.aliyun.com"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    command -v "$1" >/dev/null 2>&1
}

get_local_ip() {
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[^ ]+' | head -1)
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP="127.0.0.1"
    fi
    echo "$LOCAL_IP"
}

get_public_ip() {
    PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null)
    if [ -z "$PUBLIC_IP" ]; then
        PUBLIC_IP=$(curl -s --max-time 5 https://checkip.amazonaws.com 2>/dev/null)
    fi
    if [ -z "$PUBLIC_IP" ]; then
        PUBLIC_IP=""
    fi
    echo "$PUBLIC_IP"
}

show_access_urls() {
    LOCAL_IP=$(get_local_ip)
    PUBLIC_IP=$(get_public_ip)

    echo ""
    echo "=========================================="
    log_info "安装完成!"
    echo "=========================================="
    echo ""
    echo "访问地址:"
    if [ -n "$PUBLIC_IP" ]; then
        echo -e "  ${GREEN}外网访问:${NC} http://$PUBLIC_IP:7001"
    fi
    echo -e "  ${GREEN}局域网:${NC}  http://$LOCAL_IP:7001"
    echo ""
    echo "配置文件: $COMPOSE_FILE"
    echo ""
    echo "常用命令:"
    echo "  cd $INSTALL_DIR"
    echo "  docker compose logs -f     # 查看日志"
    echo "  docker compose restart     # 重启服务"
    echo "  docker compose down        # 停止服务"
    echo ""
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    elif [ -f /etc/centos-release ]; then
        OS="centos"
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    else
        OS="unknown"
    fi
}

check_docker() {
    if check_command docker; then
        DOCKER_VERSION=$(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',')
        log_info "Docker 已安装: $DOCKER_VERSION"
        return 0
    else
        log_warn "Docker 未安装"
        return 1
    fi
}

check_docker_compose() {
    if check_command docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version 2>/dev/null | awk '{print $3}' | tr -d ',')
        log_info "Docker Compose 已安装: $COMPOSE_VERSION"
        return 0
    elif docker compose version >/dev/null 2>&1; then
        log_info "Docker Compose (插件版) 已安装"
        return 0
    else
        log_warn "Docker Compose 未安装"
        return 1
    fi
}

install_docker_ubuntu() {
    log_info "正在安装 Docker (Ubuntu/Debian)..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release

    mkdir -p /etc/apt/keyrings
    curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/${OS}/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || \
    curl -fsSL https://download.docker.com/linux/${OS}/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/${OS} $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker

    log_info "Docker 安装完成"
}

install_docker_centos() {
    log_info "正在安装 Docker (CentOS/RHEL)..."
    yum install -y yum-utils
    yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
    yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker

    log_info "Docker 安装完成"
}

install_dockerrocky() {
    log_info "正在安装 Docker (Rocky Linux/AlmaLinux)..."
    dnf install -y yum-utils
    dnf config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker

    log_info "Docker 安装完成"
}

install_docker_debian() {
    log_info "正在安装 Docker (Debian)..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg2

    mkdir -p /etc/apt/keyrings
    curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/debian/gpg | gpg --armor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --armor -o /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker

    log_info "Docker 安装完成"
}

install_docker() {
    detect_os
    log_info "检测到操作系统: $OS"

    case $OS in
        ubuntu)
            install_docker_ubuntu
            ;;
        debian)
            install_docker_debian
            ;;
        centos)
            install_docker_centos
            ;;
        rhel|rocky|almalinux)
            install_dockerrocky
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            log_info "请手动安装 Docker"
            exit 1
            ;;
    esac
}

install_docker_compose_standalone() {
    log_info "正在安装 Docker Compose (独立版本)..."

    COMPOSE_URLS=(
        "https://get.daocloud.io/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)"
        "https://mirror.sjtu.edu.cn/github/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)"
        "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)"
    )

    for url in "${COMPOSE_URLS[@]}"; do
        log_info "尝试从: $url"
        if curl -L "$url" -o /usr/local/bin/docker-compose 2>/dev/null; then
            chmod +x /usr/local/bin/docker-compose
            log_info "Docker Compose 安装完成"
            return 0
        fi
        log_warn "下载失败，尝试下一个源..."
    done

    log_error "Docker Compose 安装失败"
    return 1
}

install_docker_compose() {
    if check_command docker && docker compose version >/dev/null 2>&1; then
        log_info "Docker Compose 插件已可用"
        return 0
    fi

    if check_command docker-compose; then
        log_info "Docker Compose 独立版本已安装"
        return 0
    fi

    install_docker_compose_standalone
}

download_compose_file() {
    log_info "正在下载 docker-compose.yaml..."
    mkdir -p "$INSTALL_DIR"

    if curl -fsSL "$COMPOSE_FILE_URL" -o "$COMPOSE_FILE.tmp"; then
        mv "$COMPOSE_FILE.tmp" "$COMPOSE_FILE"
        log_info "docker-compose.yaml 已下载到 $COMPOSE_FILE"

        if [ "$CERTD_VERSION" != "latest" ]; then
            sed -i "s|certd:latest|certd:$CERTD_VERSION|g" "$COMPOSE_FILE"
            log_info "已修改镜像版本为: $CERTD_VERSION"
        fi
    else
        log_error "下载失败，请检查网络连接"
        exit 1
    fi
}

start_certd() {
    log_info "正在启动 Certd 容器..."
    cd "$INSTALL_DIR"

    if docker compose -f "$COMPOSE_FILE" up -d 2>/dev/null; then
        log_info "Certd 启动成功!"
    elif docker-compose -f "$COMPOSE_FILE" up -d; then
        log_info "Certd 启动成功!"
    fi

    sleep 2
    docker ps --filter "name=certd" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

show_usage() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -v, --version VERSION    指定 Certd 版本 (默认: latest)"
    echo "  -p, --path PATH          指定安装路径 (默认: /opt/certd)"
    echo "  -h, --help               显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                      # 使用默认配置安装"
    echo "  $0 -v 1.29.0            # 安装指定版本"
    echo "  $0 -p /data/certd       # 安装到指定目录"
}

main() {
    echo "=========================================="
    echo "         Certd 一键安装脚本"
    echo "=========================================="
    echo ""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--version)
                CERTD_VERSION="$2"
                shift 2
                ;;
            -p|--path)
                INSTALL_DIR="$2"
                COMPOSE_FILE="$INSTALL_DIR/docker-compose.yaml"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    log_info "Certd 版本: $CERTD_VERSION"
    log_info "安装路径: $INSTALL_DIR"
    echo ""

    DOCKER_INSTALLED=true
    COMPOSE_INSTALLED=true

    if ! check_docker; then
        echo ""
        log_info "正在安装 Docker..."
        install_docker
    fi

    if ! check_docker_compose; then
        echo ""
        log_info "正在安装 Docker Compose..."
        install_docker_compose
    fi

    download_compose_file
    start_certd

    show_access_urls
}

main "$@"
