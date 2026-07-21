import React from 'react';

interface GlossyRetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'action' | 'visitor' | 'default';
  disabled?: boolean;
}

export default function GlossyRetroButton({
  id,
  onClick,
  children,
  className = '',
  variant = 'default',
  disabled = false,
  ...props
}: GlossyRetroButtonProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full py-3.5 px-6
        rounded-md
        font-sans font-black text-sm uppercase tracking-wider
        ${variant === 'visitor' ? 'text-[#101012]' : 'text-black'} text-center select-none
        border-2 border-[#5a6b6c]
        bg-gradient-to-b from-[#d1dcdc] via-[#a8b8b9] to-[#798a8b]
        shadow-[inset_0_3px_5px_rgba(255,255,255,0.95),_inset_0_-3px_5px_rgba(0,0,0,0.35),_0_3px_6px_rgba(0,0,0,0.25)]
        cursor-pointer
        transition-all duration-250 ease-out
        hover:brightness-105
        hover:border-[#ec4899]
        hover:text-[#ff39ef]
        hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-2px_4px_rgba(0,0,0,0.25),_0_0_18px_rgba(236,72,153,0.7)]
        active:translate-y-[2px]
        active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),_0_0_6px_rgba(236,72,153,0.45)]
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
      style={{
        textShadow: '0px 1px 0px rgba(255, 255, 255, 0.4)',
      }}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
