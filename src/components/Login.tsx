import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import Logo from './Logo';

interface LoginProps {
  onLogin: (token: string) => void;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, error }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isUsingDefaultPassword, setIsUsingDefaultPassword] = useState(true);

  // 检测是否使用默认密码
  useEffect(() => {
    const checkPasswordConfig = async () => {
      try {
        const response = await fetch('/api/auth/config');
        if (response.ok) {
          const data = await response.json();
          setIsUsingDefaultPassword(data.isUsingDefaultPassword || false);
        }
      } catch (err) {
        // 如果无法获取配置信息，默认显示提示
        setIsUsingDefaultPassword(true);
      }
    };
    checkPasswordConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setLoginError('请输入密码');
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('auth_token', data.token);
        onLogin(data.token);
      } else {
        setLoginError(data.error || '登录失败');
      }
    } catch (err) {
      setLoginError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
        }}>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <Logo size={24} />
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              FlatNotes
            </h1>
          </div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            请输入密码以访问您的笔记
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}>
              密码
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入访问密码"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--accent-color)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {(loginError || error) && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <p style={{
                fontSize: '14px',
                color: '#ef4444',
                margin: 0,
              }}>
                {loginError || error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '500',
              color: isLoading || !password.trim() 
                ? 'var(--accent-color)' 
                : 'white',
              backgroundColor: isLoading || !password.trim() 
                ? 'var(--accent-color-light)' 
                : 'var(--accent-color)',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || !password.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
            }}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        {isUsingDefaultPassword && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              margin: '0 0 8px 0',
              fontWeight: '500',
            }}>
              💡 提示
            </p>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              margin: 0,
              lineHeight: '1.4',
            }}>
              默认密码为 <code style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '2px 4px',
                borderRadius: '4px',
                fontSize: '11px',
              }}>flatnotes123</code>，建议通过环境变量 AUTH_PASSWORD 设置自定义密码。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;