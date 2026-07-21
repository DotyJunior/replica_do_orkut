import React, { useEffect, useState, useRef } from "react";
import { getAnalyser, getAudioContext } from "../../utils/audioHelpers";

interface EqualizerVisualizerProps {
  isPlaying: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  theme?: string;
  className?: string;
}

export const EqualizerVisualizer: React.FC<EqualizerVisualizerProps> = ({
  isPlaying,
  audioRef,
  theme = "default",
  className = "w-full bg-[#293545] rounded-xl py-3 px-4 flex items-end justify-center gap-1 h-16 select-none border border-[#1e293b]/30",
}) => {
  const barCount = 14;
  const [heights, setHeights] = useState<number[]>(Array(barCount).fill(15));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Loop function to update heights
    const updateEqualizer = () => {
      if (!isPlaying) {
        // Slow decay to baseline when paused/stopped
        setHeights((prev) => prev.map((h) => Math.max(4, h - 2)));
        animationRef.current = requestAnimationFrame(updateEqualizer);
        return;
      }

      const analyser = getAnalyser();
      const ctx = getAudioContext();

      if (analyser && ctx && ctx.state === "running") {
        // Use real audio frequencies
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const newHeights = Array(barCount)
          .fill(0)
          .map((_, i) => {
            // Map the frequency bin data to visual height (4px to 45px)
            const dataIndex = Math.floor((i / barCount) * (bufferLength / 2));
            const val = dataArray[dataIndex] || 0;
            const mappedHeight = Math.max(4, Math.floor((val / 255) * 45));
            return mappedHeight;
          });
        setHeights(newHeights);
      } else {
        // Fallback procedural animation when audio analyser is not connected/supported
        setHeights((prev) =>
          prev.map(() => {
            const delta = Math.floor(Math.random() * 15) - 7;
            const target = 22 + delta;
            return Math.min(45, Math.max(4, target));
          })
        );
      }

      animationRef.current = requestAnimationFrame(updateEqualizer);
    };

    updateEqualizer();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Determine color theme for equalizer bars - always bright green/mint as in approved screenshot
  const getBarColor = () => {
    return "bg-[#00ffaa] shadow-[0_0_8px_rgba(0,255,170,0.6)]";
  };

  return (
    <div className={className}>
      {heights.map((height, idx) => (
        <div
          key={idx}
          className={`w-1.5 rounded-sm transition-all duration-75 ${getBarColor()}`}
          style={{
            height: `${Math.max(4, height)}px`,
            transitionProperty: "height",
          }}
        />
      ))}
    </div>
  );
};

