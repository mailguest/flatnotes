import React, { useState, useEffect } from 'react';
import { getSyncStatus, forceSyncToServer, checkForDataUpdates } from '../utils/storage';
import { ViewMode } from '../types';
import ViewModeSelector from './ViewModeSelector';

interface SyncStatusProps {
  className?: string;
  showViewModeSelector?: boolean;
  currentViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ 
  className = '', 
  showViewModeSelector = false,
  currentViewMode,
  onViewModeChange 
}) => {
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // 定期更新同步状态
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!syncStatus.useServerStorage || !syncStatus.isOnline || isManualSyncing || isCheckingUpdates) {
      return;
    }

    // 如果有待同步的更改，执行上传同步
    if (syncStatus.pendingChanges > 0) {
      setIsManualSyncing(true);
      try {
        await forceSyncToServer();
        setSyncStatus(getSyncStatus());
      } catch (error) {
        console.error('手动同步失败:', error);
      } finally {
        setIsManualSyncing(false);
      }
    } else {
      // 如果没有待同步的更改，检查服务器更新
      setIsCheckingUpdates(true);
      try {
        await checkForDataUpdates();
        setSyncStatus(getSyncStatus());
      } catch (error) {
        console.error('检查数据更新失败:', error);
      } finally {
        setIsCheckingUpdates(false);
      }
    }
  };

  const getStatusIcon = () => {
    if (!syncStatus.useServerStorage) {
      return '💾'; // 本地存储
    }
    
    if (!syncStatus.isOnline) {
      return '📡'; // 离线
    }
    
    if (isManualSyncing) {
      return '🔄'; // 同步中
    }
    
    if (isCheckingUpdates) {
      return '🔍'; // 检查中
    }
    
    if (syncStatus.pendingChanges > 0) {
      return '⏳'; // 待同步
    }
    
    return '✅'; // 已同步
  };

  const getStatusText = () => {
    if (!syncStatus.useServerStorage) {
      return '本地存储';
    }
    
    if (!syncStatus.isOnline) {
      return '离线模式';
    }
    
    if (isManualSyncing) {
      return '同步中...';
    }
    
    if (isCheckingUpdates) {
      return '检查更新中...';
    }
    
    if (syncStatus.pendingChanges > 0) {
      return `待同步 (${syncStatus.pendingChanges})`;
    }
    
    const lastSync = syncStatus.lastSyncTime;
    if (lastSync) {
      const timeDiff = Date.now() - lastSync.getTime();
      const minutes = Math.floor(timeDiff / 60000);
      if (minutes < 1) {
        return '刚刚同步';
      } else if (minutes < 60) {
        return `${minutes}分钟前同步`;
      } else {
        const hours = Math.floor(minutes / 60);
        return `${hours}小时前同步`;
      }
    }
    
    return '已同步';
  };

  const getStatusColor = () => {
    if (!syncStatus.useServerStorage) {
      return 'var(--text-secondary)'; // 灰色
    }
    
    if (!syncStatus.isOnline) {
      return 'var(--warning-color)'; // 橙色
    }
    
    if (syncStatus.pendingChanges > 0) {
      return 'var(--accent-color)'; // 蓝色
    }
    
    return 'var(--success-color)'; // 绿色
  };

  return (
    <div 
      className={`sync-status ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      {/* 同步状态 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '6px',
          fontSize: '12px',
          color: getStatusColor(),
          cursor: syncStatus.useServerStorage && syncStatus.isOnline && !isManualSyncing && !isCheckingUpdates ? 'pointer' : 'default',
          userSelect: 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (syncStatus.useServerStorage && syncStatus.isOnline && !isManualSyncing && !isCheckingUpdates) {
            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
        }}
        onClick={handleSync}
        title={
          syncStatus.useServerStorage && syncStatus.isOnline && !isManualSyncing && !isCheckingUpdates
            ? (syncStatus.pendingChanges > 0 ? '点击上传同步' : '点击检查更新')
            : getStatusText()
        }
      >
        <span style={{ fontSize: '14px' }}>
          {getStatusIcon()}
        </span>
        <span>
          {getStatusText()}
        </span>
        {syncStatus.useServerStorage && syncStatus.isOnline && !isManualSyncing && !isCheckingUpdates && (
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            ↻
          </span>
        )}
      </div>

      {/* 视图模式切换器 */}
      {showViewModeSelector && currentViewMode && onViewModeChange && (
        <ViewModeSelector
          currentMode={currentViewMode}
          onModeChange={onViewModeChange}
        />
      )}
    </div>
  );
};

export default SyncStatus;