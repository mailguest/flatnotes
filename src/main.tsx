import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'



// 调整颜色亮度的辅助函数
function adjustColor(color: string, amount: number): string {
  // 简单的颜色调整，如果是 hex 颜色
  if (color.startsWith('#')) {
    const num = parseInt(color.slice(1), 16)
    const r = Math.max(0, Math.min(255, (num >> 16) + amount))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }
  return color // 如果不是 hex 颜色，直接返回原色
}

// 动态更新 favicon 以跟随主题变化
function updateFavicon() {
  // 获取当前 CSS 变量的实际值
  const computedStyle = getComputedStyle(document.documentElement)
  const accentColor = computedStyle.getPropertyValue('--accent-color').trim()
  
  // 生成稍深的强调色作为描边色
  const accentColorDark = adjustColor(accentColor, -20)
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <!-- 背景圆形 -->
      <circle cx="16" cy="16" r="15" fill="${accentColor}" stroke="${accentColorDark}" stroke-width="2"/>
      
      <!-- 笔记本图标 -->
      <rect x="8" y="7" width="16" height="18" rx="2" fill="white" opacity="0.9"/>
      
      <!-- 笔记本线条 -->
      <line x1="11" y1="12" x2="21" y2="12" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="11" y1="16" x2="19" y2="16" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="11" y1="20" x2="17" y2="20" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round"/>
      
      <!-- 左侧装订线 -->
      <line x1="10.5" y1="9" x2="10.5" y2="23" stroke="#dee2e6" strokeWidth="1"/>
    </svg>
  `
  
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  
  // 更新 favicon
  let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    document.head.appendChild(link)
  }
  link.href = url
  
  // 更新 apple-touch-icon
  let appleLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
  if (!appleLink) {
    appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    document.head.appendChild(appleLink)
  }
  appleLink.href = url
}

// 初始化 favicon
updateFavicon()

// 监听主题变化
const observer = new MutationObserver(() => {
  updateFavicon()
})

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme']
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)