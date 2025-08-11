import React, { useState, useEffect, useRef } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Search, Plus, FolderPlus, Tag, X, Edit2, Trash2, Download, FileDown, Settings } from 'lucide-react';
import { Note, Category } from '../types';
import { exportNoteToMarkdown, exportAllNotesToMarkdown, isFileSystemAPISupported } from '../utils/storage';

interface ControlPanelProps {
  notes: Note[];
  categories: Category[];
  selectedCategory: string | null;
  searchQuery: string;
  selectedTags: string[];
  selectedNoteId: string | null;
  storageMode?: 'server' | 'local';
  onCreateNote: () => void;
  onSelectCategory: (categoryId: string | null) => void;
  onCreateCategory: (name: string, color: string) => void;
  onUpdateCategory: (categoryId: string, updates: Partial<Category>) => void;
  onDeleteCategory: (categoryId: string) => void;
  onSearch: (query: string) => void;
  onTagFilter: (tags: string[]) => void;
  onOpenSettings?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  notes,
  categories,
  selectedCategory,
  searchQuery,
  selectedTags,
  selectedNoteId,
  storageMode = 'local',
  onCreateNote,
  onSelectCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSearch,
  onTagFilter,
  onOpenSettings,
}) => {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('var(--accent-color)');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // 分类项组件
  const CategoryItem: React.FC<{
    category: Category;
    isSelected: boolean;
    noteCount: number;
  }> = ({ category, isSelected, noteCount }) => {
    const {
      attributes,
      listeners,
      setNodeRef: setSortableRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: `category-${category.id}` });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
      id: `category-${category.id}`,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={(node) => {
          setSortableRef(node);
          setDroppableRef(node);
        }}
        style={{
          ...style,
          padding: '8px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          backgroundColor: isOver 
            ? 'var(--accent-color-light)' 
            : isSelected 
              ? 'var(--accent-bg)' 
              : 'transparent',
          color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
          fontSize: '14px',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          border: isOver ? '2px dashed var(--accent-color)' : '2px solid transparent',
          transition: 'all 0.2s ease',
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
          {editingCategory === category.id ? (
            <input
              type="text"
              defaultValue={category.name}
              onBlur={(e) => {
                onUpdateCategory(category.id, { name: e.target.value });
                setEditingCategory(null);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onUpdateCategory(category.id, { name: e.currentTarget.value });
                  setEditingCategory(null);
                }
              }}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                outline: 'none',
                color: 'inherit',
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span>{category.name}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>
            {noteCount}
          </span>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingCategory(category.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '2px',
                opacity: 0.6,
                color: 'var(--text-secondary)',
              }}
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定要删除这个分类吗？分类下的笔记将移动到默认分类。')) {
                  onDeleteCategory(category.id);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '2px',
                opacity: 0.6,
                color: 'var(--danger-color)',
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  };
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 过滤笔记（用于导出功能）
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
      width: '280px',
      backgroundColor: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* 应用标题 */}
      <div style={{ 
        padding: '17px 16px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            margin: 0,
            textAlign: 'center'
          }}>
            FlatNotes
          </h1>
        </div>
      </div>

      {/* 状态区域 */}
      <div style={{ padding: '17px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
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
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              title="设置"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 搜索区域 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        
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
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
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
              padding: '6px 10px',
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
            <Plus size={16} />
            新笔记
          </button>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            style={{
              padding: '6px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
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
            <FolderPlus size={16} />
          </button>
          <div ref={exportMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!isFileSystemAPISupported()}
              style={{
                padding: '6px',
                backgroundColor: isFileSystemAPISupported() ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: isFileSystemAPISupported() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isFileSystemAPISupported() ? 1 : 0.5,
                color: 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (isFileSystemAPISupported()) {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (isFileSystemAPISupported()) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }
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
                    color: 'var(--text-primary)',
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
                    color: 'var(--text-primary)',
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
                    color: 'var(--text-primary)',
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
            backgroundColor: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--warning-text)',
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
                padding: '8px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '8px',
                outline: 'none',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                style={{
                  width: '32px',
                  height: '32px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>选择颜色</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateCategory}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--text-on-accent)',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setNewCategoryName('');
                  setNewCategoryColor('var(--accent-color)');
                }}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 分类列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
            分类
          </h3>
          <div>
            <div
              onClick={() => onSelectCategory(null)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: selectedCategory === null ? 'var(--accent-bg)' : 'transparent',
                color: selectedCategory === null ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontSize: '14px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>全部笔记</span>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>
                {notes.length}
              </span>
            </div>
            <SortableContext items={categories.map(cat => `category-${cat.id}`)} strategy={verticalListSortingStrategy}>
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  isSelected={selectedCategory === category.id}
                  noteCount={notes.filter(note => note.category === category.id).length}
                />
              ))}
            </SortableContext>
          </div>
        </div>

        {/* 标签列表 */}
        {allTags.length > 0 && (
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
              标签
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: selectedTags.includes(tag) ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: selectedTags.includes(tag) ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: selectedTags.includes(tag) ? 'var(--accent-color)' : 'var(--border-color)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Tag size={10} />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;