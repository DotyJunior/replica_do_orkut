export interface Theme {
  id: string;
  name: string;
  // classes Tailwind para aplicar o tema
  bgClass: string;
  textClass: string;
  containerClass?: string;
  fontClass?: string;
}

export const AVAILABLE_THEMES: Theme[] = [
  { id: 'default', name: 'Original ScrapZone', bgClass: 'bg-white', textClass: 'text-neutral-900', containerClass: 'bg-white', fontClass: 'font-sans' },
  { id: 'dark-mode', name: 'Modo Noturno', bgClass: 'bg-neutral-900', textClass: 'text-neutral-100', containerClass: 'bg-neutral-800', fontClass: 'font-sans' },
  { id: 'retro-emo', name: 'Emo 2008', bgClass: 'bg-rose-950', textClass: 'text-rose-100', containerClass: 'bg-rose-900', fontClass: 'font-sans' },
  { id: 'cyberpunk', name: 'Cyberpunk', bgClass: 'bg-slate-950', textClass: 'text-cyan-400', containerClass: 'bg-slate-900', fontClass: 'font-cyber' },
  { id: 'victorian-gothic', name: 'Victorian Gothic', bgClass: 'bg-[#150b1d]', textClass: 'text-[#b08d57]', containerClass: 'bg-[#6e1f3f]', fontClass: 'font-gothic' },
];
