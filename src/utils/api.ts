import { Note, Category } from '../types';

const API_BASE_URL = '/api';

// API请求封装
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 获取认证token
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  // 如果有token且不是登录接口，则添加Authorization头
  if (token && !endpoint.includes('/auth/login')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    headers,
    ...options,
  });

  // 如果是401错误（未认证），清除本地token
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    // 如果不是登录接口，重新加载页面到登录页
    if (!endpoint.includes('/auth/login')) {
      window.location.reload();
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 笔记相关API
export const notesAPI = {
  // 获取所有笔记
  async getAll(): Promise<Note[]> {
    return apiRequest<Note[]>('/notes');
  },

  // 保存所有笔记
  async saveAll(notes: Note[]): Promise<void> {
    await apiRequest('/notes', {
      method: 'POST',
      body: JSON.stringify(notes),
    });
  },

  // 更新笔记排序
  async updateOrder(noteId: string, newOrder: number): Promise<void> {
    await apiRequest(`/notes/${noteId}/order`, {
      method: 'PUT',
      body: JSON.stringify({ order: newOrder }),
    });
  },

  // 更新笔记分类
  async updateCategory(noteId: string, categoryId: string): Promise<void> {
    await apiRequest(`/notes/${noteId}/category`, {
      method: 'PUT',
      body: JSON.stringify({ category: categoryId }),
    });
  },

  // 批量重新排序笔记
  async reorderNotes(noteOrders: { id: string; order: number }[]): Promise<void> {
    await apiRequest('/notes/reorder', {
      method: 'PUT',
      body: JSON.stringify({ noteOrders }),
    });
  },
};

// 分类相关API
export const categoriesAPI = {
  // 获取所有分类
  async getAll(): Promise<Category[]> {
    return apiRequest<Category[]>('/categories');
  },

  // 保存所有分类
  async saveAll(categories: Category[]): Promise<void> {
    await apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(categories),
    });
  },

  // 批量重新排序分类
  async reorderCategories(categoryOrders: { id: string; order: number }[]): Promise<void> {
    await apiRequest('/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ categoryOrders }),
    });
  },
};

// 文件上传API
export const uploadAPI = {
  // 上传文件
  async uploadFile(file: File): Promise<{
    success: boolean;
    filename: string;
    originalName: string;
    url: string;
    size: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`文件上传失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // 删除文件
  async deleteFile(filename: string): Promise<void> {
    await apiRequest(`/upload/${filename}`, {
      method: 'DELETE',
    });
  },

  // 获取文件URL
  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  },
};

// 健康检查
export const healthAPI = {
  async check(): Promise<{ status: string; timestamp: string }> {
    return apiRequest('/health');
  },
};

// 检查服务器是否可用
export async function checkServerAvailability(): Promise<boolean> {
  try {
    await healthAPI.check();
    return true;
  } catch {
    return false;
  }
}