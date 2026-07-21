import React, { useState, useEffect } from 'react';

interface CustomGothicCursorProps {
  themeId: string;
}

export function CustomGothicCursor({ themeId }: CustomGothicCursorProps) {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isClicking, setIsClicking] = useState(false);
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isActive = themeId === 'gotico-retro' || themeId === 'minimal-oldweb';

  useEffect(() => {
    if (!isActive) {
      document.body.classList.remove('custom-gothic-cursor-active');
      document.body.classList.remove('minimal-oldweb-cursor-active');
      return;
    }

    // Hide native cursor
    if (themeId === 'gotico-retro') {
      document.body.classList.add('custom-gothic-cursor-active');
    } else if (themeId === 'minimal-oldweb') {
      document.body.classList.add('minimal-oldweb-cursor-active');
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        let isClickable = false;
        let current: HTMLElement | null = target;
        
        // Traverse up to find clickable elements
        while (current && current !== document.body) {
          const tagName = current.tagName.toLowerCase();
          if (
            tagName === 'a' ||
            tagName === 'button' ||
            tagName === 'input' ||
            tagName === 'select' ||
            tagName === 'textarea' ||
            current.getAttribute('role') === 'button' ||
            current.classList.contains('cursor-pointer') ||
            current.style.cursor === 'pointer'
          ) {
            isClickable = true;
            break;
          }
          current = current.parentElement;
        }

        setIsHoveringClickable(isClickable);
      }
    };

    const handleMouseDown = () => {
      setIsClicking(true);
    };

    const handleMouseUp = () => {
      setIsClicking(false);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.body.classList.remove('custom-gothic-cursor-active');
      document.body.classList.remove('minimal-oldweb-cursor-active');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [themeId, isVisible, isActive]);

  if (!isActive || !isVisible) {
    return null;
  }

  // Windows 95/98 custom cursor styling & image
  if (themeId === 'minimal-oldweb') {
    return (
      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '32px',
          height: '32px',
          // Top-left is hotspot, so transform: none is perfect to align pointer precisely
          transform: 'none', 
          pointerEvents: 'none',
          zIndex: 999999,
        }}
      >
        <img
          src="/assets/themes/windows-98/cursor/cursor-windows-98.svg"
          alt="Windows 95/98 Cursor"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
          style={{
            filter: 'none',
            boxShadow: 'none',
            transition: 'none',
            animation: 'none',
            background: 'transparent'
          }}
        />
      </div>
    );
  }

  // Gothic custom cursor styling & image
  const showClickImage = isClicking || isHoveringClickable;
  const cursorImg = showClickImage
    ? '/assets/themes/gothic-retro/icons/Cursor/mão-cursor-gotchic-click.webp'
    : '/assets/themes/gothic-retro/icons/Cursor/mão-cursor-gotchic-pose.webp';

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '44px',
        height: '44px',
        transform: 'translate(-4px, -2px)',
        pointerEvents: 'none',
        zIndex: 999999,
      }}
    >
      {/* Light blue glow effect (#2475fe) behind the gothic hand cursor */}
      <div
        className={isHoveringClickable ? 'gothic-glow-pulse-active' : ''}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: isHoveringClickable ? undefined : 'translate(-50%, -50%)',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(36, 117, 254, 0.25) 0%, rgba(36, 117, 254, 0.05) 50%, rgba(36, 117, 254, 0) 70%)',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          transition: 'all 0.2s ease',
        }}
      />
      <img
        src={cursorImg}
        alt="Gothic Cursor"
        className="w-full h-full object-contain relative z-10"
        referrerPolicy="no-referrer"
        style={{
          filter: 'none',
          boxShadow: 'none',
          transition: 'none',
          animation: 'none',
          background: 'transparent'
        }}
      />
    </div>
  );
}
