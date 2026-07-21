import React from "react";
import { OFFICIAL_THEMES } from "./CoverPreview";

interface CdInteractiveProps {
  isPlaying?: boolean;
  coverType?: "library" | "custom";
  coverId?: string;
  coverUrl?: string;
  playbackState?: "PLAYING" | "PAUSED" | "STOPPED";
  songTitle?: string;
  artistName?: string;
}

export const CdInteractive: React.FC<CdInteractiveProps> = ({
  isPlaying = false,
  coverType = "library",
  coverId = "neon",
  coverUrl = "",
  playbackState = "STOPPED",
  songTitle = "Música",
  artistName = "Artista",
}) => {
  // Find theme background gradient if type is library
  const currentTheme = OFFICIAL_THEMES.find((t) => t.id === coverId) || OFFICIAL_THEMES[0];

  // Determine background
  const cdBackground = coverType === "custom" && coverUrl 
    ? `url("${coverUrl}") no-repeat center/cover` 
    : currentTheme.bgGradient;

  // Determine animation style for precise PLAYING/PAUSED/STOPPED states
  // We can fallback to the boolean isPlaying if playbackState is not explicitly set or remains default.
  const resolvedState = playbackState !== "STOPPED" 
    ? playbackState 
    : (isPlaying ? "PLAYING" : "STOPPED");

  const getAnimationStyle = () => {
    if (resolvedState === "PLAYING") {
      return {
        animation: "spin 12s linear infinite",
        animationPlayState: "running" as const,
      };
    } else if (resolvedState === "PAUSED") {
      return {
        animation: "spin 12s linear infinite",
        animationPlayState: "paused" as const,
      };
    } else {
      return {
        animation: "none",
      };
    }
  };

  const animStyle = getAnimationStyle();

  return (
    <div className="relative w-full h-full select-none group">
      {/* Outer Cyan Glow - Subtle 2px blur with high visibility as requested */}
      <div
        className={`absolute inset-0 rounded-full blur-[2px] opacity-75 transition-all duration-1000 ${
          resolvedState === "PLAYING" ? "animate-pulse scale-[1.01]" : "scale-100"
        } bg-[#00ffff] shadow-[0_0_8px_rgba(0,255,255,0.7)]`}
      />

      {/* Main CD Body with radial gradient or custom image background - perfectly clean and sharp */}
      <div
        id="interactive-cd-disc"
        className="relative w-full h-full rounded-full border-[3px] border-white shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-500"
        style={{
          background: cdBackground,
          ...animStyle,
        }}
      >
        {/* Theme overlay pattern (scanlines, checkers, grains) */}
        {coverType === "library" && currentTheme.overlayStyle && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
            style={currentTheme.overlayStyle}
          />
        )}

        {/* Shiny Refraction Glossy Conic Effects - Very subtle physical reflection */}
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-12"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.3) 30deg, transparent 60deg, transparent 180deg, rgba(255,255,255,0.3) 210deg, transparent 240deg)",
          }}
        />
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-08"
          style={{
            background: "conic-gradient(from 120deg, transparent 0deg, rgba(255,255,255,0.2) 40deg, transparent 80deg, transparent 180deg, rgba(255,255,255,0.2) 220deg, transparent 260deg)",
          }}
        />

        {/* Center Black Hole (Matches the exact diameter ~28px of the original SVG) */}
        <div className="absolute w-7 h-7 rounded-full bg-black border border-white/20 z-20 flex items-center justify-center">
          {/* Transparent-feeling center dot showing the exact widget background color (#415472) */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#415472]" />
        </div>
      </div>
    </div>
  );
};
