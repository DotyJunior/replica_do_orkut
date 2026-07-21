export interface ThemeStyle {
  bg: string;
  cardBg: string;
  text: string;
  borderClass: string;
  accent: string;
  glow: string;
  font: string;
  bannerGradient: string;
  navBg: string; // New
  topBarBg?: string; // New
  topBarText?: string; // New
  topBarAccent?: string; // New
  searchBarBg?: string; // New
  badgeBg: string;
  badgeText: string;
  communitiesBg: string; // Added
  panelBg: string; // Added
  inputBg: string; // Added
  textContrast: string; // Added
}

export const getThemeStyles = (themeId: string = 'default'): ThemeStyle => {
  const finalThemeId: string = themeId;
  switch (finalThemeId) {
    case 'victorian-gothic':
      return {
        bg: 'bg-[#150b1d] text-[#b08d57]',
        cardBg: 'bg-[#6e1f3f] border-[#b08d57] border text-[#b08d57]',
        text: 'text-[#b08d57]',
        borderClass: 'border-[#b08d57] border-2 shadow-[0_0_10px_rgba(176,141,87,0.5)]',
        accent: 'text-[#b08d57] bg-[#150b1d]/40 border-[#b08d57] border',
        glow: 'shadow-[0_0_15px_#150b1d]',
        font: 'font-gothic',
        bannerGradient: 'from-[#150b1d] via-[#6e1f3f] to-[#150b1d] border-b border-[#b08d57]',
        navBg: 'bg-[#302550] border-b border-[#b08d57]',
        badgeBg: 'bg-[#6e1f3f] border-[#b08d57] border',
        badgeText: 'text-[#b08d57]',
        communitiesBg: 'bg-[#150b1d]',
        panelBg: 'bg-[#302550]',
        inputBg: 'bg-[#150b1d]',
        textContrast: 'text-[#b08d57]',
      };
    case 'neon-hacker':
      return {
        bg: 'bg-black text-[#22c55e]',
        cardBg: 'bg-[#050505] border-[#22c55e] border text-[#22c55e]',
        text: 'text-[#22c55e]',
        borderClass: 'border-[#22c55e]/60 border-double border-4',
        accent: 'text-green-400 bg-green-950/40 border-green-500 border',
        glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]',
        font: 'font-mono uppercase tracking-wider',
        bannerGradient: 'from-black via-zinc-950 to-green-950 border-[#22c55e] border-b',
        navBg: 'bg-[#0a0a0a] border-b border-[#22c55e]',
        badgeBg: 'bg-green-950 border-green-500 border',
        badgeText: 'text-green-300',
        topBarBg: 'bg-[#111]',
        topBarText: 'text-green-200',
        topBarAccent: 'text-green-400',
        communitiesBg: 'bg-[#0a0a0a]',
        panelBg: 'bg-[#111]',
        inputBg: 'bg-black',
        textContrast: 'text-green-200',
      };
    case 'emo-2008':
      return {
        bg: 'bg-checkerboard text-[#f6339a]',
        cardBg: 'bg-zinc-800 border-[#f6339a] border-dashed border-2 text-neutral-200',
        text: 'text-neutral-200',
        borderClass: 'border-[#f6339a] border-dashed border-2',
        accent: 'text-[#f6339a] bg-black/40 border-[#f6339a] border',
        glow: 'shadow-[0_0_15px_rgba(246,51,154,0.45)]',
        font: 'font-comic',
        bannerGradient: 'from-neutral-900 to-zinc-900 border-b border-neutral-700',
        navBg: 'bg-neutral-900 border-b border-neutral-700',
        badgeBg: 'bg-zinc-850 border-[#f6339a] border',
        badgeText: 'text-[#f6339a]',
        topBarBg: 'bg-neutral-900',
        topBarText: 'text-[#f6339a]',
        topBarAccent: 'text-[#f6339a]',
        searchBarBg: 'bg-black',
        communitiesBg: 'bg-emo-textured',
        panelBg: 'bg-zinc-800',
        inputBg: 'bg-black',
        textContrast: 'text-pink-100',
      };
    case 'rock-underground':
      return {
        bg: 'bg-[#17130F] text-[#EDE3D0]',
        cardBg: 'bg-[#2A2019] border-[#B54A1D] border text-[#EDE3D0]',
        text: 'text-[#EDE3D0]',
        borderClass: 'border-[#B54A1D] border-2',
        accent: 'text-[#B54A1D] bg-[#2A2019]/40 border-[#B54A1D] border',
        glow: 'shadow-[0_0_10px_rgba(181,74,29,0.3)]',
        font: 'font-sans',
        bannerGradient: 'from-[#17130F] via-[#2A2019] to-[#8C1F1F] border-[#B54A1D] border-b',
        navBg: 'bg-[#1F1A15] border-b border-[#B54A1D]',
        badgeBg: 'bg-[#34281F] border-[#B54A1D] border',
        badgeText: 'text-[#EDE3D0]',
        topBarBg: 'bg-[#1F1A15]',
        topBarText: 'text-[#EDE3D0]',
        topBarAccent: 'text-[#D9A227]',
        communitiesBg: 'bg-[#2A2019]',
        panelBg: 'bg-[#2A2019]',
        inputBg: 'bg-[#17130F]',
        textContrast: 'text-[#EDE3D0]',
      };
    case 'cyberdeck':
      return {
        bg: 'bg-cyberdeck-circuit text-[#4ade80]',
        cardBg: 'bg-[#0c100a] border-[#1e2a14] border text-[#4ade80]',
        text: 'text-[#4ade80]',
        borderClass: 'border-[#1e2a14] border-2 shadow-[0_0_8px_rgba(58,90,30,0.4)]',
        accent: 'text-[#39ff14] bg-[#060b04] border-[#1e2a14] border',
        glow: 'shadow-[0_0_12px_rgba(58,90,30,0.3)]',
        font: 'font-mono',
        bannerGradient: 'from-[#0b0f08] via-[#1c2a18] to-[#0e1209] border-[#1e2a14] border-b',
        navBg: 'bg-[#0a0f0b] border-b border-[#1e2a14]',
        badgeBg: 'bg-[#1c2a18] border-[#1a2410] border',
        badgeText: 'text-[#39ff14]',
        topBarBg: 'bg-gradient-to-b from-[#080a06] to-[#1e2a14]',
        topBarText: 'text-[#4ade80]',
        topBarAccent: 'text-[#39ff14]',
        searchBarBg: 'bg-black',
        communitiesBg: 'bg-[#060b04]',
        panelBg: 'bg-[#0c100a]',
        inputBg: 'bg-[#060b04]',
        textContrast: 'text-[#39ff14]',
      };
    case 'vaporwave':
      return {
        bg: 'bg-gradient-to-tr from-[#fbcfe8] via-[#e9d5ff] to-[#ccfbf1] text-[#9333ea]',
        cardBg: 'bg-white/85 border-[#d946ef] border backdrop-blur-xs text-[#9333ea]',
        text: 'text-[#9333ea]',
        borderClass: 'border-[#d946ef]/60 border-2 border-double',
        accent: 'text-cyan-600 bg-[#ccfbf1]/50 border-cyan-300 border-b',
        glow: 'shadow-[4px_4px_0px_#9333ea]',
        font: 'font-sans italic',
        bannerGradient: 'from-pink-300 via-purple-300 to-cyan-300 border-b-2 border-[#d946ef]',
        navBg: 'bg-[#e9d5ff] border-b border-[#d946ef]',
        badgeBg: 'bg-purple-100 border-[#d946ef] border',
        badgeText: 'text-purple-700',
        topBarBg: 'bg-pink-200',
        topBarText: 'text-purple-900',
        topBarAccent: 'text-purple-600',
        communitiesBg: 'bg-white/50',
        panelBg: 'bg-[#e9d5ff]',
        inputBg: 'bg-white',
        textContrast: 'text-purple-900',
      };
    case 'minimal-oldweb':
      return {
        bg: 'bg-[#818181] text-black',
        cardBg: 'bg-[#d5d0c9] border-white border-t-2 border-l-2 border-b-black border-r-black border text-black',
        text: 'text-black',
        borderClass: 'border-t-2 border-l-2 border-b-stone-800 border-r-stone-800 border bg-[#d5d0c9]',
        accent: 'text-black bg-[#d5d0c9] border-black border',
        glow: 'shadow-none',
        font: 'font-serif',
        bannerGradient: 'from-stone-400 via-stone-300 to-stone-500 border-b-2 border-black',
        navBg: 'bg-[#c0c0c0] border-b border-black',
        badgeBg: 'bg-stone-300 border-stone-500 border',
        badgeText: 'text-black',
        topBarBg: 'bg-[#92afd9]',
        topBarText: 'text-black',
        topBarAccent: 'text-stone-700',
        searchBarBg: 'bg-white shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.35)]',
        communitiesBg: 'bg-[#c0c0c0]',
        panelBg: 'bg-[#d5d0c9]',
        inputBg: 'bg-white',
        textContrast: 'text-black',
      };
    case 'gotico-retro':
      return {
        bg: 'bg-gradient-to-br from-[#171b3e] to-[#323774] text-[#b08d57]',
        cardBg: 'bg-[#4c0c19]/70 border-[#b08d57] border text-[#b08d57]',
        text: 'text-[#b08d57]',
        borderClass: 'border-[#b08d57] border-2 shadow-[0_0_10px_rgba(176,141,87,0.5)]',
        accent: 'text-[#b08d57] bg-[#4c0c19]/40 border-[#b08d57] border',
        glow: 'shadow-[0_0_15px_#4c0c19]',
        font: 'font-gothic',
        bannerGradient: 'bg-gradient-to-r from-[#32203f] to-[#603f78] border-b border-[#b08d57]',
        navBg: 'bg-[#302550] border-b border-[#b08d57]',
        topBarBg: 'bg-gradient-to-b from-[#32203f] to-[#603f78]',
        topBarText: 'text-[#ced2d8]',
        topBarAccent: 'text-[#ff2c67]',
        searchBarBg: 'bg-black',
        badgeBg: 'bg-[#4c0c19]/70 border-[#b08d57] border',
        badgeText: 'text-[#b08d57]',
        communitiesBg: 'bg-[#4c0c19]/70',
        panelBg: 'bg-[#302550]',
        inputBg: 'bg-black',
        textContrast: 'text-[#b08d57]',
      };
    case 'matrix-terminal':
      return {
        bg: 'bg-black text-[#15803d]',
        cardBg: 'bg-black border-[#15803d] border text-[#22c55e]',
        text: 'text-[#22c55e]',
        borderClass: 'border-[#15803d]/70 border',
        accent: 'text-emerald-400 bg-black border-emerald-500 border',
        glow: 'shadow-[inset_0_0_10px_#15803d]',
        font: 'font-mono uppercase',
        bannerGradient: 'from-black via-[#041a0e] to-black border-b border-emerald-800',
        navBg: 'bg-black border-b border-emerald-800',
        badgeBg: 'bg-black border-emerald-700 border',
        badgeText: 'text-emerald-400',
        topBarBg: 'bg-[#111]',
        topBarText: 'text-green-400',
        topBarAccent: 'text-green-500',
        communitiesBg: 'bg-black',
        panelBg: 'bg-[#111]',
        inputBg: 'bg-black',
        textContrast: 'text-emerald-400',
      };
    default:
      return {
        bg: 'bg-[#dee7f4] text-neutral-800',
        cardBg: 'bg-white border-neutral-300 border text-neutral-800',
        text: 'text-neutral-800',
        borderClass: 'border-neutral-300 border',
        accent: 'text-[#1d4ed8] bg-[#dee7f4]/40 border-[#adc3df] border',
        glow: 'shadow-sm',
        font: 'font-sans',
        bannerGradient: 'from-[#dee7f4] via-[#c6d7ed] to-[#dee7f4] border-b border-[#9ebade]',
        navBg: 'bg-[#dbe4f1] border-b border-[#c4dafa]',
        badgeBg: 'bg-[#dee7f4] border-[#adc3df] border',
        badgeText: 'text-[#1d4ed8]',
        topBarBg: 'bg-[#92afd9]',
        topBarText: 'text-[#0d213f]',
        topBarAccent: 'text-rose-700',
        searchBarBg: 'bg-white',
        communitiesBg: 'bg-white',
        panelBg: 'bg-[#dbe4f1]',
        inputBg: 'bg-white',
        textContrast: 'text-neutral-800',
      };
  }
};
