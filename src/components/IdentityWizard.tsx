import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { evaluatePasswordStrength } from '../utils/password';
import { 
  Lock, 
  Sparkles, 
  ShieldCheck, 
  Mail, 
  User, 
  UserCheck, 
  ArrowRight, 
  RefreshCw, 
  Volume2, 
  Smile, 
  Camera,
  CheckCircle2,
  Tv
} from 'lucide-react';

interface IdentityWizardProps {
  onComplete: (data: {
    name: string;
    username: string;
    statusOnline: string;
    theme: string;
    aboutMe?: string;
  }) => void;
  onClose: () => void;
  currentProfile: any;
}

export default function IdentityWizard({ onComplete, onClose, currentProfile }: IdentityWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Screen 1 fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const currentPasswordStrength = evaluatePasswordStrength(password);

  // Screen 2 fields
  const [fullName, setFullName] = useState(currentProfile.name);
  const [username, setUsername] = useState(currentProfile.username || 'rust.nomad');
  const [customStatus, setCustomStatus] = useState('● programando em Rust');
  const [selectedTheme, setSelectedTheme] = useState('neon-hacker');
  const [avatarIndex, setAvatarIndex] = useState(0);

  // Custom static avatars
  const avatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', // Default
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', // Purple user
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', // Developer user
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', // Indie user
  ];

  // Old web statuses list
  const retroStatuses = [
    '● ouvindo Linkin Park',
    '● programando em Rust',
    '● desaparecido no mundo',
    '● online no cyber café',
    '● viajando sem destino'
  ];

  // Retro themes list
  const themePresets = [
    { id: 'default', name: 'Padrão Clássico', desc: 'O bom e velho azul de 2004.' },
    { id: 'neon-hacker', name: 'Neon Hacker', desc: 'Verde terminal, CRT e brilho sob o chassi.' },
    { id: 'emo-2008', name: 'Emo 2008', desc: 'Rosa choque, corações pretos e Linkin Park no talo.' },
    { id: 'rock-underground', name: 'Rock Underground', desc: 'Laranja chapa e fumaça de Curitiba.' },
    { id: 'cyberdeck', name: 'Cyberdeck', desc: 'Aço marinho com cianeto e neon purpurina.' },
    { id: 'vaporwave', name: 'Vaporwave', desc: 'Gradientes pastel, grid estático e nostalgia 90s.' },
    { id: 'minimal-oldweb', name: 'Web-anos-90 ( Windows 95/98 )', desc: 'Cinza clássico Windows 95 e fontes serif.' },
    { id: 'gotico-retro', name: 'Gótico Retrô', desc: 'Veludo escuro, sombras medievais e escarlate.' },
    { id: 'matrix-terminal', name: 'Matrix Terminal', desc: 'Monocromático fósforo verde.' }
  ];

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!email || !password) return;
      setStep(2);
    } else if (step === 2) {
      if (!fullName || !username) return;
      setStep(3);
    }
  };

  const handleFinish = () => {
    // Audio sim alert
    onComplete({
      name: fullName,
      username: username.replace('@', '').toLowerCase().trim(),
      statusOnline: customStatus,
      theme: selectedTheme
    });
  };

  return (
    <div className="fixed inset-0 m-auto bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] pointer-events-none" />
      
      <div className="bg-white border-2 border-indigo-400 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden text-left flex flex-col relative">
        {/* CRT Scanline look inside modal */}
        <div className="absolute inset-0 bg-[#000]/05 pointer-events-none" />

        {/* Header bar */}
        <div className="bg-[#dee7f4] px-4 py-2 border-b border-indigo-200 flex justify-between items-center bg-gradient-to-r from-[#dee7f4] to-[#adc3df]">
          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5 font-sans">
            <Tv size={14} className="text-[#d946ef]" /> 
            WIZARD DE IDENTIDADE DIGITAL SCRAPZONE
          </span>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-black font-bold font-sans text-xs cursor-pointer bg-white/50 px-1.5 rounded"
          >
            fechar x
          </button>
        </div>

        {/* Steps Ribbon */}
        <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 flex items-center justify-between text-[11px] font-sans">
          <span className={`font-semibold ${step >= 1 ? 'text-[#d946ef]' : 'text-neutral-400'}`}>1. Registro Moderno</span>
          <ArrowRight size={12} className="text-neutral-300" />
          <span className={`font-semibold ${step >= 2 ? 'text-[#1d4ed8]' : 'text-neutral-400'}`}>2. Identificação Old School</span>
          <ArrowRight size={12} className="text-neutral-300" />
          <span className={`font-semibold ${step >= 3 ? 'text-green-600' : 'text-neutral-400'}`}>3. Validação</span>
        </div>

        <div className="p-5 overflow-y-auto max-h-[480px]">
          <AnimatePresence mode="wait">
            {/* STEP 1: CADASTRO MODERNO */}
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleNextStep}
                className="space-y-4"
              >
                <div className="bg-slate-50 border border-slate-150 p-3 rounded text-slate-700 text-xs text-left mb-2">
                  <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1">
                    🚀 Volta pro lado humano da internet
                  </p>
                  Não criamos logs de navegação vazados no mercado. O Scrapzone-Secure valida sua identidade usando assinaturas assimétricas em memória-segura.
                </div>

                <div className="space-y-3 font-sans">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">E-mail ou Telefone Móvel:</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 text-neutral-400" size={14} />
                      <input
                        id="wizard-input-email"
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: dario@curitiba.com.br"
                        className="w-full pl-8 pr-2.5 py-1.5 border border-neutral-300 rounded text-xs text-neutral-800 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Senha Secreta:</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 text-neutral-400" size={14} />
                      <input
                        id="wizard-input-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••••"
                        className="w-full pl-8 pr-2.5 py-1.5 border border-neutral-300 rounded text-xs text-neutral-800 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Password strength analysis for simulated wizard */}
                  {password && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2 text-xs font-sans animate-fade-in shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-dashed border-slate-200 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">Força da Senha:</span>
                          {currentPasswordStrength.label === 'Bloqueada' && (
                            <span className="font-extrabold text-red-600 uppercase flex items-center gap-1">
                              🔴 {currentPasswordStrength.label}
                            </span>
                          )}
                          {currentPasswordStrength.label === 'Fraca' && (
                            <span className="font-extrabold text-rose-500 uppercase flex items-center gap-1">
                              🔴 {currentPasswordStrength.label}
                            </span>
                          )}
                          {currentPasswordStrength.label === 'Média' && (
                            <span className="font-extrabold text-amber-500 uppercase flex items-center gap-1">
                              🟠 {currentPasswordStrength.label}
                            </span>
                          )}
                          {currentPasswordStrength.label === 'Forte' && (
                            <span className="font-extrabold text-emerald-600 uppercase flex items-center gap-1">
                              🟢 {currentPasswordStrength.label}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] tracking-wider text-slate-600 font-bold">
                          {currentPasswordStrength.progressBar}
                        </span>
                      </div>
                      <div className={`text-[11px] leading-relaxed p-1.5 rounded font-sans ${
                        currentPasswordStrength.label === 'Bloqueada' ? 'bg-rose-50 text-rose-700 font-semibold' :
                        currentPasswordStrength.label === 'Fraca' ? 'bg-rose-50/30 text-neutral-600 font-medium' :
                        currentPasswordStrength.label === 'Média' ? 'bg-amber-50/50 text-amber-800 font-medium' :
                        'bg-emerald-50 text-emerald-800 font-semibold'
                      }`}>
                        {currentPasswordStrength.helpMessage}
                      </div>

                      {/* Criteria check dot items */}
                      <div className="text-[10px] space-y-0.5 text-neutral-500">
                        <div className="flex items-center gap-1">
                          <span className={`${password.length >= 8 ? 'text-emerald-700 font-bold' : 'text-neutral-400'}`}>
                            {password.length >= 8 ? '✓' : '✗'}
                          </span>
                          <span>Comprimento de pelo menos 8 caracteres ({password.length}/8)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`${/[a-zA-Z]/.test(password) ? 'text-emerald-700 font-bold' : 'text-neutral-400'}`}>
                            {/[a-zA-Z]/.test(password) ? '✓' : '✗'}
                          </span>
                          <span>Mínimo de 1 letra</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`${/[0-9]/.test(password) ? 'text-emerald-700 font-bold' : 'text-neutral-400'}`}>
                            {/[0-9]/.test(password) ? '✓' : '✗'}
                          </span>
                          <span>Mínimo de 1 número</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer mt-2 select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-400 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="text-[10px] text-neutral-600 font-sans leading-none">
                      Concordo em proteger as chaves de criptografia e manter o scrapbook limpo e seguro contra spam.
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!email || !password || !agreeTerms || !currentPasswordStrength.isValidToSubmit || currentPasswordStrength.score === 0}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-300 text-white text-xs font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    Prosseguir para Identidade
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 2: IDENTIDADE DIGITAL CLÁSSICA */}
            {step === 2 && (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleNextStep}
                className="space-y-4 text-left font-sans"
              >
                <h3 className="text-sm font-bold text-neutral-800">Escolha sua identidade clássica</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-0.5">Nome de exibição:</label>
                      <input
                        id="wizard-input-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-2 py-1.5 border border-neutral-300 rounded text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-0.5">Username da Old Web:</label>
                      <input
                        id="wizard-input-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                        placeholder="ex: rust.nomad"
                        className="w-full px-2 py-1.5 border border-neutral-300 rounded text-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Retro preview display box */}
                  <div className="bg-[#dee7f4] border border-[#9ebade] rounded p-3 flex flex-col justify-between h-28">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-blue-700">Preview do Link Digital:</span>
                      <p className="text-xs font-mono font-semibold text-neutral-800 truncate mt-1">
                        orky.net/<span className="text-pink-600 font-bold">{username || 'username'}</span>
                      </p>
                    </div>
                    <div className="pt-1.5 border-t border-blue-200">
                      <span className="text-[10px] text-neutral-700 font-bold block truncate">{fullName}</span>
                      <span className="text-[8px] text-neutral-500 font-mono">@{username || 'username'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Online Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Status Online Estilo Old-Web:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {retroStatuses.map((status, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setCustomStatus(status)}
                        className={`p-1.5 text-left text-[10px] rounded border transition-all cursor-pointer truncate ${
                          customStatus === status 
                            ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold' 
                            : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme presets selector */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Escolha seu Tema de Perfil:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {themePresets.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setSelectedTheme(t.id)}
                        className={`p-1.5 border rounded cursor-pointer transition-all flex flex-col justify-between text-left h-16 ${
                          selectedTheme === t.id 
                            ? 'bg-pink-50 border-[#d946ef] shadow-xs' 
                            : 'bg-white border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-neutral-850 block leading-tight">{t.name}</span>
                        <span className="text-[8px] text-neutral-500 leading-tight block truncate w-full">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    Validador de Segurança WASM
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 3: MISTERIOSA VALIDAÇÃO */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-4 font-sans text-xs text-neutral-600 text-left"
              >
                <div className="flex justify-center">
                  <CheckCircle2 size={48} className="text-green-500 animate-pulse" />
                </div>
                
                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-bold text-neutral-800">Identidade Pronta para Lançamento</h3>
                  <p className="text-[11px] text-neutral-500">A assinatura simétrica de seu perfil foi instalada.</p>
                </div>

                <div className="bg-neutral-900 text-green-400 p-4 border border-zinc-800 rounded font-mono text-[10px] space-y-1">
                  <p>[INFO] COMPILANDO PAULO.WASM DE IDENTIDADE ...</p>
                  <p>[SUCCESS] BORROW CHECKER: VALIDAÇÃO TOTAL OK.</p>
                  <p>[SECURE] GERADO CHAVE RSA PARA PERFIL "UCKY.NET/{username}"</p>
                  <p>✔ STATUS ASSINADO: "{customStatus}"</p>
                  <p>✔ TEMA EMBARCADO: "{selectedTheme.toUpperCase()}"</p>
                </div>

                <p className="text-[11px] text-neutral-500 italic text-center">
                  “Sua identidade foi gravada no motor invisível de segurança. Nenhum vírus clássico pode corromper seus depoimentos agora.”
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleFinish}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow-xs cursor-pointer text-xs"
                  >
                    Ativar Identidade no Navegador chapa!
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
