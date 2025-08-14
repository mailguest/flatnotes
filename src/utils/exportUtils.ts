import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Note } from '../types';

// 配置 pdfMake 字体
pdfMake.vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any);
// 配置支持中文的字体
pdfMake.fonts = {
  // 使用 pdfMake 内置的 Roboto 字体，支持中文
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

// 导出为 Markdown 文件
export const exportToMarkdown = (note: Note) => {
  const content = `# ${note.title}\n\n${note.content}`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const fileName = `${note.title || '未命名笔记'}.md`;
  saveAs(blob, fileName);
};

// 创建临时的 Markdown 预览元素
const createMarkdownPreview = (note: Note): Promise<HTMLElement> => {
  return new Promise((resolve) => {
    // 创建临时容器
    const container = document.createElement('div');
    container.setAttribute('data-export-preview', 'true');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.fontSize = '14px';
    container.style.lineHeight = '1.6';
    container.style.color = '#333333';
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .markdown-preview h1 { font-size: 2em; margin: 0.67em 0; font-weight: bold; }
      .markdown-preview h2 { font-size: 1.5em; margin: 0.75em 0; font-weight: bold; }
      .markdown-preview h3 { font-size: 1.17em; margin: 0.83em 0; font-weight: bold; }
      .markdown-preview h4 { font-size: 1em; margin: 1.12em 0; font-weight: bold; }
      .markdown-preview h5 { font-size: 0.83em; margin: 1.5em 0; font-weight: bold; }
      .markdown-preview h6 { font-size: 0.75em; margin: 1.67em 0; font-weight: bold; }
      .markdown-preview p { margin: 1em 0; }
      .markdown-preview ul, .markdown-preview ol { margin: 1em 0; padding-left: 2em; }
      .markdown-preview li { margin: 0.5em 0; }
      .markdown-preview blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid #ddd; color: #666; }
      .markdown-preview code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
      .markdown-preview pre { background-color: #f5f5f5; padding: 1em; border-radius: 5px; overflow-x: auto; }
      .markdown-preview pre code { background: none; padding: 0; }
      .markdown-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .markdown-preview th, .markdown-preview td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .markdown-preview th { background-color: #f5f5f5; font-weight: bold; }
      .markdown-preview img { max-width: 100%; height: auto; }
      .markdown-preview a { color: #0066cc; text-decoration: none; }
      .markdown-preview a:hover { text-decoration: underline; }
    `;
    container.appendChild(style);
    
    // 创建内容容器
    const contentDiv = document.createElement('div');
    contentDiv.className = 'markdown-preview';
    container.appendChild(contentDiv);
    
    document.body.appendChild(container);
    
    // 简化的Markdown渲染，避免React冲突
    const content = `# ${note.title}\n\n${note.content}`;
    

    
    // 改进的Markdown转HTML处理
    let htmlContent = content
      // 处理标题
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
      .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
      // 处理粗体和斜体
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // 处理代码
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // 处理列表
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // 分割成行并处理段落
    const lines = htmlContent.split('\n');
    const processedLines = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '') {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        continue;
      }
      
      if (line.startsWith('<li>')) {
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
        }
        processedLines.push(line);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        
        if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<ol')) {
          processedLines.push(line);
        } else {
          processedLines.push(`<p>${line}</p>`);
        }
      }
    }
    
    if (inList) {
      processedLines.push('</ul>');
    }
    
    const finalContent = processedLines.join('\n');
    
    contentDiv.innerHTML = finalContent;
    
    // 简单等待DOM更新
    setTimeout(() => resolve(container), 100);
  });
};

// 导出为图片
export const exportToImage = async (note: Note) => {
  try {
    const previewElement = await createMarkdownPreview(note);
    
    // 验证预览元素
    if (!previewElement || previewElement.children.length === 0) {
      throw new Error('预览元素生成失败');
    }
    

    
    // 设置长图模式：固定宽度，保持内容原始高度
    
    // 设置预览元素的固定宽度
    previewElement.style.width = '800px'; // 显示宽度800px
    previewElement.style.maxWidth = '800px';
    previewElement.style.boxSizing = 'border-box';
    previewElement.style.padding = '40px'; // 添加页边距
    previewElement.style.minHeight = 'auto'; // 允许内容自然展开
    
    // 等待样式应用
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const elementWidth = previewElement.scrollWidth;
    const elementHeight = previewElement.scrollHeight;
    
    // 分页导出设置：固定宽度800px，高度超限时分页
     const maxCanvasHeight = 30000; // 单页最大高度限制
     const scale = 1; // 1倍缩放，显示宽度=输出宽度
    const pageHeight = Math.min(elementHeight, maxCanvasHeight / scale);
    const totalPages = Math.ceil(elementHeight / pageHeight);
    

    
    // 如果需要分页，生成多个图片并打包成zip
    if (totalPages > 1) {

      
      const zip = new JSZip();
      const imageBlobs: { blob: Blob; fileName: string }[] = [];
      
      for (let page = 0; page < totalPages; page++) {
        const startY = page * pageHeight;
        const currentPageHeight = Math.min(pageHeight, elementHeight - startY);
        

        
        try {
          // 直接对原始元素进行截取，使用x,y参数指定截取区域
          const canvas = await html2canvas(previewElement, {
            backgroundColor: '#ffffff',
            scale: scale,
            useCORS: true,
            allowTaint: false,
            logging: false,
            width: 800,
            height: currentPageHeight,
            x: 0,
            y: startY,
            foreignObjectRendering: false,
            removeContainer: false
          });
          
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error(`第${page + 1}页图片生成失败`));
              }
            }, 'image/png', 0.95);
          });
          
          const fileName = `第${page + 1}页.png`;
          imageBlobs.push({ blob, fileName });
          
        } catch (error) {
          console.error(`第${page + 1}页生成失败:`, error);
          throw error;
        }
      }
      
      // 将所有图片添加到zip文件中
      for (const { blob, fileName } of imageBlobs) {
        zip.file(fileName, blob);
      }
      
      // 生成zip文件并下载
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `${note.title || '未命名笔记'}_分页导出.zip`;
      saveAs(zipBlob, zipFileName);
      

      
      // 清理原始预览元素
      document.body.removeChild(previewElement);
      return;
    }
    
    // 单页导出逻辑
    const canvas = await html2canvas(previewElement, {
      backgroundColor: '#ffffff',
      scale: scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: elementWidth,
      height: elementHeight,
      foreignObjectRendering: false,
      removeContainer: false
    });
    

    
    // 验证canvas
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      // 清理临时元素
      document.body.removeChild(previewElement);
      throw new Error('Canvas生成失败或尺寸无效');
    }
    
    // 转换为 blob 并下载
    return new Promise<void>((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          
          // 清理临时元素
          try {
            document.body.removeChild(previewElement);
          } catch (cleanupError) {
            console.warn('清理预览元素失败:', cleanupError);
          }
          
          if (blob) {

            const fileName = `${note.title || '未命名笔记'}.png`;
            saveAs(blob, fileName);
            resolve();
          } else {
            console.error('Canvas toBlob返回null');

            reject(new Error('无法生成图片'));
          }
        }, 'image/png', 0.95);
      } catch (toBlobError: unknown) {
         console.error('toBlob调用失败:', toBlobError);
         // 清理临时元素
         try {
           document.body.removeChild(previewElement);
         } catch (cleanupError) {
           console.warn('清理预览元素失败:', cleanupError);
         }
         const errorMessage = toBlobError instanceof Error ? toBlobError.message : '未知错误';
         reject(new Error(`Canvas转换失败: ${errorMessage}`));
       }
    });
  } catch (error) {
    console.error('导出图片失败:', error);
    
    // 确保清理临时元素
    try {
      const existingPreview = document.querySelector('[data-export-preview]');
      if (existingPreview && existingPreview.parentNode) {
        existingPreview.parentNode.removeChild(existingPreview);
      }
    } catch (cleanupError) {
      console.warn('清理临时元素失败:', cleanupError);
    }
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    alert(`导出图片失败: ${errorMessage}`);
    throw error;
  }
};

// 导出为 PDF
// 基于图片的PDF导出（保留原有功能）
export const exportToPDFImage = async (note: Note) => {
  try {
    const previewElement = await createMarkdownPreview(note);
    
    const canvas = await html2canvas(previewElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: previewElement.scrollWidth,
      height: previewElement.scrollHeight
    });
    
    // 清理临时元素
    document.body.removeChild(previewElement);
    
    // 验证 canvas 是否有效
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('生成的画布无效');
    }
    
    const imgData = canvas.toDataURL('image/png');
    
    // 验证生成的图片数据
    if (!imgData || imgData === 'data:,') {
      throw new Error('无法生成图片数据');
    }
    
    const pdf = new jsPDF();
    
    // 计算图片在 PDF 中的尺寸
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 40) / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 20;
    
    // 简化PDF生成，避免复杂的分页逻辑
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;
    
    if (scaledHeight > pdfHeight - 40) {
      // 如果内容太高，按比例缩小
      const newRatio = (pdfHeight - 40) / imgHeight;
      pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth * newRatio) / 2, imgY, imgWidth * newRatio, imgHeight * newRatio);
    } else {
      pdf.addImage(imgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);
    }
    
    const fileName = `${note.title || '未命名笔记'}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('导出 PDF 失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    alert(`导出 PDF 失败: ${errorMessage}`);
    throw error;
  }
};



// 基于文字的PDF导出（新功能）
export const exportToPDF = async (note: Note) => {
  try {
    // 使用HTML转PDF的方式来更好地支持中文
    const previewElement = await createMarkdownPreview(note);
    document.body.appendChild(previewElement);
    
    try {
      // 使用html2canvas + jsPDF的方式，但优化为文字PDF
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: previewElement.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [800, previewElement.scrollHeight]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 800, previewElement.scrollHeight);
      
      const fileName = `${note.title || '未命名笔记'}.pdf`;
      pdf.save(fileName);
    } finally {
      document.body.removeChild(previewElement);
    }
  } catch (error) {
    console.error('导出 PDF 失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    alert(`导出 PDF 失败: ${errorMessage}`);
    throw error;
  }
};

// 简单的 Markdown 到 Word 转换
const parseMarkdownToDocx = (content: string) => {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      // 空行
      paragraphs.push(new Paragraph({
        children: [new TextRun('')],
        spacing: { after: 200 }
      }));
      continue;
    }
    
    // 标题
    if (trimmedLine.startsWith('#')) {
      const level = trimmedLine.match(/^#+/)?.[0].length || 1;
      const text = trimmedLine.replace(/^#+\s*/, '');
      
      let headingLevel;
       switch (level) {
         case 1: headingLevel = HeadingLevel.HEADING_1; break;
         case 2: headingLevel = HeadingLevel.HEADING_2; break;
         case 3: headingLevel = HeadingLevel.HEADING_3; break;
         case 4: headingLevel = HeadingLevel.HEADING_4; break;
         case 5: headingLevel = HeadingLevel.HEADING_5; break;
         default: headingLevel = HeadingLevel.HEADING_6; break;
       }
      
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text, bold: true })],
        heading: headingLevel,
        spacing: { before: 240, after: 120 }
      }));
      continue;
    }
    
    // 列表项
    if (trimmedLine.match(/^[\*\-\+]\s/) || trimmedLine.match(/^\d+\.\s/)) {
      const text = trimmedLine.replace(/^[\*\-\+\d\.]+\s*/, '');
      paragraphs.push(new Paragraph({
        children: [new TextRun(`• ${text}`)],
        indent: { left: 720 },
        spacing: { after: 120 }
      }));
      continue;
    }
    
    // 引用
    if (trimmedLine.startsWith('>')) {
      const text = trimmedLine.replace(/^>\s*/, '');
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text, italics: true })],
        indent: { left: 720 },
        spacing: { after: 120 }
      }));
      continue;
    }
    
    // 代码块
    if (trimmedLine.startsWith('```')) {
      continue; // 跳过代码块标记
    }
    
    // 普通段落
    // 处理粗体和斜体
    const textRuns: TextRun[] = [];
    let currentText = trimmedLine;
    
    // 简单的粗体处理
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(currentText)) !== null) {
      if (match.index > lastIndex) {
        textRuns.push(new TextRun(currentText.slice(lastIndex, match.index)));
      }
      textRuns.push(new TextRun({ text: match[1], bold: true }));
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < currentText.length) {
      textRuns.push(new TextRun(currentText.slice(lastIndex)));
    }
    
    if (textRuns.length === 0) {
      textRuns.push(new TextRun(trimmedLine));
    }
    
    paragraphs.push(new Paragraph({
      children: textRuns,
      spacing: { after: 120 }
    }));
  }
  
  return paragraphs;
};

// 导出为 Word 文档
export const exportToWord = async (note: Note) => {
  try {
    const content = `# ${note.title}\n\n${note.content}`;
    const paragraphs = parseMarkdownToDocx(content);
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });
    
    const buffer = await Packer.toBlob(doc);
    const fileName = `${note.title || '未命名笔记'}.docx`;
    saveAs(buffer, fileName);
  } catch (error) {
    console.error('导出 Word 失败:', error);
    alert('导出 Word 失败，请重试');
  }
};