import { Note, Category, AppState } from '../types';
import { notesAPI, categoriesAPI, checkServerAvailability } from './api';

// 文件系统API类型声明
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

interface FileSystemDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

const STORAGE_KEY = 'flatnotes-data';

// 检查是否使用服务端存储
let useServerStorage = false;

// 同步策略配置
const SYNC_CONFIG = {
  AUTO_SYNC_INTERVAL: 30000, // 30秒自动同步一次
  FORCE_SYNC_DELAY: 5000,    // 5秒后强制同步（用户停止编辑后）
  MAX_PENDING_CHANGES: 10,   // 最多积累10个变更后强制同步
  DATA_CHECK_INTERVAL: 300000, // 5分钟检查一次服务器数据更新
};

// 同步状态管理
let syncTimer: NodeJS.Timeout | null = null;
let forceSyncTimer: NodeJS.Timeout | null = null;
let dataCheckTimer: NodeJS.Timeout | null = null;
let pendingChanges = 0;
let lastSyncTime = 0;
let isOnline = navigator.onLine;

// 数据更新回调
type DataUpdateCallback = (data: Partial<AppState>) => void;
let dataUpdateCallback: DataUpdateCallback | null = null;

// 初始化存储模式
export const initializeStorage = async (): Promise<boolean> => {
  try {
    const serverAvailable = await checkServerAvailability();
    useServerStorage = serverAvailable;
  
    
    if (useServerStorage) {
      // 启动定期同步
      startAutoSync();
      
      // 启动数据更新检查
      startDataUpdateCheck();
      
      // 监听网络状态变化
      setupNetworkListeners();
      // 监听页面关闭事件
      setupBeforeUnloadListener();
    }
    
    return serverAvailable;
  } catch (error) {
    console.warn('服务器不可用，使用本地存储:', error);
    useServerStorage = false;
    return false;
  }
};

// 加载数据（支持服务端和本地存储）
export const loadData = async (): Promise<Partial<AppState>> => {
  if (useServerStorage) {
    try {
      const [notes, categories] = await Promise.all([
        notesAPI.getAll(),
        categoriesAPI.getAll()
      ]);
      
      // 转换日期字符串回 Date 对象
      const processedNotes = notes.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      }));
      
      return { notes: processedNotes, categories };
    } catch (error) {
      console.error('从服务器加载数据失败，回退到本地存储:', error);
      useServerStorage = false;
      return loadDataFromLocalStorage();
    }
  } else {
    return loadDataFromLocalStorage();
  }
};

// 保存数据（智能同步策略）
export const saveData = async (data: Partial<AppState>): Promise<void> => {
  // 总是先保存到本地存储（快速响应）
  saveDataToLocalStorage(data);
  
  
  if (useServerStorage && isOnline) {
    // 增加待同步变更计数
    pendingChanges++;
    
    // 清除之前的强制同步定时器
    if (forceSyncTimer) {
      clearTimeout(forceSyncTimer);
    }
    
    // 检查是否需要立即同步
    const shouldSyncNow = 
      pendingChanges >= SYNC_CONFIG.MAX_PENDING_CHANGES || 
      (Date.now() - lastSyncTime) > SYNC_CONFIG.AUTO_SYNC_INTERVAL;
    
    if (shouldSyncNow) {
      await syncToServer();
    } else {
      // 设置延迟同步（用户停止编辑后）
      forceSyncTimer = setTimeout(async () => {
        await syncToServer();
      }, SYNC_CONFIG.FORCE_SYNC_DELAY);
      

    }
  } else if (useServerStorage && !isOnline) {
    
  }
};

// 本地存储相关函数
const loadDataFromLocalStorage = (): Partial<AppState> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // 转换日期字符串回 Date 对象
      if (parsed.notes) {
        parsed.notes = parsed.notes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
        }));
      }
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
  }
  return {};
};

const saveDataToLocalStorage = (data: Partial<AppState>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
};

// 获取当前存储模式
export const getStorageMode = (): 'server' | 'local' => {
  return useServerStorage ? 'server' : 'local';
};

// 手动切换到服务端存储
export const switchToServerStorage = async (): Promise<boolean> => {
  try {
    const serverAvailable = await checkServerAvailability();
    if (serverAvailable) {
      useServerStorage = true;
      
      // 将本地数据同步到服务器
      const localData = loadDataFromLocalStorage();
      if (localData.notes || localData.categories) {
        await saveData(localData);
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('切换到服务端存储失败:', error);
    return false;
  }
};

export const getDefaultCategories = (): Category[] => [
  { id: '1', name: '默认', color: '#2196F3', order: 0 },
  { id: '2', name: '工作', color: '#4CAF50', order: 1 },
  { id: '3', name: '学习', color: '#FF9800', order: 2 },
  { id: '4', name: '个人', color: '#9C27B0', order: 3 },
];

export const createDefaultNote = (categoryId: string, order: number = 0): Note => ({
  id: Date.now().toString(),
  title: '新笔记',
  content: '# 新笔记\n\n开始编写你的笔记...',
  tags: [],
  category: categoryId,
  attachments: [],
  order,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 生成安全的文件名
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_') // 替换非法字符
    .replace(/\s+/g, '_') // 替换空格
    .substring(0, 100); // 限制长度
};

// 格式化日期为文件名友好格式
const formatDateForFileName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
};

// 将附件URL转换为相对路径
const processAttachmentsInContent = (content: string, noteName: string): string => {
  let processedContent = content;
  
  // 处理base64数据的图片引用
  processedContent = processedContent.replace(/!\[([^\]]*)\]\(data:[^)]+\)/g, (_, altText) => {
    const fileName = altText || 'attachment';
    return `![${altText}](./${noteName}_attachments/${fileName})`;
  });
  
  // 处理/uploads/路径的链接引用（包括图片和文件）
  processedContent = processedContent.replace(/(!?)\[([^\]]*)\]\(\/uploads\/([^)]+)\)/g, (_, isImage, linkText, filePath) => {
    // 提取文件名（去掉时间戳前缀，如果有的话）
    const fileName = filePath.includes('-') ? filePath.split('-').slice(1).join('-') : filePath;
    // 如果没有扩展名，尝试从原始文件名推断
    const finalFileName = fileName.includes('.') ? fileName : `${fileName}.md`;
    
    if (isImage === '!') {
      // 图片引用
      return `![${linkText}](./${noteName}_attachments/${finalFileName})`;
    } else {
      // 文件链接引用
      return `[${linkText}](./${noteName}_attachments/${finalFileName})`;
    }
  });
  
  return processedContent;
};

// 检查浏览器是否支持文件系统API
export const isFileSystemAPISupported = (): boolean => {
  return 'showDirectoryPicker' in window;
};

// 导出单个笔记为Markdown文件
export const exportNoteToMarkdown = async (note: Note, categories: Category[]): Promise<void> => {
  if (!isFileSystemAPISupported()) {
    throw new Error('您的浏览器不支持文件系统API，请使用Chrome 86+或Edge 86+');
  }

  try {
    // 让用户选择保存目录
    const directoryHandle = await window.showDirectoryPicker!();
    
    // 生成基础文件名
    const category = categories.find(cat => cat.id === note.category);
    const categoryName = category ? sanitizeFileName(category.name) : '未分类';
    const dateStr = formatDateForFileName(note.createdAt);
    const titleStr = sanitizeFileName(note.title);
    let baseFileName = `${dateStr}_${categoryName}_${titleStr}`;
    
    // 确保文件名唯一（检查目录中是否已存在同名文件）
    let fileName = `${baseFileName}.md`;
    let counter = 1;
    try {
      while (true) {
        await directoryHandle.getFileHandle(fileName);
        // 如果文件存在，尝试下一个序号
        fileName = `${baseFileName}_${counter}.md`;
        counter++;
      }
    } catch {
      // 文件不存在，可以使用这个文件名
    }
    
    // 处理内容中的附件引用
    const processedContent = processAttachmentsInContent(note.content, sanitizeFileName(note.title));
    
    // 生成Markdown内容
    const markdownContent = generateMarkdownContent(note, category, processedContent);
    
    // 创建并写入Markdown文件
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(markdownContent);
    await writable.close();
    
    // 提取内容中的/uploads/文件引用
    const uploadsReferences = extractUploadsReferences(note.content);
    
    // 如果有附件或uploads引用，创建附件文件夹并保存文件
    if (note.attachments.length > 0 || uploadsReferences.length > 0) {
      const attachmentFolderName = `${sanitizeFileName(note.title)}_attachments`;
      const attachmentDirHandle = await directoryHandle.getDirectoryHandle(attachmentFolderName, { create: true });
      
      // 保存笔记对象中的附件
      for (const attachment of note.attachments) {
        await saveAttachment(attachment, attachmentDirHandle);
      }
      
      // 保存内容中引用的/uploads/文件
      for (const ref of uploadsReferences) {
        await saveUploadsFile(ref.originalPath, ref.fileName, attachmentDirHandle);
      }
    }
    
    alert(`笔记 "${note.title}" 已成功导出为 ${fileName}`);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // 用户取消了操作
      return;
    }
    console.error('导出笔记失败:', error);
    throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 导出所有笔记
export const exportAllNotesToMarkdown = async (notes: Note[], categories: Category[]): Promise<void> => {
  if (!isFileSystemAPISupported()) {
    throw new Error('您的浏览器不支持文件系统API，请使用Chrome 86+或Edge 86+');
  }

  try {
    // 让用户选择保存目录
    const directoryHandle = await window.showDirectoryPicker!();
    
    let successCount = 0;
    let errorCount = 0;
    const usedFileNames = new Set<string>(); // 跟踪已使用的文件名
    
    for (const note of notes) {
      try {
        // 生成基础文件名
        const category = categories.find(cat => cat.id === note.category);
        const categoryName = category ? sanitizeFileName(category.name) : '未分类';
        const dateStr = formatDateForFileName(note.createdAt);
        const titleStr = sanitizeFileName(note.title);
        let baseFileName = `${dateStr}_${categoryName}_${titleStr}`;
        
        // 确保文件名唯一
        let fileName = `${baseFileName}.md`;
        let counter = 1;
        while (usedFileNames.has(fileName)) {
          fileName = `${baseFileName}_${counter}.md`;
          counter++;
        }
        usedFileNames.add(fileName);
        
        // 处理内容中的附件引用
        const processedContent = processAttachmentsInContent(note.content, sanitizeFileName(note.title));
        
        // 生成Markdown内容
        const markdownContent = generateMarkdownContent(note, category, processedContent);
        
        // 创建并写入Markdown文件
        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(markdownContent);
        await writable.close();
        
        // 提取内容中的/uploads/文件引用
        const uploadsReferences = extractUploadsReferences(note.content);
        
        // 如果有附件或uploads引用，创建附件文件夹并保存文件
        if (note.attachments.length > 0 || uploadsReferences.length > 0) {
          const attachmentFolderName = `${sanitizeFileName(note.title)}_attachments`;
          const attachmentDirHandle = await directoryHandle.getDirectoryHandle(attachmentFolderName, { create: true });
          
          // 保存笔记对象中的附件
          for (const attachment of note.attachments) {
            await saveAttachment(attachment, attachmentDirHandle);
          }
          
          // 保存内容中引用的/uploads/文件
          for (const ref of uploadsReferences) {
            await saveUploadsFile(ref.originalPath, ref.fileName, attachmentDirHandle);
          }
        }
        
        successCount++;
      } catch (error) {
        console.error(`导出笔记 "${note.title}" 失败:`, error);
        errorCount++;
      }
    }
    
    alert(`导出完成！成功: ${successCount} 个，失败: ${errorCount} 个`);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // 用户取消了操作
      return;
    }
    console.error('批量导出失败:', error);
    throw new Error(`批量导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 生成Markdown内容
const generateMarkdownContent = (note: Note, category: Category | undefined, content: string): string => {
  const lines: string[] = [];
  
  // 确保日期是Date对象
  const createdAt = typeof note.createdAt === 'string' ? new Date(note.createdAt) : note.createdAt;
  const updatedAt = typeof note.updatedAt === 'string' ? new Date(note.updatedAt) : note.updatedAt;
  
  // 添加元数据
  lines.push('---');
  lines.push(`title: "${note.title}"`);
  lines.push(`category: "${category?.name || '未分类'}"`);
  lines.push(`tags: [${note.tags.map(tag => `"${tag}"`).join(', ')}]`);
  lines.push(`created: ${createdAt.toISOString()}`);
  lines.push(`updated: ${updatedAt.toISOString()}`);
  if (note.attachments.length > 0) {
    lines.push(`attachments: ${note.attachments.length}`);
  }
  lines.push('---');
  lines.push('');
  
  // 添加内容
  lines.push(content);
  
  // 如果有附件，添加附件列表
  if (note.attachments.length > 0) {
    lines.push('');
    lines.push('## 附件');
    lines.push('');
    for (const attachment of note.attachments) {
      lines.push(`- [${attachment.name}](./${sanitizeFileName(note.title)}_attachments/${sanitizeFileName(attachment.name)})`);
    }
  }
  
  return lines.join('\n');
};

// 从内容中提取/uploads/路径的文件引用
const extractUploadsReferences = (content: string): Array<{originalPath: string, fileName: string}> => {
  const references: Array<{originalPath: string, fileName: string}> = [];
  const regex = /(!?)\[([^\]]*)\]\(\/uploads\/([^)]+)\)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const filePath = match[3];
    // 提取文件名（去掉时间戳前缀，如果有的话）
    const fileName = filePath.includes('-') ? filePath.split('-').slice(1).join('-') : filePath;
    // 如果没有扩展名，添加.md扩展名
    const finalFileName = fileName.includes('.') ? fileName : `${fileName}.md`;
    
    references.push({
      originalPath: `/uploads/${filePath}`,
      fileName: finalFileName
    });
  }
  
  return references;
};

// 保存附件到文件系统
const saveAttachment = async (attachment: any, directoryHandle: FileSystemDirectoryHandle): Promise<void> => {
  try {
    // 从data URL或blob URL获取文件数据
    let blob: Blob;
    
    if (attachment.url.startsWith('data:')) {
      // 处理base64数据
      const response = await fetch(attachment.url);
      blob = await response.blob();
    } else if (attachment.url.startsWith('blob:')) {
      // 处理blob URL
      const response = await fetch(attachment.url);
      blob = await response.blob();
    } else {
      // 如果是其他类型的URL，尝试获取
      const response = await fetch(attachment.url);
      blob = await response.blob();
    }
    
    const fileName = sanitizeFileName(attachment.name);
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    console.error(`保存附件 "${attachment.name}" 失败:`, error);
    throw error;
  }
};

// 保存/uploads/路径的文件到文件系统
const saveUploadsFile = async (originalPath: string, fileName: string, directoryHandle: FileSystemDirectoryHandle): Promise<void> => {
  try {
    // 构建本地文件路径（相对于项目根目录）
    const localPath = `./data${originalPath}`;
    
    // 尝试获取文件内容
    const response = await fetch(localPath);
    if (!response.ok) {
      console.warn(`无法获取文件: ${localPath}`);
      return;
    }
    
    const blob = await response.blob();
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    console.error(`保存文件 "${fileName}" 失败:`, error);
    // 不抛出错误，继续处理其他文件
  }
};

// 同步到服务器
const syncToServer = async (): Promise<void> => {
  if (!useServerStorage || !isOnline) {
    return;
  }

  try {

    
    // 从本地存储获取最新数据
    const localData = loadDataFromLocalStorage();
    
    const promises: Promise<void>[] = [];
    
    if (localData.notes) {

      promises.push(notesAPI.saveAll(localData.notes));
    }
    
    if (localData.categories) {

      promises.push(categoriesAPI.saveAll(localData.categories));
    }
    
    await Promise.all(promises);
    
    // 重置同步状态
    pendingChanges = 0;
    lastSyncTime = Date.now();
    

  } catch (error) {
    console.error('❌ 同步到服务器失败:', error);
    // 不重置pendingChanges，保持待同步状态
    throw error;
  }
};

// 启动自动同步
const startAutoSync = (): void => {
  // 清除现有定时器
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  
  // 设置定期同步
  syncTimer = setInterval(async () => {
    if (pendingChanges > 0 && isOnline) {
      try {
        await syncToServer();
      } catch (error) {
        console.error('自动同步失败:', error);
      }
    }
  }, SYNC_CONFIG.AUTO_SYNC_INTERVAL);
  
  
};

// 检查服务器数据是否有更新
const checkServerDataUpdates = async (): Promise<void> => {
  if (!useServerStorage || !isOnline || !dataUpdateCallback) {
    return;
  }

  try {
    // 获取服务器最新数据
    const [serverNotes, serverCategories] = await Promise.all([
      notesAPI.getAll(),
      categoriesAPI.getAll()
    ]);

    // 获取本地数据
    const localData = loadDataFromLocalStorage();
    
    // 检查是否有更新
    let hasUpdates = false;
    const updatedData: Partial<AppState> = {};

    // 检查笔记更新
    if (serverNotes && localData.notes) {
      const serverNotesMap = new Map(serverNotes.map((note: any) => [note.id, new Date(note.updatedAt).getTime()]));
      const localNotesMap = new Map(localData.notes.map(note => [note.id, note.updatedAt.getTime()]));
      
      // 检查是否有新笔记或更新的笔记
      for (const [noteId, serverTime] of serverNotesMap) {
        const localTime = localNotesMap.get(noteId);
        if (!localTime || serverTime > localTime) {
          hasUpdates = true;
          break;
        }
      }
      
      // 检查是否有删除的笔记
      if (!hasUpdates) {
        for (const noteId of localNotesMap.keys()) {
          if (!serverNotesMap.has(noteId)) {
            hasUpdates = true;
            break;
          }
        }
      }
      
      if (hasUpdates) {
        updatedData.notes = serverNotes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
        }));
      }
    }

    // 检查分类更新
    if (serverCategories && localData.categories) {
      const serverCategoriesStr = JSON.stringify(serverCategories.sort((a: any, b: any) => a.id.localeCompare(b.id)));
      const localCategoriesStr = JSON.stringify(localData.categories.sort((a, b) => a.id.localeCompare(b.id)));
      
      if (serverCategoriesStr !== localCategoriesStr) {
        hasUpdates = true;
        updatedData.categories = serverCategories;
      }
    }

    if (hasUpdates) {

      
      // 更新本地存储
      saveDataToLocalStorage(updatedData);
      
      // 通知应用更新UI
      dataUpdateCallback(updatedData);
      
      
    }
  } catch (error) {
    console.error('检查服务器数据更新失败:', error);
  }
};

// 启动数据更新检查
const startDataUpdateCheck = (): void => {
  // 清除现有定时器
  if (dataCheckTimer) {
    clearInterval(dataCheckTimer);
  }
  
  // 设置定期检查
  dataCheckTimer = setInterval(async () => {
    await checkServerDataUpdates();
  }, SYNC_CONFIG.DATA_CHECK_INTERVAL);
  
  
};

// 设置数据更新回调
export const setDataUpdateCallback = (callback: DataUpdateCallback): void => {
  dataUpdateCallback = callback;
};

// 手动检查数据更新
export const checkForDataUpdates = async (): Promise<void> => {
  await checkServerDataUpdates();
};

// 设置网络状态监听器
const setupNetworkListeners = (): void => {
  window.addEventListener('online', () => {

    isOnline = true;
    
    // 网络恢复后立即同步
    if (pendingChanges > 0) {
      setTimeout(async () => {
        try {
          await syncToServer();
        } catch (error) {
          console.error('网络恢复后同步失败:', error);
        }
      }, 1000); // 延迟1秒确保网络稳定
    }
  });
  
  window.addEventListener('offline', () => {

    isOnline = false;
  });
};

// 设置页面关闭前的同步
const setupBeforeUnloadListener = (): void => {
  window.addEventListener('beforeunload', (event) => {
    if (pendingChanges > 0 && isOnline) {
      // 尝试同步（但由于页面即将关闭，可能无法完成）
      syncToServer().catch(error => {
        console.error('页面关闭前同步失败:', error);
      });
      
      // 提示用户有未同步的数据
      event.preventDefault();
      event.returnValue = '您有未同步的数据，确定要离开吗？';
      return '您有未同步的数据，确定要离开吗？';
    }
  });
};

// 手动强制同步
export const forceSyncToServer = async (): Promise<void> => {
  if (!useServerStorage) {
    throw new Error('当前未启用服务端存储');
  }
  
  if (!isOnline) {
    throw new Error('网络未连接，无法同步');
  }
  
  await syncToServer();
};

// 获取同步状态
export const getSyncStatus = () => {
  return {
    useServerStorage,
    isOnline,
    pendingChanges,
    lastSyncTime: lastSyncTime ? new Date(lastSyncTime) : null,
  };
};