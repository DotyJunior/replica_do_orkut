import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface OrkutCaptchaProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const PUZZLE_IMAGES = [
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=350&q=80', // Sunset Vintage
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=350&q=80', // Misty Forest
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=350&q=80', // Turquoise Water Retro
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=350&q=80', // Vintage Camera Polaroid
  'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=350&q=80'  // Nostalgic Retro Sky
];

export default function OrkutCaptcha({ onSuccess, onCancel }: OrkutCaptchaProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [targetX, setTargetX] = useState(150); // Target position of missing puzzle piece
  const [targetY, setTargetY] = useState(50);  // Y position of missing piece
  const [sliderVal, setSliderVal] = useState(0); // Slider progress (0 to 100)
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Track anti-bot mouse/touch movement vectors
  const dragEventsRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const dragStartRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sound generator
  const playRetroSound = (type: 'success' | 'fail' | 'slide') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'fail') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(147, ctx.currentTime + 0.15); // D3
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260 + sliderVal * 1.5, ctx.currentTime);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (_) {}
  };

  const initPuzzle = () => {
    setImageIndex(Math.floor(Math.random() * PUZZLE_IMAGES.length));
    
    // Set matching location randomly (to prevent replay attacks)
    const containerWidth = 280;
    const pieceSize = 40;
    // Keep it between 100px and 230px so there is a challenge
    const rx = Math.floor(Math.random() * (containerWidth - pieceSize - 110)) + 100;
    // Y position between 25px and 85px to avoid borders
    const ry = Math.floor(Math.random() * 60) + 25;
    
    setTargetX(rx);
    setTargetY(ry);
    setSliderVal(0);
    setStatus('idle');
    setErrorMessage('');
    dragEventsRef.current = [];
  };

  useEffect(() => {
    initPuzzle();
  }, []);

  const handleDragStart = (clientX: number, clientY: number) => {
    if (status === 'success') return;
    setIsDragging(true);
    dragStartRef.current = Date.now();
    dragEventsRef.current = [{ x: clientX, y: clientY, time: Date.now() }];
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || status === 'success') return;
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const trackWidth = rect.width - 40; // Subtract handle width
      const offsetX = Math.max(0, Math.min(clientX - rect.left - 20, trackWidth));
      const percentage = (offsetX / trackWidth) * 100;
      
      setSliderVal(percentage);
      dragEventsRef.current.push({ x: clientX, y: clientY, time: Date.now() });

      // Subtle dynamic noise while moving for aesthetic fidelity
      if (Math.random() < 0.2) {
        playRetroSound('slide');
      }
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Calc physical pixel position matching our slider value
    const trackWidth = 240; // slider track layout width minus handle
    const currentPieceX = (sliderVal / 100) * trackWidth;

    // Check accuracy alignment
    const marginOfError = 5.5; // very friendly but secure threshold
    const distance = Math.abs(currentPieceX - targetX);
    const matched = distance <= marginOfError;

    // Perform security telemetry analysis (Anti-Bot heuristics)
    const points = dragEventsRef.current;
    const duration = Date.now() - dragStartRef.current;

    // 1. Check speed (rejecting instant artificial skips)
    if (duration < 350) {
      playRetroSound('fail');
      setStatus('error');
      setErrorMessage('Automação suspeita bloqueada. Arraste num ritmo humano.');
      setTimeout(initPuzzle, 1500);
      return;
    }

    // 2. Trajectory heuristics (checking for flat lines)
    let yVariance = 0;
    let xVarianceCount = 0;
    if (points.length > 3) {
      const firstY = points[0].y;
      let totalYDiff = 0;
      for (let i = 1; i < points.length; i++) {
        totalYDiff += Math.abs(points[i].y - points[i - 1].y);
        if (points[i].x !== points[i - 1].x) {
          xVarianceCount++;
        }
      }
      yVariance = totalYDiff;
    }

    // Bots have zero Y variance and move perfectly straight, or complete in exactly 1 layout action.
    const isBotLike = (yVariance === 0 && xVarianceCount > 5) || points.length < 3;

    if (isBotLike) {
      playRetroSound('fail');
      setStatus('error');
      setErrorMessage('Assinatura eletrônica sintética detectada. Tente novamente.');
      setTimeout(initPuzzle, 2000);
      return;
    }

    if (matched) {
      // Human verified successfully
      playRetroSound('success');
      setStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } else {
      // Soft fail shake
      playRetroSound('fail');
      setStatus('error');
      setErrorMessage('Peça desalinhada. Tente encaixar no círculo em falta!');
      setTimeout(() => {
        // Reset puzzle position smoothly
        setSliderVal(0);
        setStatus('idle');
      }, 1500);
    }
  };

  // Convert SliderVal to translate distance for the floating puzzle piece
  const containerW = 280;
  const slidingPieceX = (sliderVal / 100) * 240; // Map slider progress to layout range

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none select-none">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-[320px] bg-white border border-[#92afd9] rounded-lg shadow-xl overflow-hidden font-sans text-neutral-800"
      >
        {/* Title ribbon styled classic Orkut header color */}
        <div className="bg-gradient-to-r from-[#1b4372] to-[#255e9e] px-4 py-2.5 flex items-center justify-between text-white border-b border-[#0f2d50]">
          <div className="flex items-center gap-1.5 text-xs font-bold leading-none font-sans uppercase tracking-wider">
            <ShieldCheck size={14} className="text-pink-400" />
            <span>Anti-Bot Scrapzone Link</span>
          </div>
          <button 
            onClick={onCancel}
            className="text-white hover:text-red-300 font-bold focus:outline-none transition-colors pr-0.5 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Puzzle wrapper */}
        <div className="p-5 flex flex-col items-center gap-4">
          <p className="text-[11px] text-neutral-500 font-sans leading-relaxed text-center leading-normal">
            Arraste o slider para encaixar a peça do quebra-cabeça na posição correta da foto antiga e provar que você é humano:
          </p>

          {/* Puzzle Image Stage */}
          <div className="relative w-[280px] h-[150px] border border-[#a0c2f7] rounded-md overflow-hidden bg-neutral-100 shadow-inner group">
            <img 
              src={PUZZLE_IMAGES[imageIndex]} 
              alt="Captcha Stage" 
              className="w-full h-full object-cover pointer-events-none select-none"
              referrerPolicy="no-referrer"
            />

            {/* Target hole (missing piece background outline) */}
            <div 
              className="absolute bg-black/60 border border-white/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] rounded-md"
              style={{
                left: `${targetX}px`,
                top: `${targetY}px`,
                width: '38px',
                height: '38px',
              }}
            >
              {/* Retro hint badge */}
              <div className="absolute inset-0 flex items-center justify-center opacity-60">
                <Sparkles size={11} className="text-white animate-pulse" />
              </div>
            </div>

            {/* Sliding puzzle piece cutout */}
            <div 
              className="absolute shadow-[0_2px_10px_rgba(0,0,0,0.45)] border border-white rounded-md overflow-hidden"
              style={{
                left: `${slidingPieceX}px`,
                top: `${targetY}px`,
                width: '38px',
                height: '38px',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            >
              <img 
                src={PUZZLE_IMAGES[imageIndex]} 
                alt="Cutout Segment" 
                className="absolute object-cover pointer-events-none max-w-none"
                style={{
                  width: '280px',
                  height: '150px',
                  left: `-${targetX}px`,  // offsets matching original background slice
                  top: `-${targetY}px`,
                  referrerPolicy: "no-referrer"
                }}
              />
            </div>

            {/* Quick success overlay */}
            {status === 'success' && (
              <div className="absolute inset-0 bg-green-500/85 backdrop-blur-xs flex flex-col items-center justify-center text-white font-semibold text-xs transition-all duration-300">
                <CheckCircle2 size={32} className="text-white mb-1.5 animate-bounce" />
                <span className="font-bold tracking-wide">✔ Verificação concluída!</span>
              </div>
            )}

            {/* Error Overlay */}
            {status === 'error' && (
              <div className="absolute inset-0 bg-red-500/85 backdrop-blur-xs flex flex-col items-center justify-center text-white p-3 text-center transition-all duration-300">
                <AlertCircle size={28} className="text-white mb-1.5 animate-shake" />
                <span className="text-[11px] font-semibold leading-tight">{errorMessage || '⚠ tente novamente'}</span>
              </div>
            )}
          </div>

          {/* Interactive Slider Track (styled classic lilac/blue/pink hues) */}
          <div 
            ref={containerRef}
            className={`w-full relative h-10 rounded-full border flex items-center p-1 font-sans ${
              status === 'success' 
                ? 'bg-green-50 border-green-300' 
                : status === 'error' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-gradient-to-r from-[#fae8ff] to-[#e0f2fe] border-[#c4dafa]'
            }`}
            onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onMouseLeave={handleDragEnd}
            onMouseUp={handleDragEnd}
            onTouchEnd={handleDragEnd}
          >
            {/* Slide guide text helper */}
            {status === 'idle' && !isDragging && (
              <span className="absolute inset-x-0 text-center text-[10px] uppercase font-bold tracking-wider text-pink-600 animate-pulse pointer-events-none select-none">
                Arraste para a direita 🧩
              </span>
            )}

            {/* Interactive Handle */}
            <div 
              style={{ left: `${sliderVal}%`, transform: 'translateX(-50%)' }}
              className={`absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-shadow select-none ${
                status === 'success'
                  ? 'bg-green-600 text-white cursor-default'
                  : status === 'error'
                  ? 'bg-red-600 text-white cursor-default animate-shake'
                  : isDragging
                  ? 'bg-[#1b4372] text-white cursor-grabbing shadow-lg scale-105'
                  : 'bg-white hover:bg-pink-50 text-[#1b4372] border border-[#a0c2f7] cursor-grab hover:border-pink-300'
              } transition-all duration-75`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleDragStart(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 0) {
                  handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
            >
              {status === 'success' ? '✔' : status === 'error' ? '×' : '🧩'}
            </div>
          </div>
        </div>

        {/* Footer info lock stamp */}
        <div className="bg-[#f5f8fc] px-4 py-2 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[9px] text-[#255e9e] uppercase font-bold tracking-wider select-none font-mono">
          <span>🛡 Proteção Ativa Anti-Bot</span>
          <span>•</span>
          <span>Sem Google reCAPTCHA</span>
        </div>
      </motion.div>
    </div>
  );
}
