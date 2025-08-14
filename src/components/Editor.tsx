import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Eye, Edit, Upload, Tag, X, Download, Paperclip } from 'lucide-react';
import { Note, Attachment } from '../types';
import { uploadAPI, checkServerAvailability } from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';
import ExportButton from './ExportButton';

interface EditorProps {
  note: Note | undefined;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  isPreview?: boolean;
  onTogglePreview?: () => void;
}

const Editor: React.FC<EditorProps> = ({ note, onUpdateNote, isPreview = false, onTogglePreview }) => {
  const { settings } = useSettings();
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isComposing, setIsComposing] = useState(false); // 跟踪中文输入法状态
  const [showPlaceholder, setShowPlaceholder] = useState(true); // 控制placeholder显示
  const [showAttachments, setShowAttachments] = useState(false); // 控制附件弹出列表显示
  
  // 防抖更新的ref
  const titleUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 本地状态用于立即更新UI显示
  const [localTitle, setLocalTitle] = useState(note?.title || '');
  const [localContent, setLocalContent] = useState(note?.content || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 计算行号
  const getLineNumbers = (content: string) => {
    const lines = content.split('\n');
    return lines.map((_, index) => index + 1);
  };

  // 防抖的标题更新函数
  const handleTitleChange = useCallback((title: string) => {
    if (!note) return;
    
    // 立即更新本地状态以提供即时反馈
    setLocalTitle(title);
    
    // 清除之前的定时器
    if (titleUpdateTimeoutRef.current) {
      clearTimeout(titleUpdateTimeoutRef.current);
    }
    
    // 设置新的定时器，300ms后执行更新
    titleUpdateTimeoutRef.current = setTimeout(() => {
      onUpdateNote(note.id, { title });
    }, 300);
  }, [note?.id, onUpdateNote]);

  // 防抖的内容更新函数
  const handleContentChange = useCallback((content: string) => {
    if (!note) return;
    
    // 清除之前的定时器
    if (contentUpdateTimeoutRef.current) {
      clearTimeout(contentUpdateTimeoutRef.current);
    }
    
    // 设置新的定时器，300ms后执行更新
    contentUpdateTimeoutRef.current = setTimeout(() => {
      // 更新到服务器
      onUpdateNote(note.id, { content });
      // 同步更新本地状态，但这不会影响textarea因为它不是受控组件
      setLocalContent(content);
    }, 300);
  }, [note?.id, onUpdateNote]);

  // 处理textarea输入变化 - 完全避免状态更新
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    
    // 直接调用防抖更新到服务器，不更新任何React状态
    handleContentChange(content);
  }, [handleContentChange]);
  
  // 初始化textarea内容和处理note变化
  useEffect(() => {
    if (textareaRef.current && !isPreview) {
      const textarea = textareaRef.current;
      const newContent = note?.content || '';
      
      // 只有当内容真正不同时才更新
      if (textarea.value !== newContent) {
        const scrollTop = textarea.scrollTop;
        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        
        textarea.value = newContent;
        
        // 恢复光标位置和滚动位置
        textarea.setSelectionRange(selectionStart, selectionEnd);
        textarea.scrollTop = scrollTop;
      }
    }
  }, [note?.content, note?.id, isPreview]); // 添加isPreview监听，确保预览切换时正确更新
  


  // 当note改变时，更新本地状态
  useEffect(() => {
    if (note) {
      // 清除之前的防抖定时器，避免影响新笔记
      if (titleUpdateTimeoutRef.current) {
        clearTimeout(titleUpdateTimeoutRef.current);
        titleUpdateTimeoutRef.current = null;
      }
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
        contentUpdateTimeoutRef.current = null;
      }
      
      setLocalTitle(note.title);
      setLocalContent(note.content);
    }
  }, [note?.id]); // 只在笔记ID变化时更新本地状态
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (titleUpdateTimeoutRef.current) {
        clearTimeout(titleUpdateTimeoutRef.current);
      }
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
    };
  }, []);
  
  // 处理点击外部关闭附件弹出列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAttachments) {
        const target = event.target as Element;
        const attachmentButton = target.closest('[data-attachment-button]');
        const attachmentPopup = target.closest('[data-attachment-popup]');
        
        if (!attachmentButton && !attachmentPopup) {
          setShowAttachments(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachments]);

  // 自动调整高度 - 只在切换笔记时调整，避免输入时的滚动跳动
  useEffect(() => {
    if (textareaRef.current && !isPreview && note) {
      // 保存当前滚动位置
      const scrollTop = textareaRef.current.scrollTop;
      
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      
      // 恢复滚动位置
      textareaRef.current.scrollTop = scrollTop;
    }
  }, [note?.id, isPreview]); // 只监听note.id变化，不监听content变化

  // 当切换到新笔记时，重新显示placeholder
  useEffect(() => {
    if (note && note.content === '') {
      setShowPlaceholder(true);
    }
  }, [note?.id]);
  
  // 清理定时器


  if (!note) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        fontSize: '16px',
      }}>
        选择一个笔记开始编辑
      </div>
    );
  }

  // 处理textarea点击事件，隐藏placeholder
  const handleTextareaClick = () => {
    if (showPlaceholder) {
      setShowPlaceholder(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !note.tags.includes(newTag.trim())) {
      onUpdateNote(note.id, { tags: [...note.tags, newTag.trim()] });
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote(note.id, { tags: note.tags.filter(tag => tag !== tagToRemove) });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // 检查服务器是否可用
      const serverAvailable = await checkServerAvailability();
      
      Array.from(files).forEach(async (file) => {
         try {
           let attachment: Attachment | null = null;
           
           if (serverAvailable) {
             // 服务器可用，上传到服务器
     
             const uploadResult = await uploadAPI.uploadFile(file);
             
             attachment = {
               id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
               name: uploadResult.originalName,
               type: file.type,
               size: uploadResult.size,
               url: uploadResult.url, // 服务器返回的相对路径
             };
   
           } else {
             // 服务器不可用，转换为base64存储在本地
   
             const reader = new FileReader();
             
             await new Promise<void>((resolve) => {
               reader.onload = (e) => {
                 attachment = {
                   id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                   name: file.name,
                   type: file.type,
                   size: file.size,
                   url: e.target?.result as string,
                 };
                 resolve();
               };
               reader.readAsDataURL(file);
             });
           }
           
           // 添加附件到笔记
           if (attachment) {
             onUpdateNote(note.id, { 
               attachments: [...note.attachments, attachment] 
             });
           }
          
        } catch (error) {
          console.error(`❌ 文件上传失败: ${file.name}`, error);
          alert(`文件上传失败: ${file.name}\n${error instanceof Error ? error.message : '未知错误'}`);
        }
      });
    }
    
    // 清空文件输入，允许重复选择同一文件
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    const attachment = note.attachments.find(att => att.id === attachmentId);
    if (!attachment) return;
    
    try {
      // 如果是服务器上的文件（URL以/uploads/开头），尝试从服务器删除
      if (attachment.url.startsWith('/uploads/')) {
        const filename = attachment.url.split('/').pop();
        if (filename) {
          const serverAvailable = await checkServerAvailability();
          if (serverAvailable) {
      
            await uploadAPI.deleteFile(filename);
    
          }
        }
      }
    } catch (error) {
      console.error(`❌ 删除服务器文件失败: ${attachment.name}`, error);
      // 即使服务器删除失败，也继续删除本地引用
    }
    
    // 从笔记中移除附件引用
    onUpdateNote(note.id, {
      attachments: note.attachments.filter(att => att.id !== attachmentId)
    });
  };

  const insertAttachmentToContent = (attachment: Attachment) => {
    let insertText = '';
    if (attachment.type.startsWith('image/')) {
      insertText = `![${attachment.name}](${attachment.url})`;
    } else {
      insertText = `[${attachment.name}](${attachment.url})`;
    }
    
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = note.content.substring(0, start) + insertText + note.content.substring(end);
      handleContentChange(newContent);
      
      // 设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + insertText.length, start + insertText.length);
      }, 0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 处理输入法组合开始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // 处理输入法组合结束
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // 重新排序有序列表的序号
  const renumberOrderedLists = (text: string): string => {
    const lines = text.split('\n');
    const result: string[] = [];
    const counters: { [key: string]: number } = {}; // 按缩进级别记录计数器
    
    for (const line of lines) {
      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match) {
        const indent = match[1];
        const content = match[3];
        
        // 重置更深层级的计数器
        Object.keys(counters).forEach(key => {
          if (key.length > indent.length) {
            delete counters[key];
          }
        });
        
        // 获取或初始化当前层级的计数器
        if (!counters[indent]) {
          counters[indent] = 1;
        } else {
          counters[indent]++;
        }
        
        result.push(`${indent}${counters[indent]}. ${content}`);
      } else {
        // 非有序列表行，重置所有计数器
        if (line.trim() !== '' && !line.match(/^\s*[-*+]\s/)) {
          Object.keys(counters).forEach(key => delete counters[key]);
        }
        result.push(line);
      }
    }
    
    return result.join('\n');
  };

  // 处理键盘事件，特别是Tab键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      // 找到当前行的范围
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
      const currentLine = value.substring(lineStart, actualLineEnd);
      
      // 检查是否是列表项
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
      
      if (e.shiftKey) {
        // Shift+Tab: 减少缩进
        if (listMatch) {
          // 列表项减少缩进
          const currentIndent = listMatch[1];
          if (currentIndent.length >= 4) {
            const newIndent = currentIndent.substring(4);
            const newLine = newIndent + currentLine.substring(currentIndent.length);
            let newValue = value.substring(0, lineStart) + newLine + value.substring(actualLineEnd);
            
            // 如果是有序列表，重新排序序号
            const isOrderedList = /^\s*\d+\.\s/.test(newLine);
            if (isOrderedList) {
              newValue = renumberOrderedLists(newValue);
            }
            
            handleContentChange(newValue);
            
            setTimeout(() => {
              const newStart = Math.max(lineStart, start - 4);
              const newEnd = Math.max(lineStart, end - 4);
              textarea.setSelectionRange(newStart, newEnd);
            }, 0);
          }
        } else {
          // 普通行减少缩进
          if (currentLine.startsWith('    ')) {
            const newValue = value.substring(0, lineStart) + currentLine.substring(4) + value.substring(actualLineEnd);
            handleContentChange(newValue);
            
            setTimeout(() => {
              const newStart = Math.max(lineStart, start - 4);
              const newEnd = Math.max(lineStart, end - 4);
              textarea.setSelectionRange(newStart, newEnd);
            }, 0);
          } else if (currentLine.startsWith('\t')) {
            const newValue = value.substring(0, lineStart) + currentLine.substring(1) + value.substring(actualLineEnd);
            handleContentChange(newValue);
            
            setTimeout(() => {
              const newStart = Math.max(lineStart, start - 1);
              const newEnd = Math.max(lineStart, end - 1);
              textarea.setSelectionRange(newStart, newEnd);
            }, 0);
          }
        }
      } else {
        // Tab: 增加缩进
        if (listMatch) {
          // 列表项增加缩进 - 在列表标识符前添加4个空格
          const newLine = '    ' + currentLine;
          let newValue = value.substring(0, lineStart) + newLine + value.substring(actualLineEnd);
          
          // 如果是有序列表，重新排序序号
          const isOrderedList = /^\s*\d+\.\s/.test(newLine);
          if (isOrderedList) {
            newValue = renumberOrderedLists(newValue);
          }
          
          handleContentChange(newValue);
          
          setTimeout(() => {
            textarea.setSelectionRange(start + 4, end + 4);
          }, 0);
        } else if (start === end) {
          // 没有选中文本且不是列表项，在光标位置插入缩进
          const newValue = value.substring(0, start) + '    ' + value.substring(end);
          handleContentChange(newValue);
          
          setTimeout(() => {
            textarea.setSelectionRange(start + 4, start + 4);
          }, 0);
        } else {
          // 选中了文本，对每行添加缩进
          const selectedText = value.substring(start, end);
          const lines = selectedText.split('\n');
          const indentedLines = lines.map(line => '    ' + line);
          const newSelectedText = indentedLines.join('\n');
          
          const newValue = value.substring(0, start) + newSelectedText + value.substring(end);
          handleContentChange(newValue);
          
          setTimeout(() => {
            textarea.setSelectionRange(start, start + newSelectedText.length);
          }, 0);
        }
      }
    } else if (e.key === 'Enter') {
      // 如果正在使用输入法组合，不处理Enter键
      if (isComposing) {
        return;
      }
      
      // 处理回车键，自动缩进
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const value = textarea.value;
      
      // 找到当前行的开始
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', start);
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
      const currentLine = value.substring(lineStart, actualLineEnd);
      
      // 检测当前行的缩进
      const indentMatch = currentLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      
      // 检查是否是列表项
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
      if (listMatch) {
        e.preventDefault();
        const listIndent = listMatch[1];
        const listMarker = listMatch[2];
        
        // 如果当前行只有列表标记，删除它
        if (currentLine.trim() === listMarker) {
          const newValue = value.substring(0, lineStart) + listIndent + value.substring(actualLineEnd);
          handleContentChange(newValue);
          setTimeout(() => {
            textarea.setSelectionRange(lineStart + listIndent.length, lineStart + listIndent.length);
          }, 0);
        } else {
          // 创建新的列表项
          let newMarker = listMarker;
          if (/^\d+\./.test(listMarker)) {
            // 数字列表，递增数字
            const num = parseInt(listMarker) + 1;
            newMarker = num + '.';
          }
          
          const newValue = value.substring(0, start) + '\n' + listIndent + newMarker + ' ' + value.substring(start);
          handleContentChange(newValue);
          setTimeout(() => {
            const newPos = start + 1 + listIndent.length + newMarker.length + 1;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
        }
      } else if (indent) {
        // 普通缩进行，保持缩进
        e.preventDefault();
        const newValue = value.substring(0, start) + '\n' + indent + value.substring(start);
        handleContentChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(start + 1 + indent.length, start + 1 + indent.length);
        }, 0);
      }
    }
  };

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: 'var(--bg-primary)',
      height: '100%',
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* 头部工具栏 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-tertiary)',
        height: '60px',
        boxSizing: 'border-box',
      }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              width: '100%',
              color: 'var(--text-primary)',
            }}
            placeholder="笔记标题"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              height: '28px',
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
            <Upload size={16} />
            上传附件
          </button>
          <ExportButton note={note} />
          <button
            onClick={() => onTogglePreview?.()}
            style={{
              padding: '4px 8px',
              backgroundColor: isPreview ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: isPreview ? 'var(--text-on-accent)' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              transition: 'all 0.2s ease',
              height: '28px',
            }}
            onMouseEnter={(e) => {
              if (!isPreview) {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--accent-color)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isPreview) {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }
            }}
            title={isPreview ? '预览模式' : '编辑模式'}
          >
            {isPreview ? (
              <Eye size={16} />
            ) : (
              <Edit size={16} />
            )}
            {isPreview ? '预览' : '编辑'}
          </button>
        </div>
      </div>

      {/* 标签区域 */}
      <div style={{ padding: '17px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
            <Tag size={14} style={{ color: 'var(--text-secondary)' }} />
            {note.tags.map(tag => (
              <span
                key={tag}
                className="tag"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                {tag}
                <X
                  size={10}
                  onClick={() => handleRemoveTag(tag)}
                  style={{ cursor: 'pointer' }}
                />
              </span>
            ))}
            {showTagInput ? (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  onBlur={handleAddTag}
                  placeholder="新标签"
                  autoFocus
                  style={{
                    padding: '2px 6px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    outline: 'none',
                    width: '80px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                style={{
                  padding: '2px 8px',
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                + 添加标签
              </button>
            )}
          </div>
          
          {/* 附件按钮 */}
          {note.attachments.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                data-attachment-button
                onClick={() => setShowAttachments(!showAttachments)}
                style={{
                  padding: '6px 8px',
                  backgroundColor: showAttachments ? 'var(--accent-color)' : 'var(--bg-primary)',
                  color: showAttachments ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!showAttachments) {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showAttachments) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }
                }}
                title={`附件 (${note.attachments.length})`}
              >
                <Paperclip size={14} />
                {note.attachments.length}
              </button>
              
              {/* 附件弹出列表 */}
              {showAttachments && (
                <div data-attachment-popup style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                  minWidth: '250px',
                  maxWidth: '350px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}>
                  <div style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                  }}>
                    附件 ({note.attachments.length})
                  </div>
                  <div style={{ padding: '8px' }}>
                    {note.attachments.map(attachment => (
                      <div
                        key={attachment.id}
                        style={{
                          padding: '8px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {attachment.name}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                            {formatFileSize(attachment.size)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => {
                              insertAttachmentToContent(attachment);
                              setShowAttachments(false);
                            }}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--accent-color)',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="插入到内容"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => downloadAttachment(attachment)}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--accent-color)',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="下载"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={() => {
                              handleRemoveAttachment(attachment.id);
                              if (note.attachments.length === 1) {
                                setShowAttachments(false);
                              }
                            }}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--error-color)',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="删除"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>



      {/* 编辑器/预览区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isPreview ? (
          // 预览模式
          <div style={{ 
            padding: '24px', 
            lineHeight: '1.6',
            flex: 1,
            overflow: 'auto',
            height: '100%',
            boxSizing: 'border-box'
          }}>
            <ReactMarkdown
              className="markdown-content"
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
            >
              {note.content}
            </ReactMarkdown>
          </div>
        ) : (
          // 编辑模式
          <div style={{ 
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
            flex: 1
          }}>
            {settings.showLineNumbers && (
              <div style={{
                width: '50px',
                backgroundColor: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-color)',
                padding: '24px 8px',
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.wordWrap ? '1.6' : '1.4',
                fontFamily: settings.fontFamily === 'mono' 
                  ? 'Monaco, Menlo, "Ubuntu Mono", monospace'
                  : settings.fontFamily === 'serif'
                  ? 'Georgia, "Times New Roman", serif'
                  : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: 'var(--text-secondary)',
                textAlign: 'right',
                userSelect: 'none',
                whiteSpace: 'pre',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}>
                {getLineNumbers(note.content).map(lineNum => (
                  <div key={lineNum} style={{ height: `${settings.fontSize * (settings.wordWrap ? 1.6 : 1.4)}px` }}>
                    {lineNum}
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onClick={handleTextareaClick}
              placeholder={showPlaceholder ? `开始编写你的笔记...

支持 Markdown 语法：
# 标题
**粗体** *斜体*
- 列表项
[链接](url)
![图片](url)

数学公式：
行内公式：$E = mc^2$
块级公式：
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

快捷键：
Tab - 增加缩进（4个空格）
Shift+Tab - 减少缩进
Enter - 智能换行（保持缩进/列表）` : ""}
              style={{
                width: '100%',
                height: '100%',
                flex: 1,
                padding: '24px',
                paddingLeft: settings.showLineNumbers ? '12px' : '24px',
                border: 'none',
                outline: 'none',
                resize: 'none',
                overflow: 'hidden', // 禁用textarea自身的滚动条，避免双滚动条
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.wordWrap ? '1.6' : '1.4',
                fontFamily: settings.fontFamily === 'mono' 
                  ? 'Monaco, Menlo, "Ubuntu Mono", monospace'
                  : settings.fontFamily === 'serif'
                  ? 'Georgia, "Times New Roman", serif'
                  : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
                whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
                wordWrap: settings.wordWrap ? 'break-word' : 'normal',
              }}
            />
          </div>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default Editor;