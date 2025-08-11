import React from 'react';
import { ViewMode } from '../types';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  currentMode,
  onModeChange,
}) => {
  const modes = [
    { 
      key: 'fullscreen' as ViewMode, 
      label: '全屏模式', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
      )
    },
    { 
      key: 'two-column' as ViewMode, 
      label: '双列模式', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3v18h8V3H3zm2 16V5h4v14H5zm8-16v18h8V3h-8zm2 2h4v14h-4V5z"/>
        </svg>
      )
    },
    { 
      key: 'three-column' as ViewMode, 
      label: '三列模式', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3v18h5V3H3zm2 16V5h1v14H5zm5-16v18h4V3h-4zm2 2h0v14h0V5zm4-2v18h5V3h-5zm2 2h1v14h-1V5z"/>
        </svg>
      )
    },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '2px',
      padding: '2px',
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '4px',
      border: '1px solid var(--border-color)',
    }}>
      {modes.map((mode) => (
        <button
          key={mode.key}
          onClick={() => onModeChange(mode.key)}
          title={mode.label}
          style={{
            padding: '6px',
            border: 'none',
            borderRadius: '3px',
            backgroundColor: currentMode === mode.key ? 'var(--accent-color)' : 'transparent',
            color: currentMode === mode.key ? 'var(--text-on-accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            minWidth: '28px',
            height: '28px',
          }}
          onMouseEnter={(e) => {
            if (currentMode !== mode.key) {
              e.currentTarget.style.backgroundColor = 'var(--accent-color-light)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentMode !== mode.key) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          {mode.icon}
        </button>
      ))}
    </div>
  );
};

export default ViewModeSelector;