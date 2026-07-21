import { useState } from 'react';
import { Heart, Share2, Send, SendHorizontal, RefreshCw, CheckCircle, Info, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SocialActionsProps {
  itemId: string;
  itemType: 'photo' | 'scrap' | 'testimonial' | 'album' | 'post';
  itemTitle: string;
  initialLikes: number;
  initialLikedByMe?: boolean;
  onLikeUpdate: (liked: boolean, newCount: number) => void;
  onShareToFeed: (itemTitle: string, itemType: string, friendName?: string) => void;
  isVisitorMode?: boolean;
  layout?: 'default' | 'retro-feed';
  onCommentClick?: () => void;
  commentCount?: number;
  theme?: string;
}

export default function SocialActions({
  itemId,
  itemType,
  itemTitle,
  initialLikes,
  initialLikedByMe = false,
  onLikeUpdate,
  onShareToFeed,
  isVisitorMode = false,
  layout = 'default',
  onCommentClick,
  commentCount,
  theme = 'default',
}: SocialActionsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [likedFeedback, setLikedFeedback] = useState(false);
  const [showFriendlyModal, setShowFriendlyModal] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [sharingProgress, setSharingProgress] = useState<number | null>(null); // null = idle, 0..100 = loading, 101 = done
  const [successMsg, setSuccessMsg] = useState('');

  // Retro cyber chime or bubble pop synth generator
  const playRetroChime = (type: 'like' | 'share' | 'success' | 'click') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playFreq = (freq: number, start: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine', vol = 0.05) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      if (type === 'like') {
        // High-pitch heart sparkle sound
        playFreq(600, 0, 0.08, 'sine', 0.03);
        playFreq(900, 0.06, 0.12, 'sine', 0.03);
      } else if (type === 'share') {
        // Computer sweep sound
        playFreq(400, 0, 0.06, 'triangle', 0.04);
        playFreq(800, 0.05, 0.1, 'sine', 0.04);
        playFreq(1200, 0.1, 0.15, 'sine', 0.04);
      } else if (type === 'success') {
        // Safe success chimes
        playFreq(523.25, 0, 0.1, 'sine', 0.05); // C5
        playFreq(659.25, 0.08, 0.1, 'sine', 0.05); // E5
        playFreq(783.99, 0.16, 0.25, 'sine', 0.05); // G5
      } else {
        // Click sound
        playFreq(1500, 0, 0.03, 'sine', 0.02);
      }
    } catch (e) {
      console.log("Audio permission deferred in preview frame.");
    }
  };

  const handleLike = () => {
    playRetroChime('like');
    const walk = likedByMe ? -1 : 1;
    const newLikes = Math.max(0, likes + walk);
    const nextLikedState = !likedByMe;
    
    setLikes(newLikes);
    setLikedByMe(nextLikedState);
    onLikeUpdate(nextLikedState, newLikes);

    if (nextLikedState) {
      setLikedFeedback(true);
      setTimeout(() => setLikedFeedback(false), 2500);
    }
  };

  const handleShareOnTelegram = () => {
    playRetroChime('click');
    const msg = `Olha essa comunidade da internet antiga 👀 - "${itemTitle}"`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(msg)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    
    setSuccessMsg('📨 Link gerado e enviado para o Telegram!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleOpenFriendlyShare = () => {
    playRetroChime('click');
    setShowFriendlyModal(true);
    setFriendName('');
    setSharingProgress(null);
  };

  const submitFriendlyShare = () => {
    if (!friendName.trim()) return;
    playRetroChime('share');
    
    // Simulate Y2K vintage server-side linear-memory transmission loading
    setSharingProgress(10);
    const intervals = [30, 65, 85, 100];
    intervals.forEach((val, idx) => {
      setTimeout(() => {
        setSharingProgress(val);
        if (val === 100) {
          playRetroChime('success');
          // Add share memory statement to current platform's global state
          onShareToFeed(itemTitle, itemType, friendName.trim());
          setSharingProgress(101); // Complete state
          
          setTimeout(() => {
            setShowFriendlyModal(false);
            setSharingProgress(null);
            setSuccessMsg('✨ Memória compartilhada com sucesso.');
            setTimeout(() => setSuccessMsg(''), 3000);
          }, 1200);
        }
      }, (idx + 1) * 350);
    });
  };

  const formatTypeLabel = (type: string) => {
    switch (type) {
      case 'photo': return 'uma foto';
      case 'scrap': return 'um scrap';
      case 'testimonial': return 'um depoimento público';
      case 'album': return 'um álbum de memórias';
      case 'post': return 'uma postagem';
      default: return 'uma lembrança';
    }
  };

  return (
    <div className={`select-none relative ${layout === 'retro-feed' ? 'flex flex-col gap-3' : 'mt-3.5 border-t border-dashed border-neutral-300/40 pt-3 flex flex-col gap-2 font-sans'}`}>
      
      {/* HUD Minimal Actions Row */}
      {layout === 'retro-feed' ? (
        <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-sans py-2.5 ${
          theme === 'emo-2008'
            ? 'border-t border-b border-dashed border-[#f6339a]/40 text-[#d0aedf]'
            : 'border-t border-b border-dashed border-neutral-300/70 text-neutral-600'
        }`}>
          
          {/* ♡ Curtir */}
          <button
            onClick={handleLike}
            className={`group flex items-center gap-1 transition-all text-xs font-sans tracking-tight select-none cursor-pointer hover:scale-[1.01] ${
              theme === 'emo-2008'
                ? 'text-[#ff28d4] font-bold'
                : likedByMe 
                  ? 'text-pink-600 font-extrabold' 
                  : 'text-neutral-600 hover:text-pink-500'
            }`}
          >
            <span className={theme === 'emo-2008' ? 'bg-[#ff16b6] px-1 rounded text-black font-semibold' : 'text-[13px] leading-none'}>
              {likedByMe ? '❤️' : '♡'}
            </span>
            <span className={theme === 'emo-2008' ? 'text-[#ff28d4] font-bold' : ''}>
              Curtir ({likes})
            </span>
          </button>

          {/* 💬 Comentários */}
          {onCommentClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCommentClick();
              }}
              className={`group flex items-center gap-1 transition-all text-xs font-sans tracking-tight cursor-pointer hover:scale-[1.01] ${
                theme === 'emo-2008' ? 'text-[#d0aedf]' : 'text-neutral-600 hover:text-pink-500'
              }`}
            >
              <span className={theme === 'emo-2008' ? 'text-[#a0a3a6]' : 'text-[12px] leading-none'}>💬</span>
              <span className={theme === 'emo-2008' ? 'text-[#d0aedf]' : ''}>
                Comentários {commentCount !== undefined ? `(${commentCount})` : ''}
              </span>
            </button>
          )}

          {/* ↪ Compartilhar */}
          <button
            onClick={() => {
              playRetroChime('click');
              onShareToFeed(itemTitle, itemType);
              setSuccessMsg('↪ Memória compartilhada!');
              setTimeout(() => setSuccessMsg(''), 3000);
            }}
            className={`group flex items-center gap-1 transition-all text-xs font-sans tracking-tight cursor-pointer hover:scale-[1.01] ${
              theme === 'emo-2008' ? 'text-[#d0aedf]' : 'text-neutral-600 hover:text-pink-500'
            }`}
          >
            <span className={theme === 'emo-2008' ? 'text-[#a0a3a6]' : 'text-[12px] leading-none'}>↪</span>
            <span className={theme === 'emo-2008' ? 'text-[#d0aedf]' : ''}>Compartilhar</span>
          </button>

          {/* ✉ Enviar */}
          <button
            onClick={handleOpenFriendlyShare}
            className={`group flex items-center gap-1 transition-all text-xs font-sans tracking-tight cursor-pointer hover:scale-[1.01] ${
              theme === 'emo-2008' ? 'text-[#d0aedf]' : 'text-neutral-600 hover:text-pink-500'
            }`}
          >
            <span className={theme === 'emo-2008' ? 'text-[#a0a3a6]' : 'text-[12px] leading-none'}>✉</span>
            <span className={theme === 'emo-2008' ? 'text-[#d0aedf]' : ''}>Enviar para amigo</span>
          </button>

          {/* 📨 Telegram */}
          <button
            onClick={handleShareOnTelegram}
            className={`group flex items-center gap-1 transition-all text-xs font-sans tracking-tight cursor-pointer hover:scale-[1.01] ${
              theme === 'emo-2008' ? 'text-[#d0aedf]' : 'text-neutral-600 hover:text-pink-500'
            }`}
          >
            <span className={theme === 'emo-2008' ? 'text-[#a0a3a6]' : 'text-[12px] leading-none'}>📨</span>
            <span className={theme === 'emo-2008' ? 'text-[#d0aedf]' : ''}>Telegram</span>
          </button>

        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[11px] text-neutral-600 font-sans">
          
          {/* ❤️ Like Clickable */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-all hover:scale-[1.03] cursor-pointer ${
              likedByMe 
                ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold shadow-[0_0_10px_rgba(244,63,94,0.15)]' 
                : 'bg-neutral-50 border-neutral-200 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50/30'
            }`}
            title="Curtir esta recordação"
          >
            <Heart 
              size={12} 
              fill={likedByMe ? '#e11d48' : 'none'} 
              className={`transition-colors ${likedByMe ? 'scale-110 text-rose-600' : 'text-neutral-400 group-hover:text-rose-450'}`} 
            />
            <span>{likes} {likes === 1 ? 'curtida' : 'curtidas'}</span>
          </button>

          {/* 🔁 Compartilhar Feed */}
          <button
            onClick={() => {
              playRetroChime('click');
              // Instant share to direct feed on profile
              onShareToFeed(itemTitle, itemType);
              setSuccessMsg('🔁 Memória compartilhada no feed do seu perfil!');
              setTimeout(() => setSuccessMsg(''), 3000);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-250 bg-neutral-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all hover:scale-[1.03] cursor-pointer"
            title="Compartilhar no seu feed pessoal"
          >
            <Share2 size={12} className="text-neutral-400 hover:text-blue-500" />
            <span>Compartilhar</span>
          </button>

          {/* ✉ Enviar para amigo */}
          <button
            onClick={handleOpenFriendlyShare}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-250 bg-neutral-50 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-600 transition-all hover:scale-[1.03] cursor-pointer"
            title="Enviar para um amigo específico"
          >
            <Send size={12} className="text-neutral-400 hover:text-pink-500" />
            <span>Enviar para amigo</span>
          </button>

          {/* 📨 Telegram */}
          <button
            onClick={handleShareOnTelegram}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-250 bg-neutral-50 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700 transition-all hover:scale-[1.03] cursor-pointer"
            title="Abrir no Telegram oficial"
          >
            <span>📨</span>
            <span>Telegram</span>
          </button>
        </div>
      )}

      {/* Floating Retro alerts and Microinteractions */}
      <AnimatePresence>
        {likedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] text-rose-600 font-bold flex items-center gap-1 self-start bg-rose-50/60 border border-rose-100 px-2.5 py-0.5 rounded shadow-sm"
          >
            <Sparkles size={10} className="text-rose-500 animate-spin" />
            <span>Você curtiu essa memória.</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-[10px] text-green-700 font-bold bg-green-50/90 border border-green-200 px-3 py-1 rounded self-start flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle size={12} className="text-green-600" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔮 MINI RETRO WINDOW: ENVIAR PARA AMIGO */}
      <AnimatePresence>
        {showFriendlyModal && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2.5 p-3.5 border border-neutral-350 bg-[#f6f9fc] rounded shadow-md text-left max-w-sm relative z-30"
          >
            {/* Title Bar DOS style */}
            <div className="bg-sky-800 text-white px-2 py-1 text-[11px] font-bold font-mono tracking-wide flex justify-between items-center rounded-t shadow-inner uppercase">
              <span>✉ Enviar para Amigo</span>
              <button 
                onClick={() => { playRetroChime('click'); setShowFriendlyModal(false); }} 
                className="text-white hover:text-red-300 font-bold px-1 select-none focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* Content box */}
            <div className="bg-white border-l border-r border-b border-neutral-350 px-3.5 py-3 rounded-b flex flex-col gap-2.5 text-xs text-neutral-800">
              
              {sharingProgress === null ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wide mb-1 select-none">
                      Username / Nome do destinatário:
                    </label>
                    <input
                      id={`share-username-${itemId}`}
                      type="text"
                      value={friendName}
                      onChange={(e) => setFriendName(e.target.value)}
                      placeholder="Ex: @paulo ou @ana"
                      className="w-full px-2 py-1 text-xs border border-neutral-350 rounded focus:outline-none focus:ring-1 focus:ring-sky-600 font-mono bg-[#fdfdfd]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitFriendlyShare();
                      }}
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-between items-center mt-1.5 pt-2 border-t border-dotted border-neutral-200">
                    <span className="text-[9px] text-neutral-400 italic">Prepara o disquete!</span>
                    <button
                      id={`btn-confirm-share-${itemId}`}
                      onClick={submitFriendlyShare}
                      disabled={!friendName.trim()}
                      className="px-4 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-[10.5px] rounded cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                    >
                      [ Compartilhar ]
                    </button>
                  </div>
                </>
              ) : sharingProgress <= 100 ? (
                /* Retro Cyber progress bar */
                <div className="py-4 text-center flex flex-col gap-2.5">
                  <RefreshCw size={18} className="animate-spin text-sky-700 mx-auto" />
                  <p className="text-[10px] text-sky-800 font-bold font-mono uppercase tracking-widest animate-pulse">
                    Transmitindo bytes para {friendName}...
                  </p>
                  <div className="w-full bg-neutral-200 h-3 border border-neutral-300 rounded overflow-hidden p-0.5 shadow-inner">
                    <div 
                      className="bg-sky-600 h-full transition-all duration-300"
                      style={{ width: `${sharingProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-neutral-400 font-mono italic">
                    {sharingProgress}% - Verificando integridade SHA-256
                  </span>
                </div>
              ) : (
                /* Success screen */
                <div className="py-4 text-center flex flex-col gap-1.5">
                  <div className="text-2xl text-green-500">✨</div>
                  <p className="text-xs font-bold text-green-700 font-sans">
                    Memória compartilhada com sucesso!
                  </p>
                  <span className="text-[10px] text-neutral-500">
                    Garantido pela infraestrutura descentralizada.
                  </span>
                </div>
              )}
            </div>
            
            {/* CRT scanline effect on modal overlay */}
            <div className="absolute inset-0 bg-neutral-900/[0.015] pointer-events-none rounded select-none uppercase tracking-widest text-[7px]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
