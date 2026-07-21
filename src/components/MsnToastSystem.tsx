import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Sparkles } from 'lucide-react';

interface FriendAlert {
  id: string;
  name: string;
  avatar: string;
  statusText: string;
  actionType: 'online' | 'away' | 'status-change';
  timestamp?: string;
  senderId?: string;
}

const POPULAR_STATUS_PRESETS = [
  'ouvindo Linkin Park 🎸',
  'escrevendo compilador Rust 🦀',
  'perdido no ciber café 🖥️',
  'viajando sem rumo 🏔️',
  'jogando CS 1.6 - de faca! ⚔️',
  'comendo pinhão cozido quente 🌲',
  'configurando RSA keypairs 🔑'
];

export default function MsnToastSystem() {
  const [activeAlert, setActiveAlert] = useState<FriendAlert | null>(null);
  
  // Audio synthesizer for classic MSN signature popup tone
  const playMsnSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // Quick double tone: Tugudum!
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // First drum tone (330Hz) starting instantly
      osc1.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
      // Second bright chime tone (659.25Hz) starting with minor delay
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.075); // E5

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);

      osc2.start(ctx.currentTime + 0.075);
      osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log('MSN alert audio deferred.');
    }
  };

  useEffect(() => {
    // Event listener for real programmatically triggered MSN alerts
    const handleRealMsnAlert = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        const { name, avatar, statusText, actionType, timestamp, senderId } = customEvent.detail;
        setActiveAlert({
          id: 'alert_' + Date.now(),
          name: name || 'Amigo',
          avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          statusText: statusText || 'recado seguro',
          actionType: actionType || 'online',
          timestamp: timestamp || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          senderId: senderId
        });

        // Play MSN chime sound
        playMsnSound();

        // Dismiss automatically after 7 seconds
        setTimeout(() => {
          setActiveAlert(current => {
            if (current?.name === name && current?.statusText === statusText) {
              return null;
            }
            return current;
          });
        }, 7000);
      }
    };

    window.addEventListener('msn-real-alert', handleRealMsnAlert);
    return () => {
      window.removeEventListener('msn-real-alert', handleRealMsnAlert);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none font-sans select-none">
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="pointer-events-auto w-72 bg-[#fdfdfd] border-2 border-sky-600 rounded shadow-[0_6px_20px_rgba(0,0,0,0.18)] overflow-hidden text-left"
          >
            {/* Header / MSN style window bar */}
            <div className="bg-[#3b61b4] text-white px-2.5 py-1.5 text-[11px] uppercase font-bold tracking-wider flex justify-between items-center shadow-inner">
              <span className="flex items-center gap-1 font-sans">
                <span>🔔</span> Nova Mensagem
              </span>
              <button 
                onClick={() => setActiveAlert(null)}
                className="text-white/80 hover:text-white cursor-pointer hover:bg-white/10 p-0.5 rounded transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Custom separators and content layout requested by the user */}
            <div className="p-3 bg-gradient-to-br from-[#ebf4fa] to-white">
              <div className="border-b border-neutral-200 pb-1.5 mb-2.5 text-[9px] text-neutral-400 font-mono tracking-wider text-center">
                -------------------------
              </div>

              <div className="flex items-center gap-3">
                {/* Profile Avatar formatted using standard img */}
                <div className="relative flex-shrink-0">
                  <img
                    src={activeAlert.avatar}
                    alt={activeAlert.name}
                    className="w-12 h-12 rounded-lg object-cover border-2 border-[#ff00a0]/60 p-[1px] bg-white shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Sender details and message preview */}
                <div className="flex-1 min-w-0 text-left">
                  <h5 className="text-[11px] text-neutral-500 font-sans leading-tight">
                    De: <span className="text-[#3b61b4] font-bold text-xs">{activeAlert.name}</span>
                  </h5>
                  <p className="text-[10px] text-neutral-600 truncate mt-1 italic">
                    "{activeAlert.statusText}"
                  </p>
                  <span className="text-[9px] text-[#1e3a8a] font-medium block mt-1">
                    Recebida às {activeAlert.timestamp}
                  </span>
                </div>
              </div>

              {/* [ Abrir Conversa ] click prompt to open the thread instantly */}
              {activeAlert.senderId && (
                <div className="mt-3 pt-2 border-t border-neutral-100 flex justify-center">
                  <button
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('msn-open-chat', {
                          detail: { partnerId: activeAlert.senderId }
                        })
                      );
                      setActiveAlert(null);
                    }}
                    className="w-full py-1 text-[11px] font-bold text-[#3b61b4] hover:text-white bg-blue-50 hover:bg-[#3b61b4] cursor-pointer rounded border border-blue-200 transition-all text-center uppercase tracking-wider"
                    id="open-chat-action-btn"
                  >
                    [ Abrir Conversa ]
                  </button>
                </div>
              )}
            </div>

            {/* Glowing bottom line indicator */}
            <div className="h-1 bg-gradient-to-r from-[#ff00a0] via-[#00d4ff] to-amber-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
