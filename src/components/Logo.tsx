import React, { useState } from 'react';
import { APP_CONFIG } from '../constants';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ className = '', variant = 'dark' }) => {
  const isDarkText = variant === 'dark';
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Logo Image with URL from APP_CONFIG */}
      {!imageError ? (
        <img
          src={APP_CONFIG.logoUrl}
          alt={`${APP_CONFIG.name} Logo`}
          onError={() => setImageError(true)}
          className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-xl shrink-0"
        />
      ) : (
        <div className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FFFFFF] border-2 border-[#D98800] shadow-xs overflow-hidden p-1 shrink-0">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <path
              d="M16 4C9.37 4 4 9.37 4 16C4 18.25 4.62 20.35 5.7 22.15L4 28L10.12 26.43C11.83 27.43 13.85 28 16 28C22.63 28 28 22.63 28 16C28 9.37 22.63 4 16 4Z"
              stroke="#0F1D38"
              strokeWidth="2"
              fill="#FFFFFF"
            />
            <path
              d="M16 9V21M12 21H20"
              stroke="#D98800"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M10 13H22"
              stroke="#D98800"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M10 13L8 17M10 13L12 17"
              stroke="#0F1D38"
              strokeWidth="1.2"
            />
            <path
              d="M22 13L20 17M22 13L24 17"
              stroke="#0F1D38"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      )}

      {/* Wordmark */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-[#D4A017] font-bold text-lg tracking-tight">
          {APP_CONFIG.hindiName.split(' ')[0]}
        </span>
        <span
          className={`font-bold text-lg tracking-tight ${
            isDarkText ? 'text-[#1F3864]' : 'text-[#FFFFFF]'
          }`}
        >
          Wakeel <span className="text-[#D4A017]">AI</span>
        </span>
      </div>
    </div>
  );
};
