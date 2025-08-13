# FlatNotes - Markdown 笔记工具

一个现代化的 Markdown 笔记应用，支持丰富的功能和优雅的用户界面。

## 功能特性

### 📝 Markdown 支持
- 完整的 Markdown 语法支持
- 实时预览模式
- 语法高亮
- 表格、列表、引用等丰富格式

### 🧮 数学公式
- 支持 LaTeX 数学公式
- 行内公式：`$E = mc^2$`
- 块级公式：
  ```
  $$
  \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
  $$
  ```

### 📎 附件管理
- 支持多种文件类型上传
- 图片直接显示在预览中
- 文件下载功能
- 拖拽插入到内容中

### 🏷️ 标签系统
- 为笔记添加多个标签
- 标签过滤功能
- 快速标签管理

### 📁 分类管理
- 自定义分类
- 颜色标识
- 拖拽重新排序
- 分类统计

### 🔍 搜索功能
- 全文搜索
- 标题和内容搜索
- 实时搜索结果

### 💾 数据持久化
- 本地存储
- 自动保存
- 数据导入导出

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **Markdown 渲染**: react-markdown
- **数学公式**: KaTeX
- **拖拽功能**: react-beautiful-dnd
- **图标**: Lucide React
- **样式**: CSS-in-JS

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## Docker 部署

### 使用 Docker Compose（推荐）

#### 生产环境部署
```bash
# 使用生产配置
docker-compose -f docker-compose.prod.yml up -d

# 或者设置自定义密码
AUTH_PASSWORD=your_secure_password docker-compose -f docker-compose.prod.yml up -d
```

#### 开发环境
```bash
# 启动开发环境
docker-compose --profile dev up
```

### 环境变量配置

应用支持以下环境变量：

- `AUTH_PASSWORD`: 访问密码（默认：flatnotes123）
- `JWT_SECRET`: JWT 密钥（可选，自动生成）
- `PORT`: 服务器端口（默认：3001）
- `NODE_ENV`: 运行环境（development/production）

#### 配置自定义密码

1. **通过环境变量**：
   ```bash
   export AUTH_PASSWORD=your_secure_password
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **通过 .env 文件**：
   ```bash
   # 复制示例配置文件
   cp .env.example .env
   
   # 编辑 .env 文件，设置你的密码
   # AUTH_PASSWORD=your_secure_password
   
   # 启动服务
   docker-compose -f docker-compose.prod.yml up -d
   ```

### 数据持久化

Docker 部署会自动将数据目录挂载到宿主机的 `./data` 目录，确保数据持久化。

### 访问应用

部署完成后，访问 `http://localhost:3001` 即可使用应用。

## 使用指南

### 创建笔记
1. 点击左侧边栏的"新笔记"按钮
2. 输入笔记标题
3. 在编辑器中编写 Markdown 内容
4. 笔记会自动保存

### 管理分类
1. 点击分类旁的"+"按钮
2. 输入分类名称并选择颜色
3. 拖拽分类可以重新排序
4. 点击分类可以过滤笔记

### 添加标签
1. 在编辑器顶部的标签区域点击"添加标签"
2. 输入标签名称并按回车
3. 点击标签旁的 X 可以删除标签
4. 在侧边栏点击标签可以过滤笔记

### 上传附件
1. 点击编辑器顶部的"上传附件"按钮
2. 选择要上传的文件
3. 点击附件的插入按钮可以插入到内容中
4. 支持图片预览和文件下载

### 数学公式
- 行内公式使用单个 `$` 包围：`$E = mc^2$`
- 块级公式使用双 `$$` 包围：
  ```
  $$
  \sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n
  $$
  ```

## 键盘快捷键

- `Ctrl/Cmd + N`: 新建笔记
- `Ctrl/Cmd + S`: 保存笔记（自动保存）
- `Ctrl/Cmd + P`: 切换预览模式
- `Ctrl/Cmd + F`: 搜索笔记

## 数据存储

应用使用浏览器的 localStorage 来存储数据，包括：
- 笔记内容
- 分类设置
- 标签信息
- 附件数据（Base64 编码）

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 开发

### 项目结构
```
src/
├── components/          # React 组件
│   ├── Sidebar.tsx     # 侧边栏组件
│   └── Editor.tsx      # 编辑器组件
├── types.ts            # TypeScript 类型定义
├── utils/              # 工具函数
│   └── storage.ts      # 数据存储
├── App.tsx             # 主应用组件
├── main.tsx            # 应用入口
└── index.css           # 全局样式
```

### 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始版本发布
- 基础 Markdown 编辑功能
- 分类和标签管理
- 附件上传支持
- 数学公式渲染