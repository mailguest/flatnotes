import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size = 24, className, style }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none"
      className={className}
      style={style}
    >
      <circle 
        cx="16" 
        cy="16" 
        r="15" 
        fill="var(--accent-color)" 
        stroke="var(--accent-color)" 
        strokeWidth="2"
      />
      <rect 
        x="8" 
        y="7" 
        width="16" 
        height="18" 
        rx="2" 
        fill="white" 
        opacity="0.9"
      />
      <line 
        x1="11" 
        y1="12" 
        x2="21" 
        y2="12" 
        stroke="var(--accent-color)" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <line 
        x1="11" 
        y1="16" 
        x2="19" 
        y2="16" 
        stroke="var(--accent-color)" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <line 
        x1="11" 
        y1="20" 
        x2="17" 
        y2="20" 
        stroke="var(--accent-color)" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <line 
        x1="10.5" 
        y1="9" 
        x2="10.5" 
        y2="23" 
        stroke="#dee2e6" 
        strokeWidth="1"
      />
    </svg>
  );
};

export default Logo;