# 使用官方 Node.js 18 镜像作为基础镜像
# 如果遇到网络问题，可以尝试使用国内镜像源
FROM node:18-alpine AS base
# 备用镜像源（如果上面失败）：
# FROM registry.cn-hangzhou.aliyuncs.com/library/node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 开发阶段
FROM base AS development
# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 开发模式启动命令
CMD ["npm", "run", "dev"]

# 构建阶段
FROM base AS build
# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制构建所需的配置文件
COPY tsconfig*.json vite.config.ts ./

# 复制源代码
COPY src ./src
COPY index.html ./
COPY public ./public

# 构建前端应用
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

# 安装 tsx 用于运行 TypeScript 服务器
RUN npm install -g tsx

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制构建后的前端文件
COPY --from=build /app/dist ./dist

# 复制服务器源码
COPY server ./server

# 创建数据目录
RUN mkdir -p /app/data

# 设置权限
RUN chown -R node:node /app
USER node

# 暴露端口
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001
# 注意：AUTH_PASSWORD 和 JWT_SECRET 必须在运行时通过环境变量设置
# 例如：docker run -e AUTH_PASSWORD=your_strong_password -e JWT_SECRET=your_jwt_secret ...

# 生产模式启动命令
CMD ["tsx", "server/index.ts"]