import React from "react";
import { CoverPreview } from "./CoverPreview";
import { CoverUploadPanel } from "./CoverUploadPanel";
import { OfficialCoverLibrary } from "./OfficialCoverLibrary";

interface MusicCoverTabProps {
  premiumStatus: "free" | "pro";
  coverType: "library" | "custom";
  coverId: string;
  coverUrl: string;
  onChangeCover: (type: "library" | "custom", id: string, url: string) => void;
  songTitle?: string;
  artistName?: string;
}

export const MusicCoverTab: React.FC<MusicCoverTabProps> = ({
  premiumStatus,
  coverType,
  coverId,
  coverUrl,
  onChangeCover,
  songTitle = "Sensorium (Gothic Symphony)",
  artistName = "EPICA",
}) => {
  return (
    <div className="space-y-4 animate-fade-in text-left">
      
      {/* 2-Column Section (Preview & Upload) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Column: CD Interactive Preview */}
        <CoverPreview
          coverType={coverType}
          selectedThemeId={coverId || "neon"}
          coverUrl={coverUrl}
          songTitle={songTitle}
          artistName={artistName}
        />

        {/* Right Column: Upload Canvas Area */}
        <CoverUploadPanel 
          premiumStatus={premiumStatus}
          coverUrl={coverUrl}
          onUploadSuccess={(url) => onChangeCover("custom", coverId || "neon", url)}
        />

      </div>

      {/* Bottom Section: Official ScrapZone Templates Library */}
      <OfficialCoverLibrary
        selectedThemeId={coverId || "neon"}
        onSelectTheme={(id) => onChangeCover("library", id, "")}
      />

    </div>
  );
};
