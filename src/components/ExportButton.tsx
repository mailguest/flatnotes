import React, { useState, useRef } from 'react';
import { Download, FileText, Image, FileDown } from 'lucide-react';
import { Note } from '../types';
import { exportToMarkdown, exportToImage, exportToPDF, exportToWord } from '../utils/exportUtils';

interface ExportButtonProps {
  note: Note;
}

const ExportButton: React.FC<ExportButtonProps> = ({ note }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportButtonRef = useRef<HTMLDivElement>(null);

  const exportFormats = [
    {
      id: 'markdown',
      name: 'Markdown',
      icon: <FileText size={16} />,
      description: '原始 Markdown 格式',
      handler: () => exportToMarkdown(note)
    },
    {
      id: 'image',
      name: '图片 (PNG)',
      icon: <Image size={16} />,
      description: 'Markdown 预览效果',
      handler: () => exportToImage(note)
    },
    {
      id: 'pdf',
      name: 'PDF',
      icon: <FileDown size={16} />,
      description: '文字格式 PDF 文档',
      handler: () => exportToPDF(note)
    },
    {
      id: 'word',
      name: 'Word 文档',
      icon: <FileText size={16} />,
      description: 'Markdown 预览效果',
      handler: () => exportToWord(note)
    }
  ];

  const handleExport = async (format: typeof exportFormats[0]) => {
    if (isExporting) return;
    
    setIsExporting(true);
    setShowExportMenu(false);
    
    try {
      await format.handler();
    } catch (error) {
      console.error(`导出${format.name}失败:`, error);
      alert(`导出${format.name}失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 点击外部关闭菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && exportButtonRef.current && !exportButtonRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  return (
    <div ref={exportButtonRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        disabled={isExporting}
        style={{
          padding: '4px 8px',
          backgroundColor: showExportMenu ? 'var(--accent-color)' : 'var(--bg-secondary)',
          color: showExportMenu ? 'var(--text-on-accent)' : 'var(--text-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          transition: 'all 0.2s ease',
          height: '28px',
          opacity: isExporting ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!showExportMenu && !isExporting) {
            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--accent-color)';
          }
        }}
        onMouseLeave={(e) => {
          if (!showExportMenu && !isExporting) {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }
        }}
        title="导出笔记"
      >
        <Download size={16} />
        {isExporting ? '导出中...' : '导出'}
      </button>

      {/* 导出格式选择菜单 */}
      {showExportMenu && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          minWidth: '200px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
          }}>
            选择导出格式
          </div>
          <div style={{ padding: '4px' }}>
            {exportFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleExport(format)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  transition: 'background-color 0.2s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ color: 'var(--accent-color)' }}>
                  {format.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500' }}>{format.name}</div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)',
                    marginTop: '2px'
                  }}>
                    {format.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;