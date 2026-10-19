import React from 'react';

interface AivoraLogoProps {
  className?: string;
}

export const AivoraLogo: React.FC<AivoraLogoProps> = ({ className = 'h-8 w-8' }) => (
  <svg className={className} viewBox="0 0 34 34" fill="none" aria-hidden="true">
    <rect width="34" height="34" rx="9" fill="#0F3D36" />
    <path
      d="M17 7.5C11.753 7.5 7.5 11.753 7.5 17C7.5 22.247 11.753 26.5 17 26.5C22.247 26.5 26.5 22.247 26.5 17"
      stroke="#D9FF5B"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="21" cy="12.5" r="3" fill="#D9FF5B" />
    <path
      d="M12.5 17L15.5 20L21.5 13.5"
      stroke="#D9FF5B"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
