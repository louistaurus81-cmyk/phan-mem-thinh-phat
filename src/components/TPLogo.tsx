import React from 'react';

interface TPLogoProps {
  className?: string;
  size?: number;
}

export function TPLogo({ className = "w-8 h-8", size }: TPLogoProps) {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg 
      viewBox="0 0 200 200" 
      className={`shrink-0 ${className}`}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <g fill="#E10600">
        {/* 1. Topmost horizontal bar */}
        <rect x="40" y="16" width="110" height="10" rx="1" />

        {/* 2. Far left thin vertical accent bar */}
        <polygon points="40,50 49,50 49,152 40,140" />

        {/* 3. Letter 'T' (Top left sloped wing & main vertical stem) */}
        <path d="
          M 14,50 
          L 52,30 
          L 118,30 
          L 110,48 
          L 76,48 
          L 76,182 
          L 52,182 
          L 52,50 
          Z
        " />

        {/* 4. Letter 'P' (Stem & Rounded Loop) */}
        <path 
          fillRule="evenodd"
          clipRule="evenodd"
          d="
            M 88,58 
            L 122,30 
            C 162,30 190,48 190,72 
            C 190,96 162,106 122,106 
            L 114,106 
            L 114,182 
            L 88,182 
            Z

            M 114,50 
            L 126,50 
            C 148,50 164,58 164,72 
            C 164,86 148,88 126,88 
            L 114,88 
            Z
          " 
        />

        {/* 5. Bottom Right Shield Ribbon Line */}
        <polygon points="144,106 152,106 152,138 114,176 98,182 114,196 122,188 164,146 164,106" />
      </g>
    </svg>
  );
}

export default TPLogo;
