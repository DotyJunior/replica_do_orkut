import React, { useRef } from "react";
import { OFFICIAL_THEMES } from "./CoverPreview";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

interface OfficialCoverLibraryProps {
  selectedThemeId: string;
  onSelectTheme: (id: string) => void;
}

export const OfficialCoverLibrary: React.FC<OfficialCoverLibraryProps> = ({
  selectedThemeId,
  onSelectTheme,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="bg-[#0b1329]/80 border border-blue-950/60 rounded-xl p-4 select-none relative flex flex-col text-left">
      
      {/* Title with retro sci-fi neon line decor */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-black tracking-[0.2em] text-[#ec4899] uppercase flex-shrink-0">
          CAPAS DA BIBLIOTECA SCRAPZONE
        </span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-pink-500/50 to-transparent" />
      </div>

      {/* Main Row layout with scroll control arrows */}
      <div className="flex items-center gap-1.5 relative group">
        
        {/* Left Arrow Button */}
        <button
          onClick={() => handleScroll("left")}
          className="w-7 h-7 bg-black/60 hover:bg-black border border-pink-500/20 hover:border-pink-500 text-pink-500 hover:text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable grid container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex gap-3 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-pink-500/30 scrollbar-track-transparent snap-x snap-mandatory"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(236, 72, 153, 0.3) transparent" }}
        >
          {OFFICIAL_THEMES.map((theme) => {
            const isSelected = selectedThemeId === theme.id;
            
            return (
              <div
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`snap-start flex-shrink-0 w-[100px] flex flex-col items-center gap-1.5 cursor-pointer group transition-all duration-300`}
              >
                {/* Visual miniature Circle CD representing the theme */}
                <div
                  className={`w-16 h-16 rounded-full border-2 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden transition-all relative ${
                    isSelected
                      ? "border-pink-500 scale-105 shadow-[0_0_12px_rgba(236,72,153,0.5)]"
                      : "border-white/10 group-hover:border-white/30 group-hover:scale-102"
                  }`}
                  style={{
                    background: theme.bgGradient,
                  }}
                >
                  {/* Miniature shiny refraction overlays */}
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-screen opacity-30"
                    style={{
                      background: "conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.4) 30deg, transparent 60deg, transparent 180deg, rgba(255,255,255,0.4) 210deg, transparent 240deg)",
                    }}
                  />
                  
                  {/* Mini grooves */}
                  <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />
                  <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />

                  {/* Tiny logo shielding or markings inside preview */}
                  <span className="text-[5px] font-black text-white/45 tracking-widest absolute top-1.5 select-none uppercase pointer-events-none">
                    {theme.id.slice(0, 4)}
                  </span>

                  {/* Center Hole */}
                  <div className="w-4 h-4 rounded-full bg-black border border-[#00f0ff] z-10 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b]" />
                  </div>

                  {/* Small selected indicator badge as shown on the first item in reference */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-pink-500 text-white rounded-full p-0.5 scale-90 border border-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] z-20">
                      <Check className="w-2.5 h-2.5 stroke-[4px]" />
                    </div>
                  )}
                </div>

                {/* Cover theme text */}
                <span
                  className={`text-[9px] font-bold text-center leading-tight truncate w-full ${
                    isSelected ? "text-pink-400 font-black" : "text-neutral-400 group-hover:text-white"
                  }`}
                >
                  {theme.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => handleScroll("right")}
          className="w-7 h-7 bg-black/60 hover:bg-black border border-pink-500/20 hover:border-pink-500 text-pink-500 hover:text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
      
      {/* Visual neon scroll track indicator bar at the bottom */}
      <div className="w-full h-1 bg-neutral-900 rounded-full mt-3 overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-300"
          style={{
            width: "30%", 
            marginLeft: selectedThemeId === "neon" ? "0%" : 
                       selectedThemeId === "gothic" ? "12%" :
                       selectedThemeId === "cyberpunk" ? "24%" :
                       selectedThemeId === "emo" ? "36%" :
                       selectedThemeId === "lanhouse" ? "48%" :
                       selectedThemeId === "eurodance" ? "60%" :
                       selectedThemeId === "orkut" ? "72%" :
                       selectedThemeId === "rock" ? "84%" : "70%",
          }}
        />
      </div>

    </div>
  );
};
