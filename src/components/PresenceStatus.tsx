import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

interface PresenceStatusProps {
  profileId: string;
  isOwnProfile: boolean;
  profileName: string;
}

export type PresenceState = 'online' | 'away' | 'offline';

export default function PresenceStatus({ profileId, isOwnProfile, profileName }: PresenceStatusProps) {
  const [presence, setPresence] = useState<PresenceState>('online');
  const [lastActive, setLastActive] = useState<number>(Date.now());
  const [elapsedAwaySecs, setElapsedAwaySecs] = useState<number>(0);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Custom Override status selected by the user
  // 'auto' means automatic passive tracking of active gestures
  const [manualOverride, setManualOverride] = useState<'auto' | 'online' | 'away' | 'offline'>('auto');

  // Ref to track last activity without triggering extra re-renders
  const lastActiveRef = useRef<number>(Date.now());

  // Synth audio player for nostalgic MSN/ICQ alert tones
  const playRetroBuzzer = (soundName: 'knock' | 'online' | 'away' | 'offline') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const playNote = (freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.04) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(volume, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      if (soundName === 'online') {
        // Legendary MSN sign-in chime: Double high pop
        playNote(480, 0, 0.08, 'sine', 0.04);
        playNote(720, 0.06, 0.12, 'sine', 0.04);
      } else if (soundName === 'knock') {
        // MSN nudge door knock sound
        playNote(180, 0, 0.08, 'triangle', 0.06);
        playNote(180, 0.07, 0.08, 'triangle', 0.06);
        playNote(180, 0.14, 0.1, 'triangle', 0.06);
      } else if (soundName === 'away') {
        // Sad high-to-low whistle
        playNote(600, 0, 0.1, 'sine', 0.03);
        playNote(450, 0.08, 0.15, 'sine', 0.03);
      } else if (soundName === 'offline') {
        // Flat notification click
        playNote(300, 0, 0.05, 'triangle', 0.03);
        playNote(150, 0.05, 0.08, 'triangle', 0.03);
      }
    } catch (e) {
      console.log('Audio deferred in iframe context.');
    }
  };

  // Seed relative times / values for other profiles to feel human/alive
  // We compute them on profileId change and keep them steady
  const externalPresenceConfig = useRef<Record<string, { baseState: PresenceState; text: string }>>({});
  
  if (!externalPresenceConfig.current[profileId]) {
    // Generate static seed characteristics for the other profile
    if (profileId === 'orkut') {
      externalPresenceConfig.current[profileId] = {
        baseState: 'online',
        text: 'está online agora'
      };
    } else if (profileId === 'alexandre') {
      // 30% chance online, 70% offline/away due to State legislative routines
      const isOnline = Date.now() % 3 < 1;
      externalPresenceConfig.current[profileId] = {
        baseState: isOnline ? 'away' : 'offline',
        text: isOnline ? 'ausente há 15 minutos' : 'offline desde às 09:30'
      };
    } else if (profileId === 'hacker') {
      // Lurks at night, might appear on-duty dynamically
      const hour = new Date().getHours();
      const isDarkHours = hour < 6 || hour > 18;
      externalPresenceConfig.current[profileId] = {
        baseState: isDarkHours ? 'online' : 'offline',
        text: isDarkHours ? 'está online agora' : 'offline há 4 horas'
      };
    } else {
      externalPresenceConfig.current[profileId] = {
        baseState: 'offline',
        text: 'offline desde terça-feira'
      };
    }
  }

  // 1. Core Event Listeners for the current Active User
  useEffect(() => {
    if (!isOwnProfile) return;

    const updateActivity = () => {
      const now = Date.now();
      // Only set state occasionally to avoid clogging React tree rendering cycles
      if (now - lastActiveRef.current > 1500) {
        setLastActive(now);
      }
      lastActiveRef.current = now;
    };

    // Listen to standard interaction flags
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach(item => window.addEventListener(item, updateActivity, { passive: true }));

    return () => {
      events.forEach(item => window.removeEventListener(item, updateActivity));
    };
  }, [isOwnProfile, profileId]);

  // 2. Real-time ticker processing status transitions every second
  useEffect(() => {
    // Save previous state to play sound alerts when state changes for yourself!
    let previousState: PresenceState = 'online';

    const interval = setInterval(() => {
      if (!isOwnProfile) {
        // Let other users drift occasionally to feel alive!
        const config = externalPresenceConfig.current[profileId];
        if (config && config.baseState === 'online') {
          // If we stay on Orkut's page for a long time, let's say 40s, he might go away
          const totalSecsOnPage = Math.floor((Date.now() - configOffsetTime.current) / 1000);
          if (totalSecsOnPage > 45) {
            setPresence('away');
            setElapsedAwaySecs(Math.floor((totalSecsOnPage - 45) / 10)); // simulated
          } else {
            setPresence('online');
          }
        } else if (config) {
          setPresence(config.baseState);
        }
        return;
      }

      // If user overrides their state manually, skip auto calculation
      if (manualOverride !== 'auto') {
        const nextState = manualOverride;
        if (nextState !== presence) {
          playRetroBuzzer(nextState);
          setPresence(nextState);
        }
        return;
      }

      const sinceLastActive = Date.now() - lastActiveRef.current;
      const secondsInactivity = Math.floor(sinceLastActive / 1000);

      let nextPresence: PresenceState = 'online';
      if (secondsInactivity >= 15 && secondsInactivity < 60) {
        nextPresence = 'away';
        setElapsedAwaySecs(secondsInactivity - 15);
      } else if (secondsInactivity >= 60) {
        nextPresence = 'offline';
        setElapsedAwaySecs(Math.floor(secondsInactivity / 60)); // will say "offline há X minutos"
      } else {
        nextPresence = 'online';
      }

      if (nextPresence !== presence) {
        playRetroBuzzer(nextPresence);
        setPresence(nextPresence);
      }
    }, 1000);

    const configOffsetTime = { current: Date.now() };

    return () => clearInterval(interval);
  }, [isOwnProfile, profileId, manualOverride, presence]);

  // Handle profile change and seed setup
  useEffect(() => {
    // When changing viewed profile, reset and trigger high fidelity "entered" chirp
    if (isOwnProfile) {
      // Read initial tracking state immediately
      const currentDiff = Math.floor((Date.now() - lastActiveRef.current) / 1000);
      if (manualOverride === 'auto') {
        if (currentDiff > 60) setPresence('offline');
        else if (currentDiff > 15) setPresence('away');
        else setPresence('online');
      } else {
        setPresence(manualOverride);
      }
    } else {
      const config = externalPresenceConfig.current[profileId];
      if (config) {
        setPresence(config.baseState);
      }
    }
  }, [profileId, isOwnProfile, manualOverride]);

  // Formatter text labels
  const getRenderDetails = () => {
    if (!isOwnProfile) {
      const config = externalPresenceConfig.current[profileId];
      if (presence === 'away') {
        return {
          colorClass: 'bg-amber-400',
          pulse: false,
          label: 'ausente há alguns minutos',
          iconName: '🟡'
        };
      }
      if (presence === 'offline') {
        return {
          colorClass: 'bg-neutral-350 border border-neutral-400',
          pulse: false,
          label: config?.text || 'offline desde ontem às 14:03',
          iconName: '⚪'
        };
      }
      return {
        colorClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
        pulse: true,
        label: 'está online agora',
        iconName: '🟢'
      };
    }

    // Is own profile
    if (presence === 'away') {
      const displayVal = elapsedAwaySecs > 0 ? (elapsedAwaySecs < 60 ? `${elapsedAwaySecs}s` : `${Math.floor(elapsedAwaySecs / 60)} min`) : '15s';
      return {
        colorClass: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
        pulse: false,
        label: `ausente há ${displayVal}`,
        iconName: '🟡'
      };
    }

    if (presence === 'offline') {
      const displayVal = elapsedAwaySecs > 0 ? `${elapsedAwaySecs} min` : '1 min';
      return {
        colorClass: 'bg-neutral-300 border border-neutral-400',
        pulse: false,
        label: `offline há ${displayVal} (inativo)`,
        iconName: '⚪'
      };
    }

    return {
      colorClass: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.73)]',
      pulse: true,
      label: 'está online agora',
      iconName: '🟢'
    };
  };

  const { colorClass, pulse, label, iconName } = getRenderDetails();

  return (
    <div className="relative inline-block font-sans select-none text-left pt-0.5">
      
      {/* Dynamic Status Pill */}
      <div 
        className="flex items-center gap-2 cursor-pointer group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (isOwnProfile) {
            playRetroBuzzer('knock');
            setShowStatusDropdown(!showStatusDropdown);
          }
        }}
      >
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors text-[11px] ${
          presence === 'online'
            ? 'bg-[#107e45] border-[#50fe6b] text-[#39ffc1] hover:bg-[#128e4e] hover:border-[#5efe7a]'
            : 'border-neutral-300/40 bg-neutral-100/40 text-neutral-700 hover:bg-neutral-200/40'
        }`}>
          
          {/* Dot container with pulse option */}
          <div className="relative flex items-center justify-center w-2.5 h-2.5">
            {pulse && (
              <span className={`absolute animate-ping inline-flex h-full w-full rounded-full opacity-75 ${
                presence === 'online' ? 'bg-[#16fc4b]' : 'bg-emerald-400'
              }`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              presence === 'online' ? 'bg-[#16fc4b] shadow-[0_0_10px_rgba(22,252,75,0.8)]' : colorClass
            }`} />
          </div>

          <span className={`font-sans font-medium tracking-tight ${
            presence === 'online' ? 'text-[#39ffc1]' : 'text-neutral-700'
          }`}>
            {label}
          </span>
          
          {isOwnProfile && (
            <ChevronDown size={11} className={`transition-colors ${
              presence === 'online' ? 'text-[#f3f6f3]' : 'text-neutral-400 group-hover:text-neutral-600'
            }`} />
          )}
        </div>

        {/* Hover Autodetect info badge slide-in */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, x: 4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="absolute left-full ml-2 top-0 z-50 whitespace-nowrap bg-neutral-900 border border-neutral-700/80 text-white text-[9.5px] px-2 py-0.5 font-mono rounded shadow-[0_4px_10px_rgba(0,0,0,0.25)] flex items-center gap-1"
            >
              <span>🔍</span>
              <span>última atividade detectada automaticamente</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Retro Dropdown Selector (MSN Style) */}
      <AnimatePresence>
        {isOwnProfile && showStatusDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowStatusDropdown(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              className="absolute left-0 mt-1.5 z-50 w-44 bg-white border border-neutral-350 rounded shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden text-xs text-neutral-800"
            >
              <div className="bg-[#dee7f4] px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-[#1d4ed8] font-sans flex justify-between items-center border-b border-dashed border-neutral-300">
                <span>Estado MSN / Scrapzone</span>
                <span className="text-[10px] animate-pulse">⚡</span>
              </div>
              
              <div className="py-1">
                {/* 1. AUTO */}
                <button
                  onClick={() => {
                    setManualOverride('auto');
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sky-500 font-bold">⚡</span>
                    <span className="font-semibold text-neutral-700">Modo Automático</span>
                  </span>
                  {manualOverride === 'auto' && <Check size={11} className="text-indigo-600 font-bold" />}
                </button>
                
                <div className="border-t border-neutral-150 my-1" />

                {/* 2. ONLINE FORCE */}
                <button
                  onClick={() => {
                    setManualOverride('online');
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Forçar Online</span>
                  </span>
                  {manualOverride === 'online' && <Check size={11} className="text-indigo-600 font-bold" />}
                </button>

                {/* 3. AWAY FORCE */}
                <button
                  onClick={() => {
                    setManualOverride('away');
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Forçar Ausente</span>
                  </span>
                  {manualOverride === 'away' && <Check size={11} className="text-indigo-600 font-bold" />}
                </button>

                {/* 4. OFFLINE FORCE */}
                <button
                  onClick={() => {
                    setManualOverride('offline');
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-neutral-350 border border-neutral-400" />
                    <span>Forçar Invisível</span>
                  </span>
                  {manualOverride === 'offline' && <Check size={11} className="text-indigo-600 font-bold" />}
                </button>

                <div className="border-t border-neutral-150 my-1" />

                {/* Sound effect tester */}
                <button
                  onClick={() => {
                    playRetroBuzzer('knock');
                  }}
                  className="w-full text-left px-3 py-1 text-[9.5px] text-neutral-500 hover:text-sky-700 hover:bg-sky-50 flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <span>🔊</span>
                  <span>Chamar a atenção (Chime)</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
