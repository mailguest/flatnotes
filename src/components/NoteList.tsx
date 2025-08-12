import React, { useRef } from 'react';
import { Tag, Trash2 } from 'lucide-react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Note, Category } from '../types';

interface NoteListProps {
  notes: Note[];
  categories: Category[];
  selectedNoteId: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  selectedTags: string[];
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  categories,
  selectedNoteId,
  selectedCategory,
  searchQuery,
  selectedTags,
  onSelectNote,
  onDeleteNote,
}) => {
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // NoteItem 子组件
  const NoteItem: React.FC<{
    note: Note;
    isSelected: boolean;
    category?: Category;
  }> = ({ note, isSelected, category }) => {
    const mouseDownTime = useRef<number>(0);
    const isDragging = useRef<boolean>(false);

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isDraggingState,
    } = useSortable({ id: note.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDraggingState ? 0.8 : 1,
    };

    const handleMouseDown = () => {
      mouseDownTime.current = Date.now();
      isDragging.current = false;
    };

    const handleMouseUp = () => {
      const timeDiff = Date.now() - mouseDownTime.current;
      // 如果时间差小于200ms且没有拖拽，则认为是点击
      if (timeDiff < 200 && !isDragging.current) {
        onSelectNote(note.id);
      }
    };

    const handleDragStart = () => {
      isDragging.current = true;
    };

    const handleDragEnd = () => {
      isDragging.current = false;
    };

    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: isSelected ? 'var(--accent-bg)' : 'transparent',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
        {...attributes}
      >
        {/* 拖拽区域 */}
        <div
          {...listeners}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{
            cursor: 'pointer',
            position: 'absolute',
            top: 0,
            left: 0,
            right: '50px', // 为删除按钮留出空间
            bottom: 0,
            zIndex: 1,
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            lineHeight: '1.4',
            position: 'relative',
            zIndex: 2,
          }}>
            {note.title || '无标题'}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('删除按钮被点击:', note.id);
              onDeleteNote(note.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              opacity: 0.6,
              color: 'var(--danger-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              position: 'relative',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.6';
            }}
            title="删除笔记"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <p style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          position: 'relative',
          zIndex: 2,
        }}>
          {note.content.replace(/[#*`]/g, '').substring(0, 100)}
          {note.content.length > 100 ? '...' : ''}
        </p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '12px',
          position: 'relative',
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: category.color,
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {category.name}
                </span>
              </div>
            )}
            {note.tags && note.tags.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={12} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {note.tags.join(', ')}
                </span>
              </div>
            )}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {formatDate(note.updatedAt)}
          </span>
        </div>
      </div>
    );
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || '未分类';
  };

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* 头部 */}
      <div style={{ 
        padding: '17px 16px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-tertiary)',
      }}>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          margin: 0, 
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>笔记列表</span>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 'normal', 
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '2px 8px',
            borderRadius: '12px',
          }}>
            {filteredNotes.length}
          </span>
        </h2>
      </div>

      {/* 筛选状态区域 */}
      <div style={{ padding: '17px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {selectedCategory && (
            <span style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-primary)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}>
              分类: {getCategoryName(selectedCategory)}
            </span>
          )}
          {selectedTags.length > 0 && (
            <span style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-primary)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}>
              标签: {selectedTags.join(', ')}
            </span>
          )}
          {searchQuery && (
            <span style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-primary)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}>
              搜索: {searchQuery}
            </span>
          )}
          {!selectedCategory && selectedTags.length === 0 && !searchQuery && (
            <span style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
            }}>
              显示所有笔记
            </span>
          )}
        </div>
      </div>

      {/* 笔记列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredNotes.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: '14px',
          }}>
            {searchQuery || selectedTags.length > 0 ? '没有找到匹配的笔记' : '暂无笔记'}
          </div>
        ) : (
          <SortableContext items={filteredNotes.map(note => note.id)} strategy={verticalListSortingStrategy}>
            {filteredNotes.map((note) => {
              const category = categories.find(cat => cat.id === note.category);
              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  category={category}
                />
              );
            })}
          </SortableContext>
        )}
      </div>


    </div>
  );
};

export default NoteList;