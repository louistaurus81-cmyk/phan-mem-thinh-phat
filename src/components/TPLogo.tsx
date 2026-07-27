import React from 'react';

interface TPLogoProps {
  className?: string;
  size?: number;
  src?: string;
}

export function TPLogo({ className = "w-8 h-8", size, src = "/favicon.svg" }: TPLogoProps) {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <img 
      src={src} 
      alt="Thịnh Phát Logo" 
      className={`shrink-0 object-contain ${className}`}
      style={style}
    />
  );
}

export default TPLogo;
