import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Settings } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import SyncStatus from './components/SyncStatus';
import SettingsModal from './components/Settings';
import Login from './components/Login';
import Logo from './components/Logo';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import { Note, Category, AppState, ViewMode } from './types';
import { loadData, saveData, getDefaultCategories, createDefaultNote, initializeStorage, getStorageMode, setDataUpdateCallback } from './utils/storage';
import { notesAPI, categoriesAPI } from './utils/api';

const AppContent: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [state, setState] = useState<AppState>({
    notes: [],
    categories: [],
    selectedNoteId: null,
    selectedCategory: null,
    searchQuery: '',
    selectedTags: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<'server' | 'local'>('local');
  const [viewMode, setViewMode] = useState<ViewMode>('three-column');
  const [showSettings, setShowSettings] = useState(false);

  // 初始化存储并加载数据
  useEffect(() => {
    // 只有在认证成功后才初始化应用
    if (!isAuthenticated || authLoading) {
      return;
    }
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        
        // 初始化存储模式
        console.log('🔧 开始初始化存储模式...');
        const serverAvailable = await initializeStorage();
        console.log('🔧 存储模式初始化完成:', { serverAvailable, storageMode: getStorageMode() });
        setStorageMode(getStorageMode());
        
        // 设置数据更新回调
        setDataUpdateCallback((updatedData) => {
          console.log('📥 收到服务器数据更新通知');
          setState(prev => ({
            ...prev,
            ...updatedData,
          }));
        });
        
        // 加载数据
        const savedData = await loadData();
        
        // 加载UI状态
        let uiState = { selectedNoteId: null, selectedCategory: null };
        try {
          const savedUiState = localStorage.getItem('flatnotes-ui-state');
          if (savedUiState) {
            uiState = JSON.parse(savedUiState);
          }
        } catch (error) {
          console.error('加载UI状态失败:', error);
        }
        
        setState(prev => ({
          ...prev,
          ...savedData,
          categories: savedData.categories || getDefaultCategories(),
          selectedNoteId: uiState.selectedNoteId,
          selectedCategory: uiState.selectedCategory,
        }));
      } catch (error) {
        console.error('初始化应用失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [isAuthenticated, authLoading]);

  // 保存数据（防抖）- 只在内容真正变化时保存
  useEffect(() => {
    if (isLoading) return; // 初始加载时不保存
    
    const timeoutId = setTimeout(async () => {
      try {
        await saveData({
          notes: state.notes,
          categories: state.categories,
          selectedNoteId: state.selectedNoteId,
          selectedCategory: state.selectedCategory,
        });
      } catch (error) {
        console.error('保存数据失败:', error);
        // 可以在这里添加用户提示
      }
    }, 500); // 500ms防抖

    return () => clearTimeout(timeoutId);
  }, [state.notes, state.categories, isLoading]); // 移除selectedNoteId和selectedCategory，它们的变化不需要同步到服务端

  // 单独保存UI状态到本地存储（不触发服务端同步）
  useEffect(() => {
    if (isLoading) return;
    
    // 只保存到本地存储，不触发服务端同步
    const uiState = {
      selectedNoteId: state.selectedNoteId,
      selectedCategory: state.selectedCategory,
    };
    
    try {
      localStorage.setItem('flatnotes-ui-state', JSON.stringify(uiState));
    } catch (error) {
      console.error('保存UI状态失败:', error);
    }
  }, [state.selectedNoteId, state.selectedCategory, isLoading]);



  const handleCreateNote = () => {
    const categoryId = state.selectedCategory || state.categories[0]?.id || '1';
    const maxOrder = Math.max(...state.notes.map(note => note.order || 0), -1);
    const newNote = createDefaultNote(categoryId, maxOrder + 1);
    setState(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes],
      selectedNoteId: newNote.id,
    }));
  };

  const handleSelectNote = useCallback((noteId: string) => {
    setState(prev => ({ ...prev, selectedNoteId: noteId }));
  }, []);

  const handleUpdateNote = (noteId: string, updates: Partial<Note>) => {
    setState(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? { ...note, ...updates, updatedAt: new Date() }
          : note
      ),
    }));
  };

  const handleDeleteNote = useCallback((noteId: string) => {
    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(note => note.id !== noteId),
      selectedNoteId: prev.selectedNoteId === noteId ? null : prev.selectedNoteId,
    }));
  }, []);

  const handleSelectCategory = (categoryId: string | null) => {
    setState(prev => ({ ...prev, selectedCategory: categoryId }));
  };

  const handleCreateCategory = (name: string, color: string) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name,
      color,
      order: state.categories.length,
    };
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
  };

  const handleUpdateCategory = (categoryId: string, updates: Partial<Category>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      ),
    }));
  };

  const handleDeleteCategory = (categoryId: string) => {
    // 将该分类下的笔记移动到默认分类
    const defaultCategoryId = state.categories[0]?.id || '1';
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId),
      notes: prev.notes.map(note =>
        note.category === categoryId
          ? { ...note, category: defaultCategoryId }
          : note
      ),
      selectedCategory: prev.selectedCategory === categoryId ? null : prev.selectedCategory,
    }));
  };

  // 防抖搜索优化
  const [searchInput, setSearchInput] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (query: string) => {
    setSearchInput(query);
    
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 设置新的防抖定时器
    searchTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, searchQuery: query }));
    }, 300); // 300ms防抖延迟
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);



  const handleTagFilter = (tags: string[]) => {
    setState(prev => ({ ...prev, selectedTags: tags }));
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    console.log('拖拽结束:', { activeId, overId, storageMode });
    console.log('当前存储模式检查:', { 
      storageMode, 
      isServerMode: storageMode === 'server',
      getStorageModeResult: getStorageMode()
    });

    // 处理分类拖拽重排序
    if (activeId.startsWith('category-') && overId.startsWith('category-')) {
      const activeIndex = state.categories.findIndex(cat => `category-${cat.id}` === activeId);
      const overIndex = state.categories.findIndex(cat => `category-${cat.id}` === overId);

      if (activeIndex !== overIndex) {
        const newCategories = Array.from(state.categories);
        const [reorderedCategory] = newCategories.splice(activeIndex, 1);
        newCategories.splice(overIndex, 0, reorderedCategory);

        // 更新顺序
        const updatedCategories = newCategories.map((cat, index) => ({
          ...cat,
          order: index,
        }));

        // 更新本地状态
        setState(prev => ({ ...prev, categories: updatedCategories }));

        // 如果是服务端模式，调用API更新排序
        if (storageMode === 'server') {
          try {
            const categoryOrders = updatedCategories.map((cat, index) => ({
              id: cat.id,
              order: index
            }));
            await categoriesAPI.reorderCategories(categoryOrders);
            console.log('分类排序已同步到服务端');
          } catch (error) {
            console.error('同步分类排序到服务端失败:', error);
          }
        }
      }
    }
    // 处理笔记拖拽到分类
    else if (!activeId.startsWith('category-') && overId.startsWith('category-')) {
      const noteId = activeId; // 直接使用activeId作为noteId
      const targetCategoryId = overId.replace('category-', '');
      
      const currentNote = state.notes.find(note => note.id === noteId);
      if (currentNote && currentNote.category !== targetCategoryId) {
        // 更新本地状态
        setState(prev => ({
          ...prev,
          notes: prev.notes.map(note =>
            note.id === noteId
              ? { ...note, category: targetCategoryId, updatedAt: new Date() }
              : note
          ),
        }));

        // 如果是服务端模式，调用API更新分类
        if (storageMode === 'server') {
          try {
            console.log(`准备调用API更新笔记分类:`, { noteId, targetCategoryId });
            await notesAPI.updateCategory(noteId, targetCategoryId);
            console.log(`笔记 ${noteId} 已移动到分类 ${targetCategoryId}`);
          } catch (error) {
            console.error('同步笔记分类到服务端失败:', error);
            // 回滚本地状态
            setState(prev => ({
              ...prev,
              notes: prev.notes.map(note =>
                note.id === noteId
                  ? { ...note, category: currentNote.category }
                  : note
              ),
            }));
          }
        }
      }
    }
    // 处理笔记拖拽重排序
    else if (!activeId.startsWith('category-') && !overId.startsWith('category-')) {
      const activeNoteId = activeId; // 直接使用activeId作为noteId
      const overNoteId = overId; // 直接使用overId作为noteId
      
      console.log('笔记重排序:', { activeNoteId, overNoteId });
      
      const activeIndex = state.notes.findIndex(note => note.id === activeNoteId);
      const overIndex = state.notes.findIndex(note => note.id === overNoteId);
      
      console.log('笔记索引:', { activeIndex, overIndex });
      
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const newNotes = Array.from(state.notes);
        const [reorderedNote] = newNotes.splice(activeIndex, 1);
        newNotes.splice(overIndex, 0, reorderedNote);
        
        // 更新排序字段
        const updatedNotes = newNotes.map((note, index) => ({
          ...note,
          order: index,
          updatedAt: new Date()
        }));

        console.log('准备更新笔记排序，存储模式:', storageMode);

        // 更新本地状态
        setState(prev => ({ ...prev, notes: updatedNotes }));

        // 如果是服务端模式，调用API更新排序
        if (storageMode === 'server') {
          console.log('调用服务端API更新笔记排序');
          try {
            const noteOrders = updatedNotes.map((note, index) => ({
              id: note.id,
              order: index
            }));
            console.log('发送排序数据:', noteOrders);
            await notesAPI.reorderNotes(noteOrders);
            console.log('笔记排序已同步到服务端');
          } catch (error) {
            console.error('同步笔记排序到服务端失败:', error);
          }
        } else {
          console.log('本地存储模式，不调用服务端API');
        }
      }
    }
  };

  const selectedNote = state.notes.find(note => note.id === state.selectedNoteId);

  // 计算当前编辑器模式
  const isPreview = settings.editorMode === 'preview';


  // 全局快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      
      // 编辑器模式切换: Ctrl/Cmd + R (在三种模式之间循环切换)
        if (ctrlOrCmd && event.key === 'r') {
          event.preventDefault();
          if (settings.editorMode === 'edit') {
            updateSettings({ editorMode: 'preview' });
          } else {
            updateSettings({ editorMode: 'edit' });
          }
          return;
        }
      
      // 新建笔记: Ctrl/Cmd + N
      if (ctrlOrCmd && event.key === 'n') {
        event.preventDefault();
        handleCreateNote();
        return;
      }
      
      // 搜索: Ctrl/Cmd + F
      if (ctrlOrCmd && event.key === 'f') {
        event.preventDefault();
        // 聚焦到搜索框
        const searchInput = document.querySelector('input[placeholder="搜索笔记..."]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }
      
      // 保存: Ctrl/Cmd + S (阻止浏览器默认保存)
      if (ctrlOrCmd && event.key === 's') {
        event.preventDefault();
        // 数据已经自动保存，这里只是阻止浏览器默认行为
        return;
      }
      
      // 清空搜索: Escape (当搜索框有焦点时)
      if (event.key === 'Escape') {
        const searchInput = document.querySelector('input[placeholder="搜索笔记..."]') as HTMLInputElement;
        if (searchInput && document.activeElement === searchInput) {
          handleSearch('');
          searchInput.blur();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings]);

  // 认证状态检查
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <div>正在验证身份...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  // 加载状态
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--accent-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          正在加载数据... ({storageMode === 'server' ? '服务端' : '本地存储'})
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const renderLayout = () => {
    switch (viewMode) {
      case 'fullscreen':
         return (
           <div style={{ 
             display: 'flex', 
             height: '100vh',
             width: '100vw',
             overflow: 'hidden',
             flexDirection: 'column'
           }}>
             {/* 全屏编辑器 */}
             <div style={{ flex: 1, overflow: 'hidden', paddingBottom: '48px' }}>
               <Editor
                note={selectedNote}
                onUpdateNote={handleUpdateNote}
                isPreview={isPreview}
                onTogglePreview={() => {
                   if (settings.editorMode === 'edit') {
                     updateSettings({ editorMode: 'preview' });
                   } else {
                     updateSettings({ editorMode: 'edit' });
                   }
                 }}
              />
             </div>

             {/* 底部状态栏 */}
             <div style={{
               position: 'fixed',
               bottom: '0',
               left: '0',
               right: '0',
               padding: '8px 16px',
               backgroundColor: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-color)',
               zIndex: 1000,
             }}>
               <SyncStatus 
                 showViewModeSelector={true}
                 currentViewMode={viewMode}
                 onViewModeChange={setViewMode}
               />
             </div>
           </div>
         );

      case 'two-column':
        return (
          <div style={{ 
            display: 'flex', 
            height: '100vh',
            width: '100vw',
            overflow: 'hidden'
          }}>
            {/* 左侧：合并的控制面板和笔记列表 */}
            <div style={{
              width: '400px',
              backgroundColor: 'var(--bg-primary)',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              height: '100vh',
              overflow: 'hidden',
            }}>
              {/* 顶部控制区域 */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <Logo size={20} />
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                      FlatNotes
                    </h1>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: storageMode === 'server' ? 'var(--success-color)' : 'var(--warning-color)',
                      }}></div>
                      {storageMode === 'server' ? '服务端存储' : '本地存储'}
                    </div>
                    <button
                      onClick={handleOpenSettings}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="设置"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                </div>
                
                {/* 搜索框 */}
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="搜索笔记..."
                    value={state.searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCreateNote}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: 'var(--accent-color)',
                      color: 'var(--text-on-accent)',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    新笔记
                  </button>
                </div>
              </div>

              {/* 笔记列表 */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <NoteList
                  notes={state.notes}
                  categories={state.categories}
                  selectedNoteId={state.selectedNoteId}
                  selectedCategory={state.selectedCategory}
                  searchQuery={state.searchQuery}
                  selectedTags={state.selectedTags}
                  onSelectNote={handleSelectNote}
                  onDeleteNote={handleDeleteNote}
                />
              </div>
            </div>

            {/* 右侧编辑器 */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              minWidth: 0,
              height: '100vh',
              overflow: 'hidden',
              paddingBottom: '48px'
            }}>
              <Editor
                note={selectedNote}
                onUpdateNote={handleUpdateNote}
                isPreview={isPreview}
                onTogglePreview={() => {
                    if (settings.editorMode === 'edit') {
                      updateSettings({ editorMode: 'preview' });
                    } else {
                      updateSettings({ editorMode: 'edit' });
                    }
                  }}
              />
            </div>

            {/* 底部状态栏 */}
             <div style={{
               position: 'fixed',
               bottom: '0',
               left: '0',
               right: '0',
               padding: '8px 16px',
               backgroundColor: 'var(--bg-tertiary)',
               borderTop: '1px solid var(--border-color)',
               zIndex: 1000,
             }}>
               <SyncStatus 
                 showViewModeSelector={true}
                 currentViewMode={viewMode}
                 onViewModeChange={setViewMode}
               />
             </div>
          </div>
        );

      case 'three-column':
      default:
        return (
          <div style={{ 
            display: 'flex', 
            height: '100vh',
            width: '100vw',
            overflow: 'hidden'
          }}>
            {/* 左侧控制面板 */}
             <ControlPanel
               notes={state.notes}
               categories={state.categories}
               selectedCategory={state.selectedCategory}
               searchQuery={state.searchQuery}
               searchInput={searchInput}
               selectedTags={state.selectedTags}
               selectedNoteId={state.selectedNoteId}
               storageMode={storageMode}
               onCreateNote={handleCreateNote}
               onSelectCategory={handleSelectCategory}
               onCreateCategory={handleCreateCategory}
               onUpdateCategory={handleUpdateCategory}
               onDeleteCategory={handleDeleteCategory}
               onSearch={handleSearch}
               onTagFilter={handleTagFilter}
               onOpenSettings={handleOpenSettings}
             />

            {/* 中间笔记列表 */}
            <div style={{ width: '350px', height: '100vh', overflow: 'hidden' }}>
              <NoteList
                notes={state.notes}
                categories={state.categories}
                selectedNoteId={state.selectedNoteId}
                selectedCategory={state.selectedCategory}
                searchQuery={state.searchQuery}
                selectedTags={state.selectedTags}
                onSelectNote={handleSelectNote}
                onDeleteNote={handleDeleteNote}
              />
            </div>

            {/* 右侧编辑器 */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              minWidth: 0,
              height: '100vh',
              overflow: 'hidden',
              paddingBottom: '48px'
            }}>
              <Editor
                note={selectedNote}
                onUpdateNote={handleUpdateNote}
                isPreview={isPreview}
                onTogglePreview={() => {
                 if (settings.editorMode === 'edit') {
                   updateSettings({ editorMode: 'preview' });
                 } else {
                   updateSettings({ editorMode: 'edit' });
                 }
               }}
              />
            </div>

            {/* 底部状态栏 */}
             <div style={{
               position: 'fixed',
               bottom: '0',
               left: '0',
               right: '0',
               padding: '8px 16px',
               backgroundColor: 'var(--bg-tertiary)',
               borderTop: '1px solid var(--border-color)',
               zIndex: 1000,
             }}>
               <SyncStatus 
                 showViewModeSelector={true}
                 currentViewMode={viewMode}
                 onViewModeChange={setViewMode}
               />
             </div>
          </div>
        );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {renderLayout()}
      <DragOverlay>
        {activeId ? (
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '14px',
            color: 'var(--text-primary)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            cursor: 'grabbing'
          }}>
            {activeId.startsWith('category-') 
              ? state.categories.find(cat => `category-${cat.id}` === activeId)?.name
              : state.notes.find(note => `note-${note.id}` === activeId)?.title || '未命名笔记'
            }
          </div>
        ) : null}
      </DragOverlay>
      <SettingsModal
         isOpen={showSettings}
         onClose={handleCloseSettings}
         storageMode={storageMode}
       />
    </DndContext>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;