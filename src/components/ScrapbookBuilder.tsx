import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Download, 
  Send, 
  RotateCcw, 
  Smile, 
  Settings, 
  HelpCircle, 
  Maximize2, 
  Volume2, 
  RefreshCw,
  Trash2,
  Tv,
  FileImage,
  Video
} from 'lucide-react';
// @ts-ignore
import gifshot from 'gifshot';
import { Profile, Scrap } from '../types';

interface ScrapbookBuilderProps {
  profiles: Record<string, Profile>;
  currentUser: { id: string; name: string; avatar: string };
  onPostScrap: (scrap: Omit<Scrap, 'id' | 'timestamp'> & { needsAiResponse?: boolean }) => void;
  onNavigateToTab: (tab: string) => void;
  theme?: string;
}

// Retro stickers list using scalable colorful emojis
const STICKERS = [
  { id: 'heart', char: '💖', label: 'Coração' },
  { id: 'hamster', char: '🐹', label: 'Hamster' },
  { id: 'star', char: '⭐', label: 'Estrela' },
  { id: 'butterfly', char: '🦋', label: 'Borboleta' },
  { id: 'skull', char: '💀', label: 'Caveira' },
  { id: 'msn_shrug', char: '🤷', label: 'MSN Shrug' },
  { id: 'floppy', char: '💾', label: 'Disquete' },
  { id: 'rainbow', char: '🌈', label: 'Arco-Íris' },
  { id: 'flames', char: '🔥', label: 'Fogo' },
  { id: 'neon_flash', char: '⚡', label: 'Neon' },
  { id: 'teddy_bear', char: '🧸', label: 'Ursinho' },
  { id: 'kiss', char: '💋', label: 'Beijo' },
];

const FONTS = [
  { id: 'Comic Sans MS', label: 'Comic Sans' },
  { id: 'Impact', label: 'Impact (Meme)' },
  { id: 'Courier New', label: 'Courier Retro' },
  { id: 'Georgia', label: 'Georgia Serif' },
  { id: 'Arial Black', label: 'Cooper Black-ish' },
  { id: 'Trebuchet MS', label: 'Trebuchet MS' },
];

const BACKGROUNDS = [
  { id: 'solid', label: 'Sólido' },
  { id: 'orkut-2004', label: 'Orkut 2004 🔵' },
  { id: 'gradient-purple-pink', label: 'Glitter Pink Gradient' },
  { id: 'gradient-blue-teal', label: 'Digital Ocean' },
  { id: 'gradient-black-purple', label: 'Vampire Midnight Gothic' },
  { id: 'checkerboard', label: 'Y2K Checkerboard' },
  { id: 'stars-space', label: 'Nebulosa Cósmica' },
  { id: 'glitter-pink', label: 'Glitter Grid' },
  { id: 'matrix-green', label: 'Cyber Matrix Code' },
];

const FRAMES = [
  { id: 'none', label: 'Sem Moldura 🚫' },
  { id: 'neon-pink', label: 'Neon Glow Rosa' },
  { id: 'neon-cyan', label: 'Neon Glow Ciano' },
  { id: 'golden-glitter', label: 'Moldura de Ouro 24k' },
  { id: 'emo-stitches', label: 'Costura Emo Retrô' },
  { id: 'cyber-borders', label: 'Terminais Cyber' },
  { id: 'double-dashed', label: 'Tracejado Duplo' },
];

const NOSTALGIC_PHRASES_2008 = [
  "✨ oLaAaAa dApAsOzInNhHAa!!! s2 PaXsAnDo pRa dEiXaR uM bEqAdInHo qApYdUxO fOfOxO!! dEiXa sCrAp tBm kYlYk s2 ✨",
  "⛓️✖️ sOmOs AnJoS dAgUeLa nOiTe fRyYa, ExCrEvE nO mEu dEpOl sÓ kUnDo fOr pRa aKêYtAr kYlYk! Mi_eMo s2 ✖️⛓️",
  "💖 BoM dYyYyYaAaA! q sUo dYa sEja tAo bRiLhAnTe qAnTo eXxE sCrAp s2 Te aMo mUuUiTo s2 lEiA dEpOiX dE sAlVaR 💖",
  "🦋 qEuA mUvAcHe, vOsS xOu dOlS dEpOiX dEvO pAsSaR pRa bAtEr pApO nO mSn dE mAdRuGaDa kkk vLw bLj 🦋",
  "☀️ BoRa dExYdYr oS nOxXoS kOmUnYdAdEx dO oRkUt qE aNnA lEaLe dYxRe vYvEr s2 mEnYnH_gAtO! ☀️",
];

interface StickerInstance {
  id: string;
  char: string;
  x: number;
  y: number;
  size: number;
  angle: number; // in degrees
}

interface Particle {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  size: number;
  color: string;
  maxSize: number;
  alpha: number;
  decay: number;
}

export default function ScrapbookBuilder({ 
  profiles, 
  currentUser, 
  onPostScrap,
  onNavigateToTab,
  theme
}: ScrapbookBuilderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Custom states matching specs
  const [promptInput, setPromptInput] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [themeName, setThemeName] = useState('Meu Scrap Animado 2008');

  // AI Generated Image background URL & Ref
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiRenderingMode, setAiRenderingMode] = useState<'normal' | 'sticker' | 'soft_sticker'>('normal');
  const aiImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!aiImageUrl) {
      aiImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        if (aiRenderingMode === 'normal') {
          // Normal Mode: Keep background from AI intact
          aiImageRef.current = img;
          return;
        }

        // Processing Canvas for Sticker / Soft Sticker with Flood Fill (BFS) segment algorithm
        const procCanvas = document.createElement('canvas');
        procCanvas.width = img.width || 500;
        procCanvas.height = img.height || 350;
        const pctx = procCanvas.getContext('2d');
        if (!pctx) {
          aiImageRef.current = img;
          return;
        }
        pctx.drawImage(img, 0, 0, procCanvas.width, procCanvas.height);
        
        const imgData = pctx.getImageData(0, 0, procCanvas.width, procCanvas.height);
        const data = imgData.data;
        const w = procCanvas.width;
        const h = procCanvas.height;

        const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
          return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        };

        const getPixelColor = (x: number, y: number) => {
          const idx = (y * w + x) * 4;
          return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
        };

        // Samples from corners to identify the solid background
        const sampleColors = [
          getPixelColor(0, 0),
          getPixelColor(w - 1, 0),
          getPixelColor(0, h - 1),
          getPixelColor(w - 1, h - 1)
        ].filter(s => s.a > 0);

        // BFS Flood Fill initialization starting specifically from external corners
        const visited = new Uint8Array(w * h);
        const isBackground = new Uint8Array(w * h);
        const q: number[] = [];

        // Seed BFS with the 4 corners to find external backdrop
        const cornerCoords = [
          { x: 0, y: 0 },
          { x: w - 1, y: 0 },
          { x: 0, y: h - 1 },
          { x: w - 1, y: h - 1 }
        ];

        for (const pt of cornerCoords) {
          const idx = pt.y * w + pt.x;
          visited[idx] = 1;
          isBackground[idx] = 1;
          q.push(idx);
        }

        // Set maximum local distance tolerance based on user explicit rendering modes
        // sticker mode (recorte total): 64. soft_sticker (recorte inteligente e preservador): 38
        const maxTolerance = aiRenderingMode === 'sticker' ? 64 : 38;

        let head = 0;
        while (head < q.length) {
          const curr = q[head++];
          const cx = curr % w;
          const cy = Math.floor(curr / w);

          const neighbors = [
            { x: cx + 1, y: cy },
            { x: cx - 1, y: cy },
            { x: cx, y: cy + 1 },
            { x: cx, y: cy - 1 }
          ];

          for (const nb of neighbors) {
            if (nb.x >= 0 && nb.x < w && nb.y >= 0 && nb.y < h) {
              const nIdx = nb.y * w + nb.x;
              if (visited[nIdx] === 0) {
                visited[nIdx] = 1;
                
                const nr = data[nIdx * 4];
                const ng = data[nIdx * 4 + 1];
                const nbVal = data[nIdx * 4 + 2];
                const naColor = data[nIdx * 4 + 3];

                if (naColor > 0) {
                  // Compute min likeness / distance to our background corner samples
                  let dist = 999999;
                  for (const s of sampleColors) {
                    const d = colorDistance(nr, ng, nbVal, s.r, s.g, s.b);
                    if (d < dist) dist = d;
                  }

                  // White color (#ffffff) is also commonly emitted as background color by image models in cutout modes
                  const isWhiteColorBg = nr > 220 && ng > 220 && nbVal > 220;

                  if (dist < maxTolerance || (aiRenderingMode === 'sticker' && isWhiteColorBg)) {
                    isBackground[nIdx] = 1;
                    q.push(nIdx);
                  }
                }
              }
            }
          }
        }

        // Apply Transparency, alpha gradual controls, and edge feathering transitions based on current modes
        if (aiRenderingMode === 'sticker') {
          // Feathering pass: 1-2px edge blending around the main boundaries
          const tempAlpha = new Uint8Array(w * h);
          for (let idx = 0; idx < w * h; idx++) {
            tempAlpha[idx] = data[idx * 4 + 3];
          }

          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              if (isBackground[idx] === 0) {
                let bgCount = 0;
                // Examine immediate 3x3 neighbor pixels
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const nIdx = (y + dy) * w + (x + dx);
                    if (isBackground[nIdx] === 1) {
                      bgCount++;
                    }
                  }
                }
                if (bgCount > 0) {
                  // Scale alpha for buttery smooth margins
                  const factor = (9 - bgCount) / 9;
                  tempAlpha[idx] = Math.max(0, Math.min(255, Math.floor(data[idx * 4 + 3] * factor)));
                }
              }
            }
          }

          // Force background index alpha to absolute transparent, and objects to feathered alpha
          for (let idx = 0; idx < w * h; idx++) {
            if (isBackground[idx] === 1) {
              data[idx * 4 + 3] = 0;
            } else {
              data[idx * 4 + 3] = tempAlpha[idx];
            }
          }
        } else if (aiRenderingMode === 'soft_sticker') {
          // Gradual Alpha Cutout: soft non-binary alpha blending based on likeness threshold
          for (let idx = 0; idx < w * h; idx++) {
            if (isBackground[idx] === 1) {
              const r = data[idx * 4];
              const g = data[idx * 4 + 1];
              const b = data[idx * 4 + 2];
              
              let dist = 999999;
              for (const s of sampleColors) {
                const d = colorDistance(r, g, b, s.r, s.g, s.b);
                if (d < dist) dist = d;
              }

              if (dist < maxTolerance * 0.4) {
                // Definitely background: fully transparent
                data[idx * 4 + 3] = 0;
              } else {
                // Transitional soft edges: compute linear gradual alpha
                const ratio = (dist - maxTolerance * 0.4) / (maxTolerance * 0.6);
                data[idx * 4 + 3] = Math.max(0, Math.min(255, Math.floor(ratio * 255)));
              }
            }
          }
        }

        pctx.putImageData(imgData, 0, 0);

        // Convert back to ready-to-render image asset
        const finalImg = new Image();
        finalImg.onload = () => {
          aiImageRef.current = finalImg;
        };
        finalImg.src = procCanvas.toDataURL();
      } catch (e) {
        console.error("Transparent background extractor failed:", e);
        aiImageRef.current = img;
      }
    };
    img.src = aiImageUrl;
  }, [aiImageUrl, aiRenderingMode]);

  // Text options
  const [messageText, setMessageText] = useState('✨ PasSeI pRa dEiXaR uM BeQaDo fOfOxO s2 s2 eXcReVe nO mEu tBm bLj kYlYk ✨');
  const [fontFamily, setFontFamily] = useState('Comic Sans MS');
  const [textSize, setTextSize] = useState(24);
  const [textColor, setTextColor] = useState('#ff00bb');
  const [textYPercent, setTextYPercent] = useState(48);
  
  // Visual options
  const [backgroundStyle, setBackgroundStyle] = useState('gradient-purple-pink');
  const [backgroundColor, setBackgroundColor] = useState('#1e0b36');
  const [frameStyle, setFrameStyle] = useState('neon-pink');
  const [glowIntensity, setGlowIntensity] = useState<'medium' | 'high' | 'extreme'>('high');
  
  // Sparkles and Particles
  const [glitterEnabled, setGlitterEnabled] = useState(true);
  const [sparkleDensity, setSparkleDensity] = useState(70);
  const [sparkleColor, setSparkleColor] = useState('#fff200');
  const [sparkleSpeed, setSparkleSpeed] = useState(1.5);
  
  // Interactive placed stickers
  const [placedStickers, setPlacedStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<'html_js_injection' | 'flood_detected' | null>(null);

  const validateText = (text: string): boolean => {
    if (!text) {
      setValidationError(null);
      return true;
    }

    const lower = text.toLowerCase();
    
    // Detect HTML tags, scripts, CSS positioning/fonts, events, iframe elements
    const tagRegex = /<\/?(script|iframe|style|object|embed|link|meta|div|span|img|font|p|a|h[1-6]|button|input|textarea|form|table|tr|td|thead|tbody|tfoot|frame|frameset|html|body|applet)\b/i;
    const eventRegex = /\bon[a-zA-Z]+\s*=/i;
    const cssRegex = /(font-family|position|display|z-index)\s*:/i;
    const scriptLinkRegex = /href\s*=\s*['"]?javascript:/i;

    if (
      tagRegex.test(lower) ||
      /<script/i.test(lower) ||
      /<\/script>/i.test(lower) ||
      /<iframe>/i.test(lower) ||
      /<style/i.test(lower) ||
      /<object/i.test(lower) ||
      /<embed/i.test(lower) ||
      eventRegex.test(lower) ||
      cssRegex.test(lower) ||
      scriptLinkRegex.test(lower)
    ) {
      setValidationError("html_js_injection");
      return false;
    }

    // Detect excessive alphanumeric character repetition (flood / automatic repetition block, e.g. 35+ repeats)
    // We exclude common repeating layouts like space ' ', newline '\n', block markers ('.', '-', '=', '*', '+', etc.) to allow healthy ASCII art.
    const repRegex = /([^ \n\.\-_\=\*\+\/\\\|\(\)\[\]\{\}\<\>\:\;\`,~\^])\1{34,}/;
    if (repRegex.test(text)) {
      setValidationError("flood_detected");
      return false;
    }

    setValidationError(null);
    return true;
  };

  // General App State
  const [recipientId, setRecipientId] = useState('me');
  const [glowBonus, setGlowBonus] = useState(0); // Boosted by DEIXAR MAIS 2008!
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [isRecordingGif, setIsRecordingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const [playAudioChime, setPlayAudioChime] = useState(true);
  const [editorTab, setEditorTab] = useState<'text' | 'sparkles' | 'theme' | 'stickers'>('text');

  // Active particles array
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef(0);
  const matrixYRef = useRef<number[]>([]);

  // Sound effects generator (Nostalgic retro beep synthesis)
  const triggerBeep = (freq: number, duration: number, type: 'sine' | 'square' | 'triangle' | 'sawtooth' = 'sine') => {
    if (!playAudioChime) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    } catch (_) {}
  };

  // Trigger 2008 sound blast
  const playRetroGlitterArpeggio = () => {
    const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C major chord arpeggio
    scale.forEach((freq, idx) => {
      setTimeout(() => triggerBeep(freq, 0.45, 'triangle'), idx * 75);
    });
  };

  // DEIXAR MAIS 2008 Button Handler!
  const handleMakeMore2008 = () => {
    triggerBeep(880, 0.1, 'square');
    setTimeout(() => {
      triggerBeep(1760, 0.2, 'sine');
    }, 100);

    // Increase values to extreme
    setGlowBonus(prev => Math.min(prev + 12, 40));
    setGlowIntensity('extreme');
    setSparkleDensity(100);
    setSparkleSpeed(3);
    setFontFamily('Comic Sans MS');
    setBackgroundStyle('gradient-purple-pink');
    setFrameStyle('neon-pink');
    setGlitterEnabled(true);
    setTextColor('#ff00cc');

    // Select a funny original phrase
    const randomPhrase = NOSTALGIC_PHRASES_2008[Math.floor(Math.random() * NOSTALGIC_PHRASES_2008.length)];
    setMessageText(randomPhrase);

    // Massive sticker spam
    const presetStickers: StickerInstance[] = [
      { id: 's1_' + Math.random(), char: '💖', x: 80, y: 80, size: 45, angle: -15 },
      { id: 's2_' + Math.random(), char: '🦋', x: 420, y: 80, size: 45, angle: 15 },
      { id: 's3_' + Math.random(), char: '⭐', x: 250, y: 310, size: 50, angle: 0 },
      { id: 's4_' + Math.random(), char: '🧸', x: 400, y: 280, size: 48, angle: -10 },
      { id: 's5_' + Math.random(), char: '💋', x: 90, y: 270, size: 45, angle: 20 },
    ];
    setPlacedStickers(presetStickers);

    // Explosion of particles inside loop
    for (let i = 0; i < 40; i++) {
      particlesRef.current.push({
        x: Math.random() * 500,
        y: Math.random() * 350,
        speedX: (Math.random() - 0.5) * 6,
        speedY: (Math.random() - 0.5) * 6,
        size: Math.random() * 8 + 4,
        color: ['#ff00ff', '#ffff00', '#00ffff', '#ff3366', '#00ff00'][Math.floor(Math.random() * 5)],
        maxSize: 12,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.01,
      });
    }

    playRetroGlitterArpeggio();
  };

  // Sticker operations
  const handleAddSticker = (char: string) => {
    triggerBeep(600, 0.15);
    const newSticker: StickerInstance = {
      id: 'st_' + Math.random().toString(36).substr(2, 9),
      char,
      x: 250 + (Math.random() - 0.5) * 80,
      y: 175 + (Math.random() - 0.5) * 60,
      size: 40,
      angle: (Math.random() - 0.5) * 30,
    };
    setPlacedStickers(prev => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const handleModifySelectedSticker = (field: 'size' | 'angle', amount: number) => {
    if (!selectedStickerId) return;
    setPlacedStickers(prev => prev.map(st => {
      if (st.id === selectedStickerId) {
        if (field === 'size') {
          return { ...st, size: Math.max(15, Math.min(150, st.size + amount)) };
        } else {
          return { ...st, angle: (st.angle + amount) % 360 };
        }
      }
      return st;
    }));
  };

  const handleDeleteSelectedSticker = () => {
    if (!selectedStickerId) return;
    setPlacedStickers(prev => prev.filter(st => st.id !== selectedStickerId));
    setSelectedStickerId(null);
    triggerBeep(300, 0.15, 'sine');
  };

  // Keyboard navigation support for deleting sticker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeNode = document.activeElement;
        // Make sure we are not editing in text area
        if (activeNode && (activeNode.tagName === 'INPUT' || activeNode.tagName === 'TEXTAREA')) {
          return;
        }
        if (selectedStickerId) {
          handleDeleteSelectedSticker();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStickerId]);

  // AI Generation fetch Handler
  const handleGenerateAI = async () => {
    if (!promptInput.trim()) return;
    setIsGeneratingAi(true);
    triggerBeep(800, 0.15);
    
    try {
      const response = await fetch('/api/scrapbook/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: promptInput })
      });

      const data = await response.json();
      
      // Load states returned from API
      if (data.themeName) setThemeName(data.themeName);
      if (data.backgroundStyle) setBackgroundStyle(data.backgroundStyle);
      if (data.backgroundColor) setBackgroundColor(data.backgroundColor);
      if (data.textColor) setTextColor(data.textColor);
      if (data.fontFamily) setFontFamily(data.fontFamily);
      if (data.textSize) setTextSize(data.textSize);
      if (data.frameStyle) setFrameStyle(data.frameStyle);
      if (data.sparkleDensity) setSparkleDensity(data.sparkleDensity);
      if (data.sparkleColor) setSparkleColor(data.sparkleColor);
      if (data.glitterEnabled !== undefined) setGlitterEnabled(data.glitterEnabled);
      if (data.glowIntensity) setGlowIntensity(data.glowIntensity);
      if (data.messageText) setMessageText(data.messageText);
      if (data.renderingMode) {
        setAiRenderingMode(data.renderingMode);
      }
      if (data.aiImageUrl) {
        setAiImageUrl(data.aiImageUrl);
      } else {
        setAiImageUrl(null);
      }
      
      // Load suggested stickers
      if (data.suggestedStickers && Array.isArray(data.suggestedStickers)) {
        const loadedStickers: StickerInstance[] = data.suggestedStickers.map((stName: string, idx: number) => {
          const matchedEmoji = STICKERS.find(s => s.id === stName || s.label.toLowerCase() === stName.toLowerCase())?.char || '⭐';
          return {
            id: `st_ai_${idx}_` + Math.random(),
            char: matchedEmoji,
            x: 100 + idx * 110,
            y: 90 + (idx % 2 === 0 ? 30 : 180),
            size: 38,
            angle: (idx * 15 - 15),
          };
        });
        setPlacedStickers(loadedStickers);
      }

      setPromptInput('');
      playRetroGlitterArpeggio();
    } catch (err) {
      console.error("AI Scrap gen failed:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Canvas Drag & Drop handlers for stickers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check hit on the currently selected sticker's 'X' delete button first
    if (selectedStickerId) {
      const selectedSt = placedStickers.find(st => st.id === selectedStickerId);
      if (selectedSt) {
        const rx = selectedSt.size / 2 + 6;
        const ry = -selectedSt.size / 2 - 6;
        const angleRad = (selectedSt.angle * Math.PI) / 180;
        const badgeX = selectedSt.x + rx * Math.cos(angleRad) - ry * Math.sin(angleRad);
        const badgeY = selectedSt.y + rx * Math.sin(angleRad) + ry * Math.cos(angleRad);
        
        const dist = Math.sqrt((mouseX - badgeX) ** 2 + (mouseY - badgeY) ** 2);
        if (dist <= 14) { // Clicking within interactive badge radius
          handleDeleteSelectedSticker();
          return;
        }
      }
    }

    // Check hit on stickers (reverse order to select topmost first)
    let hitFound = false;
    for (let i = placedStickers.length - 1; i >= 0; i--) {
      const st = placedStickers[i];
      // Basic bounding box check
      const halfSize = st.size / 2;
      const dx = mouseX - st.x;
      const dy = mouseY - st.y;
      
      if (Math.abs(dx) <= halfSize + 5 && Math.abs(dy) <= halfSize + 5) {
        setSelectedStickerId(st.id);
        hitFound = true;
        triggerBeep(700, 0.05);
        break;
      }
    }

    if (!hitFound) {
      setSelectedStickerId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedStickerId || e.buttons !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setPlacedStickers(prev => prev.map(st => {
      if (st.id === selectedStickerId) {
        return {
          ...st,
          x: Math.max(10, Math.min(490, mouseX)),
          y: Math.max(10, Math.min(340, mouseY)),
        };
      }
      return st;
    }));
  };

  // Initialize digital Matrix stream coordinates
  useEffect(() => {
    const cols = 50;
    const ys: number[] = [];
    for (let i = 0; i < cols; i++) {
      ys.push(Math.random() * -300);
    }
    matrixYRef.current = ys;
  }, []);

  // CANVAS STREAM LOOP DRAWER (Animation engine!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDestroyed = false;

    // Dynamic scale helper
    const pulseScale = () => 1 + Math.sin(frameCountRef.current * 0.1) * 0.08;

    const drawLoop = () => {
      if (isDestroyed) return;
      frameCountRef.current += 1;

      // 1. Draw Background Style
      const width = canvas.width;
      const height = canvas.height;

      ctx.save();

      // Primary Background (determined entirely by frontend theme config)
      if (backgroundStyle === 'solid') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      } else if (backgroundStyle === 'orkut-2004') {
        // Orkut 2004 classic flat light blue color chapada
        ctx.fillStyle = '#cbd3df';
        ctx.fillRect(0, 0, width, height);
      } else if (backgroundStyle === 'gradient-purple-pink') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#1e0b36');
        grad.addColorStop(0.5, '#4a044e');
        grad.addColorStop(1, '#831843');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (backgroundStyle === 'gradient-blue-teal') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (backgroundStyle === 'gradient-black-purple') {
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#111827');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (backgroundStyle === 'checkerboard') {
        // Star checkerboard pattern
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#312e81';
        const size = 30;
        for (let x = 0; x < width; x += size) {
          for (let y = 0; y < height; y += size) {
            if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
              ctx.fillRect(x, y, size, size);
            }
          }
        }
      } else if (backgroundStyle === 'stars-space') {
        // Dark star cluster gradient
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, width, height);
        // Galactic glow gas rings
        const radial = ctx.createRadialGradient(width/2, height/2, 20, width/2, height/2, 250);
        radial.addColorStop(0, 'rgba(124, 58, 237, 0.15)');
        radial.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, width, height);
      } else if (backgroundStyle === 'glitter-pink') {
        // Dark grid background with pink stars
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#f472b622';
        ctx.lineWidth = 1;
        const spacing = 25;
        for (let x = spacing; x < width; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else if (backgroundStyle === 'matrix-green') {
        // Digital cyberpunk hacker rain
        ctx.fillStyle = 'rgba(2, 6, 23, 0.22)'; // Trails
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#10b981';
        ctx.font = '9px Courier New';
        
        const ys = matrixYRef.current;
        const spacing = 15;
        for (let col = 0; col < ys.length; col++) {
          const char = ['0', '1', 'x', 's', 'e', 'c', '_'][Math.floor(Math.random() * 7)];
          const x = col * spacing;
          ctx.fillText(char, x + 5, ys[col]);
          ys[col] += 5 + Math.random() * 3;
          if (ys[col] > height) {
            ys[col] = Math.random() * -100;
          }
        }
      }

      // Draw transparent AI generated isolated cutout asset / sticker onto current backend final theme
      if (aiImageUrl && aiImageRef.current) {
        const aspect = aiImageRef.current.width ? (aiImageRef.current.width / aiImageRef.current.height) : (500 / 350);
        const stickerHeight = height * 0.72; // elegant 72% height spacing
        const stickerWidth = stickerHeight * aspect;
        const sx = (width - stickerWidth) / 2;
        const sy = (height - stickerHeight) / 2;
        ctx.drawImage(aiImageRef.current, sx, sy, stickerWidth, stickerHeight);
      }

      // 2. Spawn and update sparkle particles
      if (glitterEnabled && frameCountRef.current % 3 === 0) {
        const cap = Math.min(200, Math.floor(sparkleDensity * 1.5));
        if (particlesRef.current.length < cap) {
          particlesRef.current.push({
            x: Math.random() * width,
            y: Math.random() * height,
            speedX: (Math.random() - 0.5) * sparkleSpeed,
            speedY: (Math.random() - 0.5) * sparkleSpeed,
            size: Math.random() * 4 + 1.5,
            color: sparkleColor,
            maxSize: Math.random() * 6 + 4,
            alpha: 1.0,
            decay: Math.random() * 0.04 + 0.015,
          });
        }
      }

      // Update & Draw particles
      particlesRef.current.forEach((p, idx) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha -= p.decay;
        
        // Wrap edges to ensure persistent screen sparkle
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        if (p.alpha <= 0) {
          // Respawn of dead particles
          p.x = Math.random() * width;
          p.y = Math.random() * height;
          p.alpha = 1.0;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        // Custom drawn star paths for pixel glitter look
        ctx.beginPath();
        const numSpikes = 4;
        const innerRad = p.size / 2;
        const outerRad = p.size;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / numSpikes;

        ctx.moveTo(p.x, p.y - outerRad);
        for (let i = 0; i < numSpikes; i++) {
          ctx.lineTo(p.x + Math.cos(rot) * outerRad, p.y + Math.sin(rot) * outerRad);
          rot += step;
          ctx.lineTo(p.x + Math.cos(rot) * innerRad, p.y + Math.sin(rot) * innerRad);
          rot += step;
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // 3. Draw Gloomy Borders / Neon Frames
      if (frameStyle !== 'none' && backgroundStyle !== 'orkut-2004') {
        const borderGlow = glowIntensity === 'extreme' ? 30 + glowBonus : glowIntensity === 'high' ? 18 : 8;
        ctx.strokeStyle = frameStyle === 'neon-pink' ? '#ec4899' : frameStyle === 'neon-cyan' ? '#06b6d4' : '#fbbf24';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = borderGlow;
        ctx.lineWidth = 4;

        if (frameStyle === 'neon-pink' || frameStyle === 'neon-cyan') {
        // Double Neon boxes
        ctx.strokeRect(10, 10, width - 20, height - 20);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(15, 15, width - 30, height - 30);
      } else if (frameStyle === 'golden-glitter') {
        // Yellow glittery retro stars frames
        ctx.strokeRect(12, 12, width - 24, height - 24);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, width - 12, height - 12);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fef08a';
        ctx.font = '11px sans-serif';
        // Add star nodes in margins
        for (let x = 20; x < width - 20; x += (width / 10)) {
          ctx.fillText('⭐', x, 18);
          ctx.fillText('⭐', x, height - 10);
        }
      } else if (frameStyle === 'emo-stitches') {
        // Emo stitched borders
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, width - 20, height - 20);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(10, 10, width - 20, height - 20);
        ctx.setLineDash([]);
      } else if (frameStyle === 'cyber-borders') {
        // Digital neon grid brackets corners
        ctx.strokeRect(15, 15, width - 30, height - 30);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.shadowBlur = 0;
        ctx.fillRect(8, 8, 30, 4);
        ctx.fillRect(8, 8, 4, 30);
        ctx.fillRect(width - 38, 8, 30, 4);
        ctx.fillRect(width - 12, 8, 4, 30);
        ctx.fillRect(8, height - 12, 30, 4);
        ctx.fillRect(8, height - 38, 4, 30);
        ctx.fillRect(width - 38, height - 12, 30, 4);
        ctx.fillRect(width - 12, height - 38, 4, 30);
      } else if (frameStyle === 'double-dashed') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(10, 10, width - 20, height - 20);
        ctx.strokeStyle = '#a855f7';
        ctx.strokeRect(16, 16, width - 32, height - 32);
        ctx.setLineDash([]);
      }
      }

      // Cleanup shadow
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // 4. Draw Custom Text
      ctx.fillStyle = textColor;
      ctx.font = `bold ${textSize}px "${fontFamily}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Add dynamic glowing layers for text natively on canvas!
      const txtGlow = glowIntensity === 'extreme' ? 22 + glowBonus : glowIntensity === 'high' ? 12 : 5;
      ctx.shadowColor = textColor;
      ctx.shadowBlur = txtGlow;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Handle custom glitter fill text using shifting composite gradients
      if (glitterEnabled) {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        const hueShift = (frameCountRef.current * 4) % 360;
        gradient.addColorStop(0, `hsla(${hueShift}, 100%, 70%, 1.0)`);
        gradient.addColorStop(0.5, `hsla(${(hueShift + 120) % 360}, 100%, 75%, 1.0)`);
        gradient.addColorStop(1, `hsla(${(hueShift + 240) % 360}, 100%, 70%, 1.0)`);
        ctx.fillStyle = gradient;
      }

      // wrap text inside margins
      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Center vertically align line block
        const totalHeight = lines.length * lineHeight;
        let startY = y - (totalHeight / 2) + (lineHeight / 2);

        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i].trim(), x, startY);
          startY += lineHeight;
        }
      };

      // Draw wrapped body text inside the neon box (leaving margin for borders)
      const targetY = height * (textYPercent / 100);
      wrapText(messageText, width / 2, targetY, width - 80, textSize + 8);
      
      // Cleanup shadows
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // 5. Draw Placed Stickers
      placedStickers.forEach((st) => {
        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate((st.angle * Math.PI) / 180);
        
        ctx.font = `${st.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw outline border for selected sticker
        if (st.id === selectedStickerId) {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(-st.size / 2 - 4, -st.size / 2 - 4, st.size + 8, st.size + 8);
          
          // Delete indicator badge at top corner
          ctx.fillStyle = '#ef4444'; // Red delete button
          ctx.beginPath();
          ctx.arc(st.size / 2 + 6, -st.size / 2 - 6, 9.5, 0, Math.PI * 2);
          ctx.fill();

          // Draw a clear white "X" inside the badge
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          const bx = st.size / 2 + 6;
          const by = -st.size / 2 - 6;
          ctx.moveTo(bx - 3.5, by - 3.5);
          ctx.lineTo(bx + 3.5, by + 3.5);
          ctx.moveTo(bx + 3.5, by - 3.5);
          ctx.lineTo(bx - 3.5, by + 3.5);
          ctx.stroke();
        }

        ctx.fillText(st.char, 0, 0);
        ctx.restore();
      });

      // 6. Draw "Recording..." label if building animated loop
      if (isRecording) {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
        ctx.fillRect(20, 20, 110, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        
        const recSymbol = frameCountRef.current % 30 < 15 ? '●' : ' ';
        ctx.fillText(`${recSymbol} GRAVANDO WebM`, 28, 32);
      }

      ctx.restore();

      requestAnimationFrame(drawLoop);
    };

    requestAnimationFrame(drawLoop);

    return () => {
      isDestroyed = true;
    };
  }, [
    messageText, 
    fontFamily, 
    textSize, 
    textColor, 
    backgroundStyle, 
    backgroundColor, 
    frameStyle, 
    glowIntensity, 
    glitterEnabled, 
    sparkleDensity, 
    sparkleColor, 
    sparkleSpeed, 
    placedStickers, 
    selectedStickerId,
    glowBonus,
    isRecording,
    aiImageUrl
  ]);

  // ANIMATED WEB CANV RECORDER (Native loop, captures exactly what is animated)
  const handleRecordLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecording(true);
    setRecordProgress(0);
    triggerBeep(1000, 0.4, 'sawtooth');

    const stream = canvas.captureStream(30); // 30 FPS stream
    
    // Check supported mime types
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${themeName.toLowerCase().replace(/\s+/g, '_')}_2008.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setIsRecording(false);
        triggerBeep(1200, 0.35, 'triangle');
      };

      mediaRecorder.start();

      // Track progress inside a 3.5s interval
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 100;
        setRecordProgress(Math.min(100, Math.floor((elapsed / 3500) * 100)));
        if (elapsed >= 3500) {
          clearInterval(interval);
          mediaRecorder.stop();
        }
      }, 100);

    } catch (err) {
      console.error("Native recording failed:", err);
      setIsRecording(false);
    }
  };

  // Export immediate snapshot PNG frame
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    triggerBeep(900, 0.15);
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${themeName.toLowerCase().replace(/\s+/g, '_')}_snapshot.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export animated GIF using gifshot (captures multiple frames keyframes over time)
  const handleExportGIF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecordingGif(true);
    setGifProgress(0);
    triggerBeep(1000, 0.4, 'sawtooth');

    const frames: string[] = [];
    const totalDuration = 3000; // 3 seconds loop
    const intervalTime = 120; // 120ms per frame (makes a smooth ~8 fps glitter animation)
    const totalFramesNeeded = Math.ceil(totalDuration / intervalTime);
    
    let framesCaptured = 0;

    const interval = setInterval(() => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) {
        clearInterval(interval);
        setIsRecordingGif(false);
        return;
      }
      
      try {
        const frameDataUrl = currentCanvas.toDataURL('image/png');
        frames.push(frameDataUrl);
      } catch (err) {
        console.error("Frame capture error:", err);
      }
      
      framesCaptured++;
      setGifProgress(Math.min(95, Math.round((framesCaptured / totalFramesNeeded) * 95)));

      if (framesCaptured >= totalFramesNeeded) {
        clearInterval(interval);
        
        // Compile the GIF in the background using gifshot web workers
        // @ts-ignore
        gifshot.createGIF({
          images: frames,
          gifWidth: currentCanvas.width || 500,
          gifHeight: currentCanvas.height || 350,
          interval: intervalTime / 1000, // interval in seconds
          numWorkers: 2,
        }, function (obj: any) {
          setIsRecordingGif(false);
          setGifProgress(100);

          if (obj && !obj.error) {
            triggerBeep(1200, 0.35, 'triangle');
            const animatedImage = obj.image;
            const a = document.createElement('a');
            a.href = animatedImage;
            a.download = `${themeName.toLowerCase().replace(/\s+/g, '_')}_glitter.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            console.error("GIF creation failed:", obj?.error);
            alert("Erro ao exportar GIF. Tente gravar em formato de vídeo WebM ou salve como imagem PNG.");
          }
        });
      }
    }, intervalTime);
  };

  // Direct post action trigger
  const handlePostToScrapbook = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !!validationError) return;
    if (!validateText(messageText) || !validateText(themeName)) return;

    triggerBeep(1100, 0.25);
    const croppedUrl = canvas.toDataURL('image/png'); // Get immediate content snap

    try {
      // Structure direct post scrap data with visual fields!
      onPostScrap({
        fromId: currentUser.id,
        fromName: currentUser.name,
        fromAvatar: currentUser.avatar,
        toId: recipientId,
        rawContent: `✨ [SCRAPBOOK BUILDER ANIMADO] - Tema: "${themeName}" ✨\n"${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
        isEncrypted: false,
        imageUrl: croppedUrl // Set raw base64 data URL
      } as any);

      setPromptInput('');
      onNavigateToTab('scrapbook'); // Jump straight back to page of recados!
    } catch (err) {
      console.error("Direct post failure:", err);
    }
  };

  return (
    <div 
      id="scrapbook-builder-container" 
      className={`p-4 rounded shadow-md text-left font-sans select-none ${
        theme === 'minimal-oldweb' 
          ? 'bg-[#a19c95] border-t-2 border-l-2 border-b-black border-r-black border' 
          : theme === 'gotico-retro'
            ? 'bg-[#49101c] border border-[#b08d57]/40 shadow-[0_0_15px_rgba(73,16,28,0.5)] text-[#b08d57]'
            : 'bg-[#dee7f4] border border-[#a2bfdb]'
      }`}
    >
      
      {/* Title block */}
      <div 
        className={`rounded-sm p-3 mb-4 flex justify-between items-center flex-wrap gap-4 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.7)] ${
          theme === 'minimal-oldweb' 
            ? 'bg-gradient-to-r from-[#18237c] to-[#2480cf] border border-stone-850' 
            : theme === 'gotico-retro'
              ? 'bg-[#121624] border border-zinc-800'
              : 'bg-[#b3cbef] border border-[#97b3db]'
        }`}
      >
        <div>
          <h2 className={`text-xl font-extrabold flex items-center gap-2 ${
            theme === 'minimal-oldweb' 
              ? 'text-white' 
              : theme === 'gotico-retro'
                ? 'text-[#a0aaab]'
                : 'text-[#112d53]'
          }`}>
            {theme === 'minimal-oldweb' ? '🎨 ScrapBook Builder v2 2008' : '🎨 Scrapbook Builder Studio v2008'}
          </h2>
          <p className={`text-[11px] ${
            theme === 'minimal-oldweb' 
              ? 'text-[#00ffcc] font-semibold' 
              : theme === 'gotico-retro'
                ? 'text-[#3b93fc]'
                : 'text-[#1b4372]'
          }`}>
            Escreva recados, aplique glitter animado, use molduras neon e envie depoimentos gráficos lindos!
          </p>
        </div>

        {/* Audio control button */}
        <button 
          onClick={() => setPlayAudioChime(!playAudioChime)}
          className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded border shadow-sm transition-colors cursor-pointer ${
            playAudioChime ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-neutral-100 text-neutral-500 border-neutral-300'
          }`}
        >
          <Volume2 size={13} />
          {playAudioChime ? "Sons: LIGADO" : "Sua Placa de Som está Muda"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: THE WORKSPACE COMP/WORKSPACE MONITOR */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Classic Vintage Monitor Frame containing Canvas */}
          <div className="w-full bg-[#1e293b] rounded-t-xl p-3 border-4 border-[#94a3b8] shadow-2xl relative">
            
            {/* Monitor Header */}
            <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono pb-2 mb-2 border-b border-neutral-800">
              <span className="flex items-center gap-1">
                <Tv size={12} className="text-green-400" />
                <span>CRT MONITOR DISPLAY (500x350px)</span>
              </span>
              <span className="font-bold text-pink-400 select-none animate-pulse">
                FPS CODE: MODULAR RUST INTERFACE
              </span>
            </div>

            {/* Canvas screen node wrapper */}
            <div className="relative flex justify-center bg-black overflow-hidden border-2 border-neutral-950 rounded shadow-inner" style={{ minHeight: '350px' }}>
              <canvas
                id="scrapbook-design-canvas"
                ref={canvasRef}
                width={500}
                height={350}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                className="cursor-crosshair select-none touch-none aspect-[500/350]"
              />

              {/* Dynamic Overlay when recording video */}
              {isRecording && (
                <div className="absolute inset-x-0 bottom-0 bg-black/85 border-t border-red-500 p-2 text-center text-xs text-white flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
                  <span>Gerando Loop Animado: <strong>{recordProgress}%</strong></span>
                  <div className="w-[120px] bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-pink-500 h-full transition-all duration-100" style={{ width: `${recordProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Dynamic Overlay when recording GIF */}
              {isRecordingGif && (
                <div className="absolute inset-x-0 bottom-0 bg-black/90 border-t border-pink-500 p-2 text-center text-xs text-white flex items-center justify-center gap-3 z-30">
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-ping" />
                  <span>Renderizando GIF Animado: <strong>{gifProgress}%</strong></span>
                  <div className="w-[120px] bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-pink-500 to-fuchsia-500 h-full transition-all duration-100" style={{ width: `${gifProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom knobs/LEDs of CRT Monitor */}
            <div className="mt-3 flex justify-between items-center text-[10px] uppercase font-bold text-neutral-400 bg-neutral-900 border border-neutral-800/80 p-1.5 rounded-sm">
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" title="Security Core Live" />
                <span>POWER / CRYPTO CORE LIVE</span>
              </div>
              <div className="flex gap-2">
                <span className="w-3 h-1.5 bg-neutral-800 rounded-sm cursor-pointer hover:bg-neutral-700" onClick={() => triggerBeep(440, 0.05)} />
                <span className="w-3 h-1.5 bg-neutral-800 rounded-sm cursor-pointer hover:bg-neutral-700" onClick={() => triggerBeep(440, 0.05)} />
                <span className="w-3 h-1.5 bg-neutral-800 rounded-sm cursor-pointer hover:bg-neutral-700" onClick={() => triggerBeep(440, 0.05)} />
              </div>
            </div>
          </div>
          
          {/* Monitor stand pedestal */}
          <div className="w-[180px] bg-[#64748b] h-3 shadow-md border-x-4 border-b border-[#475569]" />
          <div className="w-[280px] bg-[#475569] h-2.5 rounded-b-xl shadow-lg" />

          {/* Canvas Instant Operations Buttons Row */}
          <div className="mt-4 w-full flex flex-wrap gap-2.5 justify-center">
            <button
              id="btn-clear-canvas"
              onClick={() => {
                setPlacedStickers([]);
                setSelectedStickerId(null);
                setMessageText('✨ Escreva mais algo... ✨');
                setGlowBonus(0);
                setAiImageUrl(null);
                triggerBeep(260, 0.2, 'sawtooth');
              }}
              className="px-3 py-1.5 bg-[#fef2f2] hover:bg-[#fee2e2] text-red-700 border border-[#fca5a5] rounded text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw size={13} />
              Limpar Tela 🧹
            </button>

            {selectedStickerId && (
              <div className="flex items-center gap-1 bg-[#fffbeb] p-1 border border-[#fef3c7] rounded shadow-xs">
                <span className="text-[10px] font-bold text-amber-800 px-1.5">Ajustar Sticker:</span>
                <button
                  onClick={() => handleModifySelectedSticker('size', 5)}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[10px] font-bold cursor-pointer"
                  title="Aumentar Tamanho"
                >
                  Tamanho+
                </button>
                <button
                  onClick={() => handleModifySelectedSticker('size', -5)}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[10px] font-bold cursor-pointer"
                  title="Diminuir"
                >
                  Tamanho-
                </button>
                <button
                  onClick={() => handleModifySelectedSticker('angle', 15)}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[10px] font-bold cursor-pointer"
                  title="Girar"
                >
                  Girar+
                </button>
                <button
                  onClick={handleDeleteSelectedSticker}
                  className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded text-[10px] font-bold cursor-pointer flex items-center gap-0.5"
                  title="Excluir"
                >
                  <Trash2 size={10} />
                  Excluir
                </button>
              </div>
            )}
          </div>

          {/* AI GENERATOR PROMPT ENGINE ASSISTANT */}
          <div className="w-full bg-gradient-to-r from-[#1e1b4b] to-[#120822] border-2 border-indigo-500 rounded p-4 mt-6 text-white shadow-lg">
            <h3 className="text-sm font-black tracking-wider text-indigo-300 flex items-center gap-1.5 uppercase">
              <Sparkles size={16} className="text-yellow-400 animate-bounce" />
              AI Scrapbook Builder (Gerador Inteligente)
            </h3>
            <p className="text-[10.5px] text-slate-300 mt-1 leading-normal mb-3">
              Digite seu desejo ou tema. O cérebro local/remoto programará a combinação ideal de fontes Comic Sans, paletas, partículas, glitter neon e emoticons correspondentes no workspace!
            </p>

            <div className="flex gap-2">
              <input
                id="ai-prompt-builder-input"
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Exemplo: scrap emo gótico vermelho brilhante com borboleta..."
                disabled={isGeneratingAi}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateAI();
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-950/80 border border-indigo-500/60 rounded text-indigo-100 focus:outline-none focus:ring-1 focus:ring-yellow-300 font-sans"
              />
              <button
                id="btn-ai-generate-builder"
                onClick={handleGenerateAI}
                disabled={isGeneratingAi || !promptInput.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1 hover:scale-103 active:scale-97 disabled:opacity-50 select-none shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="animate-spin text-yellow-300" size={13} />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-yellow-300 animate-pulse" />
                    <span>Gerar ✨</span>
                  </>
                )}
              </button>
            </div>

            {/* Explicit Mode of Output selection */}
            <div className="mt-4 pt-3 border-t border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] bg-slate-900/40 p-2 rounded">
              <div className="flex flex-col">
                <span className="text-indigo-300 font-bold flex items-center gap-1">
                  🎯 Controle de Recorte IA
                </span>
                <span className="text-[9px] text-slate-400">
                  Modo de remoção de fundo para o Scrapbook
                </span>
              </div>
              <div className="flex gap-1">
                {[
                  { id: 'normal', name: 'Normal', tooltip: 'IA gera a imagem completa com fundo (sem recorte)' },
                  { id: 'sticker', name: 'Sticker ✂️', tooltip: 'Recorte total com bordas bem suaves (feather)' },
                  { id: 'soft_sticker', name: 'Soft Sticker 🌪️', tooltip: 'Recorte inteligente e progressivo (gradual alpha)' },
                ].map(m => (
                  <button
                    key={m.id}
                    title={m.tooltip}
                    onClick={() => {
                      setAiRenderingMode(m.id as any);
                      triggerBeep(520, 0.08);
                    }}
                    type="button"
                    className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                      aiRenderingMode === m.id
                        ? 'bg-gradient-to-r from-pink-500 to-indigo-600 text-white border-pink-400 font-black shadow-[0_0_12px_rgba(236,72,153,0.5)] scale-103'
                        : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DETAILED CUSTOMIZATION SUITE */}
        <div className={`lg:col-span-5 rounded p-4 flex flex-col gap-4 shadow-sm min-h-[450px] border ${
          theme === 'gotico-retro'
            ? 'bg-[#363a3b] border-[#4d5152] text-white'
            : 'bg-white border-[#abc3df]'
        }`}>
          
          {/* THE BIG EPIC RED DIRECTIVE DEIXAR MAIS 2008 BUTTON! */}
          <div className="text-center p-1 bg-gradient-to-r from-[#d946ef] via-[#ec4899] to-[#f43f5e] rounded border-2 border-fuchsia-300 overflow-hidden shadow-lg hover:scale-101 transition-all duration-300 animate-bounce">
            <button
              id="btn-more-2008"
              onClick={handleMakeMore2008}
              className="w-full py-2 bg-[#1e293b] hover:bg-[#0f172a] text-white rounded font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-pink-400/50 cursor-pointer shadow-inner active:scale-98"
            >
              <Sparkles size={15} className="text-yellow-300 animate-spin" />
              <span>⚡ DEIXAR MAIS 2008 ⚡</span>
              <Sparkles size={15} className="text-yellow-300 animate-spin" />
            </button>
          </div>

          {/* Sub Navigation controls tabs */}
          <div className={`flex border-b border-dashed pb-1 flex-wrap gap-1 ${
            theme === 'gotico-retro' ? 'border-[#4d5152]' : 'border-neutral-300'
          }`}>
            {[
              { id: 'text', label: 'Letreiro/Texto' },
              { id: 'stickers', label: 'MSN Stickers' },
              { id: 'theme', label: 'Fundo & Moldura' },
              { id: 'sparkles', label: 'Efeitos' },
            ].map(tab => (
              <button
                id={`builder-subtab-${tab.id}`}
                key={tab.id}
                onClick={() => {
                  triggerBeep(650, 0.05);
                  setEditorTab(tab.id as any);
                }}
                className={`px-2.5 py-1 text-[10.5px] uppercase font-bold cursor-pointer rounded-sm border transition-all ${
                  editorTab === tab.id 
                    ? theme === 'gotico-retro'
                      ? 'bg-[#121624] text-[#a0aaab] border-[#121624]'
                      : 'bg-[#1b4372] text-white border-[#1b4372]' 
                    : theme === 'gotico-retro'
                      ? 'bg-[#242728] text-stone-400 border-stone-600 hover:bg-[#2d3031] hover:text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: TEXT AND RETRO TYPOGRAPHY */}
          {editorTab === 'text' && (
            <div className="flex flex-col gap-3 font-sans text-xs">
              <div>
                <label className={`block text-[10.5px] font-black uppercase mb-1 ${
                  theme === 'gotico-retro' ? 'text-zinc-300' : 'text-neutral-500'
                }`}>Título do Tema:</label>
                <input
                  id="builder-theme-name"
                  type="text"
                  value={themeName}
                  onChange={(e) => {
                    const text = e.target.value.substring(0, 100);
                    setThemeName(text);
                    validateText(text);
                  }}
                  className={`w-full px-2.5 py-1.5 border rounded text-xs font-sans focus:outline-none focus:ring-1 transition-all ${
                    validationError 
                      ? 'border-red-500 ring-2 ring-red-500/15 text-red-900 bg-red-50/10 focus:ring-red-500' 
                      : theme === 'gotico-retro'
                        ? 'border-[#4d5152] focus:ring-red-500 bg-[#0e0e12] text-[#ee1515] font-mono'
                        : 'border-neutral-300 bg-neutral-50 focus:ring-blue-500 text-neutral-800'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[10.5px] font-black uppercase mb-1 ${
                  theme === 'gotico-retro' ? 'text-zinc-300' : 'text-neutral-500'
                }`}>Mensagem do Scrap (Retro Internetês):</label>
                <textarea
                  id="builder-message-text"
                  rows={4}
                  value={messageText}
                  onChange={(e) => {
                    const text = e.target.value.substring(0, 4000);
                    setMessageText(text);
                    validateText(text);
                  }}
                  placeholder="Seu recado brilhante aqui..."
                  className={`w-full px-2.5 py-1.5 border rounded text-xs font-sans focus:outline-none focus:ring-1 transition-all ${
                    validationError 
                      ? 'border-red-500 ring-2 ring-red-500/15 text-red-900 bg-red-50/10 focus:ring-red-500' 
                      : theme === 'gotico-retro'
                        ? 'border-[#4d5152] focus:ring-[#0df0ff] bg-[#0a0a11] text-[#b5c6d0]'
                        : 'border-neutral-300 bg-neutral-50 focus:ring-blue-500 text-neutral-800'
                  }`}
                />
              </div>

              {/* CENTRALIZED ALERT FOR VALIDATION FAILURE IN BUILDER */}
              {validationError && (
                <div className="flex flex-col items-center justify-center p-4 border border-red-500 bg-red-500/5 text-red-500 rounded text-center select-none space-y-1">
                  <span className="text-3xl filter drop-shadow">☠</span>
                  <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                    ⚠ Caracteres ou padrões perigosos detectados.
                  </div>
                  <p className="text-[9px] leading-relaxed max-w-sm text-red-500/80">
                    {validationError === 'flood_detected'
                      ? "Por segurança contra flood e spam, sequências excessivas de caracteres idênticos não são permitidas."
                      : "Por segurança, scripts, tags HTML, estilos, iframe e conteúdos executáveis adicionais são estritamente bloqueados."}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[10.5px] font-black uppercase mb-1 ${
                    theme === 'gotico-retro' ? 'text-zinc-300' : 'text-neutral-500'
                  }`}>Fonte Clássica:</label>
                  <select
                    id="builder-font-family"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className={`w-full px-2 py-1.5 border rounded text-xs cursor-pointer focus:outline-none ${
                      theme === 'gotico-retro'
                        ? 'border-[#4d5152] bg-[#0c0c0f] text-[#c0c0c0]'
                        : 'border-neutral-300 bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    {FONTS.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-[10.5px] font-black uppercase mb-1 ${
                    theme === 'gotico-retro' ? 'text-zinc-300' : 'text-neutral-500'
                  }`}>Tamanho da Fonte:</label>
                  <input
                    id="builder-text-size"
                    type="range"
                    min={15}
                    max={36}
                    value={textSize}
                    onChange={(e) => setTextSize(parseInt(e.target.value))}
                    className="w-full py-2 bg-transparent cursor-ew-resize"
                  />
                  <div className="text-right text-[10px] text-neutral-500 font-mono font-bold">
                    {textSize} px
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1">Cor do Slogan Principal:</label>
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    id="builder-text-color-picker"
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded border border-neutral-300 cursor-pointer p-0 bg-transparent"
                  />
                  {['#ff00bb', '#00ffff', '#ffff00', '#22c55e', '#a855f7', '#ff3366', '#ffffff'].map(c => (
                    <button
                      id={`text-color-preset-${c.substring(1)}`}
                      key={c}
                      onClick={() => setTextColor(c)}
                      className="w-5 h-5 rounded border border-neutral-300 cursor-pointer transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1 py-0.5 rounded ml-auto">
                    {textColor}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-neutral-200 pt-3">
                <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1 flex justify-between items-center">
                  <span>Posição Vertical do Texto:</span>
                  <span className="text-[10px] font-mono text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded font-bold">
                    {textYPercent === 18 ? 'Topo (18%)' : textYPercent === 48 ? 'Centro (48%)' : textYPercent === 80 ? 'Inferior (80%)' : `${textYPercent}%`}
                  </span>
                </label>
                
                {/* Visual Preset Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setTextYPercent(18)}
                    className={`py-1 px-2 border rounded font-bold text-[9.5px] transition-all cursor-pointer ${
                      textYPercent === 18 
                        ? 'bg-pink-50 border-pink-400 text-pink-600 shadow-sm' 
                        : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    ⬆️ Topo (18%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextYPercent(48)}
                    className={`py-1 px-2 border rounded font-bold text-[9.5px] transition-all cursor-pointer ${
                      textYPercent === 48 
                        ? 'bg-pink-50 border-pink-400 text-pink-600 shadow-sm' 
                        : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    ↔️ Centro (48%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextYPercent(80)}
                    className={`py-1 px-2 border rounded font-bold text-[9.5px] transition-all cursor-pointer ${
                      textYPercent === 80 
                        ? 'bg-pink-50 border-pink-400 text-pink-600 shadow-sm' 
                        : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    ⬇️ Inferior (80%)
                  </button>
                </div>

                {/* Fine-tuning slider */}
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] text-neutral-400 font-mono">Topo</span>
                  <input
                    id="builder-text-vertical-slider"
                    type="range"
                    min={10}
                    max={90}
                    value={textYPercent}
                    onChange={(e) => setTextYPercent(parseInt(e.target.value))}
                    className="flex-1 py-1.5 bg-transparent cursor-ew-resize accent-pink-500"
                  />
                  <span className="text-[9px] text-neutral-400 font-mono">Baixo</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MSN BADGES AND DRAGGABLE STICKERS */}
          {editorTab === 'stickers' && (
            <div className="flex flex-col gap-3 font-sans text-xs">
              <span className="text-[10px] text-neutral-500 block leading-tight font-black uppercase">
                Clique nos stickers antigos da MSN/MySpace para adicionar na tela e arrastar:
              </span>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-[220px] overflow-y-auto border border-dashed border-neutral-300 p-2.5 rounded bg-neutral-50/50">
                {STICKERS.map(st => (
                  <button
                    id={`sticker-add-btn-${st.id}`}
                    key={st.id}
                    onClick={() => handleAddSticker(st.char)}
                    className="py-1.5 px-1 bg-white hover:bg-pink-50 border border-neutral-300 rounded text-center text-xl cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs flex flex-col items-center gap-1.5"
                    title={st.label}
                  >
                    <span>{st.char}</span>
                    <span className="text-[7.5px] font-medium tracking-tight text-neutral-400 truncate w-full">{st.label}</span>
                  </button>
                ))}
              </div>

              {placedStickers.length > 0 ? (
                <div className="bg-neutral-50 border border-neutral-200 rounded p-2.5 text-[10.5px]">
                  <span className="font-bold text-neutral-600 block mb-1">📋 Histórico de Stickers ({placedStickers.length}):</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {placedStickers.map((s, idx) => (
                      <button
                        id={`placed-sticker-btn-${idx}`}
                        key={s.id}
                        onClick={() => setSelectedStickerId(s.id)}
                        className={`px-2 py-0.5 border rounded cursor-pointer ${
                          selectedStickerId === s.id ? 'bg-indigo-100 border-indigo-400 font-bold text-indigo-700' : 'bg-white border-neutral-300 text-neutral-600'
                        }`}
                      >
                        {s.char} #{idx+1}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-neutral-500 italic mt-1 text-center">
                  (Dica: Selecione um sticker para girar, apagar ou mudar de tamanho no menu acima do monitor!)
                </p>
              )}
            </div>
          )}

          {/* TAB 3: BACKGROUND SYSTEMS AND FRAMES */}
          {editorTab === 'theme' && (
            <div className="flex flex-col gap-3 font-sans text-xs">
              <div>
                <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1 font-sans">Preset de Fundo Y2K:</label>
                <div className="grid grid-cols-2 gap-2">
                  {BACKGROUNDS.map(bg => (
                    <button
                      id={`bg-preset-btn-${bg.id}`}
                      key={bg.id}
                      onClick={() => {
                        triggerBeep(500, 0.08);
                        setBackgroundStyle(bg.id);
                        if (bg.id === 'orkut-2004') {
                          setFrameStyle('none');
                        }
                      }}
                      className={`px-3 py-1.5 border text-left rounded text-[10.5px] font-bold cursor-pointer transition-colors truncate ${
                        backgroundStyle === bg.id 
                          ? 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-800' 
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* OPÇÃO DE COLOCAR GLITTER OU DEIXAR SEM (Quick Toggle in Theme Tab too) */}
              <div className="bg-[#f0f4f9] p-2 rounded border border-[#a2bfdb]/50 flex items-center justify-between">
                <div className="leading-tight font-sans">
                  <span className="font-bold text-[#1b4372] text-[10.5px] block">Glitter / Efeito Brilho ✨</span>
                  <span className="text-[9.5px] text-neutral-500">Colocar estrelas cintilantes e gradiente móvel</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-neutral-300 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-[#1b4372]">{glitterEnabled ? "Sim" : "Não"}</span>
                  <input
                    id="theme-glitter-quick-toggle"
                    type="checkbox"
                    checked={glitterEnabled}
                    onChange={(e) => {
                      triggerBeep(520, 0.05);
                      setGlitterEnabled(e.target.checked);
                    }}
                    className="w-4 h-4 text-pink-500 border-neutral-300 rounded cursor-pointer"
                  />
                </div>
              </div>

              {backgroundStyle === 'solid' && (
                <div>
                  <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1">Cor Sólida do Fundo:</label>
                  <div className="flex gap-2 items-center">
                    <input
                      id="builder-background-color-picker"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-8 h-8 rounded border border-neutral-300 cursor-pointer p-0 bg-transparent"
                    />
                    {['#1e0b36', '#0f172a', '#1e1b4b', '#421242', '#000000', '#052e16', '#2d0606'].map(c => (
                      <button
                        id={`bg-color-preset-${c.substring(1)}`}
                        key={c}
                        onClick={() => setBackgroundColor(c)}
                        className="w-5 h-5 rounded border border-neutral-300 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <span className="text-[10px] font-mono text-neutral-500 ml-auto font-bold bg-neutral-100 px-1 py-0.5 rounded">
                      {backgroundColor}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1">Neon Frames & Molduras:</label>
                <div className="grid grid-cols-2 gap-2">
                  {FRAMES.map(fr => (
                    <button
                      id={`frame-preset-btn-${fr.id}`}
                      key={fr.id}
                      onClick={() => {
                        triggerBeep(520, 0.08);
                        setFrameStyle(fr.id);
                      }}
                      className={`px-3 py-1.5 border text-left rounded text-[10.5px] font-bold cursor-pointer transition-colors truncate ${
                        frameStyle === fr.id 
                          ? 'bg-cyan-100 border-cyan-400 text-cyan-800' 
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                      }`}
                    >
                      {fr.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GLITTERS, PARTICLES & SOUNDS */}
          {editorTab === 'sparkles' && (
            <div className="flex flex-col gap-3.5 font-sans text-xs">
              <div className="flex items-center justify-between bg-neutral-50 p-2 border border-neutral-200 rounded">
                <div className="font-sans leading-relaxed">
                  <span className="font-black text-neutral-700 block text-[11px] uppercase">Glitter Shifting Spectrum:</span>
                  <p className="text-[9.5px] text-neutral-500">Muda as cores do texto continuamente com efeito holográfico</p>
                </div>
                <input
                  id="builder-toggle-glitter"
                  type="checkbox"
                  checked={glitterEnabled}
                  onChange={(e) => setGlitterEnabled(e.target.checked)}
                  className="rounded text-pink-500 border-neutral-300 w-4 h-4 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1">Estilo de Glow das Lágrimas Neon:</label>
                <select
                  id="builder-glow-intensity"
                  value={glowIntensity}
                  onChange={(e) => setGlowIntensity(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-neutral-50 cursor-pointer"
                >
                  <option value="medium">Brilho Sutil (Safe Heap)</option>
                  <option value="high">Brilho Elevado (Y2K Standard)</option>
                  <option value="extreme">Brilho Extremo (2008 Fever)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-1 border-b border-dashed border-neutral-100">
                <div>
                  <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1">Densidade de Estrelas:</label>
                  <input
                    id="builder-sparkle-density"
                    type="range"
                    min={20}
                    max={120}
                    value={sparkleDensity}
                    onChange={(e) => setSparkleDensity(parseInt(e.target.value))}
                    className="w-full py-1.5 bg-transparent cursor-ew-resize"
                  />
                  <div className="text-right text-[9.5px] font-mono text-neutral-500 font-bold">
                    {sparkleDensity} partículas
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1">Velocidade de Cintilação:</label>
                  <input
                    id="builder-sparkle-speed"
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={sparkleSpeed}
                    onChange={(e) => setSparkleSpeed(parseFloat(e.target.value))}
                    className="w-full py-1.5 bg-transparent cursor-ew-resize"
                  />
                  <div className="text-right text-[9.5px] font-mono text-neutral-500 font-bold">
                    {sparkleSpeed}x speed
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase text-neutral-500 mb-1">Cor das Partículas Piscantes:</label>
                <div className="flex gap-2 items-center">
                  <input
                    id="builder-sparkle-color-picker"
                    type="color"
                    value={sparkleColor}
                    onChange={(e) => setSparkleColor(e.target.value)}
                    className="w-8 h-8 rounded border border-neutral-300 cursor-pointer p-0 bg-transparent"
                  />
                  {['#fff200', '#00ffff', '#ff66e5', '#22c55e', '#ffffff'].map(c => (
                    <button
                      id={`sparkle-color-preset-${c.substring(1)}`}
                      key={c}
                      onClick={() => setSparkleColor(c)}
                      className="w-5 h-5 rounded border border-neutral-300 cursor-pointer transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <span className="text-[10px] font-mono text-neutral-500 ml-auto font-bold bg-neutral-100 px-1 py-0.5 rounded">
                    {sparkleColor}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CHOOSE RECIPIENT & ACTION BUTTON PANEL */}
          <div className={`p-3 mt-auto flex flex-col gap-3 font-sans text-xs border rounded ${
            theme === 'gotico-retro'
              ? 'bg-[#505657] border-[#5a6061]'
              : 'bg-[#f0f5fa] border border-[#bcd2ea]'
          }`}>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className={`block text-[9px] font-black uppercase mb-1 ${
                  theme === 'gotico-retro' ? 'text-zinc-200' : 'text-neutral-500'
                }`}>Destinatário do Scrap:</label>
                <select
                  id="builder-recipient-select"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className={`w-full px-2 py-1 rounded text-[11px] font-sans font-bold cursor-pointer focus:outline-none ${
                    theme === 'gotico-retro'
                      ? 'bg-zinc-800 border-zinc-750 text-sky-300'
                      : 'bg-white border-neutral-300 text-[#1d4ed8]'
                  }`}
                >
                  <option value="me">Meu Perfil (Proprietário)</option>
                  {Object.values(profiles)
                    .filter(p => p.id !== currentUser.id && p.id !== 'me')
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Action buttons list */}
              <div className="flex gap-2 justify-end self-end flex-wrap">
                <button
                  id="btn-export-png"
                  onClick={handleExportPNG}
                  className="px-3 py-1.5 bg-[#ffffff] hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded font-black text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Salvar snapshot PNG permanente"
                >
                  <FileImage size={12} />
                  Salvar PNG
                </button>

                <button
                  id="btn-export-gif"
                  onClick={handleExportGIF}
                  disabled={isRecording || isRecordingGif}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-500 hover:from-amber-500 hover:via-pink-600 hover:to-indigo-600 text-white rounded font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-xs border border-amber-300 disabled:opacity-55"
                  title="Exportar Scrap com Glitter em GIF Animado"
                >
                  <Sparkles size={12} className="animate-spin duration-1000" />
                  Salvar GIF 🌟
                </button>

                <button
                  id="btn-export-webm"
                  onClick={handleRecordLoop}
                  disabled={isRecording}
                  className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-xs border border-pink-400"
                  title="Gravar vídeo em Loop (WebM)"
                >
                  <Video size={12} className="animate-pulse" />
                  Gravar Loop 📽️
                </button>
              </div>
            </div>

            <button
              id="btn-direct-post-scrapbook"
              onClick={handlePostToScrapbook}
              disabled={!!validationError}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs rounded transition-all flex items-center justify-center gap-2 tracking-wide uppercase border border-sky-500 cursor-pointer shadow-md shadow-sky-600/15 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              Postar Direto no Scrapbook do {recipientId === 'me' ? 'Meu Perfil' : profiles[recipientId]?.name || 'Amigo'} 🚀
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
