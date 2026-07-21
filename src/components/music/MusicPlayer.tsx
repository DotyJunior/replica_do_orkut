import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, SkipForward, SkipBack, Heart, Headphones, Pencil, Music, ExternalLink } from "lucide-react";
import { PREDEFINED_LIBRARY_TRACKS } from "../../data/musicLibrary";
import { playAudio, pauseAudio, stopAudio, seekAudio, getActiveAudio, getActiveUrl } from "../../utils/audioHelpers";
import { CdInteractive } from "./CdInteractive";
import { EqualizerVisualizer } from "./EqualizerVisualizer";
import { MusicConfigModal } from "./MusicConfigModal";
import { db, auth } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { Profile } from "../../types";
import musicIcon from "../UI-approved/aproved-icons/icone-de-musica.png";

interface MusicPlayerProps {
  profile: Profile;
  currentUserProfile: Profile | null;
  onSaveProfile: (updatedProfile: Partial<Profile>) => void;
  isOwner: boolean;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  profile,
  currentUserProfile,
  onSaveProfile,
  isOwner,
}) => {
  // Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Cover Configuration States
  const [tempCoverType, setTempCoverType] = useState<"library" | "custom">((profile.coverType as "library" | "custom") || "library");
  const [tempCoverId, setTempCoverId] = useState<string>(profile.coverId || "neon");
  const [tempCoverUrl, setTempCoverUrl] = useState<string>(profile.coverUrl || "");

  // Sync cover states with profile updates
  useEffect(() => {
    setTempCoverType((profile.coverType as "library" | "custom") || "library");
    setTempCoverId(profile.coverId || "neon");
    setTempCoverUrl(profile.coverUrl || "");
  }, [profile.coverType, profile.coverId, profile.coverUrl]);

  const handleCloseModal = () => {
    setTempCoverType((profile.coverType as "library" | "custom") || "library");
    setTempCoverId(profile.coverId || "neon");
    setTempCoverUrl(profile.coverUrl || "");
    setIsConfigOpen(false);
  };

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackState, setPlaybackState] = useState<"PLAYING" | "PAUSED" | "STOPPED">("STOPPED");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Current track configured on the profile
  const configuredTrack = profile.listeningNow || null;
  const [localTrack, setLocalTrack] = useState<any>(null);

  // Sync localTrack with configuredTrack from props (pre-resolving IndexedDB URLs asynchronously to synchronous playable blob URLs)
  useEffect(() => {
    let active = true;
    if (configuredTrack) {
      setLocalTrack(configuredTrack);
    } else {
      setLocalTrack(null);
    }
    return () => {
      active = false;
    };
  }, [configuredTrack]);

  const premiumStatus = profile.premiumStatus || "free";

  // Mock listeners count (static visual element as instructed)
  const mockListenersCount = 8;

  // Likes on the active music track
  const musicLikes = profile.lastPlayedMusic?.likesList || [];
  const currentUserId = auth.currentUser?.uid || "me";
  const hasLiked = musicLikes.includes(currentUserId);
  const likesCount = musicLikes.length;

  // Helper to check if two audio URLs are matching (relative or absolute)
  const isSameTrack = (activeSrc: string, trackUrl: string) => {
    if (!activeSrc || !trackUrl) return false;
    const currentActiveUrl = getActiveUrl();
    if (currentActiveUrl === trackUrl) return true;
    if (activeSrc === trackUrl) return true;
    try {
      const absoluteTrackUrl = new URL(trackUrl, window.location.origin).href;
      if (activeSrc === absoluteTrackUrl) return true;
    } catch (e) {
      // Ignore URL parse error
    }
    if (trackUrl.startsWith("/")) {
      return activeSrc.endsWith(trackUrl);
    }
    return activeSrc.includes(trackUrl) || trackUrl.includes(activeSrc);
  };

  // Synchronize playback state with the global HTMLAudioElement singleton
  useEffect(() => {
    // Check if singleton is currently playing this track
    const active = getActiveAudio();
    if (active && localTrack && isSameTrack(active.src, localTrack.url)) {
      audioRef.current = active;
      setIsPlaying(!active.paused);
      setPlaybackState(!active.paused ? "PLAYING" : "PAUSED");
      setCurrentTime(active.currentTime);
      if (active.duration && isFinite(active.duration) && active.duration > 0) {
        setDuration(active.duration);
      } else {
        setDuration(180); // Default simulated/fallback duration
      }
    } else {
      setIsPlaying(false);
      setPlaybackState("STOPPED");
      setCurrentTime(0);
      setDuration(180); // Default simulated/fallback duration
    }
  }, [localTrack]);

  // Keep state updated in real-time by listening to standard events directly on the active audio singleton
  useEffect(() => {
    const active = getActiveAudio();
    if (!active || !localTrack || !isSameTrack(active.src, localTrack.url)) return;

    const handleTimeUpdate = () => {
      setCurrentTime(active.currentTime);
      if (active.duration && isFinite(active.duration) && active.duration > 0) {
        setDuration(active.duration);
      }
    };

    const handleDurationChange = () => {
      if (active.duration && isFinite(active.duration) && active.duration > 0) {
        setDuration(active.duration);
      }
    };

    const handlePlayEvent = () => {
      setIsPlaying(true);
      setPlaybackState("PLAYING");
    };

    const handlePauseEvent = () => {
      setIsPlaying(false);
      setPlaybackState("PAUSED");
    };

    const handleEndedEvent = () => {
      setIsPlaying(false);
      setPlaybackState("STOPPED");
      setCurrentTime(0);
    };

    active.addEventListener("timeupdate", handleTimeUpdate);
    active.addEventListener("durationchange", handleDurationChange);
    active.addEventListener("play", handlePlayEvent);
    active.addEventListener("pause", handlePauseEvent);
    active.addEventListener("ended", handleEndedEvent);

    // Initial sync
    setCurrentTime(active.currentTime);
    if (active.duration && isFinite(active.duration) && active.duration > 0) {
      setDuration(active.duration);
    } else {
      setDuration(180);
    }

    return () => {
      active.removeEventListener("timeupdate", handleTimeUpdate);
      active.removeEventListener("durationchange", handleDurationChange);
      active.removeEventListener("play", handlePlayEvent);
      active.removeEventListener("pause", handlePauseEvent);
      active.removeEventListener("ended", handleEndedEvent);
    };
  }, [localTrack, isPlaying]);

  // Robust Interval Loop to ensure timeline always progresses smoothly (with simulation fallback)
  useEffect(() => {
    if (!isPlaying || isDragging) return;

    let lastTime = Date.now();

    const interval = setInterval(() => {
      const active = getActiveAudio();
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Check if real active audio is playing, responsive and has valid progress
      if (active && localTrack && isSameTrack(active.src, localTrack.url)) {
        if (!active.paused && active.duration && isFinite(active.duration) && active.duration > 0) {
          setCurrentTime(active.currentTime);
          setDuration(active.duration);
          return;
        }
      }

      // Simulated progress update if audio is stuck, external, has missing headers, or is blocked
      setCurrentTime((prev) => {
        const currentDuration = duration && isFinite(duration) && duration > 0 ? duration : 180;
        if (prev >= currentDuration) {
          return 0; // wrap around or stay
        }
        return Math.min(prev + delta, currentDuration);
      });

      if (!duration || !isFinite(duration) || duration <= 0) {
        setDuration(180);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isDragging, localTrack, duration]);

  // Handle Play
  const handlePlay = () => {
    if (!localTrack || !localTrack.url) {
      // Caso não exista música configurada, ainda assim entrar em modo PLAYING VISUAL sem abrir o modal.
      setIsPlaying(true);
      setPlaybackState("PLAYING");
      return;
    }

    // Play via our audio singleton
    const audio = playAudio(
      localTrack.url,
      () => {
        setIsPlaying(true);
        setPlaybackState("PLAYING");
        // Set the "Ouvindo Agora" status for the current logged-in user in Firestore
        if (isOwner) {
          onSaveProfile({
            listeningNow: {
              ...localTrack,
              isPlaying: true,
              timestamp: Date.now(),
            },
          });
        }
      },
      () => {
        // On Ended
        setIsPlaying(false);
        setPlaybackState("STOPPED");
        setCurrentTime(0);
        // Remove "Ouvindo Agora" status on ended
        if (isOwner) {
          onSaveProfile({
            listeningNow: null,
            lastPlayedMusic: {
              title: localTrack.title,
              artist: localTrack.artist,
              source: localTrack.source,
              url: localTrack.url,
              timestamp: Date.now(),
              likesList: musicLikes,
            },
          });
        }
      },
      (curr, dur) => {
        setCurrentTime(curr);
        setDuration(dur);
      }
    );

    audioRef.current = audio;
  };

  // Handle Pause
  const handlePause = () => {
    pauseAudio();
    setIsPlaying(false);
    setPlaybackState("PAUSED");

    // Update active status to paused but keep the track info
    if (isOwner) {
      if (localTrack) {
        onSaveProfile({
          listeningNow: {
            ...localTrack,
            isPlaying: false,
            timestamp: Date.now(),
          },
        });
      } else {
        onSaveProfile({
          listeningNow: null,
        });
      }
    }
  };

  // Handle Stop
  const handleStop = () => {
    stopAudio();
    audioRef.current = null;
    setIsPlaying(false);
    setPlaybackState("STOPPED");
    setCurrentTime(0);

    // Update active status to stopped but keep the track info
    if (isOwner) {
      if (localTrack) {
        onSaveProfile({
          listeningNow: {
            ...localTrack,
            isPlaying: false,
            timestamp: Date.now(),
          },
        });
      } else {
        onSaveProfile({
          listeningNow: null,
        });
      }
    }
  };

  // Handle Seek
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    seekAudio(val);
  };

  const handleTimelineInteraction = (clientX: number) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const svgWidth = rect.width;
    
    // The timeline in SVG coordinates starts at X = 13.1877 and ends at X = 500.53961 relative to the viewBox of 508.45825
    const startRatio = 13.1877 / 508.45825; // ≈ 0.0259
    const endRatio = 500.53961 / 508.45825;   // ≈ 0.9844
    const totalRatio = endRatio - startRatio; // ≈ 0.9585
    
    // Pixel coordinates of timeline start and end on the screen
    const timelineLeft = rect.left + svgWidth * startRatio;
    const timelineWidth = svgWidth * totalRatio;
    
    // Calculate progress percentage on the timeline
    const offsetX = Math.max(0, Math.min(clientX - timelineLeft, timelineWidth));
    const percentage = offsetX / timelineWidth;
    
    const newTime = percentage * duration;
    setCurrentTime(newTime);
    seekAudio(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!localTrack || ["spotify", "youtube", "soundcloud"].includes(localTrack.source)) return;
    setIsDragging(true);
    handleTimelineInteraction(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!localTrack || ["spotify", "youtube", "soundcloud"].includes(localTrack.source)) return;
    setIsDragging(true);
    if (e.touches.length > 0) {
      handleTimelineInteraction(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleTimelineInteraction(e.clientX);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        handleTimelineInteraction(e.touches[0].clientX);
      }
    };
    const handleMouseUpOrTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUpOrTouchEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleMouseUpOrTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUpOrTouchEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUpOrTouchEnd);
    };
  }, [isDragging, duration]);

  // Handle Like
  const handleToggleLike = async () => {
    const targetProfileId = profile.id;
    const currentUserId = auth.currentUser?.uid || "me";

    // Build the updated likes list
    let updatedLikes = [...musicLikes];
    if (hasLiked) {
      updatedLikes = updatedLikes.filter((uid) => uid !== currentUserId);
    } else {
      updatedLikes.push(currentUserId);
    }

    // Update the visited profile's database document
    const updatedProfile = {
      ...profile,
      lastPlayedMusic: {
        ...(profile.lastPlayedMusic || {}),
        likesList: updatedLikes,
      },
    };

    try {
      await setDoc(doc(db, "profiles", targetProfileId), updatedProfile);
    } catch (err) {
      console.error("Failed to update music likes:", err);
    }
  };

  // Play track directly
  const playTrackDirectly = (trackData: {
    title: string;
    artist: string;
    source: string;
    url: string;
    playableUrl?: string;
    coverUrl?: string;
    embedHtml?: string;
  }) => {
    console.log("[DEBUG] playTrackDirectly called with:", trackData);
    const playUrl = trackData.playableUrl || trackData.url;
    console.log("[DEBUG] Playing URL:", playUrl);

    // Instantly update local state for responsive, zero-lag UI feedback
    setLocalTrack({
      title: trackData.title,
      artist: trackData.artist,
      source: trackData.source,
      url: playUrl,
      coverUrl: trackData.coverUrl || "",
    });

    const audio = playAudio(
      playUrl,
      () => {
        setIsPlaying(true);
        setPlaybackState("PLAYING");
        if (isOwner) {
          onSaveProfile({
            listeningNow: {
              title: trackData.title,
              artist: trackData.artist,
              source: trackData.source,
              url: trackData.url, // Save the permanent url in Firestore (so others see/load it correctly from storage/IndexedDB)
              coverUrl: trackData.coverUrl || "",
              isPlaying: true,
              timestamp: Date.now(),
            },
          });
        }
      },
      () => {
        setIsPlaying(false);
        setPlaybackState("STOPPED");
        setCurrentTime(0);
        if (isOwner) {
          onSaveProfile({
            listeningNow: null,
            lastPlayedMusic: {
              title: trackData.title,
              artist: trackData.artist,
              source: trackData.source,
              url: trackData.url, // Save the permanent url in Firestore
              timestamp: Date.now(),
              likesList: musicLikes,
            },
          });
        }
      },
      (curr, dur) => {
        setCurrentTime(curr);
        setDuration(dur);
      }
    );
    audioRef.current = audio;
  };

  // Handle Previous Track (Works always with wrap-around!)
  const handlePreviousTrack = () => {
    const tracks = PREDEFINED_LIBRARY_TRACKS;
    if (tracks.length === 0) return;
    
    let currentIndex = -1;
    if (localTrack) {
      currentIndex = tracks.findIndex((t) => t.url === localTrack.url);
    }
    
    let prevTrack;
    if (currentIndex > 0) {
      prevTrack = tracks[currentIndex - 1];
    } else {
      prevTrack = tracks[tracks.length - 1];
    }
    
    playTrackDirectly({ ...prevTrack, source: "library" });
  };

  // Handle Next Track (Works always with wrap-around!)
  const handleNextTrack = () => {
    const tracks = PREDEFINED_LIBRARY_TRACKS;
    if (tracks.length === 0) return;
    
    let currentIndex = -1;
    if (localTrack) {
      currentIndex = tracks.findIndex((t) => t.url === localTrack.url);
    }
    
    let nextTrack;
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      nextTrack = tracks[currentIndex + 1];
    } else {
      nextTrack = tracks[0];
    }
    
    playTrackDirectly({ ...nextTrack, source: "library" });
  };

  // Save selected track from controls/config
  const saveSelectedTrack = async (trackData: {
    title: string;
    artist: string;
    source: string;
    url: string;
    playableUrl?: string;
    coverUrl?: string;
    embedHtml?: string;
    premiumStatus?: "free" | "pro";
  }) => {
    console.log("[DEBUG] saveSelectedTrack called with:", trackData);
    // 1. Synchronously trigger playback to bypass browser autoplay blocks
    const activeUrlToPlay = trackData.playableUrl || trackData.url;
    playTrackDirectly({
      title: trackData.title,
      artist: trackData.artist,
      source: trackData.source,
      url: trackData.url, // Save the permanent url in Firestore
      playableUrl: activeUrlToPlay, // Play the synchronous local blob/original url
      coverUrl: trackData.coverUrl || "",
      embedHtml: trackData.embedHtml,
    });

    // 2. Persist other custom modal-level fields like premiumStatus if modified
    if (trackData.premiumStatus && trackData.premiumStatus !== premiumStatus) {
      onSaveProfile({
        premiumStatus: trackData.premiumStatus,
      });
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Helper to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength).trim() + "...";
    }
    return text;
  };

  // Get active source label
  const getSourceLabel = (src: string) => {
    switch (src) {
      case "library":
        return "My Music";
      case "spotify":
        return "Spotify";
      case "youtube":
        return "YouTube";
      case "soundcloud":
        return "SoundCloud";
      case "upload":
        return "Upload";
      default:
        return "My Music";
    }
  };

  return (
    <div className="w-full max-w-[523px] mx-auto select-none relative" id="approved-music-player">
      <style>{`
        @keyframes spin-cd {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes eq-bounce-a { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1.1); } }
        @keyframes eq-bounce-b { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(0.8); } }
        @keyframes eq-bounce-c { 0%, 100% { transform: scaleY(0.2); } 50% { transform: scaleY(1.3); } }
        @keyframes eq-bounce-d { 0%, 100% { transform: scaleY(0.6); } 50% { transform: scaleY(1.0); } }
        
        .eq-bar-a { transform-origin: bottom; animation: eq-bounce-a 0.8s ease-in-out infinite alternate; }
        .eq-bar-b { transform-origin: bottom; animation: eq-bounce-b 1.1s ease-in-out infinite alternate; }
        .eq-bar-c { transform-origin: bottom; animation: eq-bounce-c 0.7s ease-in-out infinite alternate; }
        .eq-bar-d { transform-origin: bottom; animation: eq-bounce-d 0.9s ease-in-out infinite alternate; }
      `}</style>
      
      <svg
        ref={timelineRef}
        width="100%"
        height="100%"
        viewBox="0 0 508.45825 423.16306"
        version="1.1"
        id="svg1"
        xmlSpace="preserve"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs id="defs1">
          <linearGradient id="linearGradient90">
            <stop style={{ stopColor: '#8c24ee', stopOpacity: 0.6129666 }} offset="0" id="stop91" />
            <stop style={{ stopColor: '#ffb3f7', stopOpacity: 1 }} offset="0.53102034" id="stop93" />
            <stop style={{ stopColor: '#ff20e3', stopOpacity: 1 }} offset="1" id="stop92" />
          </linearGradient>
          <linearGradient id="linearGradient47">
            <stop style={{ stopColor: '#ffffff', stopOpacity: 1 }} offset="0" id="stop47" />
            <stop style={{ stopColor: '#e6dfea', stopOpacity: 0.28235294 }} offset="0.53127992" id="stop49" />
            <stop style={{ stopColor: '#e6dfea', stopOpacity: 0.0369515 }} offset="1" id="stop48" />
          </linearGradient>
          <filter id="filter21" x="-0.045641066" y="-0.047542778" width="1.0912821" height="1.0950856">
            <feGaussianBlur stdDeviation="0.096415268" id="feGaussianBlur21" />
          </filter>
          <linearGradient
            id="linearGradient48"
            x1="386.95056"
            y1="230.76669"
            x2="852.93396"
            y2="574.42059"
            gradientUnits="userSpaceOnUse"
            xlinkHref="#linearGradient47"
          />
          <linearGradient
            id="linearGradient93"
            x1="516.35107"
            y1="383.50177"
            x2="439.98358"
            y2="325.51901"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(-0.35355339,-0.70710671)"
            xlinkHref="#linearGradient90"
          />
          <filter id="filter97" x="-0.047593272" y="-0.048413741" width="1.0951865" height="1.0968275">
            <feGaussianBlur stdDeviation="2.3402891" id="feGaussianBlur97" />
          </filter>
          <filter id="filter27" x="-0.036600685" y="-0.032950848" width="1.0732014" height="1.0659017">
            <feGaussianBlur stdDeviation="0.48442702" id="feGaussianBlur27" />
          </filter>
          <filter id="filter28" x="-0.25392" y="-0.25392" width="1.50784" height="1.50784">
            <feGaussianBlur stdDeviation="0.65902584" id="feGaussianBlur28" />
          </filter>
          <filter id="filter98" x="-0.36474092" y="-0.38865835" width="1.7294818" height="1.7773167">
            <feGaussianBlur stdDeviation="2.4696" id="feGaussianBlur98" />
          </filter>
        </defs>
        
        <g id="layer1" transform="translate(-403.21402,-228.64537)">
          {/* Main Widget Background */}
          <rect
            style={{ opacity: 0.868275, fill: '#415472', fillOpacity: 1, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            id="rect3"
            width="508.45825"
            height="423.16306"
            x="403.21402"
            y="228.64537"
            rx="22.089075"
            ry="34.388779"
          />
          
          {/* Background Glow */}
          <ellipse
            style={{ opacity: 0.534323, mixBlendMode: 'normal', fill: '#35e0fd', fillOpacity: 0.846758, filter: 'url(#filter98)' }}
            id="path97"
            cx="434.46402"
            cy="249.14537"
            rx="8.125"
            ry="7.625"
            transform="matrix(1.5605884,0,0,1.5605884,-243.43048,-137.043)"
          />
          
          {/* Diagonal Sheen Sheer */}
          <path
            id="rect2"
            style={{ opacity: 0.87013, fill: 'url(#linearGradient48)', fillOpacity: 1 }}
            d="m 425.40267,228.66769 c -12.20624,0 -22.0337,15.35608 -22.0337,34.43167 v 354.83726 c 0,10.25946 2.84153,19.44414 7.36795,25.74162 -2.85687,-5.80602 -4.55091,-13.08933 -4.55091,-21.01234 V 267.83185 c 0,-19.07559 9.82551,-34.43487 22.03175,-34.43487 h 463.10121 c 5.64134,0 10.77419,3.2817 14.66381,8.69322 -4.02139,-8.17268 -10.34444,-13.42251 -17.48085,-13.42251 z"
          />
          
          {/* Approved Text "MUSICA OFICIAL" */}
          <text
            id="text23"
            xmlSpace="preserve"
            style={{
              fontStyle: 'normal',
              fontWeight: 'bold',
              fontSize: '14.5px',
              fontFamily: "'DotGothic16', 'Trebuchet MS', sans-serif",
              textAnchor: 'middle',
              opacity: 1,
              fill: '#ffffff',
              fillOpacity: 1,
              stroke: 'none',
              strokeWidth: 0.599998,
              letterSpacing: '1px'
            }}
            x="560"
            y="256.5"
          >
            <tspan x="560" y="256.5">MUSICA OFICIAL</tspan>
          </text>

          {/* Approved Vectorized Purple Music Notes Icon Group (g97) */}
          <g id="g97" transform="translate(78.733208,24.919827)">
            <path
              id="path27"
              style={{ opacity: 1, mixBlendMode: 'normal', fill: '#5e2f69', fillOpacity: 1, stroke: 'none', strokeWidth: 0.761246, strokeLinecap: 'round', strokeLinejoin: 'round', strokeOpacity: 0.968566, filter: 'url(#filter27)' }}
              d="m 447.36022,234.58338 -21.62107,5.41787 0.0428,0.27851 c -0.0214,-0.003 -0.0328,-0.005 -0.0328,-0.005 l -0.5041,19.62229 c -1.04511,-0.83968 -2.3607,-1.29931 -3.71904,-1.29933 -3.21567,-5e-5 -5.82249,2.52269 -5.82241,5.63464 -8e-5,3.11193 2.60674,5.63468 5.82241,5.63463 2.00184,0 3.8633,-0.99522 4.92889,-2.63521 l 0.003,0.006 v 0.001 h 0.001 v 10e-4 h 10e-4 10e-4 0.001 l 10e-4,-10e-4 0.001,-0.001 c 0.022,-0.0159 0.0853,-0.12733 0.17393,-0.31003 0.20166,-0.35765 0.36266,-0.73542 0.48016,-1.12667 0.34777,-0.91256 0.70881,-2.0918 0.74607,-3.01581 0.1759,-4.36213 0.27936,-11.31507 0.33397,-16.2536 l 16.19563,-3.74425 v 11.61584 a 5.8223157,5.6344991 0 0 0 -2.74611,-0.66668 5.8223157,5.6344991 0 0 0 -5.82241,5.63464 5.8223157,5.6344991 0 0 0 5.82241,5.63463 5.8223157,5.6344991 0 0 0 5.82116,-5.63463 5.8223157,5.6344991 0 0 0 -0.0693,-0.8721 v -21.40149 c 0,-0.0633 -0.0284,-0.11967 -0.0731,-0.15754 z"
              transform="matrix(0.78818081,0,0,0.78818081,16.601934,29.738058)"
            />
            <path
              id="path26"
              style={{ opacity: 1, fill: '#c017e8', fillOpacity: 1, stroke: 'none', strokeWidth: 0.6, strokeLinecap: 'round', strokeLinejoin: 'round', strokeOpacity: 0.968566 }}
              d="m 368.8356,214.17334 -17.04131,4.27026 0.0337,0.21952 c -0.0169,-0.003 -0.0258,-0.004 -0.0258,-0.004 l -0.39732,15.46591 c -0.82373,-0.66182 -1.86066,-1.02408 -2.93127,-1.0241 -2.53454,-4e-5 -4.58918,1.98834 -4.58912,4.44111 -6e-5,2.45277 2.05458,4.44115 4.58912,4.44111 1.5778,0 3.04497,-0.78442 3.88485,-2.07702 l 0.003,0.005 v 7.8e-4 h 7.8e-4 v 7.9e-4 h 8e-4 7.8e-4 7.9e-4 l 7.9e-4,-7.9e-4 7.9e-4,-7.8e-4 c 0.0173,-0.0125 0.0672,-0.10037 0.13709,-0.24437 0.15894,-0.28189 0.28584,-0.57964 0.37845,-0.88801 0.2741,-0.71926 0.55867,-1.64873 0.58804,-2.37701 0.13864,-3.43815 0.22019,-8.91832 0.26323,-12.81077 l 12.76509,-2.95115 v 9.15538 a 4.5890375,4.4410041 0 0 0 -2.16444,-0.52547 4.5890375,4.4410041 0 0 0 -4.58912,4.44112 4.5890375,4.4410041 0 0 0 4.58912,4.44111 4.5890375,4.4410041 0 0 0 4.58812,-4.44111 4.5890375,4.4410041 0 0 0 -0.0546,-0.68737 v -16.86824 c 0,-0.0499 -0.0224,-0.0943 -0.0576,-0.12417 z"
            />
            <path
              id="path25"
              style={{ opacity: 1, fill: '#faeefd', fillOpacity: 0.844794, stroke: 'none', strokeWidth: 0.6, strokeLinecap: 'round', strokeLinejoin: 'round', strokeOpacity: 0.968566 }}
              d="m 368.76416,214.07451 -17.04132,4.27033 0.0339,0.2186 c -0.0169,-0.003 -0.0262,-0.003 -0.0262,-0.003 l -0.39717,15.4665 c -0.82374,-0.66182 -1.86196,-1.02523 -2.93259,-1.02524 -2.53453,-5e-5 -4.58906,1.98843 -4.589,4.44121 -3e-5,1.45151 0.72071,2.74104 1.83344,3.55144 -0.92616,-0.81256 -1.50865,-1.98621 -1.50862,-3.29129 -6e-5,-2.45278 2.05447,-4.44124 4.589,-4.44121 1.07062,2e-5 2.10731,0.3619 2.93105,1.02372 l 0.39716,-15.46498 c 0,0 0.009,7.2e-4 0.0262,0.003 l -0.0339,-0.22013 16.71343,-4.18722 z m -2.01509,6.7257 -0.32328,0.0754 v 8.82085 a 4.5890375,4.4410041 0 0 0 -2.16442,-0.52649 4.5890375,4.4410041 0 0 0 -4.58899,4.44122 4.5890375,4.4410041 0 0 0 1.87038,3.57299 4.5890375,4.4410041 0 0 1 -1.54711,-3.31282 4.5890375,4.4410041 0 0 1 4.589,-4.44122 4.5890375,4.4410041 0 0 1 2.16442,0.52494 z"
            />
            <circle
              style={{ opacity: 1, mixBlendMode: 'normal', fill: '#ff5fdb', fillOpacity: 1, stroke: 'none', strokeWidth: 0.863758, strokeLinecap: 'round', strokeLinejoin: 'round', strokeOpacity: 0.968566, filter: 'url(#filter28)' }}
              id="path28"
              cx="420.79489"
              cy="263.28314"
              r="3.1144888"
              transform="matrix(0.69464077,0,0,0.69464077,54.558184,54.051138)"
            />
            <circle
              style={{ opacity: 0.341373, mixBlendMode: 'normal', fill: '#fffcfe', fillOpacity: 1, stroke: 'none', strokeWidth: 1.37442, strokeLinecap: 'round', strokeLinejoin: 'round', strokeOpacity: 0.968566, filter: 'url(#filter28)' }}
              id="circle28"
              cx="420.79489"
              cy="263.28314"
              r="3.1144888"
              transform="matrix(0.43655018,0,0,0.43655018,163.02374,121.95617)"
            />
            <circle
              style={{ opacity: 1, mixBlendMode: 'normal', fill: '#ff5fdb', fillOpacity: 1, stroke: 'none', strokeWidth: 0.863758, strokeLinecap: 'round', strokeLinejoin: 'round', strokeOpacity: 0.968566, filter: 'url(#filter28)' }}
              id="circle29"
              cx="420.79489"
              cy="263.28314"
              r="3.1144888"
              transform="matrix(0.69464077,0,0,0.69464077,70.087544,50.917736)"
            />
            <circle
              style={{ opacity: 0.311688, mixBlendMode: 'normal', fill: '#fffcfe', fillOpacity: 1, stroke: 'none', strokeWidth: 1.37442, strokeLinecap: 'round', strokeLinejoin: 'round', strokeOpacity: 0.968566, filter: 'url(#filter28)' }}
              id="circle30"
              cx="420.79489"
              cy="263.28314"
              r="3.1144888"
              transform="matrix(0.43655018,0,0,0.43655018,178.69076,118.86864)"
            />
          </g>

          {/* Horizontal Line Divider 1 */}
          <path
            style={{ opacity: 0.721707, fill: '#ffffff', stroke: '#cacaca', strokeWidth: 1.39999, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            d="M 416.40172,272.28349 H 903.75363"
            id="path15"
          />
          
          {/* Interactive CD-ron placed via foreignObject for 100% visual fidelity and physics support */}
          <foreignObject
            x="425.44748"
            y="288.59653"
            width="108"
            height="108"
            style={{ overflow: 'visible' }}
          >
            <CdInteractive
              playbackState={playbackState}
              coverType={tempCoverType}
              coverId={tempCoverId}
              coverUrl={tempCoverUrl}
              songTitle={localTrack ? localTrack.title : "Sensorium (Gothic Symphony)"}
              artistName={localTrack ? localTrack.artist : "EPICA"}
            />
          </foreignObject>
          
          {/* Horizontal Line Divider 2 */}
          <path
            style={{ opacity: 0.721707, fill: '#ffffff', stroke: '#cacaca', strokeWidth: 1.39999, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            d="M 416.40172,590.28349 H 903.75363"
            id="path17"
          />
          
          {/* Horizontal Line Divider 3 */}
          <path
            style={{ opacity: 0.721707, fill: '#ffffff', stroke: '#cacaca', strokeWidth: 1.39999, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            d="M 422.73913,640.28349 H 891.75937"
            id="path18"
          />
          
          {/* Static background timeline (Linha do tempo OF) */}
          <path
            style={{ opacity: 0.721707, fill: '#ffffff', stroke: '#9c9b9e', strokeWidth: 5.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            d="M 416.40172,510.28349 H 903.75363"
            id="path19"
          />
          
          {/* Dynamic cyan progress line and agulha (Linha do tempo ON + Agulha) */}
          {(() => {
            const percentFract = duration && isFinite(duration) && duration > 0
              ? Math.max(0, Math.min(1, currentTime / duration))
              : 0;
            const startX = 416.40172;
            const totalWidth = 903.75363 - startX; // = 487.35191
            const currentEndX = startX + totalWidth * percentFract;
            return (
              <>
                {/* Cyan Neon Progress Line (Linha do tempo ON) */}
                <path
                  style={{ opacity: 0.968566, fill: '#ffffff', stroke: '#3affe9', strokeWidth: 5.6, strokeLinecap: 'round', strokeLinejoin: 'round', filter: 'drop-shadow(0px 0px 5px #3affe9)' }}
                  d={`M ${startX},510.28349 H ${currentEndX}`}
                  id="path20"
                />
                
                {/* Agulha (Neon White Dot with Cyan Outline) */}
                <ellipse
                  style={{ opacity: 1, fill: '#ffffff', stroke: '#3affe9', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round', filter: 'drop-shadow(0px 0px 4px #3affe9)' }}
                  id="path21"
                  cx={currentEndX}
                  cy="510.05191"
                  rx="6.5"
                  ry="6.5"
                />

                {/* Invisible Slider overlay for scrubbing/timeline clicking */}
                <rect
                  x={startX - 10}
                  y="490"
                  width={totalWidth + 20}
                  height="40"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                />
              </>
            );
          })()}
          
          {/* Tempo Inicio */}
          <text
            xmlSpace="preserve"
            style={{ fontSize: '21.7356px', lineHeight: '34.1034px', fontFamily: 'monospace', textAnchor: 'middle', fill: '#e5ffff', fillOpacity: 0.941061 }}
            x="435.94995"
            y="536.0141"
            id="text21"
          >
            <tspan x="436.22565" y="536.0141">{formatTime(currentTime)}</tspan>
          </text>
          
          {/* Tempo Final */}
          <text
            xmlSpace="preserve"
            style={{ fontSize: '20.7356px', lineHeight: '33.1034px', fontFamily: 'monospace', textAnchor: 'middle', fill: '#e6ffff', fillOpacity: 0.948919 }}
            x="881.93079"
            y="536.0141"
            id="text22"
          >
            <tspan x="882.20648" y="536.0141">{formatTime(duration)}</tspan>
          </text>
          
          {/* Dark rounded background card for the equalizer visualizer (rect22) */}
          <rect
            style={{ opacity: 0.534323, fill: '#312e4b', fillOpacity: 1, stroke: 'none', strokeWidth: 0.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            id="rect22"
            width="401.44891"
            height="66.13195"
            x="472.14026"
            y="425.17838"
            rx="10.233806"
            ry="13.843504"
          />

          {/* Real Canvas Equalizer integrated via foreignObject into the exact SVG box bounds */}
          <foreignObject
            x="472.14026"
            y="425.17838"
            width="401.44891"
            height="66.13195"
          >
            <EqualizerVisualizer
              isPlaying={isPlaying}
              audioRef={audioRef}
              theme={profile.theme}
              className="w-full h-full bg-transparent flex items-end justify-center gap-1.5 px-6 pb-2 select-none"
            />
          </foreignObject>
          
          {/* System - Ao Vivo Title Box */}
          <rect
            style={{ opacity: 1, fill: 'none', stroke: '#0dff9a', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}
            id="rect37"
            width="117.32225"
            height="23.05118"
            x="630.25224"
            y="242.3845"
            rx="6.55569"
            ry="6.81055"
          />
          
          {/* Live Pulsing Dot */}
          <circle
            style={{ opacity: 1, fill: '#00f397' }}
            className={isPlaying ? "animate-pulse" : ""}
            id="path37"
            cx="641.88318"
            cy="253.42612"
            r="5.1866693"
          />
          
          {/* "Ouvindo Agora" indicator title */}
          <text
            xmlSpace="preserve"
            style={{ fontStyle: 'normal', fontWeight: 'bold', fontSize: '8.6874px', lineHeight: '14.5311px', fontFamily: 'sans-serif', textAnchor: 'middle', fill: '#06ffa0' }}
            x="699.4245"
            y="256.99667"
            id="text37"
          >
            <tspan x="699.60822" y="256.99667">OUVINDO AGORA</tspan>
          </text>
          
          {/* Origem: Label */}
          <text
            xmlSpace="preserve"
            style={{ fontStyle: 'normal', fontWeight: 'bold', fontSize: '14.4201px', fontFamily: 'sans-serif', textAnchor: 'middle', fill: '#ffffff' }}
            x="455.80618"
            y="619.68628"
            id="text38"
          >
            <tspan x="456.04395" y="619.68628">Origem:</tspan>
          </text>
          
          {/* Nome da Origem Value */}
          <text
            xmlSpace="preserve"
            style={{ fontStyle: 'normal', fontWeight: 'bold', fontSize: '14.4201px', fontFamily: 'sans-serif', textAnchor: 'middle', fill: '#50ddd1' }}
            x="540.93384"
            y="619.68628"
            id="text39"
          >
            <tspan x="541.17157" y="619.68628">{getSourceLabel(localTrack?.source || "").toUpperCase()}</tspan>
          </text>
          
          {/* Likes Button (Heart) */}
          <g className="cursor-pointer" onClick={handleToggleLike} style={{ pointerEvents: localTrack ? 'auto' : 'none' }}>
            <path
              style={{ opacity: 1, fill: hasLiked ? '#ff00ff' : '#ff129b', fillOpacity: 0.941061, stroke: '#000000', strokeWidth: 1.6 }}
              d="m 776.35936,610.77966 c 0,0 -4.2996,-5.05748 -7.0802,-4.61038 -3.6433,0.58582 -6.9507,4.95451 -6.9156,8.64445 0.071,7.42408 14.2428,17.12425 14.2428,17.12425 0,0 12.4422,-10.77997 14.2428,-15.807 1.3418,-3.74616 -3.2655,-8.746 -7.1626,-9.55006 -2.7569,-0.56881 -7.3272,4.19874 -7.3272,4.19874 z"
              id="path39"
            />
          </g>
          
          {/* Likes Count Text */}
          <text
            xmlSpace="preserve"
            style={{ fontStyle: 'normal', fontWeight: 'bold', fontSize: '24px', fontFamily: 'sans-serif', textAnchor: 'middle', fill: '#ffffff' }}
            x="807.1947"
            y="628"
            id="text40"
          >
            <tspan x="807.72491" y="628">{likesCount}</tspan>
          </text>
          
          {/* Headphones Icon */}
          <path
            id="path40"
            style={{ opacity: 1, fill: '#12ffaf', fillOpacity: 0.941061, stroke: '#000000', strokeWidth: 0.8 }}
            d="m 850.9816,602.51451 c -10.76084,0.0709 -12.94656,9.42861 -12.75586,18.95898 -0.0257,0.42659 -0.0188,0.84717 0.0176,1.25977 -2.51526,1.05265 -4.10924,3.2384 -4.10938,5.63281 -6e-5,3.46331 3.28347,6.27116 7.33399,6.27149 0.13177,0 2.26294,-0.004 2.39453,-0.01 0,0 -0.68013,-5.21014 -0.64453,-5.18164 -0.42871,-4.40314 -0.84892,-9.14754 -0.30078,-13.40039 0.65167,-5.05613 3.13827,-9.05466 8.08593,-9.30664 4.94766,0.25198 7.43232,4.25051 8.08399,9.30664 0.54814,4.25285 0.12793,8.99725 -0.30078,13.40039 0.0356,-0.0285 -0.64454,5.18164 -0.64454,5.18164 0.13159,0.006 2.26277,0.01 2.39454,0.01 4.05052,-3.3e-4 7.33404,-2.80818 7.33398,-6.27149 -1.4e-4,-2.39441 -1.59411,-4.58016 -4.10937,-5.63281 0.0364,-0.4126 0.0433,-0.83318 0.0176,-1.25977 0.1907,-9.53036 -1.99504,-18.88807 -12.75586,-18.95898 -0.0137,-9e-5 -0.0273,6e-5 -0.041,0 z"
          />
          
          {/* Headphones Listeners Count */}
          <text
            xmlSpace="preserve"
            style={{ fontStyle: 'normal', fontWeight: 'bold', fontSize: '24px', fontFamily: 'sans-serif', textAnchor: 'middle', fill: '#ffffff' }}
            x="883.5697"
            y="628"
            id="text44"
          >
            <tspan x="884.09991" y="628">{mockListenersCount}</tspan>
          </text>
          
          {/* Song Artist & Title text layout */}
          <text
            xmlSpace="preserve"
            style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '20px', fontFamily: "'Trebuchet MS', 'Inter', sans-serif", textAnchor: 'start', fill: '#ffffff' }}
            x="560"
            y="318.03931"
            id="text45"
          >
            <tspan x="560" y="318.03931">
              {localTrack 
                ? truncateText(`${localTrack.artist.toUpperCase()} - ${localTrack.title.toUpperCase()}`, 28)
                : "NENHUMA MÚSICA DEFINIDA"}
            </tspan>
          </text>
          
          {/* Uploader name and source: Paulo - UPLOAD */}
          <text
            xmlSpace="preserve"
            style={{ fontStyle: 'normal', fontWeight: 'bold', fontSize: '15.8px', fontFamily: "'Trebuchet MS', 'Inter', sans-serif", textAnchor: 'start', fill: '#06ff8e' }}
            x="560"
            y="349.55457"
            id="text46"
          >
            <tspan x="560" y="349.55457">
              {truncateText(`${(profile.nome_exibicao || profile.name || "Paulo").toUpperCase()} - ${(localTrack?.source || "OFFLINE").toUpperCase()}`, 28)}
            </tspan>
          </text>
          
          {/* "Definida por @..." */}
          <text
            xmlSpace="preserve"
            style={{ fontStyle: 'normal', fontWeight: 'bold', fontSize: '14px', fontFamily: "'DotGothic16', 'Trebuchet MS', monospace", textAnchor: 'start', fill: '#dde8f4', fillOpacity: 0.86444 }}
            x="560"
            y="373.79721"
            id="text47"
          >
            <tspan x="560" y="373.79721">
              {truncateText(`Definida por @${profile.username || "membro"}`, 32)}
            </tspan>
          </text>
          
          {/* Music Choice/Config Pencil Icon */}
          <g className="cursor-pointer" onClick={() => { if (isOwner) setIsConfigOpen(true); }}>
            <path
              style={{ opacity: 1, fill: '#ffffff', stroke: 'none' }}
              d="m 877.53227,236.99758 -11.22759,21.47797 0.82261,6.59186 6.24009,-3.62151 10.77272,-21.06481 z"
              id="path23"
            />
            {/* Small underline beneath pencil icon */}
            <rect
              style={{ opacity: 1, fill: '#ffffff', stroke: 'none' }}
              id="rect24"
              width="24.327154"
              height="3.4577796"
              x="865.40393"
              y="266.5163"
              rx="0.32931235"
              ry="0.32931235"
            />
          </g>
          
          {/* Main Play/Pause Button */}
          <g className="cursor-pointer" onClick={isPlaying ? handlePause : handlePlay}>
            {/* Pink Background Circle */}
            <circle
              style={{ opacity: 1, fill: '#f709db', stroke: '#cacaca', strokeWidth: 0.9 }}
              id="circle31"
              cx="629.8396"
              cy="553.40497"
              r="28.320862"
            />
            
            {/* Play/Pause Icons dynamically toggled and perfectly centered */}
            {isPlaying ? (
              <g style={{ fill: '#ffffff', stroke: 'none', pointerEvents: 'none' }}>
                <rect x="623.5" y="545.4" width="4.5" height="16" rx="1" />
                <rect x="631.5" y="545.4" width="4.5" height="16" rx="1" />
              </g>
            ) : (
              <path
                id="path33"
                style={{ opacity: 0.864564, fill: '#ffffff', stroke: '#ffffff', strokeWidth: 2.4, pointerEvents: 'none' }}
                d="m 621.36294,542.2837 v 24.98391 l 20.19804,-13.20542 z"
              />
            )}
          </g>

          {/* Dedicated Stop Button from Approved Design (g35) */}
          <g
            id="g35"
            transform="matrix(0.83235915,0,0,0.83147354,146.91499,96.562813)"
            className="cursor-pointer"
            onClick={handleStop}
          >
            <circle
              style={{ opacity: 1, fill: '#1d3439', fillOpacity: 0.343811, stroke: '#cacaca', strokeWidth: 1.08184, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              id="circle32"
              cx="665.8396"
              cy="553.40497"
              r="25.686363"
            />
            <path
              id="rect33"
              style={{ opacity: 0.864564, fill: 'none', stroke: '#ffffff', strokeWidth: 2.88491, strokeLinecap: 'round', strokeLinejoin: 'round' }}
              d="m 659.57971,547.0232 c -0.49526,0 -0.89428,0.3908 -0.89428,0.87629 v 10.51581 c 0,0.48549 0.39902,0.87629 0.89428,0.87629 h 11.80036 c 0.49526,0 0.89394,-0.3908 0.89394,-0.87629 v -10.51581 c 0,-0.48549 -0.39868,-0.87629 -0.89394,-0.87629 z"
            />
          </g>
          
          {/* Voltar / Prev Button */}
          <g
            className="cursor-pointer"
            onClick={handlePreviousTrack}
          >
            <ellipse
              style={{ fill: '#1d3439', fillOpacity: 0.343811, stroke: '#cacaca', strokeWidth: 0.900001 }}
              id="circle33"
              cx="566.0719"
              cy="556.22961"
              rx="18.949375"
              ry="18.901932"
            />
            <path
              id="path34"
              style={{ opacity: 0.864564, fill: '#ffffff', pointerEvents: 'none' }}
              d="m 559.73716,549.14775 c -0.0914,0.009 -0.16143,0.0867 -0.16143,0.18039 v 13.06218 c 0,0.1 0.0806,0.18039 0.18084,0.18039 h 1.51839 c 0.1002,0 0.18206,-0.0805 0.18206,-0.18039 v -13.06218 c 0,-0.0999 -0.0819,-0.18039 -0.18206,-0.18039 h -1.51839 c -0.006,0 -0.0133,-6e-4 -0.0194,0 z m 11.8448,0.61867 -9.53265,5.62125 9.53265,6.30286 z"
            />
          </g>
          
          {/* Avançar / Next Button */}
          <g
            className="cursor-pointer"
            onClick={handleNextTrack}
          >
            <ellipse
              style={{ fill: '#1d3439', fillOpacity: 0.343811, stroke: '#cacaca', strokeWidth: 0.9 }}
              id="circle34"
              cx="759.6073"
              cy="556.68256"
              rx="20.01697"
              ry="19.255484"
            />
            <path
              id="path35"
              style={{ opacity: 0.864564, fill: '#ffffff', pointerEvents: 'none' }}
              d="m 765.12283,549.74804 c 0.0945,0.009 0.16681,0.0864 0.16681,0.17976 v 13.01657 c 0,0.0996 -0.0833,0.17976 -0.18687,0.17976 h -1.56898 c -0.10355,0 -0.18813,-0.0802 -0.18813,-0.17976 V 549.9278 c 0,-0.0996 0.0845,-0.17976 0.18813,-0.17976 h 1.56898 c 0.006,0 0.0138,-6.1e-4 0.02,0 z m -12.23952,0.61651 9.85032,5.60162 -9.85032,6.28087 z"
            />
          </g>
        </g>
      </svg>

      {/* Music Config Modal */}
      <MusicConfigModal
        isOpen={isConfigOpen}
        onClose={handleCloseModal}
        currentTrack={localTrack}
        premiumStatus={premiumStatus}
        profile={profile}
        onSave={saveSelectedTrack}
        onSaveProfile={onSaveProfile}
        coverType={tempCoverType}
        coverId={tempCoverId}
        coverUrl={tempCoverUrl}
        onCoverChange={(type, id, url) => {
          setTempCoverType(type);
          setTempCoverId(id);
          setTempCoverUrl(url);
        }}
        onSaveCover={async () => {
          try {
            await onSaveProfile({
              coverType: tempCoverType,
              coverId: tempCoverId,
              coverUrl: tempCoverUrl,
            });
            setIsConfigOpen(false);
          } catch (err) {
            console.error("Failed to save cover config:", err);
            alert("Erro ao salvar capa do CD.");
          }
        }}
      />
    </div>
  );
};

