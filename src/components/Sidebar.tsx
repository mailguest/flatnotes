import React, { useState, useEffect, useRef } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Search, Plus, FolderPlus, Tag, X, Trash2, Download, FileDown, Settings } from 'lucide-react';
import { Note, Category } from '../types';
import { exportNoteToMarkdown, exportAllNotesToMarkdown, isFileSystemAPISupported } from '../utils/storage';

interface SidebarProps {
  notes: Note[];
  categories: Category[];
  selectedNoteId: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  selectedTags: string[];
  storageMode?: 'server' | 'local';
  onCreateNote: () => void;
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onSelectCategory: (categoryId: string | null) => void;
  onCreateCategory: (name: string, color: string) => void;
  onUpdateCategory: (categoryId: string, updates: Partial<Category>) => void;
  onDeleteCategory: (categoryId: string) => void;
  onSearch: (query: string) => void;
  onTagFilter: (tags: string[]) => void;
  onOpenSettings?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  notes,
  categories,
  selectedNoteId,
  selectedCategory,
  searchQuery,
  selectedTags,
  storageMode = 'local',
  onCreateNote,
  onSelectNote,
  onDeleteNote,
  onSelectCategory,
  onCreateCategory,
  onDeleteCategory,
  onSearch,
  onTagFilter,
  onOpenSettings,
}) => {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('var(--accent-color)');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 过滤笔记
  const filteredNotes = notes.filter(note => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
                         note.title.toLowerCase().includes(searchLower) ||
                         note.content.toLowerCase().includes(searchLower) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchLower));
    const matchesCategory = !selectedCategory || note.category === selectedCategory;
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(tag => note.tags.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  });

  // 获取所有标签
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      onCreateCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('var(--accent-color)');
      setShowCategoryForm(false);
    }
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagFilter(selectedTags.filter(t => t !== tag));
    } else {
      onTagFilter([...selectedTags, tag]);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleExportCurrentNote = async () => {
    if (!selectedNoteId) {
      alert('请先选择一个笔记');
      return;
    }
    
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) {
      alert('未找到选中的笔记');
      return;
    }

    try {
      await exportNoteToMarkdown(note, categories);
      setShowExportMenu(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : '导出失败');
    }
  };

  const handleExportAllNotes = async () => {
    if (notes.length === 0) {
      alert('没有笔记可以导出');
      return;
    }

    try {
      await exportAllNotesToMarkdown(notes, categories);
      setShowExportMenu(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : '导出失败');
    }
  };

  const handleExportFilteredNotes = async () => {
    if (filteredNotes.length === 0) {
      alert('没有符合条件的笔记可以导出');
      return;
    }

    try {
      await exportAllNotesToMarkdown(filteredNotes, categories);
      setShowExportMenu(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : '导出失败');
    }
  };

  return (
    <div style={{
      width: '320px',
      backgroundColor: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    }}>
      {/* 头部 */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, marginBottom: '4px' }}>
            FlatNotes
          </h1>
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
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
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
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="设置"
              >
                <Settings size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* 搜索框 */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
          }} />
          <input
            type="text"
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 36px 8px 36px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: '50%',
              }}
              title="清空搜索"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={onCreateNote}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: 'var(--accent-color)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <Plus size={16} />
            新笔记
          </button>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            style={{
              padding: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderPlus size={16} />
          </button>
          <div ref={exportMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!isFileSystemAPISupported()}
              style={{
                padding: '8px',
                backgroundColor: isFileSystemAPISupported() ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: isFileSystemAPISupported() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isFileSystemAPISupported() ? 1 : 0.5,
              }}
              title={isFileSystemAPISupported() ? '导出笔记' : '您的浏览器不支持文件系统API'}
            >
              <Download size={16} />
            </button>
            
            {/* 导出菜单 */}
            {showExportMenu && isFileSystemAPISupported() && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '4px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                boxShadow: '0 4px 12px var(--shadow-color)',
                zIndex: 1000,
                minWidth: '180px',
              }}>
                <button
                  onClick={handleExportCurrentNote}
                  disabled={!selectedNoteId}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: selectedNoteId ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: selectedNoteId ? 1 : 0.5,
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedNoteId) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <FileDown size={14} />
                  导出当前笔记
                </button>
                <button
                  onClick={handleExportFilteredNotes}
                  disabled={filteredNotes.length === 0}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: filteredNotes.length > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: filteredNotes.length > 0 ? 1 : 0.5,
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (filteredNotes.length > 0) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Download size={14} />
                  导出筛选结果 ({filteredNotes.length})
                </button>
                <button
                  onClick={handleExportAllNotes}
                  disabled={notes.length === 0}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: notes.length > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: notes.length > 0 ? 1 : 0.5,
                    borderTop: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (notes.length > 0) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Download size={14} />
                  导出全部笔记 ({notes.length})
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 浏览器兼容性提示 */}
        {!isFileSystemAPISupported() && (
          <div style={{
            padding: '8px',
            backgroundColor: 'var(--warning-color)',
            border: '1px solid var(--warning-color)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--text-on-accent)',
            marginBottom: '8px',
          }}>
            导出功能需要Chrome 86+或Edge 86+浏览器支持
          </div>
        )}

        {/* 新建分类表单 */}
        {showCategoryForm && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
          }}>
            <input
              type="text"
              placeholder="分类名称"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                style={{ width: '32px', height: '24px', border: 'none', borderRadius: '4px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>选择颜色</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateCategory}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: 'var(--success-color)',
                  color: 'var(--text-on-accent)',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px var(--shadow-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                创建
              </button>
              <button
                onClick={() => setShowCategoryForm(false)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 分类列表 */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          分类
        </h3>
        <div>
          <div
            onClick={() => onSelectCategory(null)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: selectedCategory === null ? 'var(--accent-color-light)' : 'transparent',
              color: selectedCategory === null ? 'var(--accent-color)' : 'var(--text-primary)',
              fontSize: '14px',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>全部笔记</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {notes.length}
            </span>
          </div>
          <SortableContext items={categories.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
            {categories.map((category) => {
              const {
                attributes,
                listeners,
                setNodeRef,
                transform,
                transition,
                isDragging,
              } = useSortable({ id: category.id });

              const style = {
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.8 : 1,
              };

              return (
                <div
                  key={category.id}
                  ref={setNodeRef}
                  style={{
                    ...style,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedCategory === category.id ? 'var(--accent-color-light)' : 'transparent',
                    color: selectedCategory === category.id ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontSize: '14px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  {...attributes}
                  {...listeners}
                  onClick={() => onSelectCategory(category.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: category.color,
                      }}
                    />
                    <span>{category.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {notes.filter(note => note.category === category.id).length}
                    </span>
                    {categories.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCategory(category.id);
                        }}
                        style={{
                          padding: '2px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </SortableContext>
        </div>
      </div>

      {/* 标签过滤 */}
      {allTags.length > 0 && (
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            标签
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {allTags.map(tag => (
              <span
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <Tag size={10} style={{ marginRight: '4px' }} />
                {tag}
              </span>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button
              onClick={() => onTagFilter([])}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={12} />
              清除标签过滤
            </button>
          )}
        </div>
      )}

      {/* 笔记列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '16px 16px 8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            笔记 ({filteredNotes.length})
          </h3>
        </div>
        <div style={{ paddingBottom: '16px' }}>
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: selectedNoteId === note.id ? 'var(--accent-color-light)' : 'transparent',
                borderLeft: selectedNoteId === note.id ? '3px solid var(--accent-color)' : '3px solid transparent',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (selectedNoteId !== note.id) {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedNoteId !== note.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: '1.3',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {note.title}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  style={{
                    padding: '2px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0';
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: '0 0 8px 0',
                lineHeight: '1.4',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {note.content.replace(/[#*`]/g, '').substring(0, 50)}...
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                  {note.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="tag" style={{ fontSize: '10px', padding: '1px 4px' }}>
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 2 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      +{note.tags.length - 2}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  {formatDate(note.updatedAt)}
                </span>
              </div>
            </div>
          ))}
          {filteredNotes.length === 0 && (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '14px',
            }}>
              {searchQuery || selectedTags.length > 0 ? '没有找到匹配的笔记' : '还没有笔记，点击"新笔记"开始创建'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;