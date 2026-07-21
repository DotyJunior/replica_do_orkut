import { useState, useEffect } from 'react';
import { Shield, Search, Lock, Cpu, Globe } from 'lucide-react';
import { ThemeStyle } from '../lib/theme';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userName: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onLogout?: () => void;
  themeStyles: ThemeStyle;
  siteLogo?: string;
  showAssets?: boolean;
  themeId?: string;
}

export default function OrkutHeader({ 
  currentTab, 
  setCurrentTab, 
  userName,
  searchQuery,
  setSearchQuery,
  onLogout,
  themeStyles,
  siteLogo,
  showAssets = false,
  themeId,
}: HeaderProps) {

  const [batFrame, setBatFrame] = useState('01');
  const [isBatVisible, setIsBatVisible] = useState(false);

  // Preload all 7 PNG frames to ensure smooth and zero-flicker animation
  useEffect(() => {
    if (themeId !== 'gotico-retro') return;
    const frames = ['01', '02', '03', '04', '05', '06', '07'];
    frames.forEach(frame => {
      const img = new Image();
      img.src = `/assets/themes/gothic/creatures/morcego-gotico/morcego-frame-${frame}.png`;
    });
  }, [themeId]);

  // Robust loop with exact timing for each frame
  useEffect(() => {
    if (themeId !== 'gotico-retro') return;

    const frames = ['01', '02', '03', '04', '05', '06', '07'];
    const delays: Record<string, number> = {
      '01': 1500,
      '02': 300,
      '03': 300,
      '04': 900,
      '05': 300,
      '06': 300,
      '07': 900,
    };

    const currentFrameIndex = frames.indexOf(batFrame);
    if (currentFrameIndex === -1) return;

    const nextIndex = (currentFrameIndex + 1) % frames.length;
    const nextFrame = frames[nextIndex];
    const delay = delays[batFrame] || 120;

    const timer = setTimeout(() => {
      setBatFrame(nextFrame);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [batFrame, themeId]);

  // Daily rare appearance system for the gothic bat
  useEffect(() => {
    if (themeId !== 'gotico-retro') return;

    const checkVisibility = () => {
      const now = new Date();
      const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      
      let storedDate = localStorage.getItem('bat_appearance_date');
      let storedTime = localStorage.getItem('bat_appearance_time');

      if (!storedDate || storedDate !== todayStr || !storedTime) {
        // Sorteio diário único
        const isFriday = now.getDay() === 5;
        let baseMinutes = 0;
        let offset = 0;

        if (isFriday) {
          baseMinutes = 23 * 60; // 23:00 base
          offset = Math.floor(Math.random() * 31) - 15; // -15 to +15 variation
        } else {
          const useOptionA = Math.random() < 0.5;
          baseMinutes = useOptionA ? (19 * 60 + 20) : (20 * 60); // 19:20 or 20:00 base
          offset = Math.floor(Math.random() * 21) - 10; // -10 to +10 variation
        }

        const targetMinutes = baseMinutes + offset;
        const h = Math.floor(targetMinutes / 60);
        const m = targetMinutes % 60;
        storedTime = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        storedDate = todayStr;

        localStorage.setItem('bat_appearance_date', todayStr);
        localStorage.setItem('bat_appearance_time', storedTime);
      }

      // Parse current stored time for today's appearance
      const [sh, sm] = storedTime.split(':').map(Number);
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm, 0, 0);
      const startTime = start.getTime();
      const endTime = startTime + 120 * 1000; // 120 seconds duration
      const nowTime = now.getTime();

      const visible = nowTime >= startTime && nowTime < endTime;
      setIsBatVisible(visible);
    };

    // Check visibility immediately
    checkVisibility();

    // Check visibility every 1 second to stay updated
    const intervalId = setInterval(checkVisibility, 1000);
    return () => clearInterval(intervalId);
  }, [themeId]);

  const menuItems = [
    { id: 'profile', label: 'INICIO' },
    { id: 'scrapbook', label: 'PAGINA DE RECADOS' },
    { id: 'testimonials', label: 'DEPOIMENTOS' },
    { id: 'communities', label: 'COMUNIDADES' },
    { id: 'scrapbook-builder', label: '🎨 BUILDER DE SCRAPS' },
    ...(showAssets ? [{ id: 'assets-manager', label: '🗂️ ASSETS' }] : [])
  ];

  return (
    <header className="w-full font-sans select-none">
      {/* 1. TOP BAR: Classic Vintage Blue (Themed) */}
      <div className={`${themeStyles.topBarBg} ${themeStyles.topBarText} border-b border-black/10 py-3 px-4 ${themeStyles.bg.includes('bg-checkerboard') ? 'border-b-2 border-dashed border-pink-500' : ''}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Left: Vintage Search Bar with Square Search Icon Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                setCurrentTab('search');
              }
            }}
            className="flex items-center"
          >
            <button
              type="submit"
              className={`${themeStyles.searchBarBg || themeStyles.topBarBg} border-neutral-400 border-r-0 h-8 w-8 flex items-center justify-center ${themeStyles.topBarText} cursor-pointer`}
              title="Pesquisar"
            >
              <Search size={16} className="stroke-[3]" />
            </button>
            <input
              id="header-search-bar"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder=""
              className={`px-2.5 py-1 text-xs w-[200px] sm:w-[240px] md:w-[280px] ${themeStyles.searchBarBg || themeStyles.topBarBg} border border-neutral-400 focus:outline-none shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)] ${themeStyles.topBarText} h-8`}
            />
          </form>

          {/* Right: Username, Settings link, and Connection Security Badge */}
          <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right font-sans">
            <div className={`text-[12px] ${themeStyles.topBarText} font-semibold flex items-center gap-1.5 flex-wrap justify-center md:justify-end`}>
              <span>Olá {userName}</span>
              <span className="opacity-50">|</span>
              <button 
                onClick={() => setCurrentTab('profile')} 
                className={`hover:underline font-bold ${themeStyles.topBarText} cursor-pointer`}
              >
                Configurações
              </button>
              {onLogout && (
                <>
                  <span className="opacity-50">|</span>
                  <button 
                    onClick={onLogout} 
                    className="bg-black hover:bg-zinc-900 border border-pink-500 rounded-lg px-3 py-1 font-extrabold text-pink-500 shadow-[0_0_5px_rgba(236,72,153,0.5)] cursor-pointer uppercase text-[10.5px] tracking-tight transition-all"
                  >
                    Sair
                  </button>
                </>
              )}
            </div>

            {/* Connection Security Badge */}
            <div className="flex items-center gap-1.5 bg-[#0b1f3c] border border-[#0d264a] text-yellow-500 font-extrabold rounded px-2.5 py-1 text-[9px] uppercase tracking-tight select-none opacity-90">
              <span className="text-[10px] leading-none">🛡️</span>
              <span className="text-[#a7c2be] text-[9px] font-sans">SUA CONEXÃO É SEGURA</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. NAVIGATION BAR: Vintage Light Slate Blue */}
      <div className={`relative overflow-hidden ${themeStyles.navBg} py-3.5 px-4`}>
        {themeId === 'gotico-retro' && (
          <>
            <div 
              className="absolute inset-0 pointer-events-none opacity-25 z-0"
              style={{
                backgroundImage: "url('/assets/themes/elemento-prara-textura-de-fundo.svg'), url('/assets/themes/elemento-prara-textura-de-fundo.svg')",
                backgroundPosition: '0 0, 50px 50px',
                backgroundRepeat: 'repeat',
                backgroundSize: '100px 100px',
              }}
            />
            {isBatVisible && (
              <img 
                src={`/assets/themes/gothic/creatures/morcego-gotico/morcego-frame-${batFrame}.png`}
                alt="Morcego Gótico"
                className="absolute right-0 h-full max-h-[150px] z-20 pointer-events-none select-none object-contain object-right-top"
                referrerPolicy="no-referrer"
                style={{
                  filter: 'none',
                  boxShadow: 'none',
                  opacity: 1,
                  transition: 'none',
                  animation: 'none',
                  mixBlendMode: 'normal',
                  background: 'transparent',
                  top: (batFrame === '06' || batFrame === '07') ? '2px' : '0px'
                }}
              />
            )}
          </>
        )}
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4 relative z-10">
          
          {/* Brand Logo Scrapzone */}
          <div 
            className="flex items-center cursor-pointer select-none" 
            onClick={() => {
              setSearchQuery('');
              setCurrentTab('profile');
            }}
          >
            {siteLogo ? (
              <img 
                src={siteLogo} 
                alt="Scrapzone Logo" 
                className="h-[110px] md:h-[120px] object-contain transition-transform hover:scale-102 active:scale-98"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-[110px] md:h-[120px] w-1" />
            )}
          </div>

          {/* Horizontal Vintage Menu Alignment directly adjacent to the logo, exactly like reference images */}
          <div className="flex flex-wrap gap-1.5 items-center justify-center md:justify-start w-full md:w-auto">
            {menuItems.map((item) => {
              const isActive = currentTab === item.id;
              let buttonClassName = "";
              
              if (themeId === 'rock-underground') {
                buttonClassName = "text-[#d4dbd9] bg-gradient-to-b from-[#333333] to-[#1a1a1a] hover:bg-gradient-to-b hover:from-[#ff8c00] hover:to-[#cc5500] hover:text-black";
              } else if (themeId === 'cyberdeck') {
                if (isActive) {
                  buttonClassName = "bg-[#0c100a] text-[#39ff14] border border-[#d946ef] shadow-[0_0_8px_rgba(217,70,239,0.6)]";
                } else {
                  buttonClassName = "bg-[#060b04] text-[#94a3b8] border border-[#1e2a14] hover:bg-[#0c100a] hover:text-[#39ff14] hover:border-[#d946ef] hover:shadow-[0_0_8px_rgba(217,70,239,0.6)]";
                }
              } else if (themeStyles.bg.includes('bg-checkerboard')) {
                if (item.id === 'communities' && currentTab === 'communities') {
                  buttonClassName = "bg-neutral-800 text-white shadow-sm border-2 border-pink-500 rounded-lg scale-105";
                } else if (currentTab === item.id) {
                  buttonClassName = "bg-zinc-800 text-pink-500 shadow-xs border border-pink-500";
                } else {
                  buttonClassName = "bg-transparent text-white hover:text-pink-500 hover:shadow-[0_0_10px_#ec4899] border border-transparent hover:border-pink-500";
                }
              } else {
                if (item.id === 'communities' && currentTab === 'communities') {
                  buttonClassName = "bg-white text-[#9d174d] shadow-sm border-2 border-[#1b4372] font-black rounded-lg scale-105";
                } else if (currentTab === item.id) {
                  buttonClassName = "bg-[#1b4372] text-white shadow-xs border border-[#1b4372]";
                } else {
                  buttonClassName = "bg-[#406a94] hover:bg-[#34597d] text-white border border-[#406a94]";
                }
              }

              return (
                <button
                  id={`tab-btn-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentTab(item.id);
                  }}
                  className={`nav-button px-4 py-2 text-[11px] font-black uppercase tracking-wide rounded-sm font-sans transition-all cursor-pointer ${buttonClassName}`}
                >
                  {item.id === 'communities' ? 'COMUNIDADE' : item.label}
                </button>
              );
            })}

            {/* Special MINHAS COMUNIDADES Tab button matching mockup - hidden on Profile page */}
            {currentTab !== 'profile' && (
              <button
                id="tab-btn-my-communities"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentTab('communities');
                }}
                className={`px-4 py-2 text-[11px] font-black uppercase tracking-wide border-2 rounded-lg shadow-sm transition-all cursor-pointer shrink-0 ml-1.5 hover:scale-102 font-sans ${
                  themeId === 'cyberdeck'
                    ? 'border-[#d946ef]/60 bg-[#060b04] text-[#39ff14] hover:bg-[#0c100a] hover:shadow-[0_0_8px_rgba(217,70,239,0.6)]'
                    : themeStyles.bg.includes('bg-checkerboard')
                    ? 'border-pink-500 bg-neutral-800 text-pink-300 hover:shadow-[0_0_10px_#ec4899]'
                    : 'border-pink-600 bg-white hover:bg-pink-50 text-pink-600'
                }`}
              >
                MINHAS COMUNIDADES
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
