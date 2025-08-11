import React from 'react';
import { X, Monitor, Sun, Moon, Type, Save, Download, Upload, Palette, Eye, Code } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  storageMode: 'server' | 'local';
  onStorageModeChange?: (mode: 'server' | 'local') => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  isOpen, 
  onClose, 
  storageMode, 
  onStorageModeChange 
}) => {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } = useSettings();

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    updateSettings({ [key]: value });
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importSettings(file);
        alert('设置导入成功！');
      } catch (error) {
        alert(error instanceof Error ? error.message : '设置导入失败！');
      }
    }
  };

  const handleResetSettings = () => {
    if (confirm('确定要重置所有设置吗？')) {
      resetSettings();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--overlay-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        width: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: 'var(--shadow)',
      }}>
        {/* 标题栏 */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
            应用设置
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 设置内容 */}
        <div style={{
          padding: '24px',
          maxHeight: 'calc(80vh - 80px)',
          overflow: 'auto',
        }}>
          {/* 外观设置 */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '16px', 
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Palette size={18} />
              外观设置
            </h3>

            {/* 主题 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                主题模式
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'light', label: '浅色', icon: Sun },
                  { value: 'dark', label: '深色', icon: Moon },
                  { value: 'auto', label: '跟随系统', icon: Monitor }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleSettingChange('theme', value)}
                    style={{
                      padding: '8px 12px',
                      border: `1px solid ${settings.theme === value ? settings.accentColor : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      backgroundColor: settings.theme === value ? `${settings.accentColor}10` : 'var(--bg-primary)',
                      color: settings.theme === value ? settings.accentColor : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (settings.theme !== value) {
                        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                        e.currentTarget.style.borderColor = settings.accentColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (settings.theme !== value) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 主题色 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                主题色
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#607D8B'].map(color => (
                  <button
                    key={color}
                    onClick={() => handleSettingChange('accentColor', color)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: color,
                      border: settings.accentColor === color ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 编辑器设置 */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '16px', 
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Code size={18} />
              编辑器设置
            </h3>

            {/* 字体大小 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                字体大小: {settings.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="20"
                value={settings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* 字体族 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                字体族
              </label>
              <select
                value={settings.fontFamily}
                onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="system">系统字体</option>
                <option value="mono">等宽字体</option>
                <option value="serif">衬线字体</option>
              </select>
            </div>

            {/* 编辑模式 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                默认编辑模式
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'edit', label: '编辑', icon: Code },
                  { value: 'preview', label: '预览', icon: Eye },
                  { value: 'split', label: '分屏', icon: Monitor }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleSettingChange('editorMode', value)}
                    style={{
                      padding: '8px 12px',
                      border: `1px solid ${settings.editorMode === value ? settings.accentColor : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      backgroundColor: settings.editorMode === value ? `${settings.accentColor}10` : 'var(--bg-primary)',
                      color: settings.editorMode === value ? settings.accentColor : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 编辑器选项 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.showLineNumbers}
                  onChange={(e) => handleSettingChange('showLineNumbers', e.target.checked)}
                />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>显示行号</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.wordWrap}
                  onChange={(e) => handleSettingChange('wordWrap', e.target.checked)}
                />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>自动换行</span>
              </label>
            </div>
          </div>

          {/* 存储设置 */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '16px', 
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Save size={18} />
              存储设置
            </h3>

            {/* 存储模式 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                当前存储模式
              </label>
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: storageMode === 'server' ? 'var(--success-color)' : 'var(--warning-color)',
                }}></div>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {storageMode === 'server' ? '服务端存储' : '本地存储'}
                </span>
              </div>
            </div>

            {/* 自动保存 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>启用自动保存</span>
              </label>
              {settings.autoSave && (
                <div>
                  <label style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    自动保存间隔: {settings.autoSaveInterval}秒
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={settings.autoSaveInterval}
                    onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '20px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={exportSettings}
              style={{
                padding: '8px 16px',
                backgroundColor: settings.accentColor,
                color: 'var(--text-on-accent)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
              <Download size={14} />
              导出设置
            </button>
            
            <label style={{
              padding: '8px 16px',
              backgroundColor: 'var(--bg-primary)',
              color: settings.accentColor,
              border: `1px solid ${settings.accentColor}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Upload size={14} />
              导入设置
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                style={{ display: 'none' }}
              />
            </label>

            <button
                onClick={handleResetSettings}
                style={{
                padding: '8px 16px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                e.currentTarget.style.borderColor = 'var(--error-color)';
                e.currentTarget.style.color = 'var(--error-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              重置设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;