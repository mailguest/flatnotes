import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: 'system' | 'mono' | 'serif';
  editorMode: 'edit' | 'preview';
  autoSave: boolean;
  autoSaveInterval: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  accentColor: string;
  language: 'zh' | 'en';
}

export const defaultSettings: AppSettings = {
  theme: 'light',
  fontSize: 14,
  fontFamily: 'system',
  editorMode: 'edit',
  autoSave: true,
  autoSaveInterval: 5,
  showLineNumbers: false,
  wordWrap: true,
  accentColor: '#2196F3',
  language: 'zh'
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => void;
  importSettings: (file: File) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // 加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('flatnotes-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    }
  }, []);

  // 应用主题
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      let actualTheme = settings.theme;
      
      if (settings.theme === 'auto') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      // 设置data-theme属性
      root.setAttribute('data-theme', actualTheme);
      
      // 应用主题色
      root.style.setProperty('--accent-color', settings.accentColor);
      root.style.setProperty('--accent-color-light', settings.accentColor + '20');
      root.style.setProperty('--accent-color-dark', settings.accentColor + 'dd');
    };

    applyTheme();

    // 监听系统主题变化
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [settings.theme, settings.accentColor]);

  // 应用字体设置
  useEffect(() => {
    const root = document.documentElement;
    
    // 设置字体大小
    root.style.setProperty('--font-size-base', `${settings.fontSize}px`);
    
    // 设置字体族
    let fontFamily = '';
    switch (settings.fontFamily) {
      case 'system':
        fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif';
        break;
      case 'mono':
        fontFamily = '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace';
        break;
      case 'serif':
        fontFamily = '"Times New Roman", "Georgia", "serif"';
        break;
    }
    root.style.setProperty('--font-family-base', fontFamily);
  }, [settings.fontSize, settings.fontFamily]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('flatnotes-settings', JSON.stringify(updatedSettings));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('flatnotes-settings', JSON.stringify(defaultSettings));
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flatnotes-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          updateSettings(imported);
          resolve();
        } catch (error) {
          reject(new Error('设置文件格式错误'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      resetSettings,
      exportSettings,
      importSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};