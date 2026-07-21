import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, ArrowLeft } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
}

export default function PrivacyModal({ isOpen, onClose, onGoToProfile }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-[#dee7f4] border-4 border-[#1b4372] rounded-lg shadow-2xl max-w-2xl w-full text-left overflow-hidden flex flex-col my-8 h-full max-h-[85vh]"
          id="privacy-policy-modal"
        >
          {/* Header */}
          <div className="bg-[#1b4372] px-6 py-4 flex justify-between items-center text-white border-b-2 border-slate-300 select-none">
            <h3 className="text-[16px] font-bold uppercase tracking-wider flex items-center gap-2 font-sans">
              <ShieldCheck className="text-amber-400" size={18} />
              🔒 Política de Privacidade e Diretrizes
            </h3>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Body (Scrollable Wrapper) */}
          <div className="p-6 md:p-8 overflow-y-auto font-sans text-[15px] leading-relaxed text-neutral-800 space-y-8 flex-1 bg-[#cfd5d4] select-text mb-0" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Section 1: Privacidade e Segurança */}
            <div className="space-y-5">
              <h4 className="text-[17px] font-bold text-[#1b4372] border-b-2 border-[#1b4372]/30 pb-2 flex items-center gap-2 uppercase font-sans tracking-tight">
                🔒 Privacidade e Segurança
              </h4>
              <p className="font-bold text-neutral-900 text-[16px] px-1">Sua privacidade é uma prioridade.</p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3 bg-white/80 p-4 border border-slate-300 rounded-md shadow-xs">
                  <span className="text-lg select-none pt-0.5">📍</span>
                  <div>
                    <strong className="text-neutral-950 block font-bold text-[15px] mb-1">Nós não rastreamos sua localização em tempo real.</strong>
                    <span className="text-neutral-700 text-[13.5px] leading-relaxed block font-normal">Seu dispositivo e coordenadas nunca são gravados ou transferidos a nossos servidores.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3 bg-white/80 p-4 border border-slate-300 rounded-md shadow-xs">
                  <span className="text-lg select-none pt-0.5">🔐</span>
                  <div>
                    <strong className="text-neutral-950 block font-bold text-[15px] mb-1">Seus dados são protegidos por criptografia e armazenados com segurança.</strong>
                    <span className="text-neutral-700 text-[13.5px] leading-relaxed block font-normal">Todo o armazenamento persiste de forma robusta e segura em instâncias estruturadas via SDK.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3 bg-white/80 p-4 border border-slate-300 rounded-md shadow-xs">
                  <span className="text-lg select-none pt-0.5">🛡️</span>
                  <div>
                    <strong className="text-neutral-950 block font-bold text-[15px] mb-1">Coletamos apenas as informações estritamente necessárias.</strong>
                    <span className="text-neutral-700 text-[13.5px] leading-relaxed block font-normal">Apenas o mínimo indispensável para o bom funcionamento da sua conta, segurança da plataforma e prevenção de abusos.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3 bg-rose-50/85 p-4 border border-rose-300 rounded-md shadow-xs">
                  <span className="text-lg select-none pt-0.5">🚫</span>
                  <div>
                    <strong className="text-rose-950 block font-bold text-[15px] mb-1">Não vendemos seus dados.</strong>
                    <span className="text-rose-800 text-[13.5px] leading-relaxed block font-normal">Seus registros são confidenciais e jamais serão comercializados com empresas terceiras de publicidade.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3 bg-rose-50/85 p-4 border border-rose-300 rounded-md shadow-xs">
                  <span className="text-lg select-none pt-0.5">🚫</span>
                  <div>
                    <strong className="text-rose-950 block font-bold text-[15px] mb-1">Não rastreamos sua atividade fora da plataforma.</strong>
                    <span className="text-rose-800 text-[13.5px] leading-relaxed block font-normal">Nenhum Pixel invasivo, pixel de rastreamento ou Cookie de monitoração de terceiros é injetado.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3 bg-rose-50/85 p-4 border border-rose-300 rounded-md shadow-xs">
                  <span className="text-lg select-none pt-0.5">🚫</span>
                  <div>
                    <strong className="text-rose-950 block font-bold text-[15px] mb-1">Não criamos perfis publicitários sobre você.</strong>
                    <span className="text-rose-800 text-[13.5px] leading-relaxed block font-normal">Sua navegação, scraps e comunidades seguem ordem puramente cronológica e orgânica, livre de algoritmos comerciais.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Section 2: Segurança da Plataforma */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[17px] font-bold text-[#1b4372] border-b-2 border-[#1b4372]/30 pb-2 flex items-center gap-2 uppercase font-sans tracking-tight">
                🛡️ Segurança da Plataforma
              </h4>
              <p className="text-neutral-900 font-semibold text-[15px] px-1">Nossos sistemas monitoram e bloqueiam tentativas de:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-800">
                <div className="flex items-center gap-2.5 p-3 px-4 bg-white/80 border border-slate-300 rounded text-[14px] font-medium font-sans leading-relaxed">
                  <span className="text-red-600 font-bold select-none">•</span> Injeção de código
                </div>
                <div className="flex items-center gap-2.5 p-3 px-4 bg-white/80 border border-slate-300 rounded text-[14px] font-medium font-sans leading-relaxed">
                  <span className="text-red-600 font-bold select-none">•</span> Scripts maliciosos
                </div>
                <div className="flex items-center gap-2.5 p-3 px-4 bg-white/80 border border-slate-300 rounded text-[14px] font-medium font-sans leading-relaxed">
                  <span className="text-red-600 font-bold select-none">•</span> Modificação não autorizada da plataforma
                </div>
                <div className="flex items-center gap-2.5 p-3 px-4 bg-white/80 border border-slate-300 rounded text-[14px] font-medium font-sans leading-relaxed">
                  <span className="text-red-600 font-bold select-none">•</span> Ataques automatizados
                </div>
                <div className="flex items-center gap-2.5 p-3 px-4 bg-white/80 border border-slate-300 rounded text-[14px] font-medium font-sans leading-relaxed">
                  <span className="text-red-600 font-bold select-none">•</span> Exploração de vulnerabilidades
                </div>
                <div className="flex items-center gap-2.5 p-3 px-4 bg-white/80 border border-slate-300 rounded text-[14px] font-medium font-sans leading-relaxed">
                  <span className="text-red-600 font-bold select-none">•</span> Spam e abuso de recursos
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-300 p-4 rounded text-[14px] text-amber-950 leading-relaxed font-sans font-medium mt-2 shadow-xs">
                ⚠️ Atividades suspeitas podem resultar em bloqueio automático, suspensão ou remoção da conta.
              </div>
            </div>

            {/* Section 3: Comunidade e Responsabilidade */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[17px] font-bold text-[#1b4372] border-b-2 border-[#1b4372]/30 pb-2 flex items-center gap-2 uppercase font-sans tracking-tight">
                ⚖️ Comunidade e Responsabilidade
              </h4>
              <p className="font-bold text-neutral-950 text-[15px] px-1">Privacidade não significa ausência de regras.</p>
              <p className="text-neutral-800 leading-relaxed text-[14px] font-sans p-4 bg-white/80 border border-slate-300 rounded-md shadow-xs">
                O ScrapZone valoriza a liberdade de expressão e a privacidade dos usuários, mas atividades ilegais, tentativas de fraude, ataques cibernéticos contra a plataforma ou abuso hostil contra outros membros poderão resultar em rápidas medidas administrativas, suspensão imediata e demais legais cabíveis.
              </p>
            </div>

          </div>

          {/* Footer Controls / Menus */}
          <div className="bg-[#dee7f4] border-t border-[#b2cbeb] p-4 flex flex-col sm:flex-row gap-3 justify-end items-center select-none font-sans">
            <button
              onClick={onGoToProfile}
              className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-md shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all hover:scale-102"
              title="Voltar ao Meu Perfil"
            >
              <ArrowLeft size={14} />
              Voltar ao meu Perfil
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-md shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all hover:scale-102"
              title="Fechar"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
