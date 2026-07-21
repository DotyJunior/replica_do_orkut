import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Heart, 
  MessageSquare, 
  Play, 
  Pause, 
  Image as ImageIcon, 
  ArrowLeft, 
  Sparkles, 
  Camera, 
  Tv, 
  ShieldCheck, 
  Volume2, 
  User, 
  ChevronRight, 
  ChevronLeft,
  Link as LinkIcon,
  Share2, 
  Star,
  Film,
  Smile,
  Info,
  Upload,
  Instagram,
  Send,
  MessageCircle
} from 'lucide-react';
import { Album, Photo, PhotoComment, Friend } from '../types';
import SocialActions from './SocialActions';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  getDocs,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { supabaseStorageService } from '../supabase';

export const getPhotoEffectClass = (effect?: string) => {
  if (!effect) return '';
  switch (effect) {
    case 'anos-2000':
      return 'contrast-[1.25] saturate-[1.4] sepia-[0.15] brightness-[1.05]';
    case 'dark-gothic':
      return 'brightness-[0.7] contrast-[1.4] saturate-[0.45] hue-rotate-[250deg]';
    case 'rosa-glitter':
      return 'hue-rotate-[315deg] saturate-[1.3] brightness-[1.1] contrast-[1.05]';
    case 'emo':
      return 'grayscale-[0.9] contrast-[1.5] brightness-[0.85]';
    case 'cyber-glitch':
      return 'hue-rotate-[80deg] saturate-[1.9] contrast-[1.3] brightness-[1.1] invert-[0.05]';
    case 'vhs':
      return 'contrast-[0.9] saturate-[1.1] brightness-[1.05] sepia-[0.2]';
    case 'fotolog':
      return 'saturate-[1.8] contrast-[1.2] brightness-[1.15]';
    case 'cyber-punk':
      return 'hue-rotate-[190deg] saturate-[2.0] contrast-[1.3] brightness-[0.9]';
    default:
      return '';
  }
};

interface PhotoAlbumsProps {
  profileId: string;
  profileName: string;
  profileAvatar: string;
  profileTheme?: string;
  albums: Album[];
  isOwnProfile: boolean;
  onUpdateAlbums: (updatedAlbums: Album[]) => void;
  featuredPhotoId: string | null;
  onSetFeaturedPhoto: (photoId: string | null) => void;
  isVisitorMode?: boolean;
  onShareToFeed: (itemTitle: string, itemType: string) => void;
  initialOpenUpload?: boolean;
  onResetUploadTrigger?: () => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserFriends?: Friend[];
}

// Preset visual suggestion options for rich user experience
const RETRO_PRESETS = [
  { name: '💿 Fita de CD Emo Rock', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600' },
  { name: '📟 Monitor de Fósforo Verde', url: 'https://images.unsplash.com/photo-1601987177651-8edfe6c20009?w=600' },
  { name: '📺 Televisão Antiga Bombada', url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600' },
  { name: '🕹️ Fliperama Retrô Curitiba', url: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=600' },
  { name: '💻 Computador de Tubo Branco', url: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600' },
  { name: '📼 Fita Cassete Magnética', url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600' }
];

const GIF_PRESETS = [
  { name: '⚡ Pikachu Dance', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWZscDBsbnFlN3pqa3FjcndwNWZ5M3YweHFtNmxyZ2MzbzlwdjI4NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Y2pC52M48T9v2/giphy.gif' },
  { name: '🌹 Rosa Brilhante Retro', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3pjdWRhbW41dzNqNTRkOWI1aWNoOGtydWZmb3hyOGo5c2YxeTJjNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LMc8vEIsS0PFC/giphy.gif' },
  { name: '🌀 Matrix Rain Code', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTYyeTFzbDN4bnFpeTdxNXBhbmtsajAweTViMmdnMnA2dzQxdnpxNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TdU3S76uAn7v83e6S7/giphy.gif' },
  { name: '👾 Cyber Glitch Animation', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExejhpYzY0cnE5MmZwbTZleTZlajRkNzdpODhzd3VyOHEyMzd6MXZzeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZElXUvIsO2ef6/giphy.gif' },
  { name: '🎸 Emo Punk Skull', url: 'https://media.giphy.com/media/3o7aTskHEUdgCQAXde/giphy.gif' }
];

// Synth Shutter Sound using Web Audio API
export const playShutterSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Camera lens auto-focus beep beep
    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.05, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playBeep(2100, 0, 0.05);
    playBeep(2100, 0.08, 0.05);

    // Shutter tsclick
    const shutterStart = 0.18;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(900, ctx.currentTime + shutterStart);
    osc1.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + shutterStart + 0.05);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(450, ctx.currentTime + shutterStart);
    osc2.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + shutterStart + 0.1);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.18, ctx.currentTime + shutterStart);
    gainNode.gain.exponentialRampToValueAtTime(0.002, ctx.currentTime + shutterStart + 0.14);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(ctx.currentTime + shutterStart);
    osc2.start(ctx.currentTime + shutterStart);
    osc1.stop(ctx.currentTime + shutterStart + 0.16);
    osc2.stop(ctx.currentTime + shutterStart + 0.16);
  } catch (e) {
    console.log("Audio gesture restriction active on sandbox.");
  }
};

let activeProcessingAudio: HTMLAudioElement | null = null;

// Play custom dynamic mp3 processing audio asset
export const playProcessingSound = () => {
  try {
    if (activeProcessingAudio) {
      activeProcessingAudio.pause();
      activeProcessingAudio.currentTime = 0;
    }
    const audio = new Audio('/assets/.aistudio/Processing_foto.mp3');
    audio.volume = 0.65;
    activeProcessingAudio = audio;
    audio.play().catch(e => {
      console.log("Audio playback deferred or blocked by browser restriction:", e);
    });
  } catch (err) {
    console.log("Failed to play custom processing audio:", err);
  }
};

// Stop custom dynamic mp3 processing audio asset
export const stopProcessingSound = () => {
  try {
    if (activeProcessingAudio) {
      activeProcessingAudio.pause();
      activeProcessingAudio.currentTime = 0;
      activeProcessingAudio = null;
    }
  } catch (err) {
    console.log("Failed to stop processing audio:", err);
  }
};

export default function PhotoAlbums({
  profileId,
  profileName,
  profileAvatar,
  profileTheme = 'default',
  albums,
  isOwnProfile,
  onUpdateAlbums,
  featuredPhotoId,
  onSetFeaturedPhoto,
  isVisitorMode = false,
  onShareToFeed,
  initialOpenUpload = false,
  onResetUploadTrigger,
  currentUserId = 'me',
  currentUserName = 'orkut',
  currentUserFriends = []
}: PhotoAlbumsProps) {
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isOpeningAlbum, setIsOpeningAlbum] = useState(false);
  
  // Sharing & Received Photos States
  const [showFriendsShareModal, setShowFriendsShareModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [shareMessageText, setShareMessageText] = useState('Olha essa foto 😂');
  const [isSharingInProgress, setIsSharingInProgress] = useState(false);
  const [receivedPhotosList, setReceivedPhotosList] = useState<any[]>([]);
  const [activeAlbumsTab, setActiveAlbumsTab] = useState<'my-albums' | 'received-photos'>('my-albums');
  const [shareSuccessData, setShareSuccessData] = useState<{
    names: string[];
    lastRecipientId: string;
  } | null>(null);

  const getUserIdByNameAndAvatar = (name: string, avatar: string): string => {
    if (name === 'Lucas Santos') return 'lucas';
    if (name === 'Alexandre Curi') return 'alexandre';
    if (name === 'Orkut Büyükkökten' || name === 'Orkut') return 'orkut';
    if (name === 'H3_Elit3_Hacker') return 'hacker';
    if (name === profileName) return profileId;
    if (name === currentUserName) return currentUserId || 'me';
    return 'me';
  };

  const handleUserClick = (uid: string) => {
    handleClosePhotoDirect();
    window.location.hash = `#/profile/${uid}`;
  };

  // Real-time synchronization of shared photos with robust local storage fallback
  useEffect(() => {
    if (!db || !currentUserId) return;
    
    const getLocalShared = (): any[] => {
      const localPhotosKey = `orkut_local_shared_photos_${currentUserId}`;
      const existingLocal = localStorage.getItem(localPhotosKey);
      if (existingLocal) {
        try {
          return JSON.parse(existingLocal);
        } catch (e) {}
      }
      return [];
    };

    const q = query(
      collection(db, 'shared_photos'),
      where('receiverId', '==', currentUserId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbList: any[] = [];
      snapshot.forEach((docSnap) => {
        dbList.push({ id: docSnap.id, ...docSnap.data() });
      });

      const localList = getLocalShared();
      const combined = [...dbList];

      localList.forEach(localItem => {
        if (!combined.some(dbItem => dbItem.id === localItem.id)) {
          combined.push(localItem);
        }
      });

      // Sort by createdAt descending
      combined.sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
      setReceivedPhotosList(combined);
    }, (error) => {
      console.error("Error loading shared photos, using local fallback only:", error);
      const localList = getLocalShared();
      localList.sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
      setReceivedPhotosList(localList);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  const [senderProfiles, setSenderProfiles] = useState<{[uid: string]: any}>({});

  useEffect(() => {
    if (!db || receivedPhotosList.length === 0) return;
    
    // Find unloaded distinct senders
    const unloadedSenders = ([...new Set(receivedPhotosList.map(item => (item.senderId || '') as string))] as string[])
      .filter(id => id && !senderProfiles[id]);
      
    if (unloadedSenders.length === 0) return;
    
    unloadedSenders.forEach(async (senderId) => {
      try {
        const docSnap = await getDocs(query(collection(db, 'profiles'), where('id', '==', senderId)));
        if (!docSnap.empty) {
          const data = docSnap.docs[0].data();
          setSenderProfiles(prev => ({
            ...prev,
            [senderId]: data
          }));
        } else {
          // Fallback profiles
          const defaultNames: {[uid: string]: string} = {
            'lucas': 'Lucas Santos',
            'alexandre': 'Alexandre Curi',
            'orkut': 'Orkut Büyükkökten',
            'hacker': 'H3_Elit3_Hacker'
          };
          const defaultAvatars: {[uid: string]: string} = {
            'lucas': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            'alexandre': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
            'orkut': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            'hacker': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150'
          };
          setSenderProfiles(prev => ({
            ...prev,
            [senderId]: {
              name: defaultNames[senderId] || `Amigo #${senderId.substring(0, 5)}`,
              avatar: defaultAvatars[senderId] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
            }
          }));
        }
      } catch (err) {
        console.error("Error loading sender profile details:", err);
      }
    });
  }, [receivedPhotosList, senderProfiles]);

  // View states: 'list' | 'album' | 'photo'
  const [viewMode, setViewMode] = useState<'list' | 'album' | 'photo'>('list');

  // Prevent background scrolling when viewing a photo in full screen modal overlay
  useEffect(() => {
    if (viewMode === 'photo') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewMode]);

  // Edit Caption states
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');

  // Organize/Manage Album states
  const [showOrganizeAlbum, setShowOrganizeAlbum] = useState(false);
  const [editAlbumName, setEditAlbumName] = useState('');
  const [editAlbumDesc, setEditAlbumDesc] = useState('');
  const [editAlbumTheme, setEditAlbumTheme] = useState<'neon-hacker' | 'emo-2008' | 'vhs' | 'cyberpunk' | 'glitter' | 'gotico' | 'polaroid' | 'old-camera'>('neon-hacker');

  // Loading simulate state for that delicious dial-up 2004 nostalgia
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  // Exportando Foto system for minimal-oldweb
  const [isExporting, setIsExporting] = useState(false);
  const [exportFrame, setExportFrame] = useState(1);
  const [exportSeconds, setExportSeconds] = useState(6);
  const [svgFrames, setSvgFrames] = useState<string[]>([]);
  const [exportPhotoData, setExportPhotoData] = useState<{
    newPhoto: Photo;
    updatedAlbums: Album[];
  } | null>(null);

  // Pre-load SVG frames on mount for oldweb export animation
  useEffect(() => {
    const loadFrames = async () => {
      try {
        const frames: string[] = [];
        for (let i = 1; i <= 9; i++) {
          const res = await fetch(`/assets/themes/windows-98/ui/aproved/exportando-foto/Frame-0${i}-processing-photo.svg`);
          const text = await res.text();
          frames.push(text);
        }
        setSvgFrames(frames);
      } catch (err) {
        console.error("Erro ao carregar frames de exportação:", err);
      }
    };
    loadFrames();
  }, []);

  // Drive animation timer for Exportando Foto
  useEffect(() => {
    if (!isExporting) return;

    const startTime = Date.now();
    const duration = 7000; // 7 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(interval);
        setExportFrame(9);
        setExportSeconds(0);
        // Complete the export
        if (exportPhotoData) {
          onUpdateAlbums(exportPhotoData.updatedAlbums);
          setNewPhotoUrl('');
          setNewPhotoCaption('');
          setNewPhotoSong('');
          setNewPhotoGif('');
          setActiveEffect('');
          setAiPrompt('');
          setShowAddPhoto(false);
          setSelectedPhotoId(exportPhotoData.newPhoto.id);
          setViewMode('photo');
        }
        setIsExporting(false);
        setExportPhotoData(null);
      } else {
        const progress = elapsed / duration;
        const frame = Math.min(9, Math.floor(progress * 9) + 1);
        setExportFrame(frame);

        const sec = Math.max(0, 6 - Math.floor(elapsed / 1000));
        setExportSeconds(sec);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isExporting, exportPhotoData]);

  const handleCancelExport = () => {
    setIsExporting(false);
    setExportPhotoData(null);
    setShowAddPhoto(true);
  };

  const getProcessedSvg = () => {
    let rawSvg = svgFrames[exportFrame - 1];
    if (!rawSvg) return '';
    
    // Replace the 1.300ms countdown text value dynamically
    const textReplacement = `${exportSeconds} ${exportSeconds === 1 ? 'segundo' : 'segundos'}`;
    rawSvg = rawSvg.replace('1.300ms', textReplacement);

    // Decrease the countdown font-size from 48px to 19px so it fits beautifully and doesn't overflow
    rawSvg = rawSvg.replace(/font-size:\s*48px/g, 'font-size:19px');

    // Replace fonts with retro/digital DotGothic16
    rawSvg = rawSvg.replace(/font-family:\s*['"]?Yu Gothic['"]?/g, "font-family:'DotGothic16', monospace");
    rawSvg = rawSvg.replace(/font-family:\s*['"]?Redensek['"]?/g, "font-family:'DotGothic16', monospace");
    
    return rawSvg;
  };

  // Creation State modals
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);

  // Form Fields
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [newAlbumTheme, setNewAlbumTheme] = useState<'neon-hacker' | 'emo-2008' | 'vhs' | 'cyberpunk' | 'glitter' | 'gotico' | 'polaroid' | 'old-camera'>('neon-hacker');

  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoSong, setNewPhotoSong] = useState('');
  const [newPhotoGif, setNewPhotoGif] = useState('');
  const [activeEffect, setActiveEffect] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingPhotoAi, setIsGeneratingPhotoAi] = useState(false);
  const [isUploadingLocalPhoto, setIsUploadingLocalPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comment posting
  const [commentInput, setCommentInput] = useState('');

  // Song visualizer simulator
  const [isSongPlaying, setIsSongPlaying] = useState(false);

  // States for simplified expanded photo view and album pagination
  const [showPhotoDropdown, setShowPhotoDropdown] = useState(false);
  const [showCommentsSection, setShowCommentsSection] = useState(false);
  const [showCaptionBubble, setShowCaptionBubble] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5'>('1:1');
  const [albumPage, setAlbumPage] = useState<number>(0);
  const [photoIdToDelete, setPhotoIdToDelete] = useState<string | null>(null);

  // Filter profiles albums loaded (only of current viewed profile!)
  const profileAlbums = albums.filter(a => a.profileId === profileId);

  // Retrieve Active elements
  const activeAlbum = albums.find(a => a.id === activeAlbumId);
  const activePhoto = activeAlbum?.photos.find(p => p.id === selectedPhotoId);

  // Sync edited caption and album details when editing targets change
  useEffect(() => {
    if (activePhoto) {
      setEditedCaption(activePhoto.caption);
    }
  }, [selectedPhotoId, activePhoto]);

  useEffect(() => {
    if (activeAlbum) {
      setEditAlbumName(activeAlbum.name);
      setEditAlbumDesc(activeAlbum.description);
      setEditAlbumTheme(activeAlbum.theme);
    }
  }, [activeAlbumId, activeAlbum]);

  // Handle auto-triggering uploads / custom photo panel actions
  useEffect(() => {
    return () => {
      stopProcessingSound();
    };
  }, []);

  useEffect(() => {
    if (initialOpenUpload) {
      if (profileAlbums.length > 0) {
        setActiveAlbumId(profileAlbums[0].id);
        setViewMode('album');
        setShowAddPhoto(true);
      } else {
        setViewMode('list');
        setShowCreateAlbum(true);
      }
      if (onResetUploadTrigger) {
        onResetUploadTrigger();
      }
    }
  }, [initialOpenUpload, profileAlbums.length, onResetUploadTrigger]);

  // Retro Loaders phrases
  const loaderPhrases = [
    'Discando via Curitiba Telecom USRobotics 56kpbs...',
    'Realizando handshake analógico de frequências...',
    'Borrow Checker liberando porta do álbum...',
    'Verificando pilha de frames estáticos...',
    'Desenhaste pixels interlaçados CRT...',
    'Iniciando tubo estático de raios catódicos...'
  ];

  const triggerNostalgicLoading = (callback: () => void, textOverride?: string, forceLoadingForOldWeb?: boolean) => {
    if (profileTheme === 'minimal-oldweb') {
      if (forceLoadingForOldWeb) {
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          callback();
        }, 7000);
      } else {
        callback();
      }
      return;
    }
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingText(textOverride || loaderPhrases[Math.floor(Math.random() * loaderPhrases.length)]);
    playProcessingSound();

    const totalDuration = 3500; // 3.5 seconds precisely
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
      setLoadingProgress(progress);

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        stopProcessingSound();
        setTimeout(() => {
          setIsLoading(false);
          callback();
        }, 100);
      }
    }, 50);
  };

  const handleOpenAlbum = (id: string) => {
    setIsOpeningAlbum(true);
    triggerNostalgicLoading(() => {
      setActiveAlbumId(id);
      setViewMode('album');
      setSelectedPhotoId(null);
      setAlbumPage(0);
      setIsOpeningAlbum(false);
    }, 'Baixando fotos do álbum no cache seguro...', true);
  };

  const handleOpenPhoto = (photoId: string) => {
    setSelectedPhotoId(photoId);
    setViewMode('photo');
    setIsSongPlaying(true); // Auto play visualizer song of the moment!
    setShowCommentsSection(false);
    setShowPhotoDropdown(false);
    setShowCaptionBubble(false);
    setShowShareMenu(false);
  };

  const handleBackToAlbums = () => {
    triggerNostalgicLoading(() => {
      setViewMode('list');
      setActiveAlbumId(null);
      setSelectedPhotoId(null);
      setShowShareMenu(false);
    });
  };

  const handleBackToAlbum = () => {
    setViewMode('album');
    setSelectedPhotoId(null);
    setShowShareMenu(false);
  };

  const handleClosePhotoDirect = () => {
    setViewMode('album');
    setSelectedPhotoId(null);
    setShowCaptionBubble(false);
    setShowShareMenu(false);
  };

  // Create Album
  const handleCreateAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    const newAlbum: Album = {
      id: 'album_' + Math.random().toString(36).substr(2, 9),
      profileId: profileId,
      name: newAlbumName.trim(),
      description: newAlbumDesc.trim() || 'Sem descrição.',
      theme: newAlbumTheme,
      photos: [],
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    onUpdateAlbums([...albums, newAlbum]);
    setNewAlbumName('');
    setNewAlbumDesc('');
    setShowCreateAlbum(false);
    triggerNostalgicLoading(() => {
      setActiveAlbumId(newAlbum.id);
      setViewMode('album');
    }, 'Pintando tema sob demanda e compilando sandbox...');
  };

  // Add Photo
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim() || !activeAlbumId) return;

    const newPhoto: Photo = {
      id: 'photo_' + Math.random().toString(36).substr(2, 9),
      url: newPhotoUrl.trim(),
      caption: newPhotoCaption.trim() || 'Sem legenda.',
      song: newPhotoSong.trim() || undefined,
      gifUrl: newPhotoGif.trim() || undefined,
      effect: activeEffect || undefined,
      likes: 0,
      loves: 0,
      comments: [],
      date: new Date().toLocaleDateString('pt-BR')
    };

    const updatedAlbums = albums.map(a => {
      if (a.id === activeAlbumId) {
        return {
          ...a,
          photos: [newPhoto, ...a.photos]
        };
      }
      return a;
    });

    if (profileTheme === 'minimal-oldweb') {
      // For Windows 95/98 theme, run the Exportando Foto animation system
      setExportPhotoData({ newPhoto, updatedAlbums });
      setShowAddPhoto(false);
      setIsExporting(true);
      setExportFrame(1);
      setExportSeconds(6);
    } else {
      onUpdateAlbums(updatedAlbums);
      setNewPhotoUrl('');
      setNewPhotoCaption('');
      setNewPhotoSong('');
      setNewPhotoGif('');
      setActiveEffect('');
      setAiPrompt('');
      setShowAddPhoto(false);

      triggerNostalgicLoading(() => {
        setSelectedPhotoId(newPhoto.id);
        setViewMode('photo');
      }, 'Processando cores de filme analógico...');
    }
  };

  // Local File Upload from device (JPG, PNG, WEBP, GIF) uploaded straight to Supabase Storage
  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[UPLOAD STEP 1] Input recebeu arquivo:", e.target.files?.length ? e.target.files[0].name : "Nenhum arquivo");
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Apenas JPG, PNG, WEBP e GIF são suportados chapa!');
      return;
    }

    console.log("[UPLOAD STEP 2] Arquivo validado:", file.name, "tamanho:", file.size);
    console.log("FILE SIZE", file.size);
    setIsUploadingLocalPhoto(true);
    try {
      const userId = auth.currentUser?.uid || profileId || 'anonymous';
      
      console.log("[UPLOAD STEP 3] Iniciando upload Supabase para usuário:", userId);
      // Upload directly into Supabase Storage under the 'scrapbook' context
      const downloadUrl = await supabaseStorageService.uploadImage(file, userId, 'scrapbook');
      console.log("[UPLOAD STEP 4] Upload concluído de volta no fluxo principal");
      console.log("[UPLOAD STEP 5] URL retornada:", downloadUrl);
      console.log("DOWNLOAD URL OBTAINED:", downloadUrl);

      setNewPhotoUrl(downloadUrl);
    } catch (err: any) {
      console.error("[UPLOAD ERROR] Mensagem completa do erro:", err);
      console.error('Error uploading file to Supabase Storage:', err);
      alert('Falha ao enviar arquivo para o Supabase Storage! Verifique seu bucket ou conexão.');
      throw err;
    } finally {
      setIsUploadingLocalPhoto(false);
    }
  };

  // AI Image generation using Pollinations
  const handleGeneratePhotoAi = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsGeneratingPhotoAi(true);

    try {
      const enhancedPrompt = `${aiPrompt.trim()}, nostalgic 2008 Y2K internet aesthetic, orkut cyber scrap collage look high detailed`;
      const generatedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=550&height=380&nologo=true`;

      // Pre-load the image to prevent breaking or blinking previews
      const img = new Image();
      img.src = generatedUrl;
      img.onload = () => {
        setNewPhotoUrl(generatedUrl);
        setIsGeneratingPhotoAi(false);
      };
      img.onerror = () => {
        setNewPhotoUrl(generatedUrl);
        setIsGeneratingPhotoAi(false);
      };
    } catch (err) {
      console.error('Erro de IA:', err);
      setIsGeneratingPhotoAi(false);
    }
  };

  // Like photo toggle
  const handleLikePhoto = () => {
    if (!activeAlbumId || !selectedPhotoId) return;
    playShutterSound();

    const updatedAlbums = albums.map(a => {
      if (a.id === activeAlbumId) {
        const updatedPhotos = a.photos.map(p => {
          if (p.id === selectedPhotoId) {
            const isLiked = p.likedByMe;
            return {
              ...p,
              likes: isLiked ? p.likes - 1 : p.likes + 1,
              likedByMe: !isLiked
            };
          }
          return p;
        });
        return { ...a, photos: updatedPhotos };
      }
      return a;
    });

    onUpdateAlbums(updatedAlbums);
  };

  // Love photo toggle
  const handleLovePhoto = () => {
    if (!activeAlbumId || !selectedPhotoId) return;
    playShutterSound();

    const updatedAlbums = albums.map(a => {
      if (a.id === activeAlbumId) {
        const updatedPhotos = a.photos.map(p => {
          if (p.id === selectedPhotoId) {
            const isLoved = p.lovedByMe;
            const currentLoves = p.loves !== undefined ? p.loves : Math.max(0, p.likes - 2);
            return {
              ...p,
              loves: isLoved ? currentLoves - 1 : currentLoves + 1,
              lovedByMe: !isLoved
            };
          }
          return p;
        });
        return { ...a, photos: updatedPhotos };
      }
      return a;
    });

    onUpdateAlbums(updatedAlbums);
  };

  // Post comment
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeAlbumId || !selectedPhotoId) return;

    const newComment: PhotoComment = {
      id: 'comm_' + Math.random().toString(36).substr(2, 9),
      authorName: profileName,
      authorAvatar: profileAvatar,
      text: commentInput.trim(),
      date: new Date().toLocaleString('pt-BR', { timeZone: 'UTC' }).slice(0, 16).replace(',', ' -')
    };

    const updatedAlbums = albums.map(a => {
      if (a.id === activeAlbumId) {
        const updatedPhotos = a.photos.map(p => {
          if (p.id === selectedPhotoId) {
            return {
              ...p,
              comments: [...p.comments, newComment]
            };
          }
          return p;
        });
        return { ...a, photos: updatedPhotos };
      }
      return a;
    });

    onUpdateAlbums(updatedAlbums);
    setCommentInput('');
  };

  // Delete photo
  const handleDeletePhoto = (photoId: string) => {
    if (!activeAlbumId) return;
    setPhotoIdToDelete(photoId);
  };

  const confirmDeletePhoto = () => {
    if (!activeAlbumId || !photoIdToDelete) return;

    const updatedAlbums = albums.map(a => {
      if (a.id === activeAlbumId) {
        return {
          ...a,
          photos: a.photos.filter(p => p.id !== photoIdToDelete)
        };
      }
      return a;
    });

    onUpdateAlbums(updatedAlbums);
    setViewMode('album');
    setSelectedPhotoId(null);
    setPhotoIdToDelete(null);
  };

  const cancelDeletePhoto = () => {
    setPhotoIdToDelete(null);
  };

  // Update photo caption (editar legenda)
  const handleUpdateCaption = () => {
    if (!activeAlbumId || !selectedPhotoId || !editedCaption.trim()) return;

    const updatedAlbums = albums.map(a => {
      if (a.id === activeAlbumId) {
         const updatedPhotos = a.photos.map(p => {
          if (p.id === selectedPhotoId) {
            return {
              ...p,
              caption: editedCaption.trim()
            };
          }
          return p;
        });
        return { ...a, photos: updatedPhotos };
      }
      return a;
    });

    onUpdateAlbums(updatedAlbums);
    setShowEditCaption(false);
  };

  // Update album info (organizar álbum / mudar tema)
  const handleUpdateAlbumInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAlbumName.trim() || !activeAlbumId) return;

    const updatedAlbums = albums.map(a => {
      if (a.id === activeAlbumId) {
        return {
          ...a,
          name: editAlbumName.trim(),
          description: editAlbumDesc.trim() || 'Sem descrição.',
          theme: editAlbumTheme
        };
      }
      return a;
    });

    onUpdateAlbums(updatedAlbums);
    setShowOrganizeAlbum(false);
    triggerNostalgicLoading(() => {}, 'Recompilando e alterando tema visual do álbum...');
  };

  // Delete entire album
  const handleDeleteAlbum = () => {
    if (!activeAlbumId) return;
    if (!confirm(`🚨 ALERTA GERAL CHAPA!\nVocê deseja realmente DELETAR o álbum inteiro "${activeAlbum?.name}"?\nIsso apagará todas as ${activeAlbum?.photos.length} fotos do servidor!\nEsta ação é irreversível.`)) return;

    const updatedAlbums = albums.filter(a => a.id !== activeAlbumId);
    onUpdateAlbums(updatedAlbums);
    setViewMode('list');
    setActiveAlbumId(null);
    setShowOrganizeAlbum(false);
  };

  // Get dynamic styles based on album theme
  const getAlbumThemeClass = (theme: string) => {
    // Always force standard light theme styling
    const finalTheme: string = 'default';
    switch (finalTheme) {
      case 'neon-hacker':
        return {
          container: 'bg-black text-[#22c55e] border-[#22c55e] font-mono',
          card: 'bg-[#050505] border-[#22c55e]/60 border shadow-[0_0_15px_rgba(34,197,94,0.15)] text-[#22c55e]',
          header: 'bg-green-950/40 border-b border-[#22c55e]',
          buttonColors: 'bg-green-950 text-[#22c55e] hover:bg-green-900 border border-[#22c55e]',
          scanlines: true,
          label: 'text-[#22c55e]/70 uppercase tracking-widest'
        };
      case 'emo-2008':
        return {
          container: 'bg-zinc-950 text-white border-[#ec4899] font-sans',
          card: 'bg-zinc-900 border-[#ec4899] border border-dashed text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]',
          header: 'bg-pink-950/60 border-b border-[#ec4899]',
          buttonColors: 'bg-pink-950 text-[#ec4899] hover:bg-pink-900 border border-[#ec4899]',
          scanlines: false,
          label: 'text-[#ec4899] font-serif font-bold italic'
        };
      case 'vhs':
        return {
          container: 'bg-[#0b0c10] text-[#45f3ff] border-[#ff007f] font-mono select-none',
          card: 'bg-[#12121e] border-2 border-double border-[#45f3ff] text-[#45f3ff] shadow-[0_0_10px_#45f3ff]',
          header: 'bg-[#ff007f]/20 border-b-2 border-dashed border-[#45f3ff]',
          buttonColors: 'bg-[#1f2833] text-[#45f3ff] hover:bg-cyan-900 border border-[#45f3ff]',
          scanlines: true,
          label: 'text-yellow-400 font-mono italic font-bold tracking-widest'
        };
      case 'cyberpunk':
        return {
          container: 'bg-[#0a0a16] text-[#00f0ff] border-[#f3ee00] font-mono',
          card: 'bg-[#0d0d21] border-[#00f0ff] border-2 border-r-4 border-b-4 text-[#00f0ff]',
          header: 'bg-[#1a0033] border-b-2 border-[#f3ee00]',
          buttonColors: 'bg-[#f3ee00] text-black hover:bg-yellow-400 font-bold',
          scanlines: true,
          label: 'text-[#f3ee00] uppercase tracking-wider'
        };
      case 'glitter':
        return {
          container: 'bg-gradient-to-br from-[#ffe4e6] via-[#fdf2f8] to-[#f3e8ff] text-[#db2777] font-sans italic',
          card: 'bg-white/85 border-[#db2777]/50 border shadow-[4px_4px_0px_#db2777] text-neutral-800',
          header: 'bg-[#fce7f3] border-b border-[#db2777]',
          buttonColors: 'bg-[#db2777] text-white hover:bg-pink-700',
          scanlines: false,
          label: 'text-[#c084fc] font-sans font-bold'
        };
      case 'gotico':
        return {
          container: 'bg-[#050101] text-[#b91c1c] border-[#7f1d1d] font-serif italic',
          card: 'bg-[#150a0a] border-2 border-[#b91c1c]/40 text-[#fca5a5] shadow-[0_0_12px_rgba(185,28,28,0.45)]',
          header: 'bg-[#2d0a0a] border-b border-[#b91c1c]',
          buttonColors: 'bg-red-950 text-red-300 hover:bg-red-900 border border-red-700',
          scanlines: false,
          label: 'text-red-500 font-serif lowercase italic'
        };
      case 'polaroid':
        return {
          container: 'bg-[#e2e8f0] text-neutral-800 border-neutral-400 font-serif',
          card: 'bg-white border border-neutral-300 p-4 shadow-md text-slate-800',
          header: 'bg-neutral-100 border-b border-neutral-200',
          buttonColors: 'bg-slate-700 text-white hover:bg-slate-800',
          scanlines: false,
          label: 'text-neutral-500 font-sans tracking-wide'
        };
      case 'old-camera':
        return {
          container: 'bg-[#f0ece1] text-amber-950 border-amber-900/60 font-serif',
          card: 'bg-[#faf6eb] border-2 border-amber-900/40 text-neutral-800 shadow-sm',
          header: 'bg-amber-100 border-b border-amber-200',
          buttonColors: 'bg-amber-900 text-[#faf6eb] hover:bg-amber-950',
          scanlines: false,
          label: 'text-amber-800 font-mono font-bold'
        };
      default:
        return {
          container: 'bg-[#dee7f4] text-neutral-800 border-neutral-300 font-sans',
          card: 'bg-white border border-neutral-300 text-neutral-800',
          header: 'bg-[#dee7f4] border-b border-[#adc3df]',
          buttonColors: 'bg-[#1d4ed8] text-white hover:bg-blue-700',
          scanlines: false,
          label: 'text-[#1d4ed8] font-sans font-semibold'
        };
    }
  };

  const activeThemeStyles = activeAlbum ? getAlbumThemeClass(activeAlbum.theme) : getAlbumThemeClass('default');

  return (
    <div className="relative flex flex-col gap-4">
      
      {/* 2004 Dialup Connection Simulator Loading Screen Overlay */}
      <AnimatePresence>
        {isLoading && (
          profileTheme === 'minimal-oldweb' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-transparent z-55 flex items-center justify-center pointer-events-auto overflow-hidden"
            >
              <div style={{ width: '96px', height: '136px' }}>
                <iframe
                  src="/assets/themes/windows-98/ui/temporizador/ampulheta-w98 (1).html"
                  className="w-full h-full border-0 pointer-events-none select-none"
                  style={{ border: 'none', overflow: 'hidden', background: 'transparent' }}
                  scrolling="no"
                  title="Ampulheta Loader"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 z-55 flex flex-col justify-center items-center p-4 backdrop-blur-xs font-mono"
            >
              <div className="bg-neutral-900 border-2 border-indigo-500 p-6 rounded-lg max-w-sm w-full text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 text-[8px] bg-indigo-500 text-white uppercase font-bold">56kbps SECURE</div>
                
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase mb-3">
                  <Camera size={14} className="animate-spin text-pink-500" />
                  Scrapzone-Secure Photo Loader
                </div>

                <span className="text-[11px] text-green-400 block h-10 italic leading-snug">
                  {loadingText}
                </span>

                {/* Classic Loading Bar */}
                <div className="w-full bg-black h-4 border border-indigo-800 overflow-hidden relative mt-2 rounded">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-150 relative bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem]" 
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[9px] text-neutral-400 mt-2 font-mono">
                  <span>COM PORT 3 OK</span>
                  <span>{loadingProgress}% RENDERIZADO</span>
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* EXPORTANDO FOTO overlay for minimal-oldweb */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-55 flex items-center justify-center p-4 overflow-hidden select-none"
          >
            <div className="relative w-full max-w-[500px] aspect-[685.43/406.02] drop-shadow-2xl">
              {/* Processed SVG */}
              <div 
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: getProcessedSvg() }}
              />
              
              {/* Clickable transparent buttons overlaid precisely on the SVG coordinates */}
              {/* CANCEL button */}
              <button
                type="button"
                onClick={handleCancelExport}
                className="absolute cursor-pointer border-0 bg-transparent opacity-0 active:opacity-10 active:bg-black/10"
                style={{
                  left: '81.36%',
                  top: '83.59%',
                  width: '15.60%',
                  height: '8.49%',
                }}
                title="Cancelar"
              />

              {/* Close (X) button on top right */}
              <button
                type="button"
                onClick={handleCancelExport}
                className="absolute cursor-pointer border-0 bg-transparent opacity-0"
                style={{
                  left: '92.45%',
                  top: '13.38%',
                  width: '7.13%',
                  height: '9.68%',
                }}
                title="Fechar"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------ VIEW 1: ALBUMS LIST ------------------ */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-neutral-300 rounded shadow-md overflow-hidden text-left bg-[#fffdfa]"
        >
          {/* Header bar */}
          <div className="bg-[#dee7f4] border-b border-neutral-300 px-4 py-3 flex justify-between items-center bg-gradient-to-r from-[#dee7f4] to-[#adc3df]">
            <div>
              <h2 className="text-sm font-bold text-neutral-800 uppercase flex items-center gap-2">
                <Camera size={16} className="text-[#1d4ed8]" />
                Álbum de Fotos — {profileName}
              </h2>
              <p className="text-[10px] text-neutral-500 font-sans mt-0.5">
                Investigando memórias digitais, gifs, sentimentos e imagens raras chapa!
              </p>
            </div>
            
            {isOwnProfile && (
              <button
                id="btn-trigger-create-album"
                onClick={() => setShowCreateAlbum(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition-transform hover:scale-105 cursor-pointer flex items-center gap-1.5 font-sans"
              >
                <Plus size={14} />
                Novo Álbum
              </button>
            )}
          </div>

          {/* Sub Tab Navigation for Owner Mode */}
          {isOwnProfile && (
            <div className="bg-[#dee7f4]/40 border-b border-neutral-300 px-4 pt-2.5 flex items-center gap-1.5 bg-gradient-to-r from-slate-100 to-slate-200/50">
              <button
                onClick={() => setActiveAlbumsTab('my-albums')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-t border-x ${
                  activeAlbumsTab === 'my-albums'
                    ? 'bg-[#fffdfa] border-neutral-300 text-[#1d4ed8] -mb-[1px] shadow-xs font-black z-10'
                    : 'bg-transparent border-transparent text-neutral-600 hover:text-neutral-950 font-semibold'
                }`}
              >
                📁 Meus Álbuns ({profileAlbums.length})
              </button>
              <button
                onClick={() => setActiveAlbumsTab('received-photos')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-t border-x ${
                  activeAlbumsTab === 'received-photos'
                    ? 'bg-[#fffdfa] border-neutral-300 text-[#1d4ed8] -mb-[1px] shadow-xs font-black z-10'
                    : 'bg-transparent border-transparent text-neutral-600 hover:text-neutral-950 font-semibold'
                }`}
              >
                📩 Fotos Recebidas
                {receivedPhotosList.length > 0 && (
                  <span className="bg-pink-600 text-white rounded-full px-2 py-0.5 text-[9px] font-mono font-bold animate-pulse">
                    {receivedPhotosList.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {isVisitorMode && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-800 font-sans flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Info size={14} className="text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Acesso do Visitante:</strong> Você está visualizando o álbum de recordações em <strong>Modo Somente Leitura</strong>. As permissões de edição, remoção e novas fotos estão bloqueadas chapa!
                </span>
              </span>
              <span className="text-[9px] bg-amber-500 text-neutral-900 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                Visitante
              </span>
            </div>
          )}

          <div className="p-4 bg-transparent min-h-[380px]">
            {activeAlbumsTab === 'received-photos' && isOwnProfile ? (
              receivedPhotosList.length === 0 ? (
                <div className="text-center py-16 text-neutral-400 italic font-sans flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl">✉️</span>
                  <span className="font-bold text-neutral-500">Nenhuma foto compartilhada com você ainda.</span>
                  <p className="text-[10px] text-neutral-400">Peça para seus amigos enviarem fotos nostálgicas no seu privado e elas aparecerão aqui! chapa 🚀</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {receivedPhotosList.map(item => {
                    const sender = senderProfiles[item.senderId] || {
                      name: `Amigo #${item.senderId.substring(0, 5)}`,
                      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                    };
                    
                    return (
                      <div
                        key={item.id}
                        className="border border-neutral-200 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all flex flex-col text-left shadow-xs justify-between group"
                      >
                        {/* Sender card header */}
                        <div className="p-3 bg-gradient-to-r from-slate-50 to-[#dee7f4]/30 border-b border-neutral-100 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={sender.avatar}
                              alt={sender.name}
                              className="w-8 h-8 rounded-full border border-neutral-255 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-neutral-800 leading-tight">{sender.name}</span>
                              <span className="text-[8px] text-neutral-400 font-mono">
                                {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : 'recentemente'}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Deseja apagar esse compartilhamento recebido chapa? 🗑️')) {
                                const removeLocal = () => {
                                  const localPhotosKey = `orkut_local_shared_photos_${currentUserId}`;
                                  const existingLocal = localStorage.getItem(localPhotosKey);
                                  if (existingLocal) {
                                    try {
                                      const filtered = JSON.parse(existingLocal).filter((it: any) => it.id !== item.id);
                                      localStorage.setItem(localPhotosKey, JSON.stringify(filtered));
                                    } catch (err) {}
                                  }
                                  setReceivedPhotosList(prev => prev.filter(it => it.id !== item.id));
                                };

                                try {
                                  await deleteDoc(doc(db, 'shared_photos', item.id));
                                  removeLocal();
                                  alert('Compartilhamento removido com sucesso!');
                                } catch (err) {
                                  console.error("Falha ao deletar do Firestore:", err);
                                  removeLocal();
                                  alert('Compartilhamento removido localmente!');
                                }
                              }
                            }}
                            className="p-1 px-2 text-[10px] bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200/50 cursor-pointer"
                            title="Apagar foto"
                          >
                            🗑️ Apagar
                          </button>
                        </div>

                        {/* Image section */}
                        <div className="h-44 bg-neutral-900 flex items-center justify-center overflow-hidden relative">
                          <img
                            src={item.photoUrl}
                            alt="Foto compartilhada"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform scale-100"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Quick overlay to view */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                // Direct load fullscreen view
                                setActiveAlbumId(item.albumId || null);
                                setSelectedPhotoId(item.photoId);
                                setViewMode('photo');
                              }}
                              className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs transition-all hover:scale-105 shadow-md flex items-center gap-1.5 cursor-pointer"
                            >
                              👀 Visualizar Grande
                            </button>
                          </div>
                        </div>

                        {/* Message text bubble details */}
                        <div className="p-3 bg-neutral-50 font-sans text-xs text-neutral-700 italic border-t border-neutral-100 flex-1 leading-relaxed whitespace-pre-wrap">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-violet-600 not-italic block mb-0.5">
                            ✉️ recado do companheiro:
                          </span>
                          "{item.message}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : profileAlbums.length === 0 ? (
              <div className="text-center py-16 text-neutral-400 italic font-sans flex flex-col items-center justify-center gap-2">
                <ImageIcon size={36} className="text-neutral-300" />
                <span>Nenhum álbum foi compilado para este perfil de segurança ainda.</span>
                {isOwnProfile && (
                  <p className="text-[10px] text-neutral-500 mt-1">Crie seu primeiro álbum acima e eternize suas fotos de Lan House!</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {profileAlbums.map(album => {
                  const albumStyles = getAlbumThemeClass(album.theme);
                  const firstPhoto = album.photos[0];
                  
                  return (
                    <div
                      key={album.id}
                      onClick={() => handleOpenAlbum(album.id)}
                      className={`group border rounded-lg overflow-hidden flex flex-col justify-between hover:scale-[1.02] cursor-pointer transition-all ${albumStyles.card} hover:border-[#d946ef] max-h-72`}
                      title="Explorar memórias do perfil"
                    >
                      {/* Album cover */}
                      <div className="h-40 bg-zinc-950 flex items-center justify-center overflow-hidden relative">
                        {firstPhoto ? (
                          <img
                            src={firstPhoto.url}
                            alt={album.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-neutral-500 gap-1.5 p-4 text-center">
                            <ImageIcon size={28} className="text-neutral-400 opacity-60 animate-pulse" />
                            <span className="text-[9px] font-mono">Álbum vazio</span>
                          </div>
                        )}
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 text-white rounded font-mono font-bold text-[9px] border border-white/20">
                          {album.photos.length} FOTOS
                        </span>
                        
                        {/* Film theme strip watermark indicator on top */}
                        <div className="absolute bottom-0 inset-x-0 bg-black/45 p-1 text-center text-[8px] font-mono tracking-widest text-[#d946ef] uppercase font-bold border-t border-dashed border-white/10">
                          📌 {album.theme.toUpperCase()} PRESSET
                        </div>
                      </div>

                      {/* Info Panel */}
                      <div className="p-3">
                        <h3 className="text-xs font-bold font-sans truncate pr-4 text-left">
                          📂 {album.name}
                        </h3>
                        <p className="text-[10px] opacity-75 truncate text-left mt-0.5">
                          {album.description}
                        </p>
                        <div className="flex justify-between items-center text-[9px] mt-2 border-t border-neutral-100/10 pt-1.5">
                          <span className="font-mono">📅 Criado em {album.createdAt}</span>
                          <span className="underline group-hover:text-pink-500">abrir →</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ------------------ VIEW 2: SINGLE ALBUM GRID ------------------ */}
      {viewMode === 'album' && activeAlbum && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`border-2 rounded shadow-lg overflow-hidden text-left min-h-[420px] pb-10 ${activeThemeStyles.container}`}
        >
          {/* Theme Special Overlay elements */}
          {activeThemeStyles.scanlines && (
            <div className="absolute inset-0 bg-[#000]/06 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] z-20" />
          )}

          {/* VHS Visual elements */}
          {activeAlbum.theme === 'vhs' && (
            <div className="absolute top-2 left-2 z-10 p-1 px-2 bg-black text-red-500 text-[10px] font-bold font-mono border border-red-500 animate-pulse uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-605 inline-block" />
              • REC 00:00:24
            </div>
          )}

          {/* Album Title Block */}
          <div className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${activeThemeStyles.header}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToAlbums}
                className="p-1 rounded bg-neutral-100/10 hover:bg-neutral-100/25 transition-colors cursor-pointer text-current"
                title="Voltar aos Álbuns"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-1 text-left">
                  📂 {activeAlbum.name}
                  <span className="text-[10px] bg-[#d946ef] text-white rounded px-1.5 font-mono ml-1.5 font-bold uppercase py-0.2">
                    {activeAlbum.theme}
                  </span>
                </h2>
                <p className="text-[10px] opacity-80 mt-1 max-w-xl text-left leading-relaxed">
                  {activeAlbum.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => setShowOrganizeAlbum(!showOrganizeAlbum)}
                    className="px-3 py-1 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white font-bold rounded text-xs transition-all flex items-center gap-1 cursor-pointer font-sans"
                  >
                    🛠️ Organizar Álbum
                  </button>
                  <button
                    id="btn-trigger-add-photo"
                    onClick={() => setShowAddPhoto(true)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Plus size={13} />
                    Postar Foto
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Collapse Panel: Organize Album */}
          {isOwnProfile && showOrganizeAlbum && (
            <div className="p-4 bg-black/45 border-b border-dashed border-neutral-700 space-y-4 shadow-inner">
              <div className="flex justify-between items-center bg-neutral-900 p-2 border border-neutral-800 rounded">
                <span className="text-xs font-bold font-mono text-cyan-400">⚙️ PAINEL DE ORGANIZAÇÃO DO ÁLBUM SECRETO</span>
                <button
                  onClick={() => setShowOrganizeAlbum(false)}
                  className="text-[10px] text-neutral-400 hover:text-white uppercase font-bold cursor-pointer"
                >
                  [ fechar x ]
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form onSubmit={handleUpdateAlbumInfo} className="space-y-3 bg-neutral-900/60 p-3 rounded border border-neutral-800">
                  <h3 className="text-xs font-bold text-white uppercase font-sans mb-1 pb-1 border-b border-neutral-800">Informações Básicas</h3>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Nome do Álbum:</label>
                    <input
                      type="text"
                      value={editAlbumName}
                      onChange={(e) => setEditAlbumName(e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-neutral-700 rounded bg-neutral-900 text-white font-sans"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Descrição:</label>
                    <textarea
                      value={editAlbumDesc}
                      onChange={(e) => setEditAlbumDesc(e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-neutral-700 rounded bg-neutral-900 text-white font-sans"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Alterar Tema Visual:</label>
                    <select
                      value={editAlbumTheme}
                      onChange={(e) => setEditAlbumTheme(e.target.value as any)}
                      className="w-full text-xs px-2 py-1 border border-neutral-700 rounded bg-neutral-900 text-white font-mono cursor-pointer"
                    >
                      <option value="neon-hacker">Neon Hacker (Verde Terminal)</option>
                      <option value="emo-2008">Emo 2008 (Corações e Rosa)</option>
                      <option value="vhs">VHS (Timer, Estática)</option>
                      <option value="cyberpunk">Cyberpunk (Amarelo, Azul)</option>
                      <option value="glitter">Glitter (Estrelas, Purpurina)</option>
                      <option value="gotico">Gótico (Gótico Escarlate)</option>
                      <option value="polaroid">Polaroid (Cartão de foto clássico)</option>
                      <option value="old-camera">Old Camera (Rolo de filme)</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={handleDeleteAlbum}
                      className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-905 text-[10px] font-bold rounded cursor-pointer transition-colors"
                    >
                      ⚠️ Deletar Álbum Inteiro
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 bg-green-500 hover:bg-green-600 text-neutral-950 font-black rounded text-[10px] uppercase cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>

                {/* Quick Photos delete management board */}
                <div className="bg-neutral-900/40 p-3 rounded border border-neutral-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase font-sans mb-1 pb-1 border-b border-neutral-800">📸 Gerenciar & Excluir Imagens ({activeAlbum.photos.length})</h3>
                    <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                      {activeAlbum.photos.map(p => (
                        <div key={p.id} className="relative aspect-square border border-neutral-700 rounded overflow-hidden group bg-black/50">
                          <img src={p.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(p.id)}
                            className="absolute inset-0 m-auto h-6 w-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md border border-red-500 scale-90 md:scale-100 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Remover foto do álbum"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[9px] text-neutral-400 italic font-sans leading-relaxed">Passe o mouse por cima de cada miniatura no painel acima e clique no botão de lixeira para excluir instantaneamente as imagens chapa.</p>
                </div>
              </div>
            </div>
          )}

          {isVisitorMode && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-[10.5px] text-amber-550 font-sans flex items-center gap-1.5 font-bold">
              <Info size={13} className="text-amber-500 flex-shrink-0" />
              <span>Modo de visualização de visitante ativo. Você não possui privilégios de postagem.</span>
            </div>
          )}

          <div className="p-4 bg-transparent animate-fadeIn">
            {activeAlbum.photos.length === 0 ? (
              <div className="text-center py-20 italic flex flex-col items-center justify-center gap-2">
                <ImageIcon size={32} className="opacity-40 animate-pulse" />
                <span>Nenhuma imagem de recordação foi adicionada a este álbum seguro ainda chapa!</span>
                {isOwnProfile && (
                  <button
                    onClick={() => setShowAddPhoto(true)}
                    className="mt-3 px-3 py-1 bg-white border text-indigo-700 font-bold rounded text-xs cursor-pointer hover:bg-neutral-55"
                  >
                    Postar Primeira Foto 📷
                  </button>
                )}
              </div>
            ) : (() => {
              const pageSize = 9;
              const totalPhotos = activeAlbum.photos.length;
              const totalPages = Math.ceil(totalPhotos / pageSize);
              // Ensure albumPage is within bounds if photos get deleted
              const validPage = Math.min(albumPage, Math.max(0, totalPages - 1));
              const currentPagePhotos = activeAlbum.photos.slice(validPage * pageSize, (validPage + 1) * pageSize);

              return (
                <div className="space-y-6">
                  {/* Discrete Proporção and Status header Bar */}
                  <div className="flex items-center justify-between border-b border-neutral-700/20 pb-2 mb-2">
                    <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold tracking-wider">
                      Galeria de Imagens • Página {validPage + 1} de {totalPages}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-sans">
                      <span className="opacity-70 text-[9px] font-bold uppercase tracking-wider">Grau Aspecto:</span>
                      <button
                        type="button"
                        onClick={() => setAspectRatio('1:1')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                          aspectRatio === '1:1' 
                            ? 'border-[#d946ef] text-[#d946ef] bg-[#d946ef]/10' 
                            : 'border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        1:1
                      </button>
                      <button
                        type="button"
                        onClick={() => setAspectRatio('4:5')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                          aspectRatio === '4:5' 
                            ? 'border-[#d946ef] text-[#d946ef] bg-[#d946ef]/10' 
                            : 'border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        4:5
                      </button>
                    </div>
                  </div>

                  {/* Clean Connected Grid (No borders, No containers, just high density visual connections!) */}
                  <div className="grid grid-cols-3 gap-1 md:gap-2 max-w-4xl mx-auto">
                    {currentPagePhotos.map(photo => {
                      return (
                        <div
                          key={photo.id}
                          onClick={() => handleOpenPhoto(photo.id)}
                          className="group cursor-pointer overflow-hidden relative bg-black flex items-center justify-center transition-all hover:brightness-105"
                        >
                          {/* Image Wrapper */}
                          <div className={`w-full overflow-hidden relative ${
                            aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'
                          }`}>
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${getPhotoEffectClass(photo.effect)}`}
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Discrete absolute badge for CD song if present */}
                            {photo.song && (
                              <span className="absolute top-1 left-1 bg-black/70 text-[7.5px] text-cyan-400 font-mono font-bold px-1.5 py-0.5 rounded shadow">
                                🎵
                              </span>
                            )}

                            {/* Highlight marker flag */}
                            {featuredPhotoId === photo.id && (
                              <div className="absolute top-1 right-1 bg-yellow-500 text-neutral-900 font-sans font-bold text-[7.5px] px-1 rounded shadow-sm scale-90 border border-yellow-300 uppercase">
                                📌
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* NAVIGAÇÃO DO ÁLBUM: Fine Elegant Classic Horizontal Page controller */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between max-w-lg mx-auto px-4 py-2 bg-neutral-950/20 border-t border-b border-neutral-700/25 text-xs text-neutral-300 font-sans tracking-wide">
                      <button
                        type="button"
                        disabled={validPage === 0}
                        onClick={() => setAlbumPage(Math.max(0, validPage - 1))}
                        className={`flex items-center font-extrabold text-xs select-none transition-all ${
                          validPage === 0 
                            ? 'opacity-20 cursor-not-allowed text-stone-500' 
                            : 'hover:text-[#d946ef] text-[#d946ef] cursor-pointer hover:underline'
                        }`}
                      >
                        [ &lt;&lt; ]
                      </button>
                      
                      {/* Elegant fine line progress indicator */}
                      <div className="flex-1 mx-6 h-[1px] bg-neutral-700/60 relative flex items-center justify-center">
                        <div className="absolute text-[8.5px] font-mono text-[#d946ef] font-bold bg-[#1e2030] px-2.5 border border-neutral-700/30 rounded-full uppercase tracking-wider">
                          PÁGINA {validPage + 1} DE {totalPages}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={validPage >= totalPages - 1}
                        onClick={() => setAlbumPage(Math.min(totalPages - 1, validPage + 1))}
                        className={`flex items-center font-extrabold text-xs select-none transition-all ${
                          validPage >= totalPages - 1 
                            ? 'opacity-20 cursor-not-allowed text-stone-500' 
                            : 'hover:text-[#d946ef] text-[#d946ef] cursor-pointer hover:underline'
                        }`}
                      >
                        [ &gt;&gt; ]
                      </button>
                    </div>
                  )}

                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      {viewMode === 'photo' && activeAlbum && activePhoto && (() => {
        const currentIndex = activeAlbum.photos.findIndex(p => p.id === activePhoto.id);

        return (
          <div 
            className="fixed inset-0 bg-[#2d3238]/95 z-50 flex items-center justify-center p-4 md:p-8 select-none backdrop-blur-md overflow-y-auto"
            onClick={() => handleClosePhotoDirect()}
            id="photo-viewer-overlay"
          >
            {/* Wrapper for responsive layout (Desktop: Side-by-side photo + comments/caption, Mobile: Stacked) */}
            <div 
              className="relative flex flex-col xl:flex-row items-center xl:items-stretch justify-center gap-6 max-w-7xl w-full mx-auto"
              onClick={(e) => e.stopPropagation()} // Stop propagation from closing
              id="photo-viewer-wrapper"
            >
              {/* CLOSE BUTTON (✖️) - OUTSIDE THE MODAL CARD FOR MOBILE */}
              <button
                onClick={() => handleClosePhotoDirect()}
                className="absolute -top-12 right-2 xl:hidden border-none text-white hover:text-fuchsia-400 font-black text-3xl cursor-pointer hover:scale-110 active:scale-95 transition-all z-50 p-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                id="photo-viewer-close-button-mobile"
                title="Fechar"
              >
                ✖️
              </button>

              {/* LEFT NAVIGATION SLIDER CHEVRON (Visible on Desktop/Mobile around the card) */}
              {activeAlbum.photos.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevIndex = (currentIndex - 1 + activeAlbum.photos.length) % activeAlbum.photos.length;
                    setSelectedPhotoId(activeAlbum.photos[prevIndex].id);
                    setShowPhotoDropdown(false);
                    setShowShareMenu(false);
                  }}
                  className="absolute -left-3 md:-left-16 xl:-left-[14px] top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 hover:bg-white text-white hover:text-black border-2 border-cyan-400 rounded-full cursor-pointer opacity-30 hover:opacity-100 hover:scale-115 active:scale-95 transition-all z-35 flex items-center justify-center shadow-lg hover:shadow-cyan-400/50 group"
                  id="photo-viewer-nav-prev"
                  title="Foto Anterior"
                >
                  <span className="text-xl font-black select-none pointer-events-none">◀</span>
                </button>
              )}

              {/* MAIN PHOTOGRAPH CARD CONTAINER */}
              <div className="relative w-full max-w-[700px] flex-shrink-0" id="photo-viewer-desktop-wrapper">
                {/* CLOSE BUTTON (X) FOR DESKTOP - POSITIONED OUTSIDE THE MODAL ON THE TOP-RIGHT CORNER */}
                <button
                  onClick={() => handleClosePhotoDirect()}
                  className="hidden xl:flex absolute -top-10 -right-12 items-center justify-center border-none bg-transparent hover:opacity-80 font-sans cursor-pointer transition-all hover:scale-110 active:scale-95 z-55"
                  style={{ color: '#38fdad', fontSize: '40px', lineHeight: '40px', fontWeight: 'bold' }}
                  id="photo-viewer-close-button"
                  title="Fechar (X)"
                >
                  X
                </button>

                <div 
                  className="w-full bg-white border-[3px] border-sky-400 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden relative"
                  id="photo-viewer-main-card"
                >
                {/* TOPO DO MODAL (Inside Main Card) */}
                <div 
                  className="bg-gradient-to-r from-sky-800 via-sky-600 to-sky-500 py-3 px-4 flex justify-between items-center text-white border-b border-sky-300/40"
                  id="photo-viewer-header"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-extrabold uppercase tracking-tight leading-tight line-clamp-1">
                      {activeAlbum.name}
                    </span>
                    <span className="text-[10px] text-sky-200 uppercase tracking-widest font-mono">
                      Título do Álbum
                    </span>
                  </div>

                  {/* Contador de fotos (e.g. 3 de 45) */}
                  <span className="text-xs font-black font-sans bg-black/25 px-2.5 py-0.5 rounded-full border border-white/10">
                    {currentIndex + 1} de {activeAlbum.photos.length}
                  </span>

                  {/* Três pontinhos ⁝ toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPhotoDropdown(!showPhotoDropdown)}
                      className="p-1 px-3 rounded hover:bg-white/15 border border-white/20 text-white transition-all cursor-pointer font-black text-lg focus:outline-none flex items-center justify-center"
                      id="photo-viewer-dropdown-trigger"
                      title="Opções"
                    >
                      ⁝
                    </button>

                    {/* THREE DOTS DROPDOWN LIST (Owner vs Visitor filters) */}
                    {showPhotoDropdown && (() => {
                      const isTrulyOwner = isOwnProfile || profileId === 'me';
                      return (
                        <div 
                          className={`absolute right-0 top-full mt-2 rounded-xl shadow-2xl py-2 w-44 z-55 text-left font-sans text-xs ${
                            isTrulyOwner 
                              ? 'bg-white/70 backdrop-blur-md border-2 border-slate-500/80 text-black font-extrabold' 
                              : 'bg-[#1b1c22]/98 border-2 border-sky-400 text-white'
                          }`}
                          id="photo-viewer-dropdown-menu"
                        >
                          {isTrulyOwner ? (
                            <>
                              {/* OWNER CONTENT: White container 70% opacity, Black text */}
                              <button
                                onClick={() => {
                                  setShowPhotoDropdown(false);
                                  setShowCaptionBubble(!showCaptionBubble);
                                }}
                                className="w-full px-4 py-2 hover:bg-black/10 text-black font-extrabold transition-colors cursor-pointer text-left uppercase tracking-wider"
                              >
                                LEGENDA
                              </button>
                              <button
                                onClick={() => {
                                  setShowPhotoDropdown(false);
                                  if (onShareToFeed) {
                                    onShareToFeed(`Compartilhou Foto: ${activePhoto.caption}`, 'photo');
                                    alert('Foto compartilhada com orgulho no mural! 🚀');
                                  } else {
                                    navigator.clipboard.writeText(activePhoto.url);
                                    alert('Link copiado para compartilhar! 📋');
                                  }
                                }}
                                className="w-full px-4 py-2 hover:bg-black/10 text-black font-extrabold transition-colors cursor-pointer text-left uppercase tracking-wider"
                              >
                                COMPARTILHAR
                              </button>
                              <button
                                onClick={() => {
                                  setShowPhotoDropdown(false);
                                  setShowEditCaption(true);
                                }}
                                className="w-full px-4 py-2 hover:bg-black/10 text-black font-extrabold transition-colors cursor-pointer text-left uppercase tracking-wider"
                              >
                                EDITAR
                              </button>
                              <button
                                onClick={() => {
                                  setShowPhotoDropdown(false);
                                  handleDeletePhoto(activePhoto.id);
                                }}
                                className="w-full px-4 py-2 hover:bg-red-500/20 hover:text-red-700 font-extrabold transition-colors cursor-pointer text-left uppercase tracking-wider border-t border-black/10"
                                style={{ color: '#ce1616' }}
                              >
                                EXCLUIR
                              </button>
                            </>
                          ) : (
                            <>
                              {/* VISITOR CONTENT: Dark layout */}
                              <button
                                onClick={() => {
                                  setShowPhotoDropdown(false);
                                  setShowCaptionBubble(!showCaptionBubble);
                                }}
                                className="w-full px-4 py-2 hover:bg-sky-950 hover:text-cyan-300 text-slate-200 transition-colors cursor-pointer text-left font-bold uppercase tracking-wider"
                              >
                                VER LEGENDA
                              </button>
                              <button
                                onClick={() => {
                                  setShowPhotoDropdown(false);
                                  if (onShareToFeed) {
                                    onShareToFeed(`Compartilhou pág: ${activePhoto.caption}`, 'photo');
                                    alert('Link compartilhado no Feed! 🚀');
                                  } else {
                                    navigator.clipboard.writeText(activePhoto.url);
                                    alert('Endereço da imagem copiado! 🔗');
                                  }
                                }}
                                className="w-full px-4 py-2 hover:bg-sky-950 hover:text-cyan-300 text-slate-200 transition-colors cursor-pointer text-left font-bold uppercase tracking-wider"
                              >
                                COMPARTILHAR
                              </button>
                              <button
                                onClick={() => {
                                  setShowPhotoDropdown(false);
                                  alert('Denúncia recebida com sucesso chapa! Nossa moderação do Orkut analisará nas próximas horas. 💻');
                                }}
                                className="w-full px-4 py-2 hover:bg-red-950 hover:text-red-300 text-red-500 transition-colors cursor-pointer text-left font-bold uppercase tracking-wider border-t border-sky-500/10"
                              >
                                DENUNCIAR
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* FOTO MEIO: PROTAGONISTA SEMPRE (Fundo com a cor exata #c7cace, evitando preto) */}
                <div 
                  className="w-full relative flex items-center justify-center select-none overflow-hidden" 
                  style={{ backgroundColor: '#c7cace', minHeight: '340px' }}
                  id="photo-viewer-stage"
                >
                  <img
                    src={activePhoto.url}
                    alt={activePhoto.caption || "Foto"}
                    className={`max-w-full max-h-[55vh] object-contain mx-auto ${getPhotoEffectClass(activePhoto.effect)}`}
                    referrerPolicy="no-referrer"
                    id="photo-viewer-active-image"
                  />

                  {/* Retro Watermark VHS or GIF labels */}
                  {activeAlbum.theme === 'vhs' && (
                    <div className="absolute top-4 left-4 z-30 text-rose-500 font-mono text-[9px] bg-black/75 p-1 px-1.5 tracking-wider animate-pulse border border-rose-950/40">
                      PLAY 0:12:44
                    </div>
                  )}
                  {activePhoto.gifUrl && (
                    <span className="absolute bottom-4 left-4 bg-pink-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded shadow border border-pink-400 uppercase tracking-widest scale-90 z-40">
                      GIF NOSTÁLGICO
                    </span>
                  )}



                  {/* SLIDER DOT CAROUSEL (Absolute Overlay on image stage for ultra-prominence) */}
                  {activeAlbum.photos.length > 1 && (
                    <div 
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20 z-45 shadow-lg"
                      id="photo-viewer-carousel-dots"
                    >
                      {activeAlbum.photos.map((p, idx) => {
                        const isActive = p.id === activePhoto.id;
                        return (
                          <button
                            key={p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPhotoId(p.id);
                              setShowPhotoDropdown(false);
                              setShowCaptionBubble(false);
                            }}
                            className={`w-2.5 h-2.5 rounded-full border border-sky-400 transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-sky-400 scale-110 shadow-[0_0_4px_rgba(56,189,248,0.8)]' 
                                : 'bg-white/40 hover:bg-white/80'
                            }`}
                            title={`Ver foto ${idx + 1}`}
                            type="button"
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* BASE INFERIOR (Footer Panel styled gray-brown in orkut look - Narrow Vertical Space) */}
                <div 
                  className="w-full py-1.5 px-3.5 bg-[#736f6d] border-t border-sky-500/30 flex flex-col gap-1 relative text-left"
                  id="photo-viewer-footer"
                >
                  
                  {/* ACTION TOOLBAR sits directly under the image stage */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white font-sans text-xs">
                      {/* Amei button (Hot Pink Heart) */}
                      <button
                        onClick={handleLovePhoto}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer font-bold p-1 px-2.5 rounded-full border border-white/5 ${
                          activePhoto.lovedByMe 
                            ? 'bg-pink-600/50 text-pink-300 border-pink-400/30' 
                            : 'bg-[#8b8989]/30 hover:bg-[#8b8989]/50 hover:text-pink-300'
                        }`}
                        id="photo-action-like"
                        title="Amei!"
                      >
                        <span className="text-sm">💖</span>
                        <span className="font-mono text-xs">
                          {activePhoto.loves !== undefined ? activePhoto.loves : Math.max(0, activePhoto.likes - 2)}
                        </span>
                      </button>

                      {/* Curtir button (Thumbs up) */}
                      <button
                        onClick={handleLikePhoto}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer font-bold p-1 px-2.5 rounded-full border border-white/5 ${
                          activePhoto.likedByMe 
                            ? 'bg-cyan-600/50 text-cyan-300 border-cyan-400/30' 
                            : 'bg-[#8b8989]/30 hover:bg-[#8b8989]/50 hover:text-cyan-300'
                        }`}
                        id="photo-action-thumbs"
                        title="Curtir!"
                      >
                        <span className="text-sm">👍</span>
                        <span className="font-mono text-xs">{activePhoto.likes}</span>
                      </button>

                      {/* Comentários button (Balloon) */}
                      <button
                        onClick={() => setShowCommentsSection(!showCommentsSection)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer font-bold p-1 px-2.5 rounded-full border border-white/5 ${
                          showCommentsSection 
                            ? 'bg-sky-600 hover:bg-sky-500 text-white' 
                            : 'bg-[#8b8989]/30 hover:bg-[#8b8989]/50 text-white'
                        }`}
                        id="photo-action-comment-toggle"
                        title="Ver Comentários"
                      >
                        <span className="text-sm">💬</span>
                        <span className="font-mono text-xs">{activePhoto.comments.length}</span>
                      </button>
                    </div>

                    {/* Compartilhar Button (Toggle Share Menu) */}
                    <button
                      onClick={() => {
                        setShowShareMenu(!showShareMenu);
                      }}
                      className="flex items-center justify-center p-1.5 bg-violet-700 hover:bg-violet-600 text-white rounded-full transition-all cursor-pointer border border-violet-500 hover:scale-105"
                      title="Compartilhar foto"
                      id="photo-action-share-toggle"
                    >
                      <Share2 size={13} />
                    </button>
                  </div>

                  {/* INLINE EDIT CAPTION MODE ON MAIN CARD */}
                  {showEditCaption && (
                    <div className="mt-2.5 p-3 bg-[#1e1e1e] border-2 border-sky-400 rounded-2xl font-sans text-xs text-white">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-400 block mb-1">
                        🖊️ Atualizar legenda da foto:
                      </span>
                      <textarea
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        className="w-full text-xs p-2 rounded bg-black border border-neutral-700 text-white font-sans focus:outline-none placeholder-slate-500"
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditCaption(false);
                            setEditedCaption(activePhoto.caption);
                          }}
                          className="px-3 py-1 text-[10px] bg-neutral-700 hover:bg-neutral-600 text-white rounded-md cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateCaption();
                            setShowEditCaption(false);
                          }}
                          className="px-3 py-1 text-[10px] bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-md cursor-pointer"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SHARE SOCIAL MENU - Rendered below the main modal card */}
              {showShareMenu && (
                <div 
                  className="w-full flex justify-center items-center gap-4 mt-5 p-3.5 bg-neutral-900/70 backdrop-blur-md rounded-2xl border-2 border-white/10 shadow-2xl animate-fadeIn z-45" 
                  id="photo-viewer-share-social-menu"
                >
                  {/* Instagran */}
                  <button
                    onClick={() => {
                      alert('O Instagram não permite compartilhamento manual direto via link de imagem. Chapa, copie o link direto da foto no botão azul de link ou compartilhe no privado dos seus amigos! 📸');
                    }}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white border-2 border-white/20 hover:border-white hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-pink-500/40 cursor-pointer"
                    title="Compartilhar no Instagram"
                  >
                    <Instagram size={22} />
                  </button>

                  {/* Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(activePhoto.url)}&text=${encodeURIComponent(activePhoto.caption || 'Olha essa foto retrô do orkut!')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-[#0088cc] flex items-center justify-center text-white border-2 border-white/20 hover:border-white hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-sky-500/40"
                    title="Compartilhar no Telegram"
                  >
                    <Send size={22} className="mr-0.5 mt-0.5" />
                  </a>

                  {/* Whatsapp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent((activePhoto.caption || 'Olha essa foto retrô do orkut!') + ' ' + activePhoto.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white border-2 border-white/20 hover:border-white hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-green-500/40"
                    title="Compartilhar no WhatsApp"
                  >
                    <MessageCircle size={22} />
                  </a>

                  {/* Mensagem no privado (Send to Friends Panel Toggle) */}
                  <button
                    onClick={() => {
                      setShowFriendsShareModal(!showFriendsShareModal);
                    }}
                    className={`w-12 h-12 rounded-full border-2 hover:border-white flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer ${
                      showFriendsShareModal 
                        ? 'bg-pink-600 border-pink-400 hover:shadow-pink-500/40' 
                        : 'bg-neutral-800 border-white/20 hover:shadow-white/20'
                    }`}
                    title="Compartilhar com Amigos no Privado"
                  >
                    <MessageSquare size={22} />
                  </button>

                  {/* Link */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activePhoto.url);
                      alert('O link público da foto foi copiado para a área de transferência! chapa 📎');
                    }}
                    className="w-12 h-12 rounded-full bg-teal-600 border-2 border-white/20 hover:border-white flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-teal-500/40 cursor-pointer"
                    title="Copiar Link"
                  >
                    <LinkIcon size={22} />
                  </button>
                </div>
              )}
            </div>

              {/* RIGHT NAVIGATION SLIDER CHEVRON */}
              {activeAlbum.photos.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIndex = (currentIndex + 1) % activeAlbum.photos.length;
                    setSelectedPhotoId(activeAlbum.photos[nextIndex].id);
                    setShowPhotoDropdown(false);
                    setShowShareMenu(false);
                  }}
                  className="absolute -right-3 md:-right-16 xl:-right-[14px] top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 hover:bg-white text-white hover:text-black border-2 border-cyan-400 rounded-full cursor-pointer opacity-30 hover:opacity-100 hover:scale-115 active:scale-95 transition-all z-35 flex items-center justify-center shadow-lg hover:shadow-cyan-400/50 group"
                  id="photo-viewer-nav-next"
                  title="Próxima Foto"
                >
                  <span className="text-xl font-black select-none pointer-events-none">▶</span>
                </button>
              )}

              {/* LEGENDA POPUP CARD (speech bubble next to the photo) */}
              {showCaptionBubble && (
                <div 
                  className="relative xl:absolute xl:left-[585px] xl:top-12 w-full max-w-[340px] bg-[#dcefed]/95 border-2 border-sky-400 rounded-3xl shadow-2xl p-5 font-sans text-neutral-800 animate-fadeIn z-40 self-center"
                  id="photo-viewer-caption-bubble"
                >
                  {/* Speech bubble arrow pointer facing left on Desktop */}
                  <div className="hidden xl:block absolute -left-3 top-10 w-4 h-4 bg-[#dcefed] border-l-2 border-b-2 border-sky-400 rotate-45" />

                  {/* Header title & close */}
                  <div className="flex justify-between items-center pb-2 border-b border-sky-400/30 mb-2">
                    <span className="font-extrabold text-sky-900 tracking-tight text-xs flex items-center gap-1">
                      📂 Legenda do Registro
                    </span>
                    <button
                      onClick={() => setShowCaptionBubble(false)}
                      className="text-[#73706d] hover:text-black font-black text-xs cursor-pointer focus:outline-none p-1"
                      title="Fechar balão"
                    >
                      X
                    </button>
                  </div>

                  {/* Caption Content */}
                  <div className="max-h-60 overflow-y-auto pr-1 text-xs leading-relaxed text-left font-medium text-slate-800 whitespace-pre-wrap break-words">
                    {activePhoto.caption || (
                      <span className="text-slate-500 italic">Nenhuma legenda descrita para esta foto nostálgica.</span>
                    )}
                  </div>
                  
                  {/* Fine Date badge / Nostalgic song footer info inside balloon */}
                  <div className="mt-3 pt-2 border-t border-sky-400/20 flex flex-wrap gap-2 justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>{activePhoto.date || new Date().toLocaleDateString('pt-BR')}</span>
                    {activePhoto.song && (
                      <span className="text-sky-700 font-sans font-bold flex items-center gap-0.5">
                        🎵 {activePhoto.song.split('-')[1]?.trim() || activePhoto.song}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* COMENTÁRIOS EXPANSIVE DRAWER (DESKTOP: RIGHT SIDE OF THE MODAL CARD, MOBILE: UNDER CARD) */}
              {showCommentsSection && (
                <>
                  {/* Desktop view comments */}
                  <div 
                    className="hidden xl:flex flex-col w-[360px] bg-[#1a1c22]/95 border-[3px] border-sky-400 rounded-3xl p-5 text-white shadow-2xl animate-slideLeft shrink-0 justify-between self-stretch relative text-left"
                    id="photo-viewer-comments-desktop"
                  >
                    <div>
                      {/* Comments Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-700/60 mb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-[#00f0ff] flex items-center gap-1.5">
                          💬 Comentarios
                        </span>
                        <span className="text-[10px] text-neutral-400 bg-[#c7cace]/10 px-2 py-0.5 rounded-full font-mono">
                          {activePhoto.comments.length} recados
                        </span>
                      </div>

                      {/* Message Input box */}
                      <form onSubmit={handlePostComment} className="flex flex-col gap-2 mb-4 bg-slate-900/40 p-2.5 rounded-xl border border-neutral-800/40">
                        <span className="text-[10px] font-bold text-sky-400">Deixe uma mensagem:</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="Deixe um recado legal..."
                            className="flex-1 px-3 py-1.5 text-xs rounded bg-black border border-neutral-800 text-white outline-none focus:border-sky-500 font-sans"
                            maxLength={150}
                            required
                          />
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white font-extrabold rounded-lg text-xs uppercase cursor-pointer transition-all border border-sky-400/30"
                          >
                            Enviar
                          </button>
                        </div>
                      </form>

                      {/* Comments Scrollable List */}
                      <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-sky-500/20">
                        {activePhoto.comments.length === 0 ? (
                          <div className="text-center py-8">
                            <span className="text-xl block mb-2">🎈</span>
                            <p className="text-xs text-neutral-400 italic font-mono">Nenhum depoimento ainda. Seja o primeiro chapa!</p>
                          </div>
                        ) : (
                          activePhoto.comments.map(c => (
                            <div key={c.id} className="text-xs flex flex-col gap-1.5">
                              <div className="flex gap-2 items-center">
                                <button
                                  type="button"
                                  onClick={() => handleUserClick(getUserIdByNameAndAvatar(c.authorName, c.authorAvatar))}
                                  className="flex gap-2 items-center text-[#00f0ff] hover:underline hover:text-cyan-300 text-left cursor-pointer group focus:outline-none"
                                >
                                  <img 
                                    src={c.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120"} 
                                    alt={c.authorName} 
                                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-sky-400/25 group-hover:border-cyan-400 transition-colors" 
                                  />
                                  <span className="font-extrabold">{c.authorName}</span>
                                </button>
                                <span className="text-[9px] text-neutral-500 font-mono ml-auto">{c.date || "recent"}</span>
                              </div>
                              <p className="text-neutral-200 pl-7 text-left leading-relaxed break-words">{c.text}</p>
                              <div className="border-b border-dashed border-neutral-700/50 pt-2 w-full" />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Nostalgic song controller if available */}
                    {activePhoto.song && (
                      <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
                        <span className="truncate max-w-[200px]">Trilha: {activePhoto.song}</span>
                        <button
                          type="button"
                          onClick={() => setIsSongPlaying(!isSongPlaying)}
                          className="px-2.5 py-1 text-[9px] bg-sky-950 font-bold border border-sky-500/30 rounded-md text-sky-400 cursor-pointer flex items-center gap-1 hover:bg-sky-900 transition-colors"
                        >
                          {isSongPlaying ? 'Mutar' : 'Tocar'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mobile view comments */}
                  <div 
                    className="block xl:hidden w-full bg-[#1a1c22]/95 border-[3px] border-sky-400 rounded-3xl p-4 text-white shadow-xl mt-2 animate-slideDown text-left"
                    id="photo-viewer-comments-mobile"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-700/60 mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#00f0ff]">
                        💬 Comentários
                      </span>
                      <span className="text-[10px] text-neutral-400 bg-white/5 px-2 rounded-full font-mono">
                        {activePhoto.comments.length}
                      </span>
                    </div>

                    <form onSubmit={handlePostComment} className="flex flex-col gap-2 mb-3 bg-slate-900/60 p-2 rounded-xl">
                      <span className="text-[10px] text-sky-300 font-bold">Deixe uma mensagem:</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Fale alguma coisa..."
                          className="flex-1 px-2.5 py-1 text-xs rounded bg-black border border-neutral-800 text-white outline-none font-sans"
                          maxLength={150}
                          required
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 bg-gradient-to-r from-sky-600 to-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Enviar
                        </button>
                      </div>
                    </form>

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {activePhoto.comments.length === 0 ? (
                        <p className="text-[10px] text-neutral-400 italic text-center py-4 font-mono">Nenhum recado ainda.</p>
                      ) : (
                        activePhoto.comments.map(c => (
                          <div key={c.id} className="text-[11px] flex flex-col gap-1 pb-1.5 last:pb-0">
                            <div className="flex gap-1.5 items-center">
                              <button
                                type="button"
                                onClick={() => handleUserClick(getUserIdByNameAndAvatar(c.authorName, c.authorAvatar))}
                                className="flex gap-1.5 items-center text-[#00f0ff] hover:underline hover:text-cyan-300 text-left cursor-pointer group focus:outline-none"
                              >
                                <img src={c.authorAvatar} alt={c.authorName} className="w-4 h-4 rounded-full object-cover shrink-0 border border-sky-400/25 group-hover:border-cyan-400" />
                                <span className="font-extrabold">{c.authorName}</span>
                              </button>
                              <span className="text-[8px] text-neutral-500 ml-auto">{c.date || "recent"}</span>
                            </div>
                            <p className="text-neutral-300 pl-5 text-left">{c.text}</p>
                            <div className="border-b border-dashed border-neutral-700/30 pt-1 w-full" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* COMPARTILHAR COM AMIGOS RESPONSIVE SIDE PANEL */}
              {showFriendsShareModal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full xl:w-[350px] bg-[#1a1c22]/95 border-[3px] border-violet-500 rounded-3xl p-5 text-white shadow-2xl flex flex-col shrink-0 self-stretch relative text-left"
                  id="photo-viewer-share-social-panel"
                >
                  <div className="flex flex-col h-full justify-between">
                    {shareSuccessData ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 my-auto">
                        <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center text-emerald-400 text-3xl mb-4 animate-bounce">
                          ✓
                        </div>
                        <p className="text-sm font-bold text-emerald-400 mb-2">Mensagem enviada!</p>
                        <p className="text-xs text-neutral-300 leading-relaxed mb-6 font-mono">
                          Foto compartilhada com: <strong>{shareSuccessData.names.join(', ')}</strong>.
                        </p>
                        
                        <div className="flex flex-col gap-2.5 w-full">
                          <button
                            type="button"
                            onClick={() => {
                              // Send the message block and open chat with last friend
                              window.dispatchEvent(new CustomEvent('open-secret-chat', {
                                detail: { friendId: shareSuccessData.lastRecipientId }
                              }));
                              handleClosePhotoDirect();
                              setShowFriendsShareModal(false);
                              setShareSuccessData(null);
                            }}
                            className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-700 text-white font-extrabold text-xs cursor-pointer rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/30 border-0"
                          >
                            💬 Abrir conversa
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setShareSuccessData(null);
                              setShowFriendsShareModal(false);
                              setSelectedFriends([]);
                            }}
                            className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer rounded-xl transition-colors border border-neutral-700"
                          >
                            Voltar para o Álbum
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          {/* Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-700/60 mb-3">
                            <span className="text-xs font-black uppercase tracking-widest text-[#d946ef] flex items-center gap-1.5">
                              💬 Compartilhar com Amigos
                            </span>
                            <button
                              onClick={() => {
                                setShowFriendsShareModal(false);
                                setSelectedFriends([]);
                              }}
                              className="text-neutral-400 hover:text-white font-extrabold text-xs cursor-pointer focus:outline-none p-1 bg-neutral-800 rounded-full w-5 h-5 flex items-center justify-center border border-neutral-700 hover:bg-neutral-700"
                              title="Fechar painel"
                            >
                              X
                            </button>
                          </div>

                          {/* Friends List */}
                          <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-neutral-800">
                            {currentUserFriends.length === 0 ? (
                              <div className="text-center py-6 text-neutral-500 text-xs italic">
                                Nenhum amigo encontrado na rede chapa!
                              </div>
                            ) : (
                              currentUserFriends.map(friend => {
                                const isSelected = selectedFriends.includes(friend.id);
                                return (
                                  <div
                                    key={friend.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedFriends(selectedFriends.filter(id => id !== friend.id));
                                      } else {
                                        setSelectedFriends([...selectedFriends, friend.id]);
                                      }
                                    }}
                                    className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none ${
                                      isSelected 
                                        ? 'bg-violet-900/30 border-violet-500' 
                                        : 'bg-neutral-800/40 border-neutral-700/50 hover:bg-neutral-800/75'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={friend.avatar}
                                        alt={friend.name}
                                        className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold leading-tight line-clamp-1">
                                          {friend.name}
                                        </span>
                                        <span className="text-[9px] text-neutral-400 font-mono">{friend.location}</span>
                                      </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all text-xs font-bold ${
                                      isSelected 
                                        ? 'bg-violet-600 border-violet-400 text-white' 
                                        : 'border-neutral-600 text-transparent'
                                    }`}>
                                      ✓
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Message Field */}
                          <div className="mt-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#00f0ff] block mb-1">
                              Mensagem Privada (Opcional):
                            </label>
                            <textarea
                              value={shareMessageText}
                              onChange={(e) => setShareMessageText(e.target.value)}
                              placeholder="Olha essa foto 😂"
                              className="w-full text-xs p-2 rounded-xl bg-black border border-neutral-700 text-white font-sans focus:border-violet-500 focus:outline-none placeholder-neutral-600 resize-none"
                              rows={2}
                            />
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-neutral-700/60">
                          <button
                            type="button"
                            onClick={() => {
                              setShowFriendsShareModal(false);
                              setSelectedFriends([]);
                            }}
                            className="px-4 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-lg cursor-pointer transition-colors border border-neutral-700"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={selectedFriends.length === 0 || isSharingInProgress}
                            onClick={async () => {
                              if (selectedFriends.length === 0) return;
                              setIsSharingInProgress(true);
                              try {
                                for (const recipientId of selectedFriends) {
                                  const shareId = 'share_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                                  const record = {
                                    id: shareId,
                                    photoId: activePhoto.id,
                                    photoUrl: activePhoto.url,
                                    albumId: activeAlbumId || '',
                                    senderId: currentUserId,
                                    receiverId: recipientId,
                                    message: shareMessageText || 'Olha essa foto 😂',
                                    createdAt: new Date().toISOString(),
                                    viewed: false
                                  };
                                  try {
                                    await setDoc(doc(db, 'shared_photos', shareId), record);
                                  } catch (err) {
                                    console.warn("Firestore error when sharing, utilizing offline fallback:", err);
                                  }

                                  // Persistent offline fallback list for shared photos
                                  const localPhotosKey = `orkut_local_shared_photos_${recipientId}`;
                                  const existingLocal = localStorage.getItem(localPhotosKey);
                                  let localList = [];
                                  if (existingLocal) {
                                    try { localList = JSON.parse(existingLocal); } catch (e) {}
                                  }
                                  localList.push(record);
                                  localStorage.setItem(localPhotosKey, JSON.stringify(localList));

                                  // Append message directly into secret chat local history too!
                                  const storageKey = `orkut_secure_secret_chat_${recipientId}`;
                                  const saved = localStorage.getItem(storageKey);
                                  let currentMsgs: any[] = [];
                                  if (saved) {
                                    try { currentMsgs = JSON.parse(saved); } catch (e) {}
                                  }
                                  const now = new Date();
                                  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                  const sharedMsg = shareMessageText.trim() || 'Olha essa foto 😂';
                                  currentMsgs.push({
                                    id: 'msg_photo_lbl_' + Math.random().toString(36).substr(2, 9),
                                    senderId: 'me',
                                    senderName: currentUserName || 'Você',
                                    text: `📸 [Foto Anexada] ${sharedMsg} - Referência: ${activePhoto.caption || 'Foto'} (${activePhoto.url})`,
                                    timestamp: timeStr,
                                    createdAt: Date.now()
                                  });
                                  localStorage.setItem(storageKey, JSON.stringify(currentMsgs));
                                }

                                if (onShareToFeed) {
                                  onShareToFeed(`Compartilhou privado: "${activePhoto.caption || ''}" com amigos`, 'photo');
                                }

                                const sharedFriendNames = selectedFriends.map(friendId => {
                                  const friendObj = currentUserFriends.find(f => f.id === friendId);
                                  return friendObj ? friendObj.name : friendId;
                                });

                                setShareSuccessData({
                                  names: sharedFriendNames,
                                  lastRecipientId: selectedFriends[selectedFriends.length - 1]
                                });

                              } catch (err) {
                                console.error("Falha ao salvar compartilhamento de foto:", err);
                                alert("Desculpe chapa, falha ao salvar compartilhamento de foto no banco.");
                              } finally {
                                setIsSharingInProgress(false);
                              }
                            }}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                              selectedFriends.length === 0 || isSharingInProgress
                                ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed border border-neutral-800'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-violet-600/30 border border-violet-400'
                            }`}
                          >
                            {isSharingInProgress ? 'Enviando...' : 'Enviar'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        );
      })()}

      {/* -------------------- POPUP MODAL: CREATE ALBUM -------------------- */}
      {showCreateAlbum && (
        <div className="fixed inset-0 m-auto bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-white border-2 border-indigo-400 rounded-lg shadow-2xl max-w-sm w-full overflow-hidden text-left flex flex-col relative font-sans text-xs">
            <div className="bg-[#dee7f4] px-3 py-1.5 border-b border-indigo-200 flex justify-between items-center bg-gradient-to-r from-[#dee7f4] to-[#adc3df]">
              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                📂 Criador de Álbum Digital
              </span>
              <button 
                onClick={() => setShowCreateAlbum(false)}
                className="text-neutral-500 hover:text-black font-bold text-xs cursor-pointer bg-white/50 px-1 rounded"
              >
                fechar x
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">Nome do álbum:</label>
                <input
                  id="album-form-name"
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="EX: Rolês 2008 ou Cyber Café"
                  className="w-full px-2 py-1.5 border border-neutral-300 rounded text-xs select-text bg-white text-neutral-800"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">Descrição:</label>
                <textarea
                  id="album-form-desc"
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  placeholder="O que representa essas recordações..."
                  rows={2}
                  className="w-full px-2 py-1.5 border border-neutral-300 rounded text-xs select-text bg-white text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">Tema visual nostálgico:</label>
                <select
                  id="album-form-theme"
                  value={newAlbumTheme}
                  onChange={(e) => setNewAlbumTheme(e.target.value as any)}
                  className="w-full px-2 py-1.5 border border-neutral-300 rounded bg-white text-neutral-800 cursor-pointer"
                >
                  <option value="neon-hacker">Neon Hacker (Verde Terminal)</option>
                  <option value="emo-2008">Emo 2008 (Corações e Rosa)</option>
                  <option value="vhs">VHS (Timer, Estática, Magenta/Cyan)</option>
                  <option value="cyberpunk">Cyberpunk (Amarelo, Azul, Tech look)</option>
                  <option value="glitter">Glitter (Estrelas, Purpurina, Doce)</option>
                  <option value="gotico">Gótico (Vermelho Escarlate, Gótico)</option>
                  <option value="polaroid">Polaroid (Cartão de foto clássico branco)</option>
                  <option value="old-camera">Old Camera (Chapa de rolo de filme)</option>
                </select>
                <p className="text-[9px] text-neutral-400 mt-0.5 leading-snug">O tema desenha a moldura de cada foto do álbum dependendo do seu vibe!</p>
              </div>

              <div className="pt-2 border-t border-dashed mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCreateAlbum(false)}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded cursor-pointer"
                >
                  Compilar Álbum ✔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- POPUP MODAL: ADD PHOTO -------------------- */}
      {showAddPhoto && activeAlbum && (
        <div className="fixed inset-0 m-auto bg-black/75 z-40 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-[#f0f4f9] border-2 border-[#1e40af] rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden text-left flex flex-col relative font-sans text-xs">
            {/* Modal Title bar */}
            <div className="bg-[#dee7f4] px-3 py-2 border-b border-indigo-200 flex justify-between items-center bg-gradient-to-r from-[#dee7f4] to-[#adc3df]">
              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5 font-sans">
                📷 Postagem de Foto no álbum: <strong className="text-[#1e40af] truncate text-[11px] font-bold">{activeAlbum.name}</strong>
              </span>
              <button 
                type="button"
                onClick={() => {
                  setShowAddPhoto(false);
                  setNewPhotoUrl('');
                  setNewPhotoCaption('');
                  setNewPhotoSong('');
                  setNewPhotoGif('');
                  setActiveEffect('');
                  setAiPrompt('');
                }}
                className="text-neutral-500 hover:text-black font-bold text-xs cursor-pointer bg-white/60 px-2 py-0.5 rounded border border-neutral-300 pointer-events-auto"
              >
                fechar x
              </button>
            </div>

            {/* Hidden device input file tag */}
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleLocalFileUpload}
            />

            <form onSubmit={handleAddPhoto} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white overflow-y-auto max-h-[85vh]">
              
              {/* LADO ESQUERDO: CONTROLES DE ENTRADA */}
              <div className="space-y-3.5 flex flex-col justify-between">
                
                {/* 1. ENDEREÇO DA IMAGEM */}
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-600 uppercase mb-1 tracking-wider">
                    ENDEREÇO DA IMAGEM:
                  </label>
                  <input
                    id="photo-form-url"
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Cole um link ou faça upload de arquivo abaixo"
                    className="w-full px-2.5 py-1.5 border border-indigo-200 rounded text-xs select-text bg-white text-neutral-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* 2. LEGENDA CURTA DA FOTO (Max 60 chars) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-extrabold text-neutral-600 uppercase tracking-wider">
                      LEGENDA CURTA DA FOTO:
                    </label>
                    <span className={`text-[9px] font-mono font-bold ${newPhotoCaption.length > 50 ? 'text-red-500' : 'text-neutral-400'}`}>
                      {newPhotoCaption.length}/60
                    </span>
                  </div>
                  <input
                    id="photo-form-caption"
                    type="text"
                    maxLength={60}
                    value={newPhotoCaption}
                    onChange={(e) => setNewPhotoCaption(e.target.value)}
                    placeholder="EX: Saudades dessa época de ouro chapa."
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs select-text bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* 3. MÚSICA DO MOMENTO (OPCIONAL) */}
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-600 uppercase mb-1 tracking-wider">
                    MÚSICA DO MOMENTO (OPCIONAL):
                  </label>
                  <input
                    id="photo-form-song"
                    type="text"
                    value={newPhotoSong}
                    onChange={(e) => setNewPhotoSong(e.target.value)}
                    placeholder="Ex: Linkin Park - Numb"
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs select-text bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* 4. ANEXAR GIF NOSTÁLGICO (OPCIONAL) */}
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-600 uppercase mb-1 tracking-wider">
                    ANEXAR GIF NOSTÁLGICO (OPCIONAL LINK):
                  </label>
                  <input
                    id="photo-form-gif"
                    type="text"
                    value={newPhotoGif}
                    onChange={(e) => setNewPhotoGif(e.target.value)}
                    placeholder="Cole o endereço link de um GIF retrô..."
                    className="w-full px-2.5 py-1.5 border border-[#neutral-300] rounded text-xs select-text bg-white text-neutral-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* 5. ENVIAR DO ARQUIVO - BIG UPLOAD BUTTON */}
                <div className="pt-2">
                  <span className="block text-[10px] text-center font-extrabold text-neutral-500 uppercase mb-1.5 font-sans">
                    Enviar do arquivo
                  </span>
                  <button
                    type="button"
                    disabled={isUploadingLocalPhoto || isGeneratingPhotoAi}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-4 bg-gradient-to-b from-[#a21caf] to-[#86198f] hover:from-[#c026d3] hover:to-[#a21caf] text-white font-black text-lg uppercase rounded shadow-md border-b-[4px] border-[#701a75] active:border-b-0 hover:scale-[1.01] active:translate-y-[4px] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer pointer-events-auto ${(isUploadingLocalPhoto || isGeneratingPhotoAi) ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Upload size={22} className={`stroke-[3] ${isUploadingLocalPhoto ? 'animate-spin' : 'animate-bounce'}`} />
                      <span className="tracking-wider text-xl">{isUploadingLocalPhoto ? 'ENVIANDO...' : 'UPLOAD'}</span>
                    </div>
                  </button>
                  <div className="text-center text-[9px] text-[#86198f] font-mono font-bold mt-1.5 uppercase tracking-wide">
                    COMPATÍVEL COM: JPG, PNG, WEBP, GIF
                  </div>
                </div>

              </div>

              {/* LADO DIREITO: ÁREA DE PREVIEW & EFEITOS */}
              <div className="space-y-4 flex flex-col justify-between border-l border-neutral-200 pl-4">
                
                {/* 1. ÁREA DE PREVIEW */}
                <div className="w-full h-36 rounded-lg bg-[#e5e5e5] border-2 border-neutral-300 flex items-center justify-center overflow-hidden relative shadow-inner">
                  {newPhotoUrl ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                      <img
                        src={newPhotoUrl}
                        alt="Preview"
                        className={`w-full h-full object-contain ${getPhotoEffectClass(activeEffect)}`}
                        referrerPolicy="no-referrer"
                      />
                      {activeEffect && (
                        <span className="absolute bottom-1 bg-[#d946ef] text-white font-normal text-[8px] font-mono px-2 py-0.5 rounded capitalize shadow border border-pink-400">
                          Efeito: {activeEffect.replace('-', ' ')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-center font-bold tracking-wider select-none p-4 flex flex-col items-center justify-center">
                      <span className="text-[17px] font-black text-[#d946ef] drop-shadow-sm font-sans uppercase animate-pulse">
                        MINIATURA FOTO
                      </span>
                      <span className="text-[9px] text-neutral-500 font-mono mt-1">Carregue ou gere uma imagem chapa</span>
                    </div>
                  )}

                  {/* AI Generating visual loader */}
                  {isGeneratingPhotoAi && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-3 text-center">
                      <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-[10px] text-indigo-400 font-mono font-extrabold tracking-widest uppercase animate-pulse">
                        PINTANDO COM IA RESTRITA...
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. SEÇÃO DE EFEITOS */}
                <div className="space-y-2">
                  <div className="pb-1 border-b-2 border-[#d946ef] inline-block">
                    <span className="text-[11px] font-black text-[#d946ef] uppercase tracking-widest font-sans">
                      EFEITOS ANOS 2000
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Anos 2000, Dark Gothic & Rosa Glitter */}
                    <button
                      type="button"
                      onClick={() => setActiveEffect(activeEffect === 'anos-2000' ? '' : 'anos-2000')}
                      className={`py-1.5 px-1 rounded-full text-[9.5px] font-bold text-center border cursor-pointer font-sans shadow-sm transition-all duration-150 pointer-events-auto ${
                        activeEffect === 'anos-2000'
                          ? 'bg-neutral-100 border-[#d946ef] text-[#d946ef] ring-2 ring-[#d946ef]/20 shadow-md scale-95'
                          : 'bg-[#e5e5e5] hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      Anos 2000
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEffect(activeEffect === 'dark-gothic' ? '' : 'dark-gothic')}
                      className={`py-1.5 px-1 rounded-full text-[9.5px] font-bold text-center border cursor-pointer font-sans shadow-sm transition-all duration-150 pointer-events-auto ${
                        activeEffect === 'dark-gothic'
                          ? 'bg-neutral-100 border-[#d946ef] text-[#d946ef] ring-2 ring-[#d946ef]/20 shadow-md scale-95'
                          : 'bg-[#e5e5e5] hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      Dark Gótic
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEffect(activeEffect === 'rosa-glitter' ? '' : 'rosa-glitter')}
                      className={`py-1.5 px-1 rounded-full text-[9.5px] font-bold text-center border cursor-pointer font-sans shadow-sm transition-all duration-150 pointer-events-auto ${
                        activeEffect === 'rosa-glitter'
                          ? 'bg-neutral-100 border-[#d946ef] text-[#d946ef] ring-2 ring-[#d946ef]/20 shadow-md scale-95'
                          : 'bg-[#e5e5e5] hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      Rosa Glitter
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Emo, Cyber Glitch & VHS */}
                    <button
                      type="button"
                      onClick={() => setActiveEffect(activeEffect === 'emo' ? '' : 'emo')}
                      className={`py-1.5 px-1 rounded-full text-[9.5px] font-bold text-center border cursor-pointer font-sans shadow-sm transition-all duration-150 pointer-events-auto ${
                        activeEffect === 'emo'
                          ? 'bg-neutral-100 border-[#d946ef] text-[#d946ef] ring-2 ring-[#d946ef]/20 shadow-md scale-95'
                          : 'bg-[#e5e5e5] hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      Emo
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEffect(activeEffect === 'cyber-glitch' ? '' : 'cyber-glitch')}
                      className={`py-1.5 px-1 rounded-full text-[9.5px] font-bold text-center border cursor-pointer font-sans shadow-sm transition-all duration-150 pointer-events-auto ${
                        activeEffect === 'cyber-glitch'
                          ? 'bg-neutral-100 border-[#d946ef] text-[#d946ef] ring-2 ring-[#d946ef]/20 shadow-md scale-95'
                          : 'bg-[#e5e5e5] hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      Cyber Glitch
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEffect(activeEffect === 'vhs' ? '' : 'vhs')}
                      className={`py-1.5 px-1 rounded-full text-[9.5px] font-bold text-center border cursor-pointer font-sans shadow-sm transition-all duration-150 pointer-events-auto ${
                        activeEffect === 'vhs'
                          ? 'bg-neutral-100 border-[#d946ef] text-[#d946ef] ring-2 ring-[#d946ef]/20 shadow-md scale-95'
                          : 'bg-[#e5e5e5] hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      VHS
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-w-[240px]">
                    {/* Fotolog & Cyber Punk */}
                    <button
                      type="button"
                      onClick={() => setActiveEffect(activeEffect === 'fotolog' ? '' : 'fotolog')}
                      className={`py-1.5 px-1 rounded-full text-[9.5px] font-bold text-center border cursor-pointer font-sans shadow-sm transition-all duration-150 pointer-events-auto ${
                        activeEffect === 'fotolog'
                          ? 'bg-neutral-100 border-[#d946ef] text-[#d946ef] ring-2 ring-[#d946ef]/20 shadow-md scale-95'
                          : 'bg-[#e5e5e5] hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      Fotolog
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEffect(activeEffect === 'cyber-punk' ? '' : 'cyber-punk')}
                      className={`py-1.5 px-1 rounded-full text-[9.5px] font-bold text-center border cursor-pointer font-sans shadow-sm transition-all duration-150 pointer-events-auto ${
                        activeEffect === 'cyber-punk'
                          ? 'bg-neutral-100 border-[#d946ef] text-[#d946ef] ring-2 ring-[#d946ef]/20 shadow-md scale-95'
                          : 'bg-[#e5e5e5] hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      Cyber Punk
                    </button>
                  </div>
                </div>

                {/* 3. GERAÇÃO POR IA (OPCIONAL) */}
                <div className="pt-2 border-t border-dashed border-neutral-200">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleGeneratePhotoAi}
                      disabled={isGeneratingPhotoAi || !aiPrompt.trim()}
                      className={`px-3 py-2 text-[10px] font-extrabold uppercase rounded shadow-sm border transition-all flex items-center justify-center gap-1 cursor-pointer pointer-events-auto ${
                        aiPrompt.trim()
                          ? 'bg-[#dee7f4] hover:bg-[#c2d2e9] text-[#1e40af] border-[#1e40af]/30'
                          : 'bg-[#e5e5e5] text-neutral-400 border-neutral-300'
                      }`}
                    >
                      <Sparkles size={11} className="stroke-[2.5]" />
                      GERAR COM IA
                    </button>

                    <div className="flex-1">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Descrever prompt..."
                        className="w-full px-3 py-1.5 bg-[#0d021a] text-white border border-[#d946ef]/30 rounded-full text-[10.5px] select-text placeholder-indigo-300/40 focus:outline-none focus:ring-1 focus:ring-[#d946ef]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. BOTÕES FINAIS: VOLTAR & PUBLICAR */}
                <div className="flex gap-2.5 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPhoto(false);
                      setNewPhotoUrl('');
                      setNewPhotoCaption('');
                      setNewPhotoSong('');
                      setNewPhotoGif('');
                      setActiveEffect('');
                      setAiPrompt('');
                    }}
                    className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded text-[10.5px] cursor-pointer transition-colors border border-stone-300 pointer-events-auto"
                  >
                    VOLTAR
                  </button>
                  <button
                    type="submit"
                    disabled={!newPhotoUrl.trim()}
                    className={`px-6 py-1.5 font-black uppercase rounded text-[10.5px] border-b-[3px] active:border-b-0 hover:scale-[1.01] active:translate-y-[3px] cursor-pointer transition-all pointer-events-auto ${
                      newPhotoUrl.trim()
                        ? 'bg-gradient-to-b from-[#1d4ed8] to-[#1e40af] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white border-[#172554] shadow-md'
                        : 'bg-[#e5e5e5] text-neutral-400 border-neutral-300'
                    }`}
                  >
                    PUBLICAR
                  </button>
                </div>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* -------------------- DYNAMIC POPUP MODAL: DELETE PHOTO CONFIRMATION -------------------- */}
      {photoIdToDelete && (
        <div className="fixed inset-0 m-auto bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[340px] w-full overflow-hidden text-center flex flex-col relative border border-neutral-300">
            {/* Top Right Off-set X button */}
            <button
              onClick={cancelDeletePhoto}
              className="absolute -top-1 -right-6 text-white hover:text-neutral-300 font-sans font-black text-2xl transition-colors cursor-pointer select-none"
              title="Fechar"
            >
              X
            </button>

            {/* Red Alert Head Header Section */}
            <div className="bg-[#dc2626] p-5 pt-6 pb-5 mx-3 mt-3 rounded-xl border border-red-700/20 shadow-md">
              <h2 className="text-white font-sans font-black uppercase text-base leading-snug tracking-wider">
                TEM CERTEZA QUE DESEJA<br />EXCLUIR ESTA FOTO?
              </h2>
            </div>

            {/* Warning SVG Sign Illustration */}
            <div className="py-2 flex justify-center items-center">
              <svg className="w-24 h-24 hover:scale-105 transition-transform duration-300 drop-shadow-sm" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 15L12 80H88L50 15Z" fill="#FBBF24" stroke="#000000" strokeWidth="6" strokeLinejoin="round" />
                <rect x="47" y="38" width="6" height="20" rx="3" fill="#000000" />
                <circle cx="50" cy="68" r="4.5" fill="#000000" />
              </svg>
            </div>

            {/* Custom CTA Action Buttons block */}
            <div className="flex gap-4 px-6 pb-6 pt-2">
              {/* Left Action: SIM */}
              <button
                type="button"
                onClick={confirmDeletePhoto}
                className="flex-1 py-2 px-4 bg-[#dc2626] hover:bg-red-700 active:bg-red-800 text-white font-sans font-black text-sm rounded shadow-md border-b-[3px] border-red-800 hover:border-[#b91c1c] hover:scale-[1.01] active:translate-y-[2px] active:border-b-0 transition-all cursor-pointer text-center uppercase tracking-wide"
              >
                SIM
              </button>

              {/* Right Action: CANCELAR */}
              <button
                type="button"
                onClick={cancelDeletePhoto}
                className="flex-1 py-2 px-4 bg-[#16a34a] hover:bg-green-700 active:bg-green-800 text-white font-sans font-black text-sm rounded shadow-md border-b-[3px] border-green-800 hover:border-[#15803d] hover:scale-[1.01] active:translate-y-[2px] active:border-b-0 transition-all cursor-pointer text-center uppercase tracking-wide"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
