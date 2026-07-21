import React from "react";

export interface CoverTheme {
  id: string;
  name: string;
  bgGradient: string;
  overlayStyle?: React.CSSProperties;
  artistColor: string;
  titleColor: string;
  decorColor: string;
  logoUrl?: string;
  fontClass?: string;
}

export const OFFICIAL_THEMES: CoverTheme[] = [
  {
    id: "neon",
    name: "CD Neon Original",
    bgGradient: "linear-gradient(135deg, rgba(140, 36, 238, 0.61) 0%, #ffb3f7 53.1%, #ff20e3 100%)",
    artistColor: "text-pink-400 drop-shadow-[0_2px_4px_rgba(236,72,153,0.6)]",
    titleColor: "text-white/90",
    decorColor: "text-pink-500",
    fontClass: "font-mono tracking-wider font-extrabold uppercase",
  },
  {
    id: "gothic",
    name: "Gothic",
    bgGradient: "radial-gradient(circle, #050505 12%, #3f3f46 15%, #18181b 20%, #27272a 45%, #09090b 80%, #000000 100%)",
    overlayStyle: {
      backgroundImage: "radial-gradient(rgba(0,0,0,0.45) 1px, transparent 0), radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0)",
      backgroundSize: "8px 8px",
    },
    artistColor: "text-zinc-300 font-serif font-black tracking-widest uppercase drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]",
    titleColor: "text-red-600/90 font-mono tracking-widest font-bold",
    decorColor: "text-red-700",
    fontClass: "font-serif",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk 2077",
    bgGradient: "radial-gradient(circle, #000000 12%, #facc15 15%, #0e7490 20%, #164e63 45%, #083344 80%, #facc15 100%)",
    overlayStyle: {
      backgroundImage: "linear-gradient(rgba(250, 204, 21, 0.05) 50%, transparent 50%)",
      backgroundSize: "100% 4px",
    },
    artistColor: "text-yellow-400 font-black tracking-tighter uppercase font-mono italic",
    titleColor: "text-cyan-400/90 font-mono",
    decorColor: "text-cyan-400",
    fontClass: "font-mono",
  },
  {
    id: "emo",
    name: "Emo 2008",
    bgGradient: "radial-gradient(circle, #000000 12%, #f43f5e 15%, #18181b 20%, #db2777 45%, #111827 80%, #f43f5e 100%)",
    overlayStyle: {
      background: "repeating-linear-gradient(45deg, rgba(244,63,94,0.05) 0px, rgba(244,63,94,0.05) 10px, transparent 10px, transparent 20px)",
    },
    artistColor: "text-rose-400 font-extrabold uppercase tracking-wide underline decoration-black decoration-2",
    titleColor: "text-white/95 font-bold",
    decorColor: "text-rose-500",
    fontClass: "font-sans",
  },
  {
    id: "lanhouse",
    name: "Lan House",
    bgGradient: "radial-gradient(circle, #000000 12%, #22c55e 15%, #022c22 20%, #052e16 45%, #000000 80%, #22c55e 100%)",
    overlayStyle: {
      backgroundImage: "radial-gradient(circle at center, rgba(34,197,94,0.1) 0%, transparent 70%)",
    },
    artistColor: "text-green-400 font-mono tracking-widest font-black uppercase blur-[0.3px]",
    titleColor: "text-emerald-500/95 font-mono font-bold",
    decorColor: "text-green-600",
    fontClass: "font-mono",
  },
  {
    id: "eurodance",
    name: "Eurodance 2000",
    bgGradient: "radial-gradient(circle, #000000 12%, #38bdf8 15%, #4f46e5 20%, #312e81 45%, #1e1b4b 80%, #38bdf8 100%)",
    overlayStyle: {
      backgroundImage: "conic-gradient(from 180deg, rgba(255,255,255,0.08) 0deg, transparent 90deg, rgba(255,255,255,0.08) 180deg, transparent 270deg)",
    },
    artistColor: "text-sky-300 font-black tracking-tight uppercase italic drop-shadow-[0_2px_8px_rgba(56,189,248,0.5)]",
    titleColor: "text-indigo-200/90 font-bold",
    decorColor: "text-sky-400",
    fontClass: "font-sans",
  },
  {
    id: "orkut",
    name: "Orkut Nostalgia",
    bgGradient: "radial-gradient(circle, #000000 12%, #d946ef 15%, #4a044e 20%, #701a75 45%, #ec4899 80%, #d946ef 100%)",
    overlayStyle: {
      backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 10%, transparent 11%)",
      backgroundSize: "16px 16px",
    },
    artistColor: "text-pink-300 font-extrabold uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]",
    titleColor: "text-fuchsia-100 font-bold",
    decorColor: "text-pink-400",
    fontClass: "font-sans",
  },
  {
    id: "rock",
    name: "Rock Classic",
    bgGradient: "radial-gradient(circle, #000000 12%, #f97316 15%, #450a0a 20%, #7f1d1d 45%, #000000 80%, #ea580c 100%)",
    overlayStyle: {
      backgroundImage: "linear-gradient(45deg, rgba(249,115,22,0.04) 25%, transparent 25%, transparent 75%, rgba(249,115,22,0.04) 75%)",
      backgroundSize: "20px 20px",
    },
    artistColor: "text-orange-500 font-extrabold uppercase italic tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]",
    titleColor: "text-amber-400/90 font-bold",
    decorColor: "text-orange-600",
    fontClass: "font-sans",
  },
  {
    id: "sertanejo",
    name: "Sertanejo Raiz",
    bgGradient: "radial-gradient(circle, #000000 12%, #d97706 15%, #451a03 20%, #78350f 45%, #1c1917 80%, #b45309 100%)",
    overlayStyle: {
      backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 4px)",
    },
    artistColor: "text-amber-500 font-bold tracking-normal uppercase",
    titleColor: "text-orange-200/90 font-bold",
    decorColor: "text-amber-700",
    fontClass: "font-serif",
  },
];

interface CoverPreviewProps {
  coverType?: "library" | "custom";
  selectedThemeId: string;
  coverUrl?: string;
  songTitle?: string;
  artistName?: string;
}

export const CoverPreview: React.FC<CoverPreviewProps> = ({
  coverType = "library",
  selectedThemeId,
  coverUrl = "",
  songTitle = "Sensorium (Gothic Symphony)",
  artistName = "EPICA",
}) => {
  const currentTheme = OFFICIAL_THEMES.find((t) => t.id === selectedThemeId) || OFFICIAL_THEMES[0];

  return (
    <div 
      className="border border-blue-950 rounded-xl p-5 flex flex-col items-center justify-between relative overflow-hidden h-[340px] shadow-inner select-none group"
      style={{ backgroundColor: "#10172a" }}
    >
      
      {/* Sci-fi corners like the screenshot */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-pink-500/60 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-pink-500/60 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-pink-500/60 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-pink-500/60 rounded-br-sm pointer-events-none" />

      {/* Title */}
      <span className="text-[10px] font-black tracking-[0.2em] text-pink-500 uppercase z-10">
        PRÉ-VISUALIZAÇÃO DO CD
      </span>

      {/* CD Body Container */}
      <div className="relative w-40 h-40 my-3 select-none flex items-center justify-center">
        {/* Outer Cyan Glow - Subtle 2px blur with high visibility as requested */}
        <div className="absolute inset-0 rounded-full blur-[2px] opacity-75 bg-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,0.8)] animate-pulse" />

        {/* CD Disc Wrapper - Sharp and clear */}
        <div
          id="interactive-cd-disc"
          className="relative w-full h-full rounded-full border-[3px] border-white/95 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden transition-all duration-700"
          style={{
            background: coverType === "custom" && coverUrl ? `url("${coverUrl}") no-repeat center/cover` : currentTheme.bgGradient,
            animation: "spin 12s linear infinite",
          }}
        >
          {/* Theme overlay pattern (scanlines, checkers, grains) */}
          {coverType === "library" && currentTheme.overlayStyle && (
            <div
              className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
              style={currentTheme.overlayStyle}
            />
          )}

          {/* Artist & Title Text Printed on CD */}
          <div className="absolute inset-0 flex flex-col items-center justify-between py-6 pointer-events-none select-none z-10 text-center">
            {/* Artist Printed on Top */}
            <div className="px-4 mt-1 leading-tight select-none">
              <span className={`text-[12px] font-bold block truncate max-w-[100px] ${coverType === 'custom' ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] font-sans' : `${currentTheme.artistColor} ${currentTheme.fontClass}`}`}>
                {artistName.toUpperCase()}
              </span>
              <span className={`text-[6px] font-bold block tracking-widest text-white/70 ${coverType === 'custom' ? 'font-sans' : currentTheme.fontClass}`}>
                SENSORIUM
              </span>
            </div>

            {/* Bottom Shield Ornament & Deco */}
            <div className="mb-1.5 flex flex-col items-center gap-0.5 opacity-90">
              <span className={`text-[7px] font-bold tracking-widest ${coverType === 'custom' ? 'text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : currentTheme.decorColor}`}>
                •••◆•••
              </span>
              {/* Small vector shield approved badge */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" className={coverType === 'custom' ? 'text-white/70' : currentTheme.decorColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Center Black Hole - clean */}
          <div className="absolute w-12 h-12 rounded-full bg-black border border-white/20 z-20 flex items-center justify-center">
            {/* Outer transparent-feeling spacer */}
            <div className="w-6 h-6 rounded-full bg-[#0a1224] border border-white/10 flex items-center justify-center">
              {/* Inner hole */}
              <div className="w-3.5 h-3.5 rounded-full bg-black/95" />
            </div>
          </div>
        </div>
      </div>

      {/* Info labels */}
      <div className="text-center z-10 w-full px-2">
        <h4 className="text-xs font-black text-white truncate max-w-xs select-none">
          {songTitle}
        </h4>
        <p className="text-[10px] font-bold text-cyan-400 mt-0.5 tracking-wider select-none">
          {artistName.toUpperCase()}
        </p>
      </div>
    </div>
  );
};
