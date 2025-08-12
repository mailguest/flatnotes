#!/bin/bash

# FlatNotes Docker 部署脚本
# 使用方法: ./deploy.sh [dev|prod|stop|logs|backup]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} FlatNotes Docker 部署工具${NC}"
    echo -e "${BLUE}================================${NC}"
}

# 检查 Docker 和 Docker Compose
check_requirements() {
    print_message "检查系统要求..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        echo ""
        echo "请按照以下步骤安装 Docker:"
        echo "1. 访问 https://docs.docker.com/get-docker/"
        echo "2. 下载适合您操作系统的 Docker Desktop"
        echo "3. 安装并启动 Docker Desktop"
        echo "4. 重新运行此脚本"
        echo ""
        echo "macOS 用户也可以使用 Homebrew 安装:"
        echo "  brew install --cask docker"
        echo ""
        exit 1
    fi
    
    # 检查Docker是否运行
    if ! docker info &> /dev/null; then
        print_error "Docker 已安装但未运行"
        echo "请启动 Docker Desktop 或 Docker 服务后重试"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装"
        echo ""
        echo "请安装 Docker Compose:"
        echo "1. 如果使用 Docker Desktop，Compose 已包含在内"
        echo "2. 如果使用独立 Docker，请访问: https://docs.docker.com/compose/install/"
        echo ""
        exit 1
    fi
    
    print_message "✅ Docker 和 Docker Compose 已安装并运行"
}

# 获取Docker Compose命令
get_docker_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# 确保数据目录存在
ensure_data_dir() {
    print_message "检查数据目录..."
    
    if [ ! -d "data" ]; then
        print_warning "数据目录不存在，正在创建..."
        mkdir -p data/notes data/uploads
        print_message "✅ 数据目录已创建"
    else
        print_message "✅ 数据目录已存在"
    fi
}

# 开发环境部署
deploy_dev() {
    print_header
    print_message "启动开发环境..."
    
    check_requirements
    ensure_data_dir
    
    local DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)
    
    print_message "构建并启动开发容器..."
    $DOCKER_COMPOSE_CMD --profile dev up --build flatnotes-dev
}

# 生产环境部署
deploy_prod() {
    print_header
    print_message "启动生产环境..."
    
    check_requirements
    ensure_data_dir
    
    local DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)
    
    print_message "构建并启动生产容器..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up --build -d
    
    print_message "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps | grep -q "Up"; then
        print_message "✅ 服务启动成功！"
        print_message "🌐 访问地址: http://localhost:3001"
        print_message "📊 查看日志: ./deploy.sh logs"
    else
        print_error "❌ 服务启动失败，请查看日志"
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs
    fi
}

# 停止服务
stop_services() {
    print_header
    print_message "停止所有服务..."
    
    local DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)
    
    # 停止生产环境
    if [ -f "docker-compose.prod.yml" ]; then
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down
    fi
    
    # 停止开发环境
    $DOCKER_COMPOSE_CMD --profile dev down
    
    print_message "✅ 所有服务已停止"
}

# 查看日志
show_logs() {
    print_header
    print_message "显示服务日志..."
    
    local DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)
    
    if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps | grep -q "Up"; then
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f --tail=100
    elif $DOCKER_COMPOSE_CMD --profile dev ps | grep -q "Up"; then
        $DOCKER_COMPOSE_CMD --profile dev logs -f --tail=100
    else
        print_warning "没有运行中的服务"
    fi
}

# 备份数据
backup_data() {
    print_header
    print_message "备份数据..."
    
    if [ ! -d "data" ]; then
        print_error "数据目录不存在"
        exit 1
    fi
    
    BACKUP_FILE="flatnotes-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" data/
    
    print_message "✅ 数据已备份到: $BACKUP_FILE"
    print_message "📁 备份大小: $(du -h "$BACKUP_FILE" | cut -f1)"
}

# 显示帮助信息
show_help() {
    print_header
    echo "使用方法: $0 [命令]"
    echo ""
    echo "可用命令:"
    echo "  dev     - 启动开发环境"
    echo "  prod    - 启动生产环境"
    echo "  stop    - 停止所有服务"
    echo "  logs    - 查看服务日志"
    echo "  backup  - 备份数据"
    echo "  help    - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 prod    # 启动生产环境"
    echo "  $0 dev     # 启动开发环境"
    echo "  $0 logs    # 查看日志"
    echo "  $0 backup  # 备份数据"
}

# 主函数
main() {
    case "${1:-help}" in
        "dev")
            deploy_dev
            ;;
        "prod")
            deploy_prod
            ;;
        "stop")
            stop_services
            ;;
        "logs")
            show_logs
            ;;
        "backup")
            backup_data
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"