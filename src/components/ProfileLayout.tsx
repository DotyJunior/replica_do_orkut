import React, { useState, FormEvent, useEffect, useRef, ChangeEvent, MouseEvent } from 'react';
import { Eye, Edit, Save, ShieldCheck, Heart, IceCream, Smile, Star, MapPin, Sparkles, KeyRound, Palette, RefreshCw, Send, MessageSquare, Camera, Trash2, Bell, UserPlus, Settings, Cog } from 'lucide-react';
import { Profile, Friend, Community, Album, Photo, SharedMemory, FriendRequest } from '../types';
import { getThemeStyles } from '../lib/theme';
import SocialSidebar from './SocialSidebar';
import IdentityWizard from './IdentityWizard';
import Windows95Installer from './Windows95Installer';
import SocialActions from './SocialActions';
import PresenceStatus from './PresenceStatus';
import GlossyRetroButton from './GlossyRetroButton';
import { ThemeSelector } from './ThemeSelector';
import { RainOverlay } from './RainOverlay';
import { motion, AnimatePresence } from 'motion/react';
import { MusicPlayer } from './music/MusicPlayer';
import { supabaseStorageService } from '../supabase';

const getFontStyleClass = (style?: string) => {
  switch (style) {
    case 'gothic':
      return 'font-gothic';
    case 'medieval':
      return 'font-medieval';
    case 'cursivo':
      return 'font-cursivo';
    case 'cyber':
      return 'font-cyber tracking-wider';
    case 'vaporwave':
      return 'font-vaporwave tracking-widest';
    case 'smallcaps':
      return 'font-smallcaps tracking-tight font-extrabold';
    default:
      return 'font-sans';
  }
};

const DEFAULT_PROFILES_LOCAL: Record<string, any> = {
  me: { id: 'me', name: 'Junior Sombra', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  alexandre: { id: 'alexandre', name: 'Alexandre Curi', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' },
  orkut: { id: 'orkut', name: 'Orkut Büyükkökten', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
  hacker: { id: 'hacker', name: 'H3_Elit3_Hacker', avatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150' },
  lucas: { id: 'lucas', name: 'Lucas Santos', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
};

const sanitizeTextInput = (text: string): string => {
  if (!text) return '';
  return text.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 45);
};

interface ProfileLayoutProps {
  profile: Profile;
  friends: Friend[];
  communities: Community[];
  isOwnProfile: boolean;
  onSaveProfile: (updatedProfile: Partial<Profile>) => void;
  onNavigateToFriend: (id: string) => void;
  onNavigateToTab: (tab: string, forceVisitor?: boolean, autoTriggerUpload?: boolean, communityId?: string) => void;
  userPublicKey: string;
  currentTab: string;
  albums: Album[];
  featuredPhotoId: string | null;
  sharedMemories?: SharedMemory[];
  onShareToFeed: (itemTitle: string, itemType: string) => void;
  onLikeShare: (id: string, liked: boolean, count: number) => void;
  onOpenSecretChat?: (targetFriendId?: string) => void;
  onRateProfile?: (profileId: string, type: 'trusty' | 'cool' | 'sexy' | 'fans', value: number) => void;
  friendRequests?: FriendRequest[];
  onAddFriend?: (receiverId: string) => Promise<void>;
  onAcceptFriendRequest?: (requestId: string) => Promise<void>;
  onRejectFriendRequest?: (requestId: string) => Promise<void>;
  onRemoveFriend?: (receiverId: string) => Promise<void>;
  profiles?: Record<string, Profile>;
  loggedInUserId?: string;
}

export default function ProfileLayout({
  profile,
  friends,
  communities,
  isOwnProfile,
  onSaveProfile,
  onNavigateToFriend,
  onNavigateToTab,
  userPublicKey,
  currentTab,
  albums,
  featuredPhotoId,
  sharedMemories = [],
  onShareToFeed,
  onLikeShare,
  onOpenSecretChat,
  onRateProfile,
  friendRequests = [],
  onAddFriend,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onRemoveFriend,
  profiles = {},
  loggedInUserId,
}: ProfileLayoutProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showIdentityWizard, setShowIdentityWizard] = useState(false);
  const [showOldWebInstaller, setShowOldWebInstaller] = useState(false);
  const [pendingThemeCallback, setPendingThemeCallback] = useState<(() => void) | null>(null);

  const handleThemeSelectionWithInstaller = (targetTheme: string, onAccept: () => void) => {
    if (targetTheme === 'minimal-oldweb' && profile.theme !== 'minimal-oldweb') {
      setPendingThemeCallback(() => onAccept);
      setShowOldWebInstaller(true);
    } else {
      onAccept();
    }
  };

  const [isPendingLocal, setIsPendingLocal] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);

  const [isFriendDropdownOpen, setIsFriendDropdownOpen] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);

  const loggedInUid = loggedInUserId;

  // Determine friendship status
  const isAlreadyFriend = friends.some(f => f.id === loggedInUid) || 
    (profile.id === 'me' || loggedInUid === 'me' ? ['lucas', 'alexandre', 'orkut', 'hacker', 'me'].includes(profile.id) : false);

  const isFriends = isAlreadyFriend || friendRequests.some(req => 
    req.status === 'accepted' && 
    ((req.fromUserId === loggedInUid && req.toUserId === profile.id) || 
     (req.fromUserId === profile.id && req.toUserId === loggedInUid))
  );

  const pendingRequest = friendRequests.find(req => 
    req.status === 'pending' && 
    ((req.fromUserId === loggedInUid && req.toUserId === profile.id) || 
     (req.fromUserId === profile.id && req.toUserId === loggedInUid))
  );

  // Compute "Amigos de amigos / Sugestões" that are clickable and load the profile
  const friendsIds = friends.map(f => f.id);
  const friendsOfFriends = Object.values(profiles).filter(p => 
    p.id !== loggedInUid && 
    p.id !== profile.id && 
    !friendsIds.includes(p.id) &&
    ['marina', 'carlos', 'ana', 'felipe', 'juliana', 'bruno', 'patricia', 'ricardo'].includes(p.id)
  );

  // Pending received requests FOR the logged-in user to show in the Bell icon notification!
  // Fallback to checking toUserId as well in case of mapping inconsistencies.
  const pendingReceivedRequests = friendRequests.filter(req => 
    req.status === 'pending' && req.toUserId === loggedInUid
  );
  
  const hasPendingRequests = pendingReceivedRequests.length > 0;

  const handleAddFriendClick = async () => {
    if (!onAddFriend) return;
    setIsPendingLocal(true);
    await onAddFriend(profile.id);
  };

  const userAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) {
      alert('Operação não permitida: Apenas o dono do perfil pode alterar a foto!');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens JPG, PNG, WEBP ou GIF são suportadas!');
      return;
    }

    try {
      const downloadURL = await supabaseStorageService.uploadImage(file, profile.id, 'profile');
      onSaveProfile({ avatar: downloadURL });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Erro ao enviar imagem. Tente novamente.');
    }
  };

  const handleRemoveProfilePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwnProfile) {
      alert('Operação não permitida: Apenas o dono do perfil pode remover a foto!');
      return;
    }
    if (window.confirm('Deseja realmente remover sua foto de perfil?')) {
      onSaveProfile({ avatar: '👤' });
    }
  };

  // Status and thought feed parameters
  const [newStatusText, setNewStatusText] = useState('');
  const [postingStatus, setPostingStatus] = useState(false);

  const handlePostStatus = (e: FormEvent) => {
    e.preventDefault();
    if (!newStatusText.trim()) return;
    setPostingStatus(true);
    setTimeout(() => {
      onShareToFeed(newStatusText.trim(), 'post');
      setNewStatusText('');
      setPostingStatus(false);
    }, 450);
  };

  // Sound generator
  const playShutterSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playBeep(2100, 0, 0.05);
      playBeep(2100, 0.08, 0.05);

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

  // Theme support
  const themeStyles = getThemeStyles(profile.theme);

  const [aboutMeError, setAboutMeError] = useState<string | null>(null);

  const validateAboutMeField = (text: string): boolean => {
    if (!text) {
      setAboutMeError(null);
      return true;
    }

    // Checking for HTML scripts, tags, iframes, events, style elements, or custom styles
    const tagRegex = /<\/?(script|iframe|style|object|embed|link|meta|div|span|img|font|p|a|h[1-6]|button|input|textarea|form|table|tr|td|thead|tbody|tfoot|frame|frameset|html|body|applet)\b/i;
    const eventRegex = /\bon[a-zA-Z]+\s*=/i;
    const cssRegex = /(font-family|position|display|z-index)\s*:/i;

    if (
      tagRegex.test(text) ||
      /<script/i.test(text) ||
      /<\/script>/i.test(text) ||
      /<iframe>/i.test(text) ||
      /<style/i.test(text) ||
      /<object/i.test(text) ||
      /<embed/i.test(text) ||
      eventRegex.test(text) ||
      cssRegex.test(text)
    ) {
      setAboutMeError("Caracteres inválidos detectados. Por segurança, apenas texto, emojis, símbolos e ASCII Art são permitidos.");
      return false;
    }

    setAboutMeError(null);
    return true;
  };

  const [editForm, setEditForm] = useState({
    name: profile.name,
    aboutMe: profile.aboutMe,
    relationship: profile.relationship,
    humor: profile.humor,
    fashion: profile.fashion,
    religion: profile.religion,
    passions: profile.passions,
    username: profile.username || 'junior.sombra',
    statusOnline: profile.statusOnline || '● programando em Rust',
    theme: profile.theme || 'default',
    nome_exibicao: profile.nome_exibicao || profile.name || '',
    estilo_fonte: profile.estilo_fonte || 'normal',
    preserve_formatting: profile.preserve_formatting !== false, // default to true to match user desire for preservation
    isTwoFactorEnabled: profile.isTwoFactorEnabled || false,
  });

  useEffect(() => {
    setEditForm({
      name: profile.name,
      aboutMe: profile.aboutMe,
      relationship: profile.relationship,
      humor: profile.humor,
      fashion: profile.fashion,
      religion: profile.religion,
      passions: profile.passions,
      username: profile.username || 'junior.sombra',
      statusOnline: profile.statusOnline || '● programando em Rust',
      theme: profile.theme || 'default',
      nome_exibicao: profile.nome_exibicao || profile.name || '',
      estilo_fonte: profile.estilo_fonte || 'normal',
      preserve_formatting: profile.preserve_formatting !== false,
      isTwoFactorEnabled: profile.isTwoFactorEnabled || false,
    });
    // Reset error when profile changes
    setAboutMeError(null);
  }, [profile]);

  const handleSave = () => {
    if (!isOwnProfile) {
      alert("Operação não permitida: Apenas o dono do perfil pode editar esses dados!");
      return;
    }
    if (!validateAboutMeField(editForm.aboutMe)) {
      return;
    }
    onSaveProfile(editForm);
    setIsEditing(false);
  };

  // Track fanned profiles in state
  const [fannedProfiles, setFannedProfiles] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('fanned_profiles');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const isFanOfThisUser = fannedProfiles[profile.id] || false;

  const playRatingSound = (type: 'trusty' | 'cool' | 'sexy' | 'fans') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const playFreq = (freq: number, start: number, duration: number, soundType: 'sine' | 'triangle' = 'sine', vol = 0.05) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = soundType;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      if (type === 'trusty') {
        playFreq(523.25, 0, 0.15, 'sine', 0.04);
        playFreq(659.25, 0.08, 0.15, 'sine', 0.04);
      } else if (type === 'cool') {
        playFreq(587.33, 0, 0.15, 'triangle', 0.04);
        playFreq(880, 0.08, 0.2, 'sine', 0.03);
      } else if (type === 'sexy') {
        playFreq(349.23, 0, 0.15, 'sine', 0.05);
        playFreq(523.25, 0.06, 0.2, 'sine', 0.04);
      } else {
        playFreq(783.99, 0, 0.1, 'sine', 0.04);
        playFreq(987.77, 0.06, 0.1, 'sine', 0.04);
        playFreq(1174.66, 0.12, 0.2, 'sine', 0.03);
      }
    } catch (e) {
      console.log("Audio permission deferred in preview frame.");
    }
  };

  // Icon arrays for rating visualization
  const renderSmileys = (count: number) => {
    return Array.from({ length: 3 }).map((_, idx) => {
      const active = idx < count;
      return (
        <button
          key={idx}
          onClick={() => {
            if (!isOwnProfile && onRateProfile) {
              playRatingSound('trusty');
              onRateProfile(profile.id, 'trusty', idx + 1);
            }
          }}
          disabled={isOwnProfile}
          className={`${!isOwnProfile ? 'cursor-pointer hover:scale-125 hover:rotate-12 active:scale-95 transition-all outline-none border-0 bg-transparent p-0' : ''} focus:outline-none`}
          title={!isOwnProfile ? `Classificar Confiabilidade: ${idx + 1}/3` : `Confiável: ${count}/3`}
        >
          <Smile
            size={18}
            fill={active ? '#fbbf24' : 'none'}
            className={`${active ? 'text-[#f59e0b]' : 'text-neutral-300'} transition-colors`}
          />
        </button>
      );
    });
  };

  const renderIceCubes = (count: number) => {
    return Array.from({ length: 3 }).map((_, idx) => {
      const active = idx < count;
      return (
        <button
          key={idx}
          onClick={() => {
            if (!isOwnProfile && onRateProfile) {
              playRatingSound('cool');
              onRateProfile(profile.id, 'cool', idx + 1);
            }
          }}
          disabled={isOwnProfile}
          className={`${!isOwnProfile ? 'cursor-pointer hover:scale-125 active:scale-95 transition-all outline-none border-0 bg-transparent p-0' : ''} focus:outline-none`}
          title={!isOwnProfile ? `Classificar Legal/Divertido: ${idx + 1}/3` : `Legal: ${count}/3`}
        >
          <IceCream
            size={18}
            fill={active ? '#38bdf8' : 'none'}
            className={`${active ? 'text-[#0284c7]' : 'text-neutral-300'} transition-colors`}
          />
        </button>
      );
    });
  };

  const renderHearts = (count: number) => {
    return Array.from({ length: 3 }).map((_, idx) => {
      const active = idx < count;
      return (
        <button
          key={idx}
          onClick={() => {
            if (!isOwnProfile && onRateProfile) {
              playRatingSound('sexy');
              onRateProfile(profile.id, 'sexy', idx + 1);
            }
          }}
          disabled={isOwnProfile}
          className={`${!isOwnProfile ? 'cursor-pointer hover:scale-125 hover:-rotate-12 active:scale-95 transition-all outline-none border-0 bg-transparent p-0' : ''} focus:outline-none`}
          title={!isOwnProfile ? `Classificar Sexy: ${idx + 1}/3` : `Sexy: ${count}/3`}
        >
          <Heart
            size={18}
            fill={active ? '#f43f5e' : 'none'}
            className={`${active ? 'text-[#e11d48]' : 'text-neutral-300'} transition-colors`}
          />
        </button>
      );
    });
  };

  const displayNameText = profile.nome_exibicao && profile.nome_exibicao.trim() ? profile.nome_exibicao.trim() : profile.name;
  const displayNameClass = profile.nome_exibicao && profile.nome_exibicao.trim() ? getFontStyleClass(profile.estilo_fonte) : 'font-sans';

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 p-1 transition-all rounded ${themeStyles.font} ${profile.theme === 'rock-underground' ? 'theme-rock-underground' : ''}`}>
      {profile.theme === 'gotico-retro' && <RainOverlay />}
      {/* Identity Creator call to action banner for own profile */}
      {isOwnProfile && (!profile.username || profile.username === 'me') && (
        <div className="lg:col-span-12 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-left">
            <h4 className="font-bold flex items-center gap-1.5 text-sm">
              <Sparkles size={16} /> Ainda não personalizou sua Identidade Digital Scrapzone?
            </h4>
            <p className="text-[11px] text-[#dee7f4] mt-1">
              Escolha seu nome de autor, username exclusivo, status clássico dos anos 2000 chapa e ative um dos 8 temas de profile!
            </p>
          </div>
          <button
            onClick={() => setShowIdentityWizard(true)}
            className="px-4 py-1.5 bg-white text-indigo-700 font-bold rounded-full text-xs hover:bg-neutral-105 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
          >
            Configurar Identidade 🎭
          </button>
        </div>
      )}

      {/* 1. Left Side: Photo, Interactive Sidebar and Key Fingerprint */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Profile Card Only - Photo Container (Enlarged) */}
        <div className={`border rounded p-3 text-center transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass}`}>
          <div className={`relative group mx-auto w-full aspect-square overflow-hidden rounded-lg flex items-center justify-center shadow-xs ${
            profile.theme === 'cyberdeck' 
              ? 'cyber-neon-border-container p-[2px]' 
              : 'border-2 border-neutral-300 bg-neutral-100'
          }`}>
            {profile.avatar && profile.avatar !== '👤' && profile.avatar.trim() !== '' ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full object-cover z-10 rounded-[5px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-[#dee7f4] flex flex-col items-center justify-center text-neutral-400 gap-2 select-none z-10 rounded-[5px]">
                <span className="text-6xl">👤</span>
                <span className="text-xs font-bold tracking-widest uppercase text-neutral-500">Sem Foto</span>
              </div>
            )}

            {isOwnProfile && (
              profile.avatar && profile.avatar !== '👤' && profile.avatar.trim() !== '' ? (
                /* COM FOTO: Floating menu, semi-transparent, only shows on hover */
                <div 
                  className="absolute bottom-2 left-2 right-2 h-7.5 bg-black/40 backdrop-blur-xs border border-white/10 rounded-full flex items-center justify-between px-2.5 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 select-none font-sans z-20"
                >
                  <button 
                    type="button"
                    onClick={() => userAvatarInputRef.current?.click()}
                    className="text-[9px] font-black uppercase tracking-wider text-left hover:text-pink-300 flex items-center gap-1 cursor-pointer bg-transparent border-none text-white p-0"
                  >
                    Alterar Foto <Camera size={10} />
                  </button>
                  <button 
                    type="button"
                    onClick={handleRemoveProfilePhoto}
                    title="Remover Foto"
                    className="text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ) : (
                /* SEM FOTO: Menu visible by default, semi-transparent */
                <div 
                  onClick={() => userAvatarInputRef.current?.click()}
                  className="absolute bottom-2.5 left-2.5 right-2.5 h-8 bg-black/40 backdrop-blur-xs border border-white/10 rounded-full flex items-center justify-between px-3 text-white cursor-pointer select-none font-sans hover:bg-black/55 active:scale-[0.98] transition-all z-20"
                >
                  <span className="text-[9.5px] font-black uppercase tracking-wide flex items-center gap-1.5">📷 Adicionar Foto</span>
                </div>
              )
            )}
          </div>

          {/* Hidden file input for Profile avatar upload */}
          <input 
            type="file"
            ref={userAvatarInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleProfileImageUpload}
          />
        </div>

        {/* Profile Details Container Below Photo */}
        <div className={`border rounded p-4 text-center transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} space-y-3.5`}>
          {profile.theme === 'gotico-retro' ? (
            <div className="flex flex-col items-center">
              <div 
                className="relative mx-auto w-full flex flex-col items-center justify-center select-none"
                style={{
                  backgroundImage: "url('/assets/themes/plaqueta-gotica.webp')",
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  minHeight: '118px',
                  padding: '26px 20px 20px 20px',
                  marginTop: '-10px',
                }}
              >
                {isOwnProfile && (
                  <button 
                    onClick={() => setShowIdentityWizard(true)} 
                    title="Configurar Identidade"
                    className="absolute top-2 right-4 p-1 text-[#2c1303] hover:text-[#4d2105] cursor-pointer shrink-0 transition-transform active:scale-95 z-20"
                  >
                    <Palette size={12} />
                  </button>
                )}
                <h2 
                  className={`font-black flex items-center justify-center gap-1 break-all tracking-wide text-[#100703] ${displayNameClass}`}
                  style={{
                    fontSize: '12px',
                    lineHeight: '18px',
                    textShadow: '0 0 4px rgba(255, 63, 44, 0.15)',
                  }}
                >
                  {displayNameText}
                </h2>
                {profile.username && (
                  <span 
                    className="block font-sans font-bold text-[#220d04] tracking-normal mt-0.5"
                    style={{
                      fontSize: '8px',
                    }}
                  >
                    @{profile.username}
                  </span>
                )}
              </div>
              
              <p className="text-[12px] md:text-[13px] font-medium font-sans flex items-center justify-center gap-1.5 mt-2.5 tracking-wider uppercase text-[#ad2fff]">
                <MapPin size={14} className="text-[#ad2fff] shrink-0" />
                {profile.location}
              </p>
            </div>
          ) : (
            <div className="py-1">
            <h2 className={`profile-name text-base md:text-lg font-bold flex items-center justify-center gap-1.5 break-all tracking-wide ${
              profile.theme === 'gotico-retro' 
                ? 'text-[#aaa857]' 
                : profile.theme === 'emo-2008'
                  ? 'text-[#f6339a] [text-shadow:1px_1px_2px_rgba(0,0,0,0.8)]'
                  : profile.theme === 'cyberdeck'
                    ? 'text-[#55ff94]'
                    : 'text-neutral-800'
            } ${displayNameClass}`}>
              {displayNameText}
              {isOwnProfile && (
                <button 
                  onClick={() => setShowIdentityWizard(true)} 
                  title="Configurar Identidade"
                  className="p-1 text-pink-500 hover:text-pink-600 cursor-pointer shrink-0 transition-transform active:scale-95"
                >
                  <Palette size={14} />
                </button>
              )}
            </h2>
            {profile.username && (
              <span className="profile-nickname inline-block text-xs font-mono font-bold text-[#c4d1db] bg-[#0f0f1d] px-1.5 py-0.5 rounded border border-[#c4d1db]/20 shadow-sm mt-1.5 tracking-normal">
                @{profile.username}
              </span>
            )}
            
            <p className={`text-[12px] md:text-[13px] font-medium font-sans flex items-center justify-center gap-1.5 mt-2.5 tracking-wider uppercase ${
              profile.theme === 'emo-2008' 
                ? 'text-[#be2efd]' 
                : profile.theme === 'gotico-retro'
                  ? 'text-[#ad2fff]'
                  : 'text-neutral-700'
            }`}>
              <MapPin size={14} className={
                profile.theme === 'emo-2008' 
                  ? 'text-[#be2efd] shrink-0' 
                  : profile.theme === 'gotico-retro'
                    ? 'text-[#ad2fff] shrink-0'
                    : 'text-pink-600 shrink-0'
              } />
              {profile.location}
            </p>
          </div>
          )}

          <div className="border-t border-dashed border-neutral-350 pt-3.5 text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 opacity-70">Criptografia Local</span>
            <div className="flex items-center gap-1.5 p-1 px-2 bg-green-500/10 border border-green-500/40 rounded text-[10px] text-green-700 font-semibold font-mono">
              <ShieldCheck size={14} className="text-green-650 flex-shrink-0" />
              Chave RSA Ativa
            </div>
            <div className="flex items-center gap-1.5 p-1 px-2 mt-1.5 bg-blue-500/15 border border-blue-500/30 rounded text-[9px] text-[#1d4ed8] font-semibold font-mono">
              🛡️ Protegido contra Exploit Antigo
            </div>
          </div>

          {isOwnProfile && (
            <div className="border-t border-dashed border-neutral-350 pt-3 text-center">
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-2 font-sans tracking-wider">
                Gerenciar Imagens
              </div>
              <GlossyRetroButton
                id="sidebar-btn-photos-owner"
                onClick={() => {
                  playShutterSound();
                  onNavigateToTab('photos', false, true); // Owner Mode with auto photo upload panel trigger
                }}
                variant="action"
                className="w-full h-11 text-[#1a011a]"
              >
                Add Fotos
              </GlossyRetroButton>
            </div>
          )}

          <div className="border-t border-dashed border-neutral-350 pt-3 text-center">
            <div className="text-[10px] uppercase font-bold text-neutral-500 mb-2 font-sans tracking-wider">
              Conversa Secreta (48h)
            </div>
            <GlossyRetroButton
              id="sidebar-btn-secret-messages"
              onClick={() => {
                playShutterSound();
                if (onOpenSecretChat) {
                   // Connects to active friend if viewing a friend's page, or defaults to lucas
                  onOpenSecretChat(profile.id === 'me' ? 'lucas' : profile.id);
                }
              }}
              variant="action"
              className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-[#1a011a]"
            >
              💬 Mensagem
            </GlossyRetroButton>
          </div>

          {/* Friend System Button Section (Shown when visiting another profile) */}
          {!isOwnProfile && (
            <div className="border-t border-dashed border-neutral-350 pt-3 text-center">
              <div className="text-[10px] uppercase font-bold text-neutral-500 mb-2 font-sans tracking-wider">
                Rede de Amigos
              </div>
              {isFriends ? (
                <div className="relative">
                  <GlossyRetroButton
                    id="sidebar-btn-friends"
                    onClick={() => setIsFriendDropdownOpen(!isFriendDropdownOpen)}
                    variant="action"
                    className="w-full h-11 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 hover:border-neutral-400 text-neutral-800 font-sans font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    ✓ Amigos ▼
                  </GlossyRetroButton>
                  
                  {isFriendDropdownOpen && (
                    <div className="absolute top-12 left-0 w-full bg-white border border-neutral-350 rounded shadow-md z-30 py-1 text-left font-sans text-xs">
                      <div className="px-3 py-1 font-bold text-neutral-400 select-none uppercase text-[9px] tracking-wider">
                        Opções de Amizade
                      </div>
                      <div className="border-t border-neutral-200 my-1"></div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsFriendDropdownOpen(false);
                          setShowRemoveConfirm(true);
                        }}
                        className="w-full text-left px-3 py-2 text-red-650 hover:bg-red-50 hover:text-red-750 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        ❌ Remover Amizade
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <GlossyRetroButton
                  id="sidebar-btn-add-friend"
                  onClick={handleAddFriendClick}
                  disabled={isPendingLocal || !!pendingRequest}
                  variant="action"
                  className={`w-full h-11 text-white font-sans ${
                    isPendingLocal || !!pendingRequest 
                    ? 'bg-neutral-400 border-neutral-300 cursor-not-allowed opacity-80' 
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 text-white'
                  }`}
                >
                  {isPendingLocal || !!pendingRequest ? '⏳ Pendente' : '➕ Amigo'}
                </GlossyRetroButton>
              )}
            </div>
          )}

        </div>

        {/* Nostalgic Sidebar Component */}
        <SocialSidebar
          currentTab={currentTab}
          setCurrentTab={onNavigateToTab}
          friends={friends}
          communities={communities}
          onNavigateToFriend={onNavigateToFriend}
          themeStyles={themeStyles}
          friendRequests={friendRequests}
          loggedInUserId={loggedInUserId}
          onAcceptFriendRequest={onAcceptFriendRequest}
          onRejectFriendRequest={onRejectFriendRequest}
          profiles={profiles}
          theme={profile.theme || 'default'}
        />

        {/* Digital Signature Card */}
        <div className="bg-neutral-900 text-neutral-300 p-3 rounded font-mono text-[9px] shadow-sm leading-relaxed border border-neutral-800">
          <div className="flex items-center gap-1 text-[#f59e0b] font-bold uppercase tracking-wider mb-2 text-[10px]">
            <KeyRound size={12} />
            Identidade Digital
          </div>
          <div className="space-y-1 text-left select-all">
            <div><span className="text-neutral-500">PROT:</span> END-TO-END-ORCRYPT</div>
            <div><span className="text-neutral-500">SHA-256 FINGERPRINT:</span></div>
            <div className="bg-black/40 text-green-400 p-1 rounded font-semibold text-[8px] truncate">
              {userPublicKey}
            </div>
            <div><span className="text-neutral-500">STATUS:</span> SIGNATURE_VERIFIED</div>
          </div>
        </div>
      </div>

      {/* 2. Center Column: Profile Stats and Editable Fields */}
      <div className="lg:col-span-6 flex flex-col gap-4">
        {/* Dynamic Name Header Box */}
        <div className={`border rounded p-4 transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} text-left`}>
          {/* Row 1: Name + Sparkles (Left) & Edit/Save Button (Right) */}
          <div className="flex justify-between items-center mb-1">
            <h1 className={`text-2xl font-bold flex items-center gap-2 break-all ${displayNameClass}`}>
              {displayNameText}
              <Sparkles className="text-pink-500 shrink-0" size={18} />
            </h1>
            
            {isOwnProfile && (
              <button
                id="btn-edit-profile"
                onClick={() => {
                  if (isEditing) handleSave();
                  else setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 focus:outline-none focus:ring-0 active:scale-97 opacity-80 hover:opacity-100 transition-all cursor-pointer group"
              >
                {isEditing ? (
                  <>
                    <div className="relative flex items-center pr-1.5">
                      <Cog className="text-emerald-500 animate-[spin_10s_linear_infinite]" size={16} />
                      <Settings className="text-emerald-500 absolute -right-1 -top-1 animate-[spin_6s_linear_infinite_reverse]" size={10} />
                    </div>
                    <span className="bg-[#107e45] hover:bg-[#0b5c32] text-white font-mono text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-[1.5px_1.5px_3px_rgba(0,0,0,0.3)] border border-emerald-700/50 flex items-center">
                      SALVAR
                    </span>
                  </>
                ) : (
                  <>
                    <div className="relative flex items-center pr-1.5">
                      <Cog className="text-[#5a6b7c] group-hover:text-[#455463] transition-colors animate-[spin_16s_linear_infinite]" size={16} />
                      <Settings className="text-[#5a6b7c] absolute -right-1 -top-1 group-hover:text-[#455463] transition-colors animate-[spin_10s_linear_infinite_reverse]" size={10} />
                    </div>
                    <span className="bg-[#5b6c73] hover:bg-[#4a5a60] text-white font-sans text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-[1.5px_1.5px_3px_rgba(0,0,0,0.3)] border border-[#48565c] flex items-center">
                      EDITAR
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Row 2: @Username (Left) & orkay.net/username link (Right/Inline next to it) */}
          {profile.username && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-6 text-xs md:text-sm font-sans">
              <span className={`font-black ${
                profile.theme === 'gotico-retro' ? 'text-[#b08d57]' : 'text-[#7e7ea0]'
              }`}>
                @{profile.username}
              </span>
              <a 
                href={`https://orkay.net/${profile.username}`} 
                onClick={(e) => e.preventDefault()} 
                className={`${
                  profile.theme === 'gotico-retro' 
                    ? 'text-[#ad2fff] dark:text-[#ad2fff] hover:text-[#c466ff]' 
                    : profile.theme === 'minimal-oldweb'
                    ? 'text-[#000080] dark:text-[#000080] hover:text-[#0000ee]'
                    : 'text-[#0000a0] dark:text-sky-300 hover:text-[#1d4ed8]'
                } font-bold underline transition-colors select-all`}
              >
                orkay.net/{profile.username}
              </a>
            </div>
          )}

          {/* Row 3: Online status badge (Left) & Informações button/status (Right) on top of dashed line */}
          <div className={`flex justify-between items-center border-b border-dashed pb-3 mb-4 ${
            profile.theme === 'emo-2008' ? 'border-[#ff00af]' : 'border-neutral-350'
          }`}>
            <PresenceStatus
              profileId={profile.id}
              isOwnProfile={isOwnProfile}
              profileName={displayNameText}
            />

            {/* Status personalizado secundário (ou Botão Informações para Proprietário/Outros) */}
            {(() => {
              const rawStatus = profile.statusOnline || '';
              const cleanStatus = rawStatus.replace(/^●\s*/, '').trim();
              
              // If not own profile and no status expression, hide section
              if (!isOwnProfile && (!cleanStatus || cleanStatus === 'offline')) return null;

              let statusIcon = '✏️';
              const lowercaseStatus = cleanStatus.toLowerCase();
              if (lowercaseStatus.includes('ouvindo') || lowercaseStatus.includes('linkin') || lowercaseStatus.includes('música') || lowercaseStatus.includes('music')) {
                statusIcon = '🎵';
              } else if (lowercaseStatus.includes('programando') || lowercaseStatus.includes('rust') || lowercaseStatus.includes('código') || lowercaseStatus.includes('audit')) {
                statusIcon = '💻';
              } else if (lowercaseStatus.includes('café') || lowercaseStatus.includes('comendo') || lowercaseStatus.includes('donuts') || lowercaseStatus.includes('comer') || lowercaseStatus.includes('assembléia') || lowercaseStatus.includes('paraná')) {
                statusIcon = '☕';
              } else if (lowercaseStatus.includes('viajando') || lowercaseStatus.includes('viagem') || lowercaseStatus.includes('destino')) {
                statusIcon = '🏔️';
              } else if (lowercaseStatus.includes('hack') || lowercaseStatus.includes('pentest') || lowercaseStatus.includes('vulnerabilidade')) {
                statusIcon = '🕵️‍♂️';
              }

              return (
                <div 
                  onClick={() => { if (isOwnProfile) setIsEditing(true); }}
                  className={`${isOwnProfile ? 'cursor-pointer' : ''} flex items-center transition-all`}
                >
                  {isOwnProfile ? (
                    <div className="flex items-center gap-1.5 font-sans group">
                      <div className="relative flex items-center pr-0.5">
                        <Cog className="text-[#5a6b7c] group-hover:text-[#455463] group-hover:rotate-45 transition-all duration-300" size={17} />
                      </div>
                      <span className="bg-[#b9ceda] hover:bg-[#a1b9c9] text-[#1e293b] font-sans text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded border border-[#8ea9ba] shadow-[1.5px_1.5px_3px_rgba(0,0,0,0.15)] flex items-center transition-colors">
                        INFORMAÇÕES
                      </span>
                    </div>
                  ) : (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs border font-mono shadow-[0_1px_3.5px_rgba(0,0,0,0.06)] ${
                      profile.theme === 'gotico-retro'
                        ? 'bg-[#3e2142] border-[#b08d57]/30 text-[#b08d57]'
                        : `${themeStyles.badgeBg} ${themeStyles.badgeText}`
                    }`}>
                      <span className="text-[10px] opacity-85 font-bold">{statusIcon}</span>
                      <span className="font-medium tracking-wide">
                        {cleanStatus}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Retro Orkut Badges Ratings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-1 mb-3 font-sans select-none">
            {profile.theme === 'gotico-retro' ? (
              <div className="relative pt-6 pb-2 text-center flex flex-col items-center justify-between group select-none min-h-[125px]">
                {/* The Cross at the top */}
                <div className="absolute top-0 flex justify-center items-center h-6 w-full">
                  <div className="relative w-1.5 h-6 bg-[#8a7f96] flex justify-center items-center shadow-xs rounded-sm">
                    <div className="absolute top-1.5 w-4.5 h-1.5 bg-[#8a7f96] rounded-sm" />
                  </div>
                </div>
                
                {/* Body of the Tombstone */}
                <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-[#1b0d1e] to-[#2d1533] border-2 border-[#b08d57]/50 w-full rounded-t-[48px] pt-4 pb-2 px-1 text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)] min-h-[90px] z-10 hover:border-[#ff00a0]/80 transition-all duration-300">
                  <span className="text-[10px] text-[#b08d57] font-black uppercase mb-1.5 tracking-wider font-mono">
                    Confiável
                  </span>
                  <div id="meter-trusty" className="flex gap-1.5 py-0.5 justify-center items-center">
                    {renderSmileys(profile.trusty)}
                  </div>
                </div>
                
                {/* Tombstone Base Plate */}
                <div className="w-[106%] h-2.5 bg-[#170919] border border-[#b08d57]/30 rounded-full shadow-md z-20 -mt-1" />
              </div>
            ) : (
              <div className={`border rounded p-2 text-center flex flex-col items-center justify-center transition-all ${
                profile.theme === 'cyberdeck'
                  ? 'bg-transparent border-[#06b6d4]/30'
                  : profile.theme === 'emo-2008'
                    ? 'bg-[#0f0f11] border-neutral-200/40'
                    : 'bg-neutral-100/40 border-neutral-200/40'
              } ${profile.theme === 'rock-underground' ? 'rock-status-transparent' : ''} ${!isOwnProfile && profile.theme !== 'cyberdeck' ? 'hover:bg-[#fefce8]/40 hover:border-amber-200' : ''}`}>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase mb-1 flex items-center gap-1">
                  Confiável {!isOwnProfile && <span className="text-[9px] text-[#406a94] normal-case font-normal">(votar)</span>}
                </span>
                <div id="meter-trusty" className="flex gap-1.5 py-0.5">
                  {renderSmileys(profile.trusty)}
                </div>
              </div>
            )}

            {/* Legal Card */}
            {profile.theme === 'gotico-retro' ? (
              <div className="relative pt-6 pb-2 text-center flex flex-col items-center justify-between group select-none min-h-[125px]">
                {/* The Cross at the top */}
                <div className="absolute top-0 flex justify-center items-center h-6 w-full">
                  <div className="relative w-1.5 h-6 bg-[#8a7f96] flex justify-center items-center shadow-xs rounded-sm">
                    <div className="absolute top-1.5 w-4.5 h-1.5 bg-[#8a7f96] rounded-sm" />
                  </div>
                </div>
                
                {/* Body of the Tombstone */}
                <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-[#1b0d1e] to-[#2d1533] border-2 border-[#b08d57]/50 w-full rounded-t-[48px] pt-4 pb-2 px-1 text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)] min-h-[90px] z-10 hover:border-[#ff00a0]/80 transition-all duration-300">
                  <span className="text-[10px] text-[#b08d57] font-black uppercase mb-1.5 tracking-wider font-mono">
                    Legal
                  </span>
                  <div id="meter-cool" className="flex gap-1.5 py-0.5 justify-center items-center">
                    {renderIceCubes(profile.cool)}
                  </div>
                </div>
                
                {/* Tombstone Base Plate */}
                <div className="w-[106%] h-2.5 bg-[#170919] border border-[#b08d57]/30 rounded-full shadow-md z-20 -mt-1" />
              </div>
            ) : (
              <div className={`border rounded p-2 text-center flex flex-col items-center justify-center transition-all ${
                profile.theme === 'cyberdeck'
                  ? 'bg-transparent border-[#06b6d4]/30'
                  : profile.theme === 'emo-2008'
                    ? 'bg-[#0f0f11] border-neutral-200/40'
                    : 'bg-neutral-100/40 border-neutral-200/40'
              } ${profile.theme === 'rock-underground' ? 'rock-status-transparent' : ''} ${!isOwnProfile && profile.theme !== 'cyberdeck' ? 'hover:bg-[#f0f9ff]/40 hover:border-sky-200' : ''}`}>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase mb-1 flex items-center gap-1">
                  Legal {!isOwnProfile && <span className="text-[9px] text-[#406a94] normal-case font-normal">(votar)</span>}
                </span>
                <div id="meter-cool" className="flex gap-1.5 py-0.5">
                  {renderIceCubes(profile.cool)}
                </div>
              </div>
            )}

            {/* Sexy Card */}
            {profile.theme === 'gotico-retro' ? (
              <div className="relative pt-6 pb-2 text-center flex flex-col items-center justify-between group select-none min-h-[125px]">
                {/* The Cross at the top */}
                <div className="absolute top-0 flex justify-center items-center h-6 w-full">
                  <div className="relative w-1.5 h-6 bg-[#8a7f96] flex justify-center items-center shadow-xs rounded-sm">
                    <div className="absolute top-1.5 w-4.5 h-1.5 bg-[#8a7f96] rounded-sm" />
                  </div>
                </div>
                
                {/* Body of the Tombstone */}
                <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-[#1b0d1e] to-[#2d1533] border-2 border-[#b08d57]/50 w-full rounded-t-[48px] pt-4 pb-2 px-1 text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)] min-h-[90px] z-10 hover:border-[#ff00a0]/80 transition-all duration-300">
                  <span className="text-[10px] text-[#b08d57] font-black uppercase mb-1.5 tracking-wider font-mono">
                    Sexy
                  </span>
                  <div id="meter-sexy" className="flex gap-1.5 py-0.5 justify-center items-center">
                    {renderHearts(profile.sexy)}
                  </div>
                </div>
                
                {/* Tombstone Base Plate */}
                <div className="w-[106%] h-2.5 bg-[#170919] border border-[#b08d57]/30 rounded-full shadow-md z-20 -mt-1" />
              </div>
            ) : (
              <div className={`border rounded p-2 text-center flex flex-col items-center justify-center transition-all ${
                profile.theme === 'cyberdeck'
                  ? 'bg-transparent border-[#06b6d4]/30'
                  : profile.theme === 'emo-2008'
                    ? 'bg-[#0f0f11] border-neutral-200/40'
                    : 'bg-neutral-100/40 border-neutral-200/40'
              } ${profile.theme === 'rock-underground' ? 'rock-status-transparent' : ''} ${!isOwnProfile && profile.theme !== 'cyberdeck' ? 'hover:bg-[#fff1f2]/40 hover:border-rose-200' : ''}`}>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase mb-1 flex items-center gap-1">
                  Sexy {!isOwnProfile && <span className="text-[9px] text-[#406a94] normal-case font-normal">(votar)</span>}
                </span>
                <div id="meter-sexy" className="flex gap-1.5 py-0.5">
                  {renderHearts(profile.sexy)}
                </div>
              </div>
            )}

            {/* Fans Card */}
            {profile.theme === 'gotico-retro' ? (
              <button
                id="meter-fans"
                disabled={isOwnProfile}
                onClick={() => {
                  if (!isOwnProfile && onRateProfile) {
                    playRatingSound('fans');
                    const delta = isFanOfThisUser ? -1 : 1;
                    const updated = {
                      ...fannedProfiles,
                      [profile.id]: !isFanOfThisUser
                    };
                    setFannedProfiles(updated);
                    try {
                      localStorage.setItem('fanned_profiles', JSON.stringify(updated));
                    } catch (e) {}
                    onRateProfile(profile.id, 'fans', delta);
                  }
                }}
                className={`group relative pt-6 pb-2 text-center flex flex-col items-center justify-between w-full focus:outline-none select-none min-h-[125px] ${isOwnProfile ? '' : 'cursor-pointer active:scale-95 transition-all duration-150'}`}
                title={!isOwnProfile ? (isFanOfThisUser ? 'Você é fã! Clique para deixar de ser' : 'Tornar-se fã deste membro') : `Fãs: ${profile.fans}`}
              >
                {/* The Cross at the top */}
                <div className="absolute top-0 flex justify-center items-center h-6 w-full">
                  <div className="relative w-1.5 h-6 bg-[#8a7f96] flex justify-center items-center shadow-xs rounded-sm">
                    <div className="absolute top-1.5 w-4.5 h-1.5 bg-[#8a7f96] rounded-sm" />
                  </div>
                </div>
                
                {/* Body of the Tombstone */}
                <div className={`relative flex flex-col items-center justify-center w-full rounded-t-[48px] pt-4 pb-2 px-1 text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)] min-h-[90px] z-10 border-2 transition-all duration-300 ${isFanOfThisUser ? 'bg-gradient-to-b from-[#2d1f0d] to-[#422d15] border-amber-500' : 'bg-gradient-to-b from-[#1b0d1e] to-[#2d1533] border-[#b08d57]/50 hover:border-[#ff00a0]/80'}`}>
                  <span className="text-[10px] text-[#b08d57] font-black uppercase mb-1.5 tracking-wider font-mono flex flex-col items-center gap-0.5 leading-none">
                    <span>Fãs</span>
                    {!isOwnProfile && (
                      <span className="text-[7.5px] text-[#ff00a0] font-normal normal-case">
                        {isFanOfThisUser ? '★ Já é fã!' : '(ser fã)'}
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1 items-center justify-center text-[#d97706] font-bold text-xs">
                    <Star 
                      size={14} 
                      fill={isFanOfThisUser || isOwnProfile ? "#fbbf24" : "none"} 
                      className={`${isFanOfThisUser || isOwnProfile ? 'text-[#f59e0b]' : 'text-[#8a7f96]'} transition-all`} 
                    />
                    <span className="ml-0.5 font-mono text-[#b08d57] text-[11px]">{profile.fans}</span>
                  </div>
                </div>
                
                {/* Tombstone Base Plate */}
                <div className="w-[106%] h-2.5 bg-[#170919] border border-[#b08d57]/30 rounded-full shadow-md z-20 -mt-1" />
              </button>
            ) : (
              <button
                id="meter-fans"
                disabled={isOwnProfile}
                onClick={() => {
                  if (!isOwnProfile && onRateProfile) {
                    playRatingSound('fans');
                    const delta = isFanOfThisUser ? -1 : 1;
                    const updated = {
                      ...fannedProfiles,
                      [profile.id]: !isFanOfThisUser
                    };
                    setFannedProfiles(updated);
                    try {
                      localStorage.setItem('fanned_profiles', JSON.stringify(updated));
                    } catch (e) {}
                    onRateProfile(profile.id, 'fans', delta);
                  }
                }}
                className={`border rounded p-2 text-center flex flex-col items-center justify-center w-full focus:outline-none transition-all ${
                  profile.theme === 'cyberdeck'
                    ? 'bg-transparent border-[#06b6d4]/30'
                    : profile.theme === 'emo-2008'
                      ? 'bg-[#0f0f11] border-neutral-200/40'
                      : isOwnProfile 
                        ? 'bg-neutral-100/40 border-neutral-200/40' 
                        : `cursor-pointer hover:scale-[1.02] shadow-xs ${
                            isFanOfThisUser 
                              ? 'bg-amber-50/70 border-amber-300 text-amber-800 font-extrabold shadow-[0_1px_6px_rgba(251,191,36,0.15)]' 
                              : 'bg-neutral-100/40 border-neutral-200/40 hover:bg-amber-50/20 hover:border-amber-250 text-neutral-600'
                          }`
                }`}
                title={!isOwnProfile ? (isFanOfThisUser ? 'Você é fã! Clique para deixar de ser' : 'Tornar-se fã deste membro') : `Fãs: ${profile.fans}`}
              >
                <span className="text-[10px] text-neutral-500 font-semibold uppercase mb-1 flex items-center gap-1">
                  Fãs {!isOwnProfile && <span className="text-[9px] text-[#d97706] normal-case font-normal">{isFanOfThisUser ? '★ Já é fã!' : '(clique p/ ser fã)'}</span>}
                </span>
                <div className="flex gap-1 items-center justify-center text-[#d97706] font-bold text-sm">
                  <Star 
                    size={16} 
                    fill={isFanOfThisUser || isOwnProfile ? "#fbbf24" : "none"} 
                    className={`${isFanOfThisUser || isOwnProfile ? 'text-[#f59e0b]' : 'text-neutral-300'} transition-all hover:scale-110`} 
                  />
                  <span className={`ml-1 text-[11px] font-sans ${profile.theme === 'cyberdeck' ? 'text-[#06b6d4]' : 'text-amber-800'}`}>{profile.fans} fãs</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Foto do Momento (Photo of the Week) */}
        {(() => {
          // Find featured photo
          let featuredPhoto: Photo | undefined;
          let parentAlbumId = '';
          const profileAlbums = albums.filter(a => a.profileId === profile.id);
          
          if (featuredPhotoId) {
            for (const alb of profileAlbums) {
              const ph = alb.photos.find(p => p.id === featuredPhotoId);
              if (ph) {
                featuredPhoto = ph;
                parentAlbumId = alb.id;
                break;
              }
            }
          }
          
          // Fallback to first photo in first album if none explicitly set
          if (!featuredPhoto && profileAlbums.length > 0 && profileAlbums[0].photos.length > 0) {
            featuredPhoto = profileAlbums[0].photos[0];
            parentAlbumId = profileAlbums[0].id;
          }

          if (!featuredPhoto) return null;

          return (
            <div 
              onClick={() => {
                playShutterSound();
                onNavigateToTab('photos');
              }}
              className={`relative border rounded shadow-xs text-left cursor-pointer transition-all overflow-hidden flex flex-col ${themeStyles.cardBg} ${themeStyles.borderClass} ${themeStyles.glow} ${themeStyles.font}`}
              style={(profile.theme === 'default' || !profile.theme) ? { borderColor: '#ededed' } : undefined}
            >
              {/* Header: Foto do Momento */}
              <div className={`px-4 py-3 flex items-center justify-between border-b ${themeStyles.accent} select-none`}>
                <h3 className={`text-[13px] font-bold ${themeStyles.text} font-sans flex items-center gap-1.5 m-0 leading-none`}>
                  📸 Foto do Momento
                </h3>
                <span className="px-2 py-0.5 bg-[#ffdf85] border border-[#f3c853] text-[#704f05] font-extrabold text-[9px] rounded uppercase tracking-wider">
                  📌 DESTAQUE DA SEMANA
                </span>
              </div>

              {/* Main Stack Content */}
              <div className="p-5 flex flex-col gap-4 bg-transparent">
                
                {/* 1. FOTO: Aumentar tamanho, dominando visualmente o card */}
                <div 
                  className={`w-full flex justify-center p-3 rounded border relative ${
                    profile.theme === 'cyberdeck' 
                      ? 'bg-[#060b04] border-[#1e2a14]/60' 
                      : profile.theme === 'gotico-retro'
                        ? 'bg-[#150307]/50 border-[#b08d57]/30'
                        : profile.theme === 'minimal-oldweb'
                          ? 'bg-[#d5d0c9] border-black'
                          : 'bg-neutral-100/50 border-neutral-150'
                  }`}
                >
                  <div className="relative max-w-full md:max-w-md w-full aspect-square md:aspect-[4/3] bg-neutral-900 rounded-xs overflow-hidden border border-neutral-250 shadow-sm">
                    <img 
                      src={featuredPhoto.url} 
                      alt="Foto do Momento" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    {featuredPhoto.gifUrl && (
                      <span className="absolute bottom-1.5 right-1.5 bg-pink-600 text-white font-mono text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider select-none">
                        GIF ATIVO
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. LEGENDA: Texto limpo, sem caixa pesada, alinhamento simples */}
                <div className="text-center sm:text-left mt-0.5 px-1">
                  <p className="text-xs font-sans text-neutral-700 italic leading-relaxed">
                    “{featuredPhoto.caption}”
                  </p>
                </div>

                {/* 3. MÚSICA: Linha discreta */}
                {featuredPhoto.song && (
                  <div className="flex items-center gap-1.5 px-1 text-xs text-neutral-500 font-sans select-none">
                    <span>🎵</span>
                    <span>Ouvindo: <span className="font-semibold text-neutral-700">{featuredPhoto.song}</span></span>
                  </div>
                )}

                {/* 4. INTERAÇÕES & COMENTÁRIOS */}
                <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                  <SocialActions
                    itemId={featuredPhoto.id}
                    itemType={featuredPhoto.gifUrl ? 'post' : 'photo'}
                    itemTitle={featuredPhoto.gifUrl ? `GIF Animado: "${featuredPhoto.caption}"` : `Foto do Momento: "${featuredPhoto.caption}"`}
                    initialLikes={featuredPhoto.likes}
                    initialLikedByMe={featuredPhoto.likedByMe}
                    onLikeUpdate={(liked, count) => {
                      if (featuredPhoto) {
                        featuredPhoto.likes = count;
                        featuredPhoto.likedByMe = liked;
                      }
                    }}
                    onShareToFeed={onShareToFeed}
                    layout="retro-feed"
                    theme={profile.theme}
                    onCommentClick={() => {
                      playShutterSound();
                      onNavigateToTab('photos');
                    }}
                    commentCount={featuredPhoto.comments.length}
                  />
                </div>

                {/* 5. DATA */}
                <div className="text-[10px] text-neutral-400 font-sans px-1 select-none">
                  <span>📅 Postado em {featuredPhoto.date}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Profile Detail Fields */}
        <div className={`border rounded p-4 transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} text-left`}>
          <h3 className="text-sm font-bold font-sans border-b pb-1 mb-3">Informações de Perfil</h3>

          <div className="space-y-3 font-sans text-xs">
            {isEditing ? (
              <div className="space-y-3">
                {/* 📌 SEÇÃO DE IDENTIDADE VISUAL RETRÔ DO PERFIL */}
                <div className={`p-3 rounded-lg space-y-3.5 mb-2 border ${
                  profile.theme === 'gotico-retro'
                    ? 'border-[#b08d57]/30 bg-black/40'
                    : 'border-indigo-200 bg-indigo-50/50'
                }`}>
                  <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider border-b pb-1.5 ${
                    profile.theme === 'gotico-retro'
                      ? 'text-[#b08d57] border-[#b08d57]/30'
                      : 'text-indigo-800 border-indigo-100'
                  }`}>
                    <Sparkles size={13} className={profile.theme === 'gotico-retro' ? "text-[#b08d57]" : "text-pink-500"} />
                    Estilo e Identidade Visual Retrô do Nome
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-input-display-name" className={`block text-[11px] font-bold uppercase mb-1 ${
                        profile.theme === 'gotico-retro' ? 'text-zinc-300' : 'text-neutral-600'
                      }`}>
                        Nome de Exibição (Display Name):
                      </label>
                      <input
                        id="edit-input-display-name"
                        type="text"
                        value={editForm.nome_exibicao}
                        placeholder="Ex: Paulo Dark, Emo Gothic, Sombra"
                        maxLength={45}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          setEditForm({ ...editForm, nome_exibicao: sanitized, name: sanitized });
                        }}
                        className={`w-full px-2.5 py-1.5 border rounded font-sans text-xs focus:ring-1 focus:outline-none ${
                          profile.theme === 'gotico-retro'
                            ? 'border-zinc-700 bg-black text-[#c0c0c0] placeholder:text-zinc-650 focus:ring-zinc-500'
                            : 'border-indigo-200 bg-white text-neutral-800 focus:ring-indigo-400 placeholder:text-neutral-400'
                        }`}
                      />
                      <span className="text-[10px] text-neutral-400 mt-1 block leading-tight">
                        Tratado como texto puro (XSS-safe). Caracteres perigosos (<span className="font-mono text-[9px]">&lt;&gt;</span>) são filtrados automaticamente. Máx. 45 caracteres.
                      </span>
                    </div>

                    <div>
                      <span className={`block text-[11px] font-bold uppercase mb-2 ${
                        profile.theme === 'gotico-retro' ? 'text-zinc-300' : 'text-neutral-600'
                      }`}>
                        Estilo da Fonte do Nome:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: 'normal', label: 'Normal' },
                          { key: 'gothic', label: 'Gótico' },
                          { key: 'medieval', label: 'Medieval' },
                          { key: 'cursivo', label: 'Cursivo' },
                          { key: 'cyber', label: 'Cyber' },
                          { key: 'vaporwave', label: 'Vaporwave' },
                          { key: 'smallcaps', label: 'Pequenas Capitais' },
                        ].map((fontStyle) => (
                          <label
                            key={fontStyle.key}
                            className={`flex items-center gap-2 p-1.5 px-2.5 rounded border cursor-pointer select-none transition-all text-[11px] ${
                              profile.theme === 'gotico-retro'
                                ? (editForm.estilo_fonte === fontStyle.key
                                  ? 'border-[#0df0ff] bg-[#24252a] text-white font-bold shadow-[0_0_8px_rgba(13,240,255,0.6)]'
                                  : 'border-zinc-700 bg-[#24252a] text-zinc-300 hover:border-zinc-400 hover:bg-[#2c2d33]')
                                : (editForm.estilo_fonte === fontStyle.key
                                  ? 'border-[#d946ef] bg-[#d946ef]/5 font-bold text-[#d946ef]'
                                  : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-600')
                            }`}
                          >
                            <input
                              type="radio"
                              name="estilo_fonte"
                              checked={editForm.estilo_fonte === fontStyle.key}
                              onChange={() => setEditForm({ ...editForm, estilo_fonte: fontStyle.key })}
                              className="accent-[#d946ef] sr-only"
                            />
                            <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center shrink-0 ${
                              profile.theme === 'gotico-retro' ? 'border-zinc-650' : 'border-neutral-300'
                            }`}>
                              {editForm.estilo_fonte === fontStyle.key && (
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  profile.theme === 'gotico-retro' ? 'bg-[#0df0ff]' : 'bg-[#d946ef]'
                                }`} />
                              )}
                            </span>
                            <span className="truncate">{fontStyle.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Nome:</label>
                    <input
                      id="edit-input-name"
                      type="text"
                      value={editForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm({ ...editForm, name: val, nome_exibicao: val });
                      }}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Username:</label>
                    <input
                      id="edit-input-username"
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value.replace(/\s+/g, '').toLowerCase() })}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">✏️ Status Personalizado (Nostálgico):</label>
                    <input
                      id="edit-input-status-custom"
                      type="text"
                      value={editForm.statusOnline}
                      onChange={(e) => setEditForm({ ...editForm, statusOnline: e.target.value })}
                      placeholder="Ex: ouvindo Linkin Park de madrugada..."
                      className="w-full px-2.5 py-1.5 border border-pink-350/65 rounded font-sans focus:outline-none focus:ring-1 focus:ring-pink-500 text-xs bg-white text-neutral-800"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        '● ouvindo Linkin Park 🎸',
                        '● programando em Rust 🦀',
                        '● perdido no cyber café 🖥️',
                        '● viajando sem destino 🏔️'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, statusOnline: preset })}
                          className="px-2 py-0.5 bg-neutral-100 hover:bg-[#fae8ff] border border-neutral-350 rounded text-[9px] cursor-pointer text-neutral-600 font-mono transition-all"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 font-mono">Tema Cyber/Nostálgico do Perfil:</label>
                  <select
                    id="edit-select-theme"
                    value={editForm.theme}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleThemeSelectionWithInstaller(val, () => {
                        onSaveProfile({ theme: val });
                        setEditForm(prev => ({ ...prev, theme: val }));
                        setIsEditing(false);
                      });
                    }}
                    className="w-full px-2 py-1.5 border border-pink-400 bg-pink-50/10 text-[#d946ef] font-bold rounded cursor-pointer"
                  >
                    <option value="default">Padrão Scrapzone Clássico (Azul)</option>
                    <option value="neon-hacker">Neon Hacker (Verde Terminal)</option>
                    <option value="emo-2008">Emo 2008 (Rosa Choque e Preto)</option>
                    <option value="rock-underground">Rock Underground (Chapa Laranja)</option>
                    <option value="cyberdeck">Cyberdeck (Aço Marinho e Cyan)</option>
                    <option value="vaporwave">Vaporwave (Aesthetic Pastel Gradient)</option>
                    <option value="minimal-oldweb">Web-anos-90 ( Windows 95/98 )</option>
                    <option value="gotico-retro">Gótico Retrô (Vermelho Escarlate)</option>
                    <option value="matrix-terminal">Matrix Terminal (Monitor Fósforo Verde)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase">Quem sou eu (Bio):</label>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {editForm.aboutMe?.length || 0}/4000 caracteres
                    </span>
                  </div>
                  <textarea
                    id="edit-input-aboutme"
                    value={editForm.aboutMe}
                    onChange={(e) => {
                      const text = e.target.value.substring(0, 4000); // 4000 char limit
                      setEditForm({ ...editForm, aboutMe: text });
                      validateAboutMeField(text);
                    }}
                    rows={7}
                    placeholder="Digites frases, emojis, símbolos decorativos ou ASCII Art..."
                    className={`w-full px-2.5 py-1.5 border rounded font-mono text-xs focus:outline-none transition-all ${
                      aboutMeError 
                        ? 'border-red-500 ring-2 ring-red-500/15 text-red-900 bg-red-50/10' 
                        : 'border-neutral-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'
                    }`}
                  />
                  
                  {/* CENTRALIZED ALERT FOR VALIDATION FAILURE */}
                  {aboutMeError && (
                    <div className="flex flex-col items-center justify-center p-5 border border-red-500 bg-red-500/5 text-red-500 rounded-lg text-center font-sans space-y-2 mt-2 animate-fadeIn select-none">
                      <span className="text-4xl filter drop-shadow">☠</span>
                      <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                        ⚠ Caracteres inválidos detectados.
                      </div>
                      <p className="text-[10px] leading-relaxed max-w-sm">
                        Por segurança, apenas texto, emojis, símbolos e ASCII Art são permitidos.
                      </p>
                    </div>
                  )}

                  {/* PRESERVE FORMATTING CHECKBOX */}
                  <div className="flex items-center gap-2 mt-2 select-none border border-neutral-100 bg-neutral-50/50 p-2 rounded">
                    <label className="flex items-center gap-2 text-[11.5px] text-neutral-600 font-semibold hover:text-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.preserve_formatting}
                        onChange={(e) => setEditForm({ ...editForm, preserve_formatting: e.target.checked })}
                        className="rounded border-neutral-300 text-pink-500 focus:ring-pink-400 h-4 w-4 accent-[#d946ef] cursor-pointer"
                      />
                      <span>☑ Preservar Formatação (Mantém alinhamentos, múltiplos espaços e ASCII Art)</span>
                    </label>
                  </div>

                  {/* TWO-FACTOR AUTHENTICATION (MFA) OPTION (OPTIONAL) */}
                  <div className="flex flex-col gap-1 mt-3 select-none border border-[#92afd9]/60 bg-[#ecf2fa]/75 p-3 rounded">
                    <label className="flex items-center gap-2 text-[11.5px] text-[#1b4372] font-black hover:text-[#0b1f3c] cursor-pointer font-sans">
                      <input
                        type="checkbox"
                        checked={editForm.isTwoFactorEnabled}
                        onChange={(e) => setEditForm({ ...editForm, isTwoFactorEnabled: e.target.checked })}
                        className="rounded border-neutral-300 text-[#1b4372] focus:ring-indigo-400 h-4 w-4 cursor-pointer accent-[#1b4372]"
                      />
                      <span className="flex items-center gap-1">🔒 Ativar Autenticação de 2 Fatores (MFA / 2FA)</span>
                    </label>
                    <p className="text-[10px] text-[#3b526d] pl-6 leading-normal font-sans">
                      Altamente recomendado! Ao ativar, um código pin de 6 dígitos será enviado ao seu e-mail de segurança simulado a cada novo login para blindar sua conta.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Relacionamento:</label>
                    <input
                      id="edit-input-relationship"
                      type="text"
                      value={editForm.relationship}
                      onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 font-mono">Humor do dia:</label>
                    <input
                      id="edit-input-humor"
                      type="text"
                      value={editForm.humor}
                      onChange={(e) => setEditForm({ ...editForm, humor: e.target.value })}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Moda:</label>
                    <input
                      id="edit-input-fashion"
                      type="text"
                      value={editForm.fashion}
                      onChange={(e) => setEditForm({ ...editForm, fashion: e.target.value })}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Paixão:</label>
                    <input
                      id="edit-input-passions"
                      type="text"
                      value={editForm.passions}
                      onChange={(e) => setEditForm({ ...editForm, passions: e.target.value })}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <ThemeSelector
                    currentTheme={editForm.theme}
                    onThemeChange={(themeId) => setEditForm({ ...editForm, theme: themeId })}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-neutral-200/50 pb-2">
                  <span className="font-bold text-neutral-500 uppercase text-[10px] block mb-0.5">Quem sou eu:</span>
                  <p 
                    id="profile-aboutme-text" 
                    className={`leading-relaxed break-all ${
                      profile.preserve_formatting !== false 
                        ? `font-mono text-[11px] whitespace-pre p-3 rounded overflow-x-auto shadow-inner ${
                            profile.theme === 'gotico-retro'
                              ? 'bg-[#171221]/80 border border-[#b08d57]/30 text-zinc-200 gotico-retro-scrollbar'
                              : 'bg-neutral-950/5 border border-neutral-200/40'
                          }` 
                        : 'font-sans text-xs whitespace-pre-wrap'
                    }`}
                  >
                    {profile.aboutMe}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="font-bold text-neutral-500 uppercase text-[10px] block">Relacionamento:</span>
                    <span id="profile-relationship-text" className="font-semibold">{profile.relationship}</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-500 uppercase text-[10px] block">Aqui para:</span>
                    <span id="profile-herefor-text" className="font-semibold">{profile.hereFor}</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-500 uppercase text-[10px] block">De onde:</span>
                    <span id="profile-location-text" className="font-semibold">{profile.location}</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-500 uppercase text-[10px] block">Cidade natal:</span>
                    <span id="profile-hometown-text" className="font-semibold">{profile.hometown}</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-500 uppercase text-[10px] block">Humor:</span>
                    <span id="profile-humor-text" className="font-semibold">{profile.humor}</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-500 uppercase text-[10px] block">Moda:</span>
                    <span id="profile-fashion-text" className="font-semibold">{profile.fashion}</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-500 uppercase text-[10px] block">Paixões:</span>
                    <span id="profile-passions-text" className="font-semibold">{profile.passions}</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-500 uppercase text-[10px] block">Idiomas:</span>
                    <span id="profile-languages-text" className="font-semibold">{profile.languages}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 🎵 ScrapZone Music Player Widget */}
        <div className="mb-4">
          <MusicPlayer
            profile={profile}
            currentUserProfile={profiles?.[loggedInUserId || 'me'] || null}
            onSaveProfile={onSaveProfile}
            isOwner={isOwnProfile}
          />
        </div>

        {/* ✍️ No que você está pensando, chapa? (Nostalgic Status Input) */}
        <div className={`border rounded p-4 transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} text-left`}>
          <h4 className="text-xs font-bold font-sans uppercase text-[#1d4ed8] tracking-wider mb-2 select-none flex items-center gap-1.5 ">
            <span>✍️</span> No que você está pensando, chapa?
          </h4>
          <form onSubmit={handlePostStatus} className="flex flex-col gap-2 mt-1">
            <textarea
              id="thought-status-textarea"
              rows={2}
              value={newStatusText}
              onChange={(e) => setNewStatusText(e.target.value)}
              placeholder="Digite um pensamento nostálgico, novidade ou status clássico chapa..."
              className="w-full px-2.5 py-1.5 text-xs border border-neutral-350 rounded font-sans focus:outline-none focus:ring-1 focus:ring-pink-500 bg-white"
              disabled={postingStatus}
            />
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 text-[10.5px] text-neutral-450 select-none">
              <span>Publicado instantaneamente no seu feed de recordações.</span>
              <button
                id="btn-post-thought"
                type="submit"
                disabled={postingStatus || !newStatusText.trim()}
                className="px-4 py-1.5 bg-[#fae8ff] hover:bg-[#f5d0fe] border border-[#f0abfc] text-pink-700 font-bold text-xs rounded transition-all cursor-pointer shadow-sm disabled:opacity-50 font-sans"
              >
                {postingStatus ? 'Enviando...' : 'Postar Pensamento chapa!'}
              </button>
            </div>
          </form>
        </div>

        {/* 🔁 MURAL DE RECORDAÇÕES COMPARTILHADAS (Dynamic Activities Feed) */}
        <div className={`border rounded shadow-sm overflow-hidden text-left transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass}`}>
          <div className={`px-4 py-2 flex justify-between items-center ${themeStyles.accent} border-b border-dashed border-neutral-350`}>
            <span className="text-xs font-bold uppercase flex items-center gap-1.5">
              <span>🔁</span> Mural de Recordações & Feed ({sharedMemories.length})
            </span>
            <span className="text-[9px] font-mono select-none">ATUALIZADO EM REAL-TIME</span>
          </div>

          <div className="p-4 space-y-4 bg-transparent max-h-[600px] overflow-y-auto custom-scrollbar">
            {sharedMemories.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-500 italic font-sans animate-pulse">
                Nenhuma atividade relatada no mural ainda chapa. Curta ou compartilhe fotos, scraps ou depoimentos para vê-los aqui!
              </div>
            ) : (
              sharedMemories.map((entry) => {
                return (
                  <div 
                    key={entry.id} 
                    className={`border rounded p-3 shadow-xs relative transition-all group ${
                      profile.theme === 'emo-2008'
                        ? 'bg-[#473b4b] border-[#f6339a] border-dashed border-2 hover:border-[#f6339a]/80'
                        : 'border-neutral-200/60 bg-white/40 hover:border-[#1d4ed8]/30'
                    }`}
                  >
                    {/* Activity Header */}
                    <div className="flex items-center justify-between border-b border-neutral-200/20 pb-2 mb-2">
                       <div className="flex items-center gap-2">
                        <img
                          src={entry.sharerAvatar}
                          alt={entry.sharerName}
                          className="w-6 h-6 rounded-full object-cover border border-neutral-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-[11px] leading-tight text-left">
                          <strong className={`font-sans border-b border-transparent group-hover:border-purple-500/30 ${
                            profile.theme === 'emo-2008' ? 'text-[#cd5bff] font-black' : 'text-neutral-800'
                          }`}>
                            {entry.sharerName}
                          </strong>
                          <span className={`text-[10.5px] ml-1 ${
                            profile.theme === 'emo-2008' ? 'text-[#d0aedf]' : 'text-neutral-500'
                          }`}>
                            {entry.itemType === 'photo' && 'compartilhou uma foto:'}
                            {entry.itemType === 'album' && 'recomendou um álbum de fotos:'}
                            {entry.itemType === 'post' && 'postou um pensamento chapa:'}
                            {entry.itemType === 'scrap' && 'divulgou um scrap:'}
                            {entry.itemType === 'testimonial' && 'divulgou um depoimento:'}
                          </span>
                          {entry.targetUser && (
                            <span className={`text-[10.5px] ${
                              profile.theme === 'emo-2008' ? 'text-[#d0aedf]' : 'text-neutral-500'
                            }`}>
                              {' '}para <strong className={profile.theme === 'emo-2008' ? 'text-[#cd5bff]' : 'text-neutral-800'}>@{entry.targetUser}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[9px] font-mono ${
                        profile.theme === 'emo-2008' ? 'text-[#d0aedf]' : 'text-neutral-450'
                      }`}>
                        {entry.timestamp.split(' - ')[1] || entry.timestamp}
                      </span>
                    </div>

                    {/* Shared Content preview */}
                    <div className={`px-2.5 py-2.5 rounded text-xs leading-relaxed font-sans mt-1 ${
                      profile.theme === 'emo-2008'
                        ? 'bg-black/30 border border-[#f6339a]/30 text-pink-300'
                        : 'bg-white/85 border border-neutral-250/30 text-neutral-800'
                    }`}>
                      {entry.itemType === 'photo' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🖼️</span>
                          <div>
                            <p className={`font-bold italic ${profile.theme === 'emo-2008' ? 'text-pink-400' : 'text-sky-700'}`}>
                              “{entry.itemTitle.replace('Foto: ', '')}”
                            </p>
                            <span className="text-[9px] text-neutral-400">Verificado em Scrapzone Secure Albums</span>
                          </div>
                        </div>
                      )}
                      {entry.itemType === 'album' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xl">FolderPath</span>
                          <div>
                            <p className={`font-bold uppercase tracking-wide ${profile.theme === 'emo-2008' ? 'text-pink-400' : 'text-pink-700'}`}>📂 {entry.itemTitle}</p>
                            <span className="text-[9px] text-neutral-400">Clique em Acessar Fotos para decodificar esse rolo analógico</span>
                          </div>
                        </div>
                      )}
                      {entry.itemType === 'post' && (
                        <div className="flex flex-col gap-1">
                          <p className={`font-sans text-[11.5px] leading-normal font-medium bg-neutral-100/10 rounded ${
                            profile.theme === 'emo-2008' ? 'text-pink-300' : 'text-neutral-800'
                          }`}>
                            “{entry.itemTitle}”
                          </p>
                          <span className="text-[8.5px] text-neutral-400 font-mono">Publicado via Rede Local Descentralizada</span>
                        </div>
                      )}
                      {entry.itemType !== 'photo' && entry.itemType !== 'album' && entry.itemType !== 'post' && (
                        <p className={`italic font-medium ${profile.theme === 'emo-2008' ? 'text-pink-300' : 'text-neutral-700'}`}>“{entry.itemTitle}”</p>
                      )}
                    </div>

                    {/* Social Interaction options for the Feed Activity item */}
                    <SocialActions
                      itemId={entry.id}
                      itemType="post"
                      itemTitle={entry.itemTitle}
                      initialLikes={entry.likes}
                      initialLikedByMe={entry.likedByMe}
                      onLikeUpdate={(liked, count) => onLikeShare(entry.id, liked, count)}
                      onShareToFeed={onShareToFeed}
                      layout="retro-feed"
                      theme={profile.theme}
                    />

                    {/* CRT Scan line HUD vibe overlay */}
                    <div className="absolute inset-0 bg-neutral-900/[0.005] pointer-events-none rounded select-none" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Right Side: Friends and Communities lists (Classic 3x3 layout) */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Friends Grid */}
        <div className={`relative border rounded shadow-sm overflow-hidden text-left transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} ${profile.theme === 'rock-underground' ? 'rock-underground-widget' : ''}`}>
          <div className={`px-3 py-1.5 flex justify-between items-center ${
            profile.theme === 'minimal-oldweb'
              ? 'bg-gradient-to-br from-[#000080] to-[#1084d0]'
              : themeStyles.accent
          }`}>
            <span className={`text-[11px] font-bold uppercase ${profile.theme === 'minimal-oldweb' ? 'text-[#d6f9ff]' : ''}`}>Amigos ({friends.length})</span>
            <button onClick={() => onNavigateToTab('profile')} className={`text-[10px] hover:underline font-bold ${profile.theme === 'minimal-oldweb' ? 'text-[#d6f9ff]' : ''}`}>ver todos</button>
          </div>

          <div className="p-3 grid grid-cols-3 gap-2 bg-transparent pb-10">
            {console.log('[DEBUG] ProfileLayout rendering friends:', friends)}
            {friends.slice(0, 9).map((friend) => (
              <div
                key={friend.id}
                onClick={() => onNavigateToFriend(friend.id)}
                className="flex flex-col items-center justify-center cursor-pointer p-1.5 rounded transition-all group hover:bg-neutral-100/10"
              >
                <div className="w-12 h-12 border border-neutral-300 overflow-hidden rounded bg-neutral-100 group-hover:border-[#d946ef]">
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className={`w-full h-full object-cover ${
                      profile.theme === 'cyberdeck' ? 'cyberdeck-friend-img' : ''
                    }`}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className={`text-[9px] font-bold text-center mt-1 truncate w-full group-hover:underline ${
                  profile.theme === 'minimal-oldweb' 
                    ? 'text-[#0033b6]' 
                    : (!profile.theme || profile.theme === 'default')
                      ? 'text-[#110e61]'
                      : ''
                }`}>
                  {friend.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          {/* Dynamic/Pulsating Notification Bell - Bottom-Right layout within friends panel */}
          <div className="absolute bottom-1.5 right-1.5 z-25">
            <button
              id="friends-notification-bell"
              onClick={() => setIsRequestsModalOpen(true)}
              className={
                profile.theme === 'gotico-retro'
                  ? "p-1 px-1.5 bg-transparent border-none hover:scale-110 active:scale-95 transition-all shadow-none relative flex items-center justify-center cursor-pointer"
                  : profile.theme === 'cyberdeck'
                    ? "p-1 px-1.5 bg-[#070b07] border border-[#638163] rounded hover:bg-[#121b0e] hover:scale-105 active:scale-95 transition-all shadow-md relative flex items-center justify-center cursor-pointer text-[#39ff14]"
                    : "p-1 px-1.5 bg-white border border-neutral-300 rounded hover:bg-neutral-50 hover:scale-105 active:scale-95 transition-all shadow-md relative flex items-center justify-center cursor-pointer"
              }
              title="Solicitações de Amizade"
            >
              {hasPendingRequests ? (
                <div className="flex items-center justify-center relative w-5 h-5">
                  <motion.div
                    animate={
                      profile.theme === 'gotico-retro'
                        ? { scale: [1, 1.25, 1], rotate: [0, 6, -6, 6, 0] }
                        : { scale: [1, 1.15, 1], rotate: [0, 8, -8, 8, 0] }
                    }
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className={profile.theme === 'gotico-retro' ? "animate-pulse" : ""}
                  >
                    <Bell 
                      size={16} 
                      className={
                        profile.theme === 'gotico-retro' 
                          ? "text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.95)]" 
                          : profile.theme === 'cyberdeck'
                            ? "text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.95)]"
                            : "text-[#ff003a]"
                      } 
                      fill={
                        profile.theme === 'gotico-retro' 
                          ? "#ffd700" 
                          : profile.theme === 'cyberdeck'
                            ? "#39ff14"
                            : "#ff003a"
                      } 
                    />
                  </motion.div>
                  <span className={
                    profile.theme === 'gotico-retro'
                      ? "absolute -top-1.5 -right-1.5 bg-[#ffd700] text-black text-[8px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center shadow-[0_0_6px_rgba(255,215,0,0.8)] border border-black/30"
                      : profile.theme === 'cyberdeck'
                        ? "absolute -top-1.5 -right-1.5 bg-[#39ff14] text-black text-[8px] font-mono font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-[0_0_6px_rgba(57,255,20,0.8)] border border-[#070b07]"
                        : "absolute -top-1.5 -right-1.5 bg-[#ff003a] text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
                  }>
                    {pendingReceivedRequests.length}
                  </span>
                </div>
              ) : (
                <Bell 
                  size={16} 
                  className={
                    profile.theme === 'gotico-retro'
                      ? "text-[#cccccc] fill-[#4a4a4a] drop-shadow-[0_0_4px_rgba(204,204,204,0.45)] opacity-85 hover:opacity-100 transition-opacity"
                      : profile.theme === 'cyberdeck'
                        ? "text-[#47ff8c] opacity-80"
                        : "text-neutral-400"
                  } 
                />
              )}
            </button>
          </div>
        </div>

        {/* Communities Grid */}
        <div className={`border rounded shadow-sm overflow-hidden text-left transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} ${profile.theme === 'rock-underground' ? 'rock-underground-widget' : ''}`}>
          <div className={`px-3 py-1.5 flex justify-between items-center ${
            profile.theme === 'minimal-oldweb'
              ? 'bg-gradient-to-br from-[#000080] to-[#1084d0]'
              : themeStyles.accent
          }`}>
            <span className={`text-[11px] font-bold uppercase ${profile.theme === 'minimal-oldweb' ? 'text-[#d6f9ff]' : ''}`}>Comunidades ({communities.length})</span>
            <button onClick={() => onNavigateToTab('communities', !isOwnProfile)} className={`text-[10px] hover:underline font-bold ${profile.theme === 'minimal-oldweb' ? 'text-[#d6f9ff]' : ''}`}>ver todas</button>
          </div>

          <div className="p-3 grid grid-cols-3 gap-2 bg-transparent">
            {communities.slice(0, 9).map((comm) => (
              <div
                key={comm.id}
                onClick={() => onNavigateToTab('communities', !isOwnProfile, false, comm.id)}
                className="flex flex-col items-center justify-center cursor-pointer p-1.5 rounded transition-all group hover:bg-neutral-100/10"
              >
                <div className="w-12 h-12 border border-neutral-300 flex items-center justify-center text-xl overflow-hidden rounded bg-pink-100 text-pink-600 group-hover:border-[#1d4ed8]">
                  {comm.avatar && (
                    comm.avatar.startsWith('data:') ||
                    comm.avatar.startsWith('http://') ||
                    comm.avatar.startsWith('https://') ||
                    comm.avatar.startsWith('/')
                  ) ? (
                    <img src={comm.avatar} alt={comm.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{comm.avatar || '👥'}</span>
                  )}
                </div>
                <span className="text-[9px] font-bold text-center mt-1 truncate w-full group-hover:underline leading-tight font-sans">
                  {comm.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Album de Fotos Widget Block */}
        {(() => {
          const profileAlbums = albums.filter(a => a.profileId === profile.id);
          const allMyPhotos = profileAlbums.reduce<Photo[]>((acc, album) => {
            if (album.photos && Array.isArray(album.photos)) {
              return [...acc, ...album.photos];
            }
            return acc;
          }, []);

          // Sort using date parser
          const sortedPhotos = [...allMyPhotos].sort((a, b) => {
            const parseDate = (dStr: string) => {
              if (!dStr) return 0;
              const parts = dStr.split('/');
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day).getTime();
              }
              return Date.parse(dStr) || 0;
            };
            return parseDate(b.date) - parseDate(a.date);
          });

          // Fallback to reversed order of the original array (where newer photos are appended at the end of the array)
          const displayPhotosList = sortedPhotos.every(p => !p.date) 
            ? [...allMyPhotos].reverse() 
            : sortedPhotos;

          const recentPhotosToShow = displayPhotosList.slice(0, 3);

          return (
            <div 
              onClick={() => {
                playShutterSound();
                onNavigateToTab('photos', !isOwnProfile);
              }}
              className={`border rounded shadow-sm overflow-hidden text-left transition-all cursor-pointer hover:scale-[1.02] ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} ${profile.theme === 'rock-underground' ? 'rock-underground-widget' : ''} group hover:border-[#d946ef] mt-1.5`}
              title={isOwnProfile ? "Explorar meus álbuns de fotos chapa!" : "Explorar memórias do perfil (Acesso de Visitante)"}
            >
              <div className={`px-3 py-1.5 flex justify-between items-center ${
                profile.theme === 'minimal-oldweb'
                  ? 'bg-gradient-to-br from-[#000080] to-[#1084d0]'
                  : themeStyles.accent
              }`}>
                <span className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${profile.theme === 'minimal-oldweb' ? 'text-[#d6f9ff]' : ''}`}>
                  📸 Álbum de Fotos
                </span>
                <span className={`text-[9px] group-hover:translate-x-0.5 transition-transform ${profile.theme === 'minimal-oldweb' ? 'text-[#d6f9ff]' : ''}`}>explorar →</span>
              </div>
              <div className="p-3 bg-transparent font-sans text-[11px] leading-relaxed text-left flex flex-col gap-1.5">
                <p className="opacity-95">
                  Veja fotos, gifs, memórias e momentos do perfil.
                </p>
                <div className="p-1.5 bg-neutral-100/15 border border-neutral-200/20 rounded flex items-center gap-2 text-[10px] text-[#1d4ed8] font-sans">
                  <span>🖼️</span>
                  <span className="italic">"{profile.name} compartilhou lembranças!"</span>
                </div>

                {/* Miniaturas de pelo menos 3 fotos mais recentes postadas */}
                {recentPhotosToShow.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 my-2">
                    {recentPhotosToShow.map((ph, idx) => (
                      <div 
                        key={ph.id || idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          playShutterSound();
                          onNavigateToTab('photos', !isOwnProfile); // Visit full album/photo tab
                        }}
                        className="relative aspect-square border border-neutral-300 rounded overflow-hidden shadow-xs hover:border-[#1d4ed8] transition-all hover:scale-105 group/thumb bg-white"
                        title={ph.caption || `Foto Recente`}
                      >
                        <img 
                          src={ph.url} 
                          alt={ph.caption || "Miniatura"} 
                          className="w-full h-full object-cover select-none" 
                          referrerPolicy="no-referrer"
                        />
                        {ph.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            {ph.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2 my-1.5 justify-center py-2 bg-neutral-100/10 rounded border border-dashed border-neutral-300/30">
                    <span className="text-[10px] text-neutral-500 italic">Nenhuma foto postada ainda</span>
                  </div>
                )}

                {/* Added: Acessar Fotos Button (Visitor Access) */}
                <div className="mt-2 pt-2 border-t border-dashed border-neutral-300/30">
                  <GlossyRetroButton
                    id="btn-access-photos-visitor"
                    onClick={(e) => {
                      e.stopPropagation();
                      playShutterSound();
                      onNavigateToTab('photos', !isOwnProfile);
                    }}
                    variant={isOwnProfile ? "default" : "visitor"}
                    className={`w-full h-11 ${profile.theme === 'rock-underground' ? '!text-[#101012]' : ''}`}
                  >
                    Ver Fotos
                  </GlossyRetroButton>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Sugestões: Amigos de amigos widget */}
        {friendsOfFriends.length > 0 && (
          <div className={`border rounded shadow-sm overflow-hidden text-left transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} ${profile.theme === 'rock-underground' ? 'rock-underground-widget' : ''} mt-4`}>
            <div className={`px-3 py-1.5 flex justify-between items-center ${
              profile.theme === 'minimal-oldweb'
                ? 'bg-gradient-to-br from-[#000080] to-[#1084d0]'
                : themeStyles.accent
            }`}>
              <span className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${profile.theme === 'minimal-oldweb' ? 'text-[#d6f9ff]' : ''}`}>
                👥 Amigos de amigo
              </span>
              <span className={`text-[9px] font-sans ${profile.theme === 'minimal-oldweb' ? 'text-[#d6f9ff]' : 'text-neutral-500'}`}>sugestões</span>
            </div>

            <div className="p-3 grid grid-cols-3 gap-2 bg-transparent pb-4">
              {friendsOfFriends.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToFriend(item.id)}
                  className="flex flex-col items-center justify-center cursor-pointer p-1.5 rounded transition-all group hover:bg-neutral-100/10"
                  title={`Visualizar perfil de ${item.name}`}
                >
                  <div className="w-12 h-12 border border-neutral-300 overflow-hidden rounded bg-neutral-100 group-hover:border-[#1d4ed8]">
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className={`w-full h-full object-cover ${
                        profile.theme === 'cyberdeck' ? 'cyberdeck-friend-img' : ''
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[9px] font-bold text-center mt-1 truncate w-full group-hover:underline leading-tight">
                    {item.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Identity Creator Modal Wizard */}
      {showIdentityWizard && (
        <IdentityWizard
          currentProfile={profile}
          onClose={() => setShowIdentityWizard(false)}
          onComplete={(completedData) => {
            handleThemeSelectionWithInstaller(completedData.theme || 'default', () => {
              onSaveProfile(completedData);
            });
            setShowIdentityWizard(false);
          }}
        />
      )}

      {/* Lateral Sliding Drawer Panel for Friend Requests */}
      <AnimatePresence>
        {isRequestsModalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop overlay (darkened) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRequestsModalOpen(false)}
              className="fixed inset-0 bg-neutral-900/60 backdrop-blur-[2px] cursor-pointer"
            />

            {/* Slide-out Drawer Container */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 shadow-2xl">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                className="w-80 max-w-md bg-white h-full flex flex-col overflow-hidden text-left border-l border-neutral-200"
              >
                {/* Header */}
                <div className="px-4 py-4 bg-[#e0f2fe] border-b border-sky-100 flex justify-between items-center shrink-0">
                  <h3 className="text-xs font-bold text-sky-850 uppercase tracking-widest flex items-center gap-2">
                    <Bell size={15} className="text-sky-600 animate-bounce" />
                    Solicitações de Amizade ({pendingReceivedRequests.length})
                  </h3>
                  <button
                    onClick={() => setIsRequestsModalOpen(false)}
                    className="text-neutral-500 hover:text-neutral-800 text-sm font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-100 bg-neutral-50/50">
                  {pendingReceivedRequests.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                      <span className="text-4xl text-neutral-300 select-none">🎐</span>
                      <p className="text-xs text-neutral-500 font-sans">
                        Sua caixa de correio está limpa! Nenhuma solicitação pendente.
                      </p>
                    </div>
                  ) : (
                    pendingReceivedRequests.map((req) => {
                      const senderProfile = profiles[req.fromUserId] || DEFAULT_PROFILES_LOCAL[req.fromUserId];
                      const avatarUrl = senderProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
                      const senderName = senderProfile?.name || 'Membro do Scrapzone';
                      
                      return (
                        <div key={req.id} className="py-4 flex flex-col gap-3 justify-between first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded border border-neutral-250 overflow-hidden shrink-0 bg-neutral-100 shadow-sm">
                              <img
                                src={avatarUrl}
                                alt={senderName}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span 
                                className="text-xs font-bold text-neutral-850 block hover:underline cursor-pointer truncate" 
                                onClick={() => {
                                  setIsRequestsModalOpen(false);
                                  onNavigateToFriend(req.fromUserId);
                                }}
                              >
                                {senderName}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono block">
                                Enviado em {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full">
                            <button
                              onClick={async () => {
                                if (onAcceptFriendRequest) {
                                  await onAcceptFriendRequest(req.id);
                                }
                              }}
                              className="flex-1 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded text-[11px] shadow-sm select-none cursor-pointer text-center"
                            >
                              Aceitar
                            </button>
                            <button
                              onClick={async () => {
                                if (onRejectFriendRequest) {
                                  await onRejectFriendRequest(req.id);
                                }
                              }}
                              className="flex-1 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold rounded text-[11px] shadow-sm select-none cursor-pointer text-center"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Remoção de Amizade */}
      <AnimatePresence>
        {showRemoveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRemoveConfirm(false)}
              className="fixed inset-0 bg-neutral-900/60 backdrop-blur-[2px] cursor-pointer"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`relative max-w-sm w-full border rounded-lg shadow-xl overflow-hidden text-left z-10 ${themeStyles.cardBg} ${themeStyles.borderClass} ${themeStyles.glow}`}
            >
              <div className={`px-4 py-3 border-b flex justify-between items-center ${themeStyles.accent}`}>
                <h3 className={`text-xs font-bold leading-none uppercase m-0 flex items-center gap-2 ${themeStyles.text}`}>
                  💔 Remover Amizade
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(false)}
                  className="text-neutral-500 hover:text-neutral-800 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-white text-zinc-800">
                <p className="text-xs font-medium text-neutral-700 font-sans leading-relaxed">
                  Remover este amigo da sua lista?
                </p>
                <p className="text-[10px] text-neutral-400 font-sans mt-1.5 italic">
                  Você não fará mais parte da lista de conexões de {profile.name}.
                </p>
              </div>

              <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200/60 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isRemovingFriend}
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold rounded text-[11px] shadow-sm select-none cursor-pointer text-center font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isRemovingFriend}
                  onClick={async () => {
                    if (onRemoveFriend) {
                      setIsRemovingFriend(true);
                      await onRemoveFriend(profile.id);
                      setIsRemovingFriend(false);
                    }
                    setIsPendingLocal(false);
                    setShowRemoveConfirm(false);
                  }}
                  className={`px-3 py-1.5 text-white font-bold rounded text-[11px] shadow-sm select-none cursor-pointer text-center font-sans ${
                    isRemovingFriend 
                      ? 'bg-neutral-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isRemovingFriend ? 'Removendo...' : 'Remover'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Windows95Installer
        isOpen={showOldWebInstaller}
        onClose={() => {
          setShowOldWebInstaller(false);
          setPendingThemeCallback(null);
        }}
        onComplete={() => {
          setShowOldWebInstaller(false);
          if (pendingThemeCallback) {
            pendingThemeCallback();
            setPendingThemeCallback(null);
          }
        }}
      />
    </div>
  );
}
