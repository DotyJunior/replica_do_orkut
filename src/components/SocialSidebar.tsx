import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MessageSquare, 
  Star, 
  Users, 
  Heart, 
  Eye, 
  Paperclip, 
  Plus, 
  Mail, 
  Send, 
  ShieldCheck, 
  Check, 
  X,
  Sparkles,
  Award,
  Bell
} from 'lucide-react';
import { Friend, Community, FriendRequest } from '../types';

interface SocialSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  friends: Friend[];
  communities: Community[];
  onNavigateToFriend: (id: string) => void;
  themeStyles: any; // injected theme style
  friendRequests: FriendRequest[];
  loggedInUserId?: string;
  onAcceptFriendRequest: (requestId: string) => Promise<void>;
  onRejectFriendRequest: (requestId: string) => Promise<void>;
  profiles: Record<string, any>;
  theme?: string;
}

export default function SocialSidebar({
  currentTab,
  setCurrentTab,
  friends,
  communities,
  onNavigateToFriend,
  themeStyles,
  friendRequests,
  loggedInUserId,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  profiles,
  theme,
}: SocialSidebarProps) {
  // Invite states
  const [inviteInput, setInviteInput] = useState('');
  const [invitesLeft, setInvitesLeft] = useState(3);
  const [selectedPhrase, setSelectedPhrase] = useState('As comunidades voltaram.');
  const [isSending, setIsSending] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [invitationsList, setInvitationsList] = useState<string[]>([]);

  // Modals / Dropdowns toggles
  const [activeModal, setActiveModal] = useState<'none' | 'visitors' | 'favorites' | 'friends' | 'pending-requests'>('none');

  // Phrases list
  const invitePhrases = [
    'As comunidades voltaram.',
    'Achei que você sentiria falta da internet antiga.',
    'Volta pro lado humano da internet.',
    'Seu perfil ainda existe em algum lugar da memória.'
  ];

  // Simulated Visitors
  const mockVisitors = [
    { name: 'Alexandre Curi', time: 'Há 3 minutos', status: '🛡️ Conexão Segura', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' },
    { name: 'Orkut Büyükkökten', time: 'Há 1 hora', status: '🔑 Assinatura Verificada', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
    { name: 'H3_Elit3_Hacker', time: 'Há 4 horas', status: '🕵️ Auditor do Sandbox', avatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150' },
    { name: 'Ana 2008 (Estudante)', time: 'Ontem', status: '⏳ Conectada via Cyber Café', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' }
  ];

  // Send invite sequence
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim() || invitesLeft <= 0 || isSending) return;

    setIsSending(true);
    setShowAnimation(true);

    // Simulated MSN sound chime would run here. We use an amazing visual envelope path animation!
    setTimeout(() => {
      setIsSending(false);
      setInvitesLeft(prev => prev - 1);
      setInvitationsList(prev => [...prev, inviteInput]);
      setInviteInput('');
      
      // Keep envelope visible for a short time
      setTimeout(() => {
        setShowAnimation(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Social Navigation Menu Block */}
      <div className={`rounded overflow-hidden transition-all ${themeStyles.cardBg} ${themeStyles.glow}`}>
        <div className={`px-3 py-1.5 text-[11px] font-bold uppercase ${
          theme === 'minimal-oldweb'
            ? 'bg-gradient-to-r from-[#000080] to-[#1080d0] text-[#b9cee5]'
            : themeStyles.accent
        } ${theme === 'rock-underground' ? '!text-[#deda26]' : ''}`}>
          Menu Social
        </div>
        <div className={`flex flex-col text-xs font-sans text-left ${themeStyles.font}`}>
          {/* 1. PERFIL */}
          <button
            id="sidebar-nav-profile"
            onClick={() => setCurrentTab('profile')}
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 transition-colors border-b border-dashed border-neutral-200/50 flex items-center gap-2 cursor-pointer text-left nav-button ${
              currentTab === 'profile' ? 'bg-neutral-100/30 font-bold text-[#d946ef]' : 'hover:bg-neutral-100/15'
            } ${theme === 'cyberdeck' ? `cyberdeck-btn ${currentTab === 'profile' ? 'active' : ''}` : ''}`}
          >
            <User size={13} className="text-[#1d4ed8]" />
            <span>Perfil</span>
          </button>

          {/* 2. RECADOS */}
          <button
            id="sidebar-nav-scrapbook"
            onClick={() => setCurrentTab('scrapbook')}
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 transition-colors border-b border-dashed border-neutral-200/50 flex items-center justify-between cursor-pointer text-left nav-button ${
              currentTab === 'scrapbook' ? 'bg-neutral-100/30 font-bold text-[#d946ef]' : 'hover:bg-neutral-100/15'
            } ${theme === 'cyberdeck' ? `cyberdeck-btn ${currentTab === 'scrapbook' ? 'active' : ''}` : ''}`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare size={13} className="text-[#1d4ed8]" />
              <span>Recados</span>
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold">Secure</span>
          </button>

          {/* 3. DEPOIMENTOS */}
          <button
            id="sidebar-nav-testimonials"
            onClick={() => setCurrentTab('testimonials')}
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 transition-colors border-b border-dashed border-neutral-200/50 flex items-center justify-between cursor-pointer text-left nav-button ${
              currentTab === 'testimonials' ? 'bg-neutral-100/30 font-bold text-[#d946ef]' : 'hover:bg-neutral-100/15'
            } ${theme === 'cyberdeck' ? `cyberdeck-btn ${currentTab === 'testimonials' ? 'active' : ''}` : ''}`}
          >
            <span className="flex items-center gap-2">
              <Star size={13} className="text-yellow-600" />
              <span>Depoimentos</span>
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold">Safe Heap</span>
          </button>

          {/* 3.5. ÁLBUM DE FOTOS */}
          <button
            id="sidebar-nav-photos"
            onClick={() => {
              try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                  const ctx = new AudioContextClass();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(1400, ctx.currentTime);
                  gain.gain.setValueAtTime(0.04, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.08);
                }
              } catch (e) {}
              setCurrentTab('photos');
            }}
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 transition-colors border-b border-dashed border-neutral-200/50 flex items-center justify-between cursor-pointer text-left nav-button ${
              currentTab === 'photos' ? 'bg-neutral-100/30 font-bold text-[#d946ef]' : 'hover:bg-neutral-100/15'
            } ${theme === 'cyberdeck' ? `cyberdeck-btn ${currentTab === 'photos' ? 'active' : ''}` : ''}`}
          >
            <span className="flex items-center gap-2">
              <span className="text-pink-600 font-sans">📸</span>
              <span className={theme === 'rock-underground' ? '!text-[#deda26]' : ''}>Álbum de Fotos</span>
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold">Nostalgic</span>
          </button>

          {/* 4. COMUNIDADES */}
          <button
            id="sidebar-nav-communities"
            onClick={() => setCurrentTab('communities')}
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 transition-colors border-b border-dashed border-neutral-200/50 flex items-center gap-2 cursor-pointer text-left nav-button ${
              currentTab === 'communities' ? 'bg-neutral-100/30 font-bold text-[#d946ef]' : 'hover:bg-neutral-100/15'
            } ${theme === 'cyberdeck' ? `cyberdeck-btn ${currentTab === 'communities' ? 'active' : ''}` : ''}`}
          >
            <Users size={13} className="text-pink-600" />
            <span className={theme === 'rock-underground' ? '!text-[#deda26]' : ''}>Comunidades</span>
          </button>

          {/* 4.5. BUILDER DE SCRAPS */}
          <button
            id="sidebar-nav-scrapbook-builder"
            onClick={() => setCurrentTab('scrapbook-builder')}
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 transition-colors border-b border-dashed border-neutral-200/50 flex items-center justify-between cursor-pointer text-left nav-button ${
              currentTab === 'scrapbook-builder' ? 'bg-neutral-100/30 font-bold text-[#d946ef]' : 'hover:bg-neutral-100/15'
            } ${theme === 'cyberdeck' ? `cyberdeck-btn ${currentTab === 'scrapbook-builder' ? 'active' : ''}` : ''}`}
          >
            <span className="flex items-center gap-2">
              <Sparkles size={13} className="text-fuchsia-500 animate-pulse" />
              <span>Builder de Scraps</span>
            </span>
            <span className="text-[9px] bg-pink-100 text-pink-700 px-1.5 py-0.2 rounded font-mono font-bold animate-bounce">Glitter</span>
          </button>

          {/* 5. AMIGOS (MODAL TOGGLE) */}
          <div
            id="sidebar-nav-friends-container"
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 border-b border-dashed border-neutral-200/50 flex items-center justify-between hover:bg-neutral-100/15 ${
              theme === 'cyberdeck' ? `cyberdeck-btn ${activeModal === 'friends' ? 'active' : ''}` : ''
            }`}
          >
            <div 
              onClick={() => setActiveModal(activeModal === 'friends' ? 'none' : 'friends')}
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <Heart size={13} className="text-red-500" />
              <span className={`text-xs ${theme === 'rock-underground' ? '!text-[#deda26]' : ''}`}>Amigos</span>
              <span className="text-[9px] bg-neutral-200/75 px-1 py-0.2 rounded text-neutral-600 font-bold font-mono">
                {friends.length} conectados
              </span>
            </div>
            
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveModal(activeModal === 'pending-requests' ? 'none' : 'pending-requests');
              }}
              className="relative p-1 hover:bg-neutral-200/50 rounded transition-colors cursor-pointer flex items-center justify-center mr-1"
              title="Solicitações Pendentes & Diagnósticos"
            >
              {friendRequests.filter(req => req.toUserId === loggedInUserId && req.status === 'pending').length > 0 && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              )}
              <Bell size={13} className={friendRequests.filter(req => req.toUserId === loggedInUserId && req.status === 'pending').length > 0 ? "text-pink-500" : "text-neutral-400"} />
            </button>
          </div>

          {/* 6. VISITANTES (MODAL TOGGLE) */}
          <button
            id="sidebar-nav-visitors-popup"
            onClick={() => setActiveModal(activeModal === 'visitors' ? 'none' : 'visitors')}
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 transition-colors border-b border-dashed border-neutral-200/50 flex items-center justify-between cursor-pointer text-left hover:bg-neutral-100/15 ${
              theme === 'cyberdeck' ? `cyberdeck-btn ${activeModal === 'visitors' ? 'active' : ''}` : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <Eye size={13} className="text-[#d946ef]" />
              <span>Visitantes</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 px-1 text-[8px] font-bold rounded">ONLINE NOW</span>
          </button>

          {/* 7. FAVORITOS (MODAL TOGGLE) */}
          <button
            id="sidebar-nav-favorites-popup"
            onClick={() => setActiveModal(activeModal === 'favorites' ? 'none' : 'favorites')}
            style={theme === 'cyberdeck' ? { backgroundColor: '#0c100a' } : undefined}
            className={`px-3 py-2.5 transition-colors flex items-center justify-between cursor-pointer text-left hover:bg-neutral-100/15 ${
              theme === 'cyberdeck' ? `cyberdeck-btn ${activeModal === 'favorites' ? 'active' : ''}` : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <Award size={13} className="text-amber-500" />
              <span>Favoritos</span>
            </span>
            <span className="text-neutral-500 text-[10px]">★ Destacados</span>
          </button>
        </div>
      </div>

      {/* Floating Interactive Custom Popup for Amigos, Visitantes, Favoritos */}
      {activeModal !== 'none' && (
        <div className="border border-neutral-300 rounded overflow-hidden shadow-md bg-[#fffdfa] text-left">
          <div className="bg-[#dee7f4] px-3 py-1.5 flex justify-between items-center border-b border-neutral-200">
            <span className="text-[10px] font-bold text-neutral-800 uppercase flex items-center gap-1">
              {activeModal === 'friends' && '👥 Painel de Conexões'}
              {activeModal === 'visitors' && '👁️ Quem andou fofocando (Visitantes)'}
              {activeModal === 'favorites' && '★ Seus Favoritos Estrela'}
            </span>
            <button onClick={() => setActiveModal('none')} className="text-neutral-500 hover:text-black cursor-pointer">
              <X size={14} />
            </button>
          </div>

          <div className="p-3 text-xs">
            {activeModal === 'pending-requests' && (
              <div className="space-y-3 py-1 text-left">
                <div className="flex justify-between items-center bg-neutral-100 p-1 rounded border border-neutral-200">
                  <h4 className="text-[10px] font-bold text-neutral-600 uppercase">Solicitações Pendentes ({friendRequests.filter(req => req.toUserId === loggedInUserId && req.status === 'pending').length})</h4>
                </div>

                <div className="space-y-1">
                  {friendRequests.filter(req => req.toUserId === loggedInUserId && req.status === 'pending').map((request) => {
                    const fromProfile = profiles[request.fromUserId];
                    return (
                        <div key={request.id} className="p-2 border rounded text-[10.5px] flex justify-between items-center bg-white shadow-sm">
                            <span className="font-bold text-neutral-800 truncate" style={{maxWidth: '120px'}}>{fromProfile?.nome_exibicao || fromProfile?.name || `Usuário (${request.fromUserId.substring(0,6)})`}</span>
                            <div className="flex gap-1.5">
                                <button 
                                  onClick={() => onAcceptFriendRequest(request.id)} 
                                  className="bg-green-600 text-white font-bold rounded-md px-2 py-0.5 text-[9px] hover:bg-green-700 cursor-pointer"
                                >
                                  Aceitar
                                </button>
                                <button 
                                  onClick={() => onRejectFriendRequest(request.id)} 
                                  className="bg-red-600 text-white font-bold rounded-md px-2 py-0.5 text-[9px] hover:bg-red-700 cursor-pointer"
                                >
                                  Rejeitar
                                </button>
                            </div>
                        </div>
                    );
                  })}
                  {friendRequests.filter(req => req.toUserId === loggedInUserId && req.status === 'pending').length === 0 && (
                    <p className="text-[10px] text-neutral-400 text-center py-2 italic bg-neutral-50 rounded border border-dashed border-neutral-200">
                      Nenhuma solicitação pendente para você neste momento.
                    </p>
                  )}
                </div>

                {/* PAINEL DE DIAGNÓSTICO EM TEMPO REAL (Rastreamento Real) */}
                <div className="mt-3 p-2 bg-neutral-900 text-zinc-300 rounded-lg border border-neutral-700 font-mono text-[9px] select-all leading-tight">
                  <div className="text-pink-400 font-bold border-b border-neutral-700 pb-1 mb-1 flex justify-between items-center">
                    <span>📡 RASTREAMENTO REAL</span>
                    <span className="text-[8px] bg-red-600 text-white font-bold px-1 rounded animate-pulse">LIVE</span>
                  </div>
                  
                  <div className="space-y-1 text-zinc-300">
                    <div>
                      <span className="text-yellow-400">ID Usuário Ativo (B):</span>{" "}
                      <span className="text-white font-bold">{loggedInUserId || "Desconectado"}</span>
                    </div>
                    <div>
                      <span className="text-yellow-400">ID Lindo pelo Sino:</span>{" "}
                      <span className="text-white font-bold">{loggedInUserId || "Desconectado"}</span>
                    </div>
                    <div>
                      <span className="text-yellow-400">Documentos Amizade Totais:</span>{" "}
                      <span className="text-white font-bold">{friendRequests.length}</span>
                    </div>
                    <div>
                      <span className="text-yellow-400">Filtrados (pending & destino B):</span>{" "}
                      <span className="text-white font-bold">
                        {friendRequests.filter(req => req.toUserId === loggedInUserId && req.status === 'pending').length}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-neutral-800 mt-2 pt-2">
                    <p className="text-pink-400 font-bold mb-1 uppercase text-[8.5px]">Análise detalhada por Documento:</p>
                    {friendRequests.length === 0 ? (
                      <p className="text-red-400 text-[8.5px] italic">[0 registros retornados pela coleção friend_requests]</p>
                    ) : (
                      <div className="space-y-2 mt-1.5 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                        {friendRequests.map((req, idx) => {
                          const isMatchTo = req.toUserId === loggedInUserId;
                          const isPending = req.status === 'pending';
                          return (
                            <div key={req.id} className="p-1.5 bg-neutral-950 rounded border border-neutral-800">
                              <p className="text-emerald-400 font-extrabold text-[8.5px]">Doc #{idx + 1} (id: {req.id})</p>
                              <pre className="text-[7.5px] text-zinc-400 leading-[9px] mt-0.5 bg-neutral-900/50 p-1 rounded overflow-x-auto whitespace-pre-wrap">
{`fromUserId : "${req.fromUserId}"
toUserId   : "${req.toUserId}"
status     : "${req.status}"
senderId   : "${req.senderId}"
receiverId : "${req.receiverId}"`}
                              </pre>
                              
                              <p className="mt-1 font-bold text-[8px] text-yellow-500 uppercase">Valores Lado-a-Lado:</p>
                              <div className="text-[7.5px] text-zinc-400 mt-0.5 space-y-0.5 leading-[9px]">
                                <div className="flex justify-between">
                                  <span>Destinatário doc (toUserId):</span>
                                  <span className="text-white font-bold">"{req.toUserId}"</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>ID Logado (loggedInUserId):</span>
                                  <span className="text-white font-bold">"{loggedInUserId}"</span>
                                </div>
                              </div>

                              <div className="mt-1 flex items-center gap-1.5 text-[8px] font-bold">
                                <span>Comparação ID:</span>
                                {isMatchTo ? (
                                  <span className="text-green-400 bg-green-950/40 px-1 rounded border border-green-800">✅ VERDADEIRO (IGUAIS)</span>
                                ) : (
                                  <span className="text-red-400 bg-red-950/40 px-1 rounded border border-red-800">❌ FALSO (DIFERENTES)</span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[8px] font-bold">
                                <span>Check status:</span>
                                {isPending ? (
                                  <span className="text-green-400 bg-green-950/40 px-1 rounded border border-green-800">✅ PENDING</span>
                                ) : (
                                  <span className="text-red-400 bg-red-950/40 px-1 rounded border border-red-800">❌ STATUS: {req.status}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeModal === 'friends' && (
              <div className="space-y-2">
                <p className="text-[11px] text-neutral-600 italic">Conversas criptografadas ponta-a-ponta abertas:</p>
                <div className="grid grid-cols-1 gap-2">
                  {friends.map(f => (
                    <div 
                      key={f.id} 
                      onClick={() => {
                        onNavigateToFriend(f.id);
                        setActiveModal('none');
                      }}
                      className="p-1 px-2 border border-neutral-200 hover:border-pink-300 rounded flex items-center gap-2 bg-white cursor-pointer transition-colors"
                    >
                      <img src={f.avatar} className="w-6 h-6 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[11px] truncate">{f.name}</p>
                        <p className="text-[9px] text-[#1d4ed8] font-mono">Chave Ed25519 ativa</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'visitors' && (
              <div className="space-y-2">
                <p className="text-[10px] text-neutral-600">Esses viajantes visitaram seu scrapbook e validaram seu borrow checking nas últimas 24 horas:</p>
                <div className="space-y-1.5">
                  {mockVisitors.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center p-1.5 border-b border-dashed border-neutral-200 bg-white rounded">
                      <img src={v.avatar} className="w-6 h-6 rounded-full object-cover" />
                      <div className="text-[10px] flex-1">
                        <div className="font-bold flex justify-between">
                          <span>{v.name}</span>
                          <span className="text-[8px] text-neutral-400">{v.time}</span>
                        </div>
                        <span className={`text-[8px] font-mono font-semibold ${themeStyles.bg.includes('bg-checkerboard') ? 'bg-[#0c4b24] border border-[#0ef46f] text-[#16fc21] px-1 rounded' : 'text-green-700'}`}>{v.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'favorites' && (
              <div className="space-y-2 text-center py-2">
                <p className="text-[10px] text-neutral-600">Perfís com carimbo de integridade de ouro:</p>
                <div className="flex justify-center gap-3">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-amber-400 overflow-hidden mx-auto">
                      <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" className="object-cover w-full h-full" />
                    </div>
                    <span className="text-[9px] font-bold block mt-1 text-orange-850">Junior (Me)</span>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-amber-400 overflow-hidden mx-auto">
                      <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150" className="object-cover w-full h-full" />
                    </div>
                    <span className="text-[9px] font-bold block mt-1 text-orange-850">Orkut B.</span>
                  </div>
                </div>
                <div className="p-1 px-2 border border-amber-200 bg-amber-50 rounded text-[9px] text-amber-800 font-mono">
                  ★ O algoritmo não decide suas conexões, você decide no abraço.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOCK — CONVIDAR AMIGO */}
      <div className={`rounded shadow-sm overflow-hidden text-left transition-all duration-300 ${
        theme === 'emo-2008'
          ? 'bg-neutral-900/85 backdrop-blur-sm border border-[#1ec6ff] anim-blue-neon'
          : theme === 'default' || !theme 
            ? 'bg-[#77879e] border border-[#1b4b82]' 
            : 'bg-neutral-900/80 backdrop-blur-sm border border-neutral-800'
      }`}>
        <div className={`px-3 py-1.5 flex items-center justify-between border-b ${
          theme === 'emo-2008'
            ? 'bg-neutral-950/75 border-[#1ec6ff]/35'
            : theme === 'default' || !theme 
              ? 'bg-[#1b4b82] border-b border-[#2965ab]' 
              : 'bg-neutral-950/70 border-neutral-600'
        }`}>
          <span className={`text-[11px] font-bold uppercase flex items-center gap-1 ${
            theme === 'emo-2008'
              ? 'text-[#1ec6ff]'
              : theme === 'default' || !theme ? 'text-white' : 'text-neutral-300'
          }`}>
            <Plus size={13} className={theme === 'emo-2008' ? 'text-[#1ec6ff]' : (theme === 'default' || !theme ? 'text-white' : 'text-neutral-400')} /> Convidar Amigo
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
            theme === 'emo-2008'
              ? 'bg-[#1ec6ff]/10 text-[#1ec6ff] border border-[#1ec6ff]/30'
              : theme === 'default' || !theme 
                ? 'bg-[#123661] text-[#77879e]' 
                : 'bg-neutral-800 text-neutral-400'
          }`}>
            {invitesLeft} RESTANTES
          </span>
        </div>
        
        <div className={`p-3 text-xs flex flex-col justify-between min-h-[190px] ${
          theme === 'default' || !theme ? 'text-black' : 'text-neutral-200'
        }`}>
          {invitesLeft > 0 ? (
            <form onSubmit={handleSendInvite} className="flex flex-col gap-2 relative">
              <label className={`text-[10px] font-bold uppercase ${
                theme === 'emo-2008'
                  ? 'text-[#1ec6ff]'
                  : theme === 'default' || !theme ? 'text-[#000000]' : 'text-neutral-600'
              }`}>Username ou E-mail:</label>
              <input
                id="sidebar-invite-input"
                type="text"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Ex: rust.nomad ou dario@gmail.com"
                className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 text-xs ${
                  theme === 'emo-2008'
                    ? 'border-[#1ec6ff]/40 text-neutral-100 bg-neutral-950 focus:ring-[#1ec6ff]'
                    : theme === 'default' || !theme 
                      ? 'border-[#1b4b82] text-black bg-white focus:ring-[#1b4b82]' 
                      : 'border-neutral-700 text-neutral-100 bg-neutral-950 focus:ring-neutral-500'
                }`}
                required
              />

              {/* Quick message selector */}
              <div>
                <label className={`text-[9px] font-bold uppercase block mb-1 ${
                  theme === 'emo-2008'
                    ? 'text-[#1ec6ff]'
                    : theme === 'default' || !theme ? 'text-[#000000] bg-[#77879e]' : 'text-neutral-500'
                }`}>Frase nostálgica de acompanhamento:</label>
                <div className="flex flex-col gap-1">
                  {invitePhrases.map((phrase, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedPhrase(phrase)}
                      className={`text-left p-1 text-[9px] rounded font-sans leading-tight cursor-pointer ${
                        theme === 'emo-2008'
                          ? (selectedPhrase === phrase
                            ? 'bg-[#1ed6ff]/10 text-[#1ec6ff] font-bold border border-[#1ec6ff]'
                            : 'hover:bg-neutral-800 text-neutral-400 border border-transparent')
                          : theme === 'default' || !theme
                            ? (selectedPhrase === phrase
                              ? 'bg-neutral-800 text-white font-bold border border-neutral-900 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]'
                              : 'bg-[#5a668a] text-stone-200 hover:bg-[#4d5777] border border-transparent')
                            : (selectedPhrase === phrase 
                              ? 'bg-neutral-800 text-neutral-200 font-bold border border-neutral-600' 
                              : 'hover:bg-neutral-800 text-neutral-400 border border-transparent')
                      }`}
                    >
                      “{phrase}”
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSending || !inviteInput.trim()}
                className={`w-full text-center font-bold px-3 py-1.5 mt-2 rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 font-sans shadow-md ${
                  theme === 'emo-2008'
                    ? 'bg-[#1ec6ff] hover:bg-[#00adff] text-zinc-950 font-black disabled:bg-neutral-800 disabled:text-neutral-500'
                    : theme === 'default' || !theme
                      ? 'bg-[#1b4b82] hover:bg-[#153a66] disabled:bg-[#4d5777] text-white'
                      : 'bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 text-[#000000]'
                }`}
              >
                {isSending ? (
                  <>🚀 Enviando sinal...</>
                ) : (
                  <>
                    <Send size={12} />
                    Enviar Convite
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className={`text-center py-6 italic ${
              theme === 'default' || !theme ? 'text-neutral-900' : 'text-neutral-400'
            }`}>
              🚨 Seus 3 convites mensais foram consumidos. Aguarde o ciclo de segurança renovar em 30 dias para convocar mais companheiros.
            </div>
          )}

          {/* Invitation success list */}
          {invitationsList.length > 0 && (
            <div className={`mt-3 border-t border-dashed pt-2 text-[10px] ${
              theme === 'default' || !theme ? 'border-[#1b4b82]/40' : 'border-neutral-700'
            }`}>
              <span className={`font-bold block ${
                theme === 'default' || !theme ? 'text-[#040415]' : 'text-neutral-400'
              }`}>Sinais ativados este mês:</span>
              <ul className={`list-disc pl-3 mt-1 ${
                theme === 'default' || !theme ? 'text-neutral-900' : 'text-neutral-500'
              }`}>
                {invitationsList.map((mail, i) => (
                  <li key={i} className="truncate">{mail} (Aguardando handcheck)</li>
                ))}
              </ul>
            </div>
          )}

          <div className={`border-t border-dashed mt-3 pt-2 text-center text-[10px] font-sans italic ${
            theme === 'default' || !theme ? 'border-[#1b4b82]/40 text-[#040415]' : 'border-neutral-700 text-neutral-500'
          }`}>
            “A internet antiga só existia porque alguém chamou você.”
          </div>
        </div>
      </div>

      {/* Fly-out Animated Envelope Simulator Overlay */}
      <AnimatePresence>
        {showAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -200 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 m-auto w-72 h-44 bg-pink-100 border-2 border-pink-400 p-4 rounded-lg shadow-2xl flex flex-col justify-center items-center z-50 text-center"
          >
            <div className="relative text-pink-600 animate-bounce mb-2">
              <Mail size={48} className="drop-shadow-md" />
              <div className="absolute top-0 right-0 bg-[#d946ef] h-3.5 w-3.5 rounded-full ring-2 ring-pink-100 animate-ping" />
            </div>
            <h4 className="font-mono text-xs font-bold text-neutral-800 uppercase tracking-widest leading-none">
              CONVITE ENVIADO!
            </h4>
            <span className="text-[10px] text-neutral-600 block mt-1 font-mono">
              Convite criptografado enviado para:
            </span>
            <strong className="text-[11px] text-[#1d4ed8] font-mono mt-0.5 block truncate max-w-full">
              {inviteInput}
            </strong>
            <p className="text-[9px] text-[#d946ef] italic mt-2">
              “{selectedPhrase}”
            </p>
            <div className="flex items-center gap-1 mt-3 bg-green-50 text-green-700 px-2 py-0.5 rounded text-[8px] font-mono border border-green-200 uppercase tracking-wider">
              <ShieldCheck size={11} /> Handshake WASM OK
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
