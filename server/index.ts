import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

// 加载.env文件
dotenv.config();

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: { authenticated: boolean; timestamp: number };
    }
  }
}

// 类型定义
interface NoteMeta {
  id: string;
  title: string;
  tags: string[];
  category: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  order: number;
}

interface Note extends NoteMeta {
  content: string;
}

interface NoteOrder {
  id: string;
  order: number;
}

interface Category {
  id: string;
  name: string;
  order: number;
}

interface CategoryOrder {
  id: string;
  order: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 认证配置
// 认证密码必须通过环境变量设置，确保安全性
if (!process.env.AUTH_PASSWORD) {
  console.error('错误: AUTH_PASSWORD 环境变量未设置。请在 .env 文件中设置一个强密码。');
  process.exit(1);
}
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

// JWT密钥必须通过环境变量设置，确保服务重启后token仍然有效
if (!process.env.JWT_SECRET) {
  console.error('错误: JWT_SECRET 环境变量未设置。请在 .env 文件中设置一个强密钥。');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_DURATION = '7d'; // JWT token有效期

// 中间件
// CORS 安全配置
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // 开发环境允许所有来源（可通过环境变量控制）
    if (process.env.CORS_ALLOW_ALL === 'true') {
      return callback(null, true);
    }
    
    // 允许的域名列表（生产环境应该配置具体域名）
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
      // 生产环境请添加实际域名，例如：
      // 'https://yourdomain.com',
      // 'https://www.yourdomain.com'
    ];
    
    // 开发环境允许无 origin 的请求（如 Postman）
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS 阻止的请求来源:', origin);
      callback(new Error('不允许的 CORS 来源'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24小时
};

// 安全响应头配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // 允许文件上传
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 认证中间件
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要认证' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token无效' });
    }
    req.user = user;
    next();
  });
}

// 检查是否需要认证的中间件
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // 不需要认证的接口列表
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/verify', 
    '/api/auth/config',
    '/api/health'
  ];
  
  // 检查是否为公开接口
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  // API接口需要认证
  if (req.path.startsWith('/api/')) {
    return authenticateToken(req, res, next);
  }
  
  next();
}

// 数据存储目录
const DATA_DIR = path.join(__dirname, '../data');
const NOTES_META_FILE = path.join(DATA_DIR, 'notes-meta.json'); // 只存储元数据
const NOTES_CONTENT_DIR = path.join(DATA_DIR, 'notes'); // 笔记内容目录
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// 兼容性：旧的notes.json文件路径
const OLD_NOTES_FILE = path.join(DATA_DIR, 'notes.json');

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }

  try {
    await fs.access(NOTES_CONTENT_DIR);
  } catch {
    await fs.mkdir(NOTES_CONTENT_DIR, { recursive: true });
  }
}

// 数据迁移：从旧格式迁移到新格式
async function migrateOldData() {
  try {
    // 检查是否存在旧的notes.json文件
    await fs.access(OLD_NOTES_FILE);
    
    console.log('🔄 检测到旧数据格式，开始迁移...');
    
    const oldData = await fs.readFile(OLD_NOTES_FILE, 'utf-8');
    const oldNotes = JSON.parse(oldData);
    
    const notesMeta: NoteMeta[] = [];
    
    // 迁移每个笔记
    for (const note of oldNotes) {
      // 保存笔记内容到单独文件
      const contentFile = path.join(NOTES_CONTENT_DIR, `${note.id}.md`);
      await fs.writeFile(contentFile, note.content || '');
      
      // 创建元数据记录
      const meta = {
        id: note.id,
        title: note.title,
        tags: note.tags || [],
        category: note.category || 'uncategorized',
        attachments: note.attachments || [],
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        order: note.order || 0
      };
      
      notesMeta.push(meta);
    }
    
    // 保存元数据文件
    await fs.writeFile(NOTES_META_FILE, JSON.stringify(notesMeta, null, 2));
    
    // 备份旧文件
    const backupFile = path.join(DATA_DIR, `notes-backup-${Date.now()}.json`);
    await fs.rename(OLD_NOTES_FILE, backupFile);
    
    console.log(`✅ 数据迁移完成！迁移了 ${oldNotes.length} 条笔记`);
    console.log(`📦 旧数据已备份到: ${backupFile}`);
    
  } catch (error) {
    // 旧文件不存在，这是正常的
    if (error.code !== 'ENOENT') {
      console.error('数据迁移失败:', error);
    }
  }
}

// 读取笔记元数据
async function readNotesMeta(): Promise<NoteMeta[]> {
  try {
    const data = await fs.readFile(NOTES_META_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 保存笔记元数据
async function saveNotesMeta(notesMeta: NoteMeta[]) {
  await fs.writeFile(NOTES_META_FILE, JSON.stringify(notesMeta, null, 2));
}

// 读取笔记内容
async function readNoteContent(noteId: string): Promise<string> {
  try {
    const contentFile = path.join(NOTES_CONTENT_DIR, `${noteId}.md`);
    return await fs.readFile(contentFile, 'utf-8');
  } catch {
    return '';
  }
}

// 保存笔记内容
async function saveNoteContent(noteId: string, content: string): Promise<void> {
  const contentFile = path.join(NOTES_CONTENT_DIR, `${noteId}.md`);
  await fs.writeFile(contentFile, content || '');
}

// 删除笔记内容文件
async function deleteNoteContent(noteId: string): Promise<void> {
  try {
    const contentFile = path.join(NOTES_CONTENT_DIR, `${noteId}.md`);
    await fs.unlink(contentFile);
  } catch {
    // 文件不存在，忽略错误
  }
}

// 允许的文件类型白名单
const ALLOWED_FILE_TYPES = [
  // 图片类型
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  // 文档类型
  'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
  // Word文档
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel文档
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint文档
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 其他常见文件类型
  'application/octet-stream', // 通用二进制文件类型（如LICENSE等无扩展名文件）
  'application/json', 'application/xml', 'text/xml', 'text/html', 'text/css', 'text/javascript',
  // 压缩文件
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
];

// 允许的文件扩展名
const ALLOWED_EXTENSIONS = [
  // 图片扩展名
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff',
  // 文档扩展名
  '.pdf', '.txt', '.md', '.csv',
  // Office文档扩展名
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // 其他常见扩展名
  '.json', '.xml', '.html', '.css', '.js',
  // 压缩文件扩展名
  '.zip', '.rar', '.7z',
  // 无扩展名文件（如LICENSE, README等）
  ''
];

// 文件名安全检查
function sanitizeFilename(filename: string): string {
  // 移除路径遍历字符和特殊字符
  return filename
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.\.+/g, '_')
    .replace(/^\.|\.$/, '_')
    .substring(0, 100); // 限制文件名长度
}

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const sanitizedName = sanitizeFilename(originalName);
    const uniqueSuffix = Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitizedName);
    const nameWithoutExt = path.basename(sanitizedName, ext);
    cb(null, `${timestamp}_${uniqueSuffix}_${nameWithoutExt}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
    files: 1 // 一次只能上传一个文件
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
    
    // 检查文件扩展名
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`不支持的文件扩展名: ${ext}`));
    }
    
    // 检查文件名长度
    if (file.originalname.length > 255) {
      return cb(new Error('文件名过长'));
    }
    
    cb(null, true);
  }
});

// 静态文件服务
app.use('/uploads', express.static(UPLOADS_DIR));

// 登录接口（无需认证）
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  
  if (!password || password !== AUTH_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  
  const token = jwt.sign(
    { authenticated: true, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: SESSION_DURATION }
  );
  
  res.json({ token, message: '登录成功' });
});

// 获取认证配置信息（无需认证）
app.get('/api/auth/config', (req, res) => {
  // 现在所有密码都必须通过环境变量设置，不再有默认密码
  res.json({ isUsingDefaultPassword: false });
});

// 验证token接口
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// 应用认证中间件
app.use(requireAuth);

// 生产环境下提供前端静态文件服务
if (process.env.NODE_ENV === 'production') {
  const DIST_DIR = path.join(__dirname, '../dist');
  app.use(express.static(DIST_DIR));
  
  // 所有非API路由都返回index.html（用于SPA路由）
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// API路由

// 获取所有笔记（包含内容）
app.get('/api/notes', async (req, res) => {
  try {
    const notesMeta = await readNotesMeta();
    
    // 并行读取所有笔记内容
    const notes = await Promise.all(
      notesMeta.map(async (meta) => {
        const content = await readNoteContent(meta.id);
        return {
          ...meta,
          content
        };
      })
    );
    
    console.log(`📖 从服务器加载 ${notes.length} 条笔记`);
    res.json(notes);
  } catch (error) {
    console.error('读取笔记失败:', error);
    res.status(500).json({ error: '读取笔记失败' });
  }
});

// 获取单个笔记
app.get('/api/notes/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const notesMeta = await readNotesMeta();
    const meta = notesMeta.find(note => note.id === noteId);
    
    if (!meta) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    
    const content = await readNoteContent(noteId);
    const note = { ...meta, content };
    
    res.json(note);
  } catch (error) {
    console.error('读取笔记失败:', error);
    res.status(500).json({ error: '读取笔记失败' });
  }
});

// 保存所有笔记
app.post('/api/notes', async (req, res) => {
  try {
    const notes = req.body;
    console.log(`📝 保存 ${notes.length} 条笔记到服务器`);
    
    const notesMeta: NoteMeta[] = [];
    
    // 分离保存元数据和内容
    for (const note of notes) {
      // 保存内容到单独文件
      await saveNoteContent(note.id, note.content);
      
      // 收集元数据
      const meta = {
        id: note.id,
        title: note.title,
        tags: note.tags || [],
        category: note.category || 'uncategorized',
        attachments: note.attachments || [],
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        order: note.order || 0
      };
      
      notesMeta.push(meta);
    }
    
    // 保存元数据
    await saveNotesMeta(notesMeta);
    
    res.json({ success: true });
  } catch (error) {
    console.error('保存笔记失败:', error);
    res.status(500).json({ error: '保存笔记失败' });
  }
});

// 创建或更新单个笔记
app.put('/api/notes/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const noteData = req.body;
    
    // 读取现有元数据
    const notesMeta = await readNotesMeta();
    const existingIndex = notesMeta.findIndex(note => note.id === noteId);
    
    // 保存内容
    await saveNoteContent(noteId, noteData.content);
    
    // 更新或添加元数据
    const meta = {
      id: noteId,
      title: noteData.title,
      tags: noteData.tags || [],
      category: noteData.category || 'uncategorized',
      attachments: noteData.attachments || [],
      createdAt: noteData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: noteData.order || 0
    };
    
    if (existingIndex >= 0) {
      notesMeta[existingIndex] = meta;
    } else {
      notesMeta.push(meta);
    }
    
    await saveNotesMeta(notesMeta);
    
    console.log(`📝 ${existingIndex >= 0 ? '更新' : '创建'} 笔记 ${noteId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('保存笔记失败:', error);
    res.status(500).json({ error: '保存笔记失败' });
  }
});

// 删除笔记
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    
    // 删除内容文件
    await deleteNoteContent(noteId);
    
    // 从元数据中移除
    const notesMeta = await readNotesMeta();
    const filteredMeta = notesMeta.filter(note => note.id !== noteId);
    await saveNotesMeta(filteredMeta);
    
    console.log(`🗑️ 删除笔记 ${noteId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('删除笔记失败:', error);
    res.status(500).json({ error: '删除笔记失败' });
  }
});

// 更新笔记排序
app.put('/api/notes/:id/order', async (req, res) => {
  try {
    const noteId = req.params.id;
    const { order } = req.body;
    
    const notesMeta = await readNotesMeta();
    const noteIndex = notesMeta.findIndex(note => note.id === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    
    notesMeta[noteIndex].order = order;
    notesMeta[noteIndex].updatedAt = new Date().toISOString();
    
    await saveNotesMeta(notesMeta);
    console.log(`📝 更新笔记 ${noteId} 的排序为 ${order}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新笔记排序失败:', error);
    res.status(500).json({ error: '更新笔记排序失败' });
  }
});

// 更新笔记分类
app.put('/api/notes/:id/category', async (req, res) => {
  try {
    const noteId = req.params.id;
    const { category } = req.body;
    
    const notesMeta = await readNotesMeta();
    const noteIndex = notesMeta.findIndex(note => note.id === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: '笔记不存在' });
    }
    
    notesMeta[noteIndex].category = category;
    notesMeta[noteIndex].updatedAt = new Date().toISOString();
    
    await saveNotesMeta(notesMeta);
    console.log(`📝 更新笔记 ${noteId} 的分类为 ${category}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新笔记分类失败:', error);
    res.status(500).json({ error: '更新笔记分类失败' });
  }
});

// 批量重新排序笔记
app.put('/api/notes/reorder', async (req, res) => {
  try {
    const { noteOrders } = req.body;
    
    const notesMeta = await readNotesMeta();
    
    // 更新笔记排序
    noteOrders.forEach(({ id, order }: NoteOrder) => {
      const noteIndex = notesMeta.findIndex(note => note.id === id);
      if (noteIndex !== -1) {
        notesMeta[noteIndex].order = order;
        notesMeta[noteIndex].updatedAt = new Date().toISOString();
      }
    });
    
    await saveNotesMeta(notesMeta);
    console.log(`📝 批量更新 ${noteOrders.length} 条笔记的排序`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('批量更新笔记排序失败:', error);
    res.status(500).json({ error: '批量更新笔记排序失败' });
  }
});

// 获取所有分类
app.get('/api/categories', async (req, res) => {
  try {
    const data = await fs.readFile(CATEGORIES_FILE, 'utf-8');
    const categories = JSON.parse(data);
    res.json(categories);
  } catch (error) {
    // 如果文件不存在，返回默认分类
    const defaultCategories = [
      { id: 'all', name: '全部', color: '#6b7280' },
      { id: 'uncategorized', name: '未分类', color: '#9ca3af' }
    ];
    res.json(defaultCategories);
  }
});

// 保存所有分类
app.post('/api/categories', async (req, res) => {
  try {
    const categories = req.body;
    console.log(`📂 保存 ${categories.length} 个分类到服务器`);
    await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('保存分类失败:', error);
    res.status(500).json({ error: '保存分类失败' });
  }
});

// 批量重新排序分类
app.put('/api/categories/reorder', async (req, res) => {
  try {
    const { categoryOrders } = req.body;
    
    // 读取现有分类
    let categories: Category[] = [];
    try {
      const data = await fs.readFile(CATEGORIES_FILE, 'utf-8');
      categories = JSON.parse(data);
    } catch {
      return res.status(404).json({ error: '分类文件不存在' });
    }

    // 更新分类排序
    categoryOrders.forEach(({ id, order }: CategoryOrder) => {
      const categoryIndex = categories.findIndex((category: Category) => category.id === id);
      if (categoryIndex !== -1) {
        categories[categoryIndex].order = order;
      }
    });
    
    // 保存更新后的分类
    await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
    console.log(`📂 批量更新 ${categoryOrders.length} 个分类的排序`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('批量更新分类排序失败:', error);
    res.status(500).json({ error: '批量更新分类排序失败' });
  }
});

// 文件上传
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('文件上传错误:', err.message);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件大小超过限制（最大10MB）' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: '一次只能上传一个文件' });
        }
      }
      return res.status(400).json({ error: err.message || '文件上传失败' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: '没有文件上传' });
      }

      // 额外的安全检查：验证文件确实存在于预期位置
      const filePath = path.join(UPLOADS_DIR, req.file.filename);
      if (!filePath.startsWith(UPLOADS_DIR)) {
        console.error('安全警告：检测到路径遍历尝试');
        return res.status(400).json({ error: '无效的文件路径' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        success: true,
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('文件上传处理失败:', error);
      res.status(500).json({ error: '文件上传处理失败' });
    }
  });
});

// 删除文件
app.delete('/api/upload/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 安全检查：验证文件名格式
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: '无效的文件名' });
    }
    
    // 防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error('安全警告：检测到路径遍历尝试:', filename);
      return res.status(400).json({ error: '无效的文件名格式' });
    }
    
    // 使用 path.basename 确保只获取文件名部分
    const safeFilename = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    
    // 验证文件路径确实在上传目录内
    if (!filePath.startsWith(UPLOADS_DIR)) {
      console.error('安全警告：文件路径超出允许范围:', filePath);
      return res.status(400).json({ error: '无效的文件路径' });
    }
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    await fs.unlink(filePath);
    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ error: '删除文件失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
async function startServer() {
  await ensureDataDir();
  await migrateOldData(); // 自动迁移旧数据
  
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📁 数据目录: ${DATA_DIR}`);
    console.log(`📄 元数据文件: ${NOTES_META_FILE}`);
    console.log(`📂 内容目录: ${NOTES_CONTENT_DIR}`);
  });
}

startServer().catch(console.error);