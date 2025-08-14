import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Tag, Trash2, Loader2, RefreshCw } from 'lucide-react';
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
  // 无限滚动配置
  const ITEMS_PER_PAGE = 50; // 每次加载50个笔记
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 下拉刷新配置
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const PULL_THRESHOLD = 80; // 下拉刷新阈值

  // 过滤笔记 - 使用useMemo缓存计算结果
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
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
  }, [notes, searchQuery, selectedCategory, selectedTags]);

  // 显示的笔记 - 根据displayedCount截取
  const displayedNotes = useMemo(() => {
    return filteredNotes.slice(0, displayedCount);
  }, [filteredNotes, displayedCount]);

  // 当过滤条件变化时重置显示数量
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    setHasMore(true);
  }, [searchQuery, selectedCategory, selectedTags]);

  // 更新hasMore状态
  useEffect(() => {
    setHasMore(displayedCount < filteredNotes.length);
  }, [displayedCount, filteredNotes.length]);

  // 加载更多笔记
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    // 减少延迟以提供更流畅的体验
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setDisplayedCount(prev => {
      const newCount = prev + ITEMS_PER_PAGE;
      return Math.min(newCount, filteredNotes.length);
    });
    setIsLoading(false);
  }, [isLoading, hasMore, filteredNotes.length]);

  // 滚动监听器
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 100; // 距离底部100px时开始加载
    
    if (scrollHeight - scrollTop - clientHeight < threshold && hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  // 下拉刷新功能
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    // 模拟刷新延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 重置显示数量到初始值
    setDisplayedCount(ITEMS_PER_PAGE);
    setHasMore(true);
    setIsRefreshing(false);
  }, [isRefreshing]);

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  }, []);

  // 触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || scrollContainerRef.current?.scrollTop !== 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    const dampedDistance = Math.min(distance * 0.5, PULL_THRESHOLD * 1.5);
    
    setPullDistance(dampedDistance);
    
    // 阻止默认滚动行为
    if (distance > 0) {
      e.preventDefault();
    }
  }, [isPulling, startY]);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (isPulling && pullDistance >= PULL_THRESHOLD) {
      handleRefresh();
    }
    
    setIsPulling(false);
    setPullDistance(0);
    setStartY(0);
  }, [isPulling, pullDistance, handleRefresh]);

  // 缓存日期格式化函数
  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, []);

  // 优化内容预览计算
  const getContentPreview = useCallback((content: string) => {
    const cleanContent = content.replace(/[#*`]/g, '').substring(0, 100);
    return cleanContent + (content.length > 100 ? '...' : '');
  }, []);

  // LazyNoteItem 子组件 - 使用React.memo和懒加载优化
  const LazyNoteItem = React.memo<{
    note: Note;
    selectedNoteId: string | null;
    category?: Category;
    onSelectNote: (noteId: string) => void;
    onDeleteNote: (noteId: string) => void;
    formatDate: (date: Date) => string;
    getContentPreview: (content: string) => string;
  }>(({ note, selectedNoteId, category, onSelectNote, onDeleteNote, formatDate, getContentPreview }) => {
    const isSelected = selectedNoteId === note.id;
    const [hasBeenVisible, setHasBeenVisible] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);
    const mouseDownTime = useRef<number>(0);
    const isDragging = useRef<boolean>(false);

    // useSortable Hook必须在条件渲染之前调用
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isDraggingState,
    } = useSortable({ id: note.id });

    // Intersection Observer for lazy loading
    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasBeenVisible) {
            setHasBeenVisible(true);
          }
        },
        {
          rootMargin: '50px', // 提前50px开始加载
          threshold: 0.1
        }
      );

      if (observerRef.current) {
        observer.observe(observerRef.current);
      }

      return () => {
        if (observerRef.current) {
          observer.unobserve(observerRef.current);
        }
      };
    }, [hasBeenVisible]);

    // 如果从未可见过，显示占位符
    if (!hasBeenVisible) {
      return (
        <div
          ref={observerRef}
          style={{
            height: '80px', // 预估高度
            backgroundColor: 'var(--bg-secondary)',
            margin: '1px 0',
            borderRadius: '4px',
            opacity: 0.6,
            transition: 'opacity 0.2s ease-in-out',
            // 移除加载文字，使用更简洁的占位符
          }}
        />
      );
    }

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
      const clickDuration = Date.now() - mouseDownTime.current;
      if (clickDuration < 200 && !isDragging.current) {
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
        {...listeners}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          ...style,
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: isSelected ? 'var(--accent-bg)' : 'transparent',
          transition: 'all 0.2s ease, opacity 0.3s ease-in-out',
          position: 'relative',
          opacity: hasBeenVisible ? 1 : 0,
          animation: hasBeenVisible ? 'fadeIn 0.3s ease-in-out' : 'none',
          cursor: 'pointer',
        }}
        {...attributes}
      >
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            lineHeight: '1.4',
          }}>
            {note.title || '无标题'}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
      
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
        }}>
          {getContentPreview(note.content)}
        </p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '12px',
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
  }, (prevProps, nextProps) => {
      // 计算当前笔记的选中状态
      const prevSelected = prevProps.selectedNoteId === prevProps.note.id;
      const nextSelected = nextProps.selectedNoteId === nextProps.note.id;
      
      // 只有当笔记内容、选中状态或分类信息改变时才重新渲染
      return (
        prevProps.note.id === nextProps.note.id &&
        prevProps.note.title === nextProps.note.title &&
        prevProps.note.content === nextProps.note.content &&
        prevProps.note.updatedAt.getTime() === nextProps.note.updatedAt.getTime() &&
        JSON.stringify(prevProps.note.tags) === JSON.stringify(nextProps.note.tags) &&
        prevProps.note.category === nextProps.note.category &&
        prevSelected === nextSelected &&
        prevProps.category?.id === nextProps.category?.id &&
        prevProps.category?.name === nextProps.category?.name &&
        prevProps.category?.color === nextProps.category?.color &&
        prevProps.onSelectNote === nextProps.onSelectNote &&
        prevProps.onDeleteNote === nextProps.onDeleteNote
      );
    });

  // 缓存分类名称获取函数
  const getCategoryName = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || '未分类';
  }, [categories]);

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
        padding: '12px 16px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-tertiary)',
        height: '60px',
        boxSizing: 'border-box',
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
            {selectedCategory && (
              <span style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-primary)',
                padding: '4px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                fontWeight: '500',
              }}>
                分类: {getCategoryName(selectedCategory)}
              </span>
            )}
            {selectedTags.length > 0 && (
              <span style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-primary)',
                padding: '4px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                fontWeight: '500',
              }}>
                标签: {selectedTags.join(', ')}
              </span>
            )}
            {searchQuery && (
              <span style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-primary)',
                padding: '4px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                fontWeight: '500',
              }}>
                搜索: {searchQuery}
              </span>
            )}
            {!selectedCategory && selectedTags.length === 0 && !searchQuery && (
              <span style={{
                fontSize: '16px',
                color: 'var(--text-primary)',
                fontWeight: 'bold',
              }}>
                所有笔记
              </span>
            )}
          </div>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 'normal', 
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '2px 8px',
            borderRadius: '12px',
            flexShrink: 0,
          }}>
            {filteredNotes.length}
          </span>
        </div>
      </div>

      {/* 笔记列表 */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          display: 'flex', 
          flexDirection: 'column',
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
          paddingBottom: '20px'
        }}
      >
        {/* 下拉刷新指示器 */}
        {(isPulling || isRefreshing) && (
          <div style={{
            position: 'absolute',
            top: `-${Math.max(60, pullDistance)}px`,
            left: 0,
            right: 0,
            height: '60px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            zIndex: 10,
          }}>
            <RefreshCw 
              size={16} 
              className={isRefreshing || pullDistance >= PULL_THRESHOLD ? 'animate-spin' : ''}
              style={{
                transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)`,
                transition: isRefreshing ? 'none' : 'transform 0.1s ease-out'
              }}
            />
            <span>
              {isRefreshing 
                ? '刷新中...' 
                : pullDistance >= PULL_THRESHOLD 
                  ? '松开刷新' 
                  : '下拉刷新'
              }
            </span>
          </div>
        )}
        <div style={{ flex: 1 }}>
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
            <SortableContext items={displayedNotes.map(note => note.id)} strategy={verticalListSortingStrategy}>
              {displayedNotes.map((note) => {
                const category = categories.find(cat => cat.id === note.category);
                return (
                  <LazyNoteItem
                    key={note.id}
                    note={note}
                    selectedNoteId={selectedNoteId}
                    category={category}
                    onSelectNote={onSelectNote}
                    onDeleteNote={onDeleteNote}
                    formatDate={formatDate}
                    getContentPreview={getContentPreview}
                  />
                );
              })}
            </SortableContext>
          )}
        </div>
        
        {/* 加载更多指示器 */}
        {isLoading && (
          <div style={{
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
          }}>
            <Loader2 size={16} className="animate-spin" />
            <span>加载中...</span>
          </div>
        )}
        
        {/* 到达底部提示 */}
        {!hasMore && displayedNotes.length > 0 && (
          <div style={{
            padding: '20px 16px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div>
              <div style={{
                fontWeight: '500',
                marginBottom: '4px',
              }}>已到达列表底部</div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
              }}>共 {filteredNotes.length} 个笔记</div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

// 自定义比较函数，避免不必要的重新渲染
const areEqual = (prevProps: NoteListProps, nextProps: NoteListProps) => {
  // 检查基本props
  if (
    prevProps.selectedNoteId !== nextProps.selectedNoteId ||
    prevProps.selectedCategory !== nextProps.selectedCategory ||
    prevProps.searchQuery !== nextProps.searchQuery ||
    JSON.stringify(prevProps.selectedTags) !== JSON.stringify(nextProps.selectedTags) ||
    prevProps.onSelectNote !== nextProps.onSelectNote ||
    prevProps.onDeleteNote !== nextProps.onDeleteNote
  ) {
    return false;
  }

  // 智能比较notes数组 - 只有当笔记数量、ID或关键属性变化时才重新渲染
  if (prevProps.notes.length !== nextProps.notes.length) {
    return false;
  }

  // 检查笔记ID顺序是否变化
  for (let i = 0; i < prevProps.notes.length; i++) {
    const prevNote = prevProps.notes[i];
    const nextNote = nextProps.notes[i];
    
    if (
      prevNote.id !== nextNote.id ||
      prevNote.title !== nextNote.title ||
      prevNote.category !== nextNote.category ||
      JSON.stringify(prevNote.tags) !== JSON.stringify(nextNote.tags)
      // 注意：这里故意不比较content和updatedAt，避免编辑时触发列表刷新
    ) {
      return false;
    }
  }

  // 简单比较categories
  if (prevProps.categories !== nextProps.categories) {
    return false;
  }

  return true;
};

export default React.memo(NoteList, areEqual);