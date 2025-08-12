# FlatNotes Docker 部署指南

本文档介绍如何使用 Docker 部署 FlatNotes 笔记应用。

## 📋 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+

## 🚀 快速开始

### 生产环境部署

1. **克隆项目并进入目录**
   ```bash
   git clone <your-repo-url>
   cd flatnotes
   ```

2. **确保数据目录存在**
   ```bash
   mkdir -p data/notes data/uploads
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **访问应用**
   打开浏览器访问: http://localhost:3001

### 开发环境

1. **启动开发环境**
   ```bash
   docker-compose --profile dev up flatnotes-dev
   ```

2. **访问应用**
   - 前端开发服务器: http://localhost:3000
   - 后端API服务器: http://localhost:3001

## 📁 数据持久化

### 数据目录结构
```
data/
├── notes-meta.json          # 笔记元数据
├── notes/                   # 笔记内容目录
│   ├── note-id-1.md
│   ├── note-id-2.md
│   └── ...
├── categories.json          # 分类配置
├── uploads/                 # 上传文件目录
└── notes-backup-*.json      # 自动备份文件
```

### 数据卷挂载
- `./data:/app/data` - 主数据目录
- `./data/uploads:/app/data/uploads` - 上传文件目录

## 🔧 配置选项

### 环境变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3001` | 服务端口 |

### 端口映射

| 容器端口 | 宿主机端口 | 用途 |
|----------|------------|------|
| 3001 | 3001 | 主应用服务 |
| 3000 | 3000 | 开发环境前端服务 |

## 📝 常用命令

### 基本操作
```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps
```

### 数据管理
```bash
# 备份数据
tar -czf flatnotes-backup-$(date +%Y%m%d).tar.gz data/

# 恢复数据
tar -xzf flatnotes-backup-YYYYMMDD.tar.gz

# 查看数据目录大小
du -sh data/
```

### 开发相关
```bash
# 进入容器
docker-compose exec flatnotes sh

# 查看容器内文件
docker-compose exec flatnotes ls -la /app

# 重新构建镜像
docker-compose build --no-cache
```

## 🔍 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 修改 docker-compose.yml 中的端口映射
   ports:
     - "3002:3001"  # 改为其他端口
   ```

2. **数据权限问题**
   ```bash
   # 修复数据目录权限
   sudo chown -R 1000:1000 data/
   ```

3. **容器无法启动**
   ```bash
   # 查看详细日志
   docker-compose logs flatnotes
   
   # 检查容器状态
   docker-compose ps
   ```

### 健康检查

应用包含健康检查端点：
- URL: `http://localhost:3001/api/health`
- 检查间隔: 30秒
- 超时时间: 10秒

## 🔄 更新升级

1. **停止当前服务**
   ```bash
   docker-compose down
   ```

2. **拉取最新代码**
   ```bash
   git pull origin main
   ```

3. **重新构建并启动**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

## 🛡️ 安全建议

1. **数据备份**: 定期备份 `data` 目录
2. **权限控制**: 确保数据目录权限正确设置
3. **网络安全**: 在生产环境中使用反向代理（如 Nginx）
4. **SSL证书**: 配置 HTTPS 访问

## 📊 监控

### 资源使用
```bash
# 查看容器资源使用情况
docker stats flatnotes-app

# 查看磁盘使用
docker system df
```

### 日志管理
```bash
# 查看实时日志
docker-compose logs -f --tail=100

# 清理日志
docker-compose down
docker system prune -f
```

## 🤝 支持

如果遇到问题，请：
1. 查看日志文件
2. 检查数据目录权限
3. 确认端口是否被占用
4. 提交 Issue 并附上错误日志