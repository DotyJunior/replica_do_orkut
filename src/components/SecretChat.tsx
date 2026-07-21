import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Clock, Send, ShieldAlert, Circle, ChevronDown } from 'lucide-react';
import { Friend } from '../types';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';

interface ChatMessage {
  id: string;
  senderId: 'me' | string; // 'me' or characterId or real UID
  senderName: string;
  text: string;
  timestamp: string; // e.g. "14:32"
  createdAt: number; // raw epoch Ms for the 48-hour auto-deletion
  type?: 'photo' | 'text';
  photoUrl?: string;
  photoCaption?: string;
}

interface SecretChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; name: string; avatar: string; username: string };
  initialTargetFriendId?: string; // Friend currently selected or viewed
  friendsList: Friend[];
}

export default function SecretChat({
  isOpen,
  onClose,
  currentUser,
  initialTargetFriendId = 'lucas',
  friendsList
}: SecretChatProps) {
  // Static list of Orkut bot character profiles
  const staticBots = [
    {
      id: 'lucas',
      name: 'Lucas Santos',
      username: 'Lucas_Santos',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      online: true,
      bio: 'Eae parça! Sou o Lucas, curto muito bater papo de madrugada e relembrar as comunidades clássicas. Ativei meu canal seguro com criptografia de 48 horas!'
    },
    {
      id: 'alexandre',
      name: 'Alexandre Curi',
      username: 'alexandre.curi',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      online: true,
      bio: 'Presidente da Assembleia Legislativa do Paraná. Debatendo segurança cibernética.'
    },
    {
      id: 'orkut',
      name: 'Orkut Büyükkökten',
      username: 'orkut.b',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      online: true,
      bio: 'Founder of Orkut, celebrating zero-knowledge encryption.'
    },
    {
      id: 'hacker',
      name: 'H3_Elit3_Hacker',
      username: 'elit3.hacker',
      avatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150',
      online: true,
      bio: 'Auditor InfoSec aposentado que adora testar o borrow checker.'
    }
  ];

  // Dynamically resolved real profiles from Firestore
  const [dbProfiles, setDbProfiles] = useState<any[]>([]);

  // Query and listen to all profiles in the system in real-time
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== currentUser.id && docSnap.id !== 'me') {
          list.push({
            id: docSnap.id,
            name: data.nome_exibicao || data.name || 'Usuário Sem Nome',
            username: data.username || docSnap.id,
            avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            online: data.statusOnline ? !data.statusOnline.includes('Offline') : true,
            bio: data.aboutMe || 'Nostálgico do Scrapzone.',
            isReal: true
          });
        }
      });
      setDbProfiles(list);
    }, (err) => {
      console.error("Error listening to profiles collection in SecretChat:", err);
    });
    return () => unsubscribe();
  }, [currentUser.id]);

  // Combine Bot characters and Real system profiles loaded dynamically from Firestore
  const fullCharactersList = [
    ...staticBots,
    ...dbProfiles
  ];

  // Set selected character
  const [activePartnerId, setActivePartnerId] = useState<string>(initialTargetFriendId);
  const [showPartnerSelector, setShowPartnerSelector] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Keep track of unread message counts for each friend/character
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [conversationMetadata, setConversationMetadata] = useState<Record<string, { lastMessageAt: number }>>({});

  // Sort partners based on unread counts and last message time
  const sortedCharacters = React.useMemo(() => {
    return [...fullCharactersList].sort((a, b) => {
      const unreadA = unreadCounts[a.id] || 0;
      const unreadB = unreadCounts[b.id] || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;
      const timeA = conversationMetadata[a.id]?.lastMessageAt || 0;
      const timeB = conversationMetadata[b.id]?.lastMessageAt || 0;
      return timeB - timeA;
    });
  }, [fullCharactersList, unreadCounts, conversationMetadata]);

  // Sync refs to execute conditional notifications without recreating effect listeners
  const isOpenRef = useRef(isOpen);
  const activePartnerIdRef = useRef(activePartnerId);
  const listenerStartTimeRef = useRef(Date.now());

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    activePartnerIdRef.current = activePartnerId;
    if (activePartnerId) {
      setUnreadCounts((prev) => ({ ...prev, [activePartnerId]: 0 }));
    }
  }, [activePartnerId]);

  useEffect(() => {
    if (isOpen && activePartnerId) {
      setUnreadCounts((prev) => ({ ...prev, [activePartnerId]: 0 }));
    }
  }, [isOpen, activePartnerId]);

  // Dynamic Real-time messaging alert system for incoming messages
  useEffect(() => {
    if (!currentUser?.id) return;
    
    // Combine all potential chat partners, removing duplicates
    const allPartners = [
      ...fullCharactersList,
      ...friendsList.filter(f => !fullCharactersList.some(p => p.id === f.id))
    ];

    if (allPartners.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    allPartners.forEach((partner) => {
      const convId = [currentUser.id, partner.id].sort().join('_');
      const messagesRef = collection(db, 'conversations', convId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));

      let isInitial = true;
      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const isSenderMe = data.senderId === currentUser.id;
            const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
            const isWithin48Hours = data.createdAt >= fortyEightHoursAgo;

            if (!isInitial && !isSenderMe && isWithin48Hours) {
              const isCurrentlyChatting = isOpenRef.current && activePartnerIdRef.current === partner.id;
              
              if (!isCurrentlyChatting) {
                setUnreadCounts((prev) => ({
                  ...prev,
                  [partner.id]: (prev[partner.id] || 0) + 1
                }));
              }

              // Fire MSN custom window alert with full metadata
              window.dispatchEvent(
                new CustomEvent('msn-real-alert', {
                  detail: {
                    name: partner.name || data.senderName,
                    avatar: partner.avatar,
                    statusText: data.text || 'enviou um recado seguro.',
                    timestamp: data.timestamp || new Date(data.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    senderId: partner.id,
                    actionType: 'online'
                  }
                })
              );
            }

            // Always update last interaction time for sorting
            setConversationMetadata((prev) => ({
              ...prev,
              [partner.id]: { 
                lastMessageAt: Math.max(prev[partner.id]?.lastMessageAt || 0, data.createdAt) 
              }
            }));
          }
        });
        isInitial = false;
      }, (err) => {
        console.warn("Silent ignored conversation listen error:", err);
      });

      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [fullCharactersList.map(p => p.id).join(','), friendsList.map(f => f.id).join(','), currentUser?.id]);

  const feedRef = useRef<HTMLDivElement>(null);

  // Active conversational partner model (Bot, Firestore Profile, or FriendsList fallback)
  const activePartner = fullCharactersList.find(p => p.id === activePartnerId) || 
                        friendsList.find(f => f.id === activePartnerId) || {
                          id: activePartnerId,
                          name: 'Amigo',
                          username: activePartnerId.slice(0, 10),
                          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                          online: true,
                          bio: 'Conexão segura real.'
                        };

  // Helper to construct a unique, deterministic ID for any pair of interlocutors (sorted alphabetically)
  const getConversationId = (user1: string, user2: string) => {
    return [user1, user2].sort().join('_');
  };

  // Load user fonts on mount
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;800&family=Bebas+Neue&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Update selection if prop initialTargetFriendId changes
  useEffect(() => {
    setActivePartnerId(initialTargetFriendId);
  }, [initialTargetFriendId]);

  // Read message subcollection from Firestore in real-time
  useEffect(() => {
    if (!isOpen || !activePartnerId || !currentUser.id) return;

    const convId = getConversationId(currentUser.id, activePartnerId);
    const messagesRef = collection(db, 'conversations', convId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMsgs: ChatMessage[] = [];
      const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
      
      snapshot.forEach((docDoc) => {
        const data = docDoc.data();
        if (data.createdAt >= fortyEightHoursAgo) {
          fetchedMsgs.push({
            id: docDoc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text,
            timestamp: data.timestamp,
            createdAt: data.createdAt,
            type: data.type || 'text',
            photoUrl: data.photoUrl,
            photoCaption: data.photoCaption
          });
        }
      });

      setMessages(fetchedMsgs);
      
      // Scroll to bottom
      setTimeout(() => {
        if (feedRef.current) {
          feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
      }, 50);
    }, (err) => {
      console.error("Error listening to messages under conversation:", err);
    });

    return () => unsubscribe();
  }, [isOpen, activePartnerId, currentUser.id]);

  // Handle auto-scroll on new messages or typing indicator
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendChatMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || !currentUser.id || !activePartnerId) return;

    const convId = getConversationId(currentUser.id, activePartnerId);
    const nowMs = Date.now();
    const timeStr = new Date(nowMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const msgId = 'msg_' + Math.random().toString(36).substr(2, 9);
    const newMsgDoc = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: text,
      timestamp: timeStr,
      createdAt: nowMs,
      type: 'text'
    };

    try {
      // Save directly to the subcollection
      await setDoc(doc(db, 'conversations', convId, 'messages', msgId), newMsgDoc);

      // Trigger automatic reply from static chatbot friends
      const isBot = ['lucas', 'alexandre', 'orkut', 'hacker'].includes(activePartnerId);
      if (isBot) {
        setIsTyping(true);
        try {
          const response = await fetch('/api/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterId: activePartnerId,
              userName: currentUser.name,
              userProfile: `Usuário do chat criptografado temporário de 48 horas.`,
              text: text,
              encrypt: true
            })
          });

          const data = await response.json();
          const replyText = data.reply || "Resposta enviada de forma criptografada.";

          const replyMsgId = 'reply_' + Math.random().toString(36).substr(2, 9);
          const replyMsgDoc = {
            senderId: activePartnerId,
            senderName: activePartner.name,
            text: replyText,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            createdAt: Date.now(),
            type: 'text'
          };

          await setDoc(doc(db, 'conversations', convId, 'messages', replyMsgId), replyMsgDoc);
        } catch (e) {
          console.error("Local fallback response execution during bot chat endpoint call:", e);
          const fallbacks: Record<string, string> = {
            lucas: "Só vou TOMAR um Banho Ja tô saindo, blz? A gente se tromba!!",
            alexandre: "Excelente reflexão chapa! A Assembleia do Paraná apoia canais seguros.",
            orkut: "That structure is pure secure connection. Cheers my friend!",
            hacker: "Interceptei o quantum tunnel... mas essa chave descartável com exclusão em 48h me brecou."
          };

          const replyMsgId = 'reply_fb_' + Math.random().toString(36).substr(2, 9);
          const replyMsgDoc = {
            senderId: activePartnerId,
            senderName: activePartner.name,
            text: fallbacks[activePartnerId] || "Mensagem privada criptografada recebida com sucesso.",
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            createdAt: Date.now(),
            type: 'text'
          };

          await setDoc(doc(db, 'conversations', convId, 'messages', replyMsgId), replyMsgDoc);
        } finally {
          setIsTyping(false);
        }
      }
    } catch (err) {
      console.error("Failed to write private message to Firestore:", err);
    }
  };

  const handleSendMessage = async () => {
    const text = messageInput.trim();
    if (!text) return;
    setMessageInput('');
    await sendChatMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChatHistory = async () => {
    if (window.confirm("Deseja apagar permanentemente todas as mensagens desta conversa agora?")) {
      const convId = getConversationId(currentUser.id, activePartnerId);
      try {
        const messagesRef = collection(db, 'conversations', convId, 'messages');
        const snapshot = await getDocs(messagesRef);
        const deletePromises = snapshot.docs.map(dDoc => deleteDoc(dDoc.ref));
        await Promise.all(deletePromises);
        setMessages([]);
      } catch (err) {
        console.error("Failed to clear conversation history in Firestore:", err);
      }
    }
  };

  if (!isOpen) return null;

  const isMe = (msg: ChatMessage) => {
    return msg.senderId === 'me' || msg.senderId === currentUser.id;
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
      {/* Container holding left contacts column + right chat card side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 max-h-[92vh] max-w-full">
        
        {/* ── LEFT VERTICAL CONTACTS PANEL (DESKTOP ONLY) ─────────────────────── */}
        <div 
          className="hidden lg:flex flex-col w-[320px] rounded-[20px] overflow-hidden font-sans border shadow-2xl"
          style={{
            backgroundColor: '#c6d0da',
            borderColor: '#3b61b4',
            fontFamily: '"Exo 2", sans-serif',
          }}
        >
          {/* Logo Brand Header */}
          <div 
            className="p-4 flex items-center justify-between border-b relative"
            style={{
              backgroundColor: '#42508a',
              color: '#ededed',
              borderColor: '#3b61b4',
            }}
          >
            <p className="font-semibold text-[15px] tracking-wider font-sans" style={{ color: '#ffffff' }}>
              Scrap Zone
            </p>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono" style={{ color: '#4affd1' }}>
              MSN Mode
            </span>
          </div>

          {/* Current Logged-in User Profile Area */}
          <div className="m-3 p-3 bg-white rounded-xl flex items-center gap-3 border border-blue-200/60 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-[#00d4ff] p-[2px] flex-shrink-0">
              <div className="w-full h-full bg-[#123661] rounded-full flex items-center justify-center text-white text-xs font-bold uppercase border border-white">
                {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'ME'}
              </div>
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-sm text-[#001235] truncate">{currentUser.name || 'Usuário'}</p>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2fffaa] border border-emerald-500 animate-pulse" />
                <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">online agora</p>
              </div>
            </div>
          </div>

          {/* MSN-style Contacts Category Divider */}
          <div className="px-4 py-1.5 bg-[#9cbad5] text-[#001235] text-[10px] font-bold text-left tracking-wider uppercase flex items-center justify-between">
            <span>RECADOS / MENSAGENS / AMIGOS</span>
            <span className="text-[9px] opacity-75">({fullCharactersList.length})</span>
          </div>

          {/* Scrollable MSN-style list of online/offline contacts */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[380px] scrollbar-thin scrollbar-thumb-blue-400">
            {sortedCharacters.map((item, index) => {
              const isSelected = activePartnerId === item.id;
              
              // Generate 2-letter initials for retro avatar replacement
              const initials = item.name ? item.name.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase() : 'FT';
              
              // Map customized legendary MSN status options
              let msnStatus = "online agora";
              let dotColor = "#2fffaa"; // Emerald online
              
              if (item.id === 'lucas') {
                msnStatus = "programando...";
                dotColor = "#2fffaa";
              } else if (item.id === 'alexandre') {
                msnStatus = "ocupado";
                dotColor = "#ffa500"; // Busy orange
              } else if (item.id === 'orkut') {
                msnStatus = "ouvindo música";
                dotColor = "#2fffaa";
              } else if (item.id === 'hacker') {
                msnStatus = "viajando";
                dotColor = "#ff3b3b"; // Traveling/Offline red
              } else {
                // Procedural fun status allocation for real Firestore users
                const statuses = ["online agora", "programando", "ouvindo música", "na Igreja", "ocupado", "Viajando"];
                const colors = ["#2fffaa", "#2fffaa", "#2fffaa", "#ffa500", "#ffa500", "#ff3b3b"];
                msnStatus = statuses[index % statuses.length];
                dotColor = colors[index % colors.length];
              }

              // Set aesthetic background styling matching EXEMPLO.png
              const accentColorClasses = [
                "bg-orange-50 text-orange-600 border-orange-200", 
                "bg-blue-50 text-blue-600 border-blue-200", 
                "bg-emerald-50 text-emerald-600 border-emerald-200", 
                "bg-pink-50 text-pink-600 border-pink-200", 
                "bg-purple-50 text-purple-600 border-purple-200"
              ];
              const boxColors = accentColorClasses[index % accentColorClasses.length];

              return (
                <button
                  key={item.id}
                  onClick={() => setActivePartnerId(item.id)}
                  className={`w-full p-2.5 flex items-center gap-3 rounded-lg text-left transition-all border ${
                    isSelected 
                      ? 'bg-white border-[#3b61b4] shadow-md scale-[1.01]' 
                      : 'bg-white/45 hover:bg-white/90 border-transparent text-neutral-700'
                  }`}
                >
                  {/* Initials box similar to EXEMPLO.png (using uppercase letters) */}
                  {item.avatar && item.avatar !== '👤' && item.avatar.trim() !== '' ? (
                    <img 
                      src={item.avatar} 
                      alt={item.name} 
                      className="w-9 h-9 rounded-md object-cover border border-neutral-300 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-xs uppercase border flex-shrink-0 ${boxColors}`}>
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 text-left">
                    <p className={`truncate text-xs font-bold leading-tight ${isSelected ? 'text-[#3b61b4]' : 'text-neutral-800'}`}>
                      {item.name}
                    </p>
                    <p className="text-[10px] font-medium truncate mt-0.5" style={{ color: dotColor === '#ff3b3b' ? '#ef4444' : dotColor === '#ffa500' ? '#d97706' : '#059669' }}>
                      {msnStatus}
                    </p>
                  </div>

                  {/* Unread Counter Badge */}
                  {unreadCounts[item.id] > 0 && (
                    <span 
                      className="bg-[#ff00a0] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce flex-shrink-0"
                      style={{ boxShadow: '0 0 6px rgba(255, 0, 160, 0.6)' }}
                    >
                      {unreadCounts[item.id]}
                    </span>
                  )}

                  {/* Indicator Dot */}
                  <span 
                    className="w-2 h-2 rounded-full border border-neutral-300 flex-shrink-0" 
                    style={{ backgroundColor: dotColor }} 
                  />
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-blue-100/40 text-[9px] text-[#001235]/60 text-center border-t border-blue-200/40">
            Canais seguros com expiração de 48 horas.
          </div>
        </div>

        {/* ── RIGHT CHAT CONVERSATION CARD ────────────────────────────────────── */}
        <div 
          className="chat-card w-[360px] max-w-full rounded-[20px] overflow-hidden flex flex-col font-sans border shadow-2xl relative"
          style={{
            backgroundColor: '#111827',
            borderColor: '#3b61b4',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 40px rgba(59,97,180,0.18), 0 24px 64px rgba(0,0,0,0.7)',
            fontFamily: '"Exo 2", sans-serif',
          }}
        >
        {/* Custom Scoped inline styles for Animations and Scroll */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spinRing {
            to { transform: rotate(360deg); }
          }
          @keyframes scrollTicker {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes blink {
            0%, 100% { box-shadow: 0 0 0 2px rgba(47,255,170,0.2), 0 0 8px #2fffaa; }
            50%      { box-shadow: 0 0 0 4px rgba(47,255,170,0.05), 0 0 20px #2fffaa; }
          }
          .custom-avatar-ring {
            animation: spinRing 6s linear infinite;
          }
          .custom-online-dot {
            animation: blink 2.5s ease-in-out infinite;
          }
          .custom-ticker-track {
            animation: scrollTicker 14s linear infinite;
            will-change: transform;
          }
        `}} />

        {/* ── HEADER ─────────────────────── */}
        <div 
          className="chat-header flex items-center justify-between p-4 relative border-b border-[#3b61b4]"
          style={{
            backgroundColor: '#3b61b4',
            color: '#ffffff',
          }}
        >
          {/* Top colored aesthetic bar line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3b61b4] to-[#00d4ff]" />

          <div className="flex items-center gap-3">
            {/* Cone ring avatar wrapper */}
            <div 
              className="avatar-shell w-11 h-11 rounded-full p-[2px] flex-shrink-0 custom-avatar-ring"
              style={{
                background: 'conic-gradient(#00d4ff 0deg, #3b61b4 120deg, #2fffaa 240deg, #00d4ff 360deg)'
              }}
            >
              <div className="avatar-inner w-full h-full rounded-full bg-[#1a2535] border border-[#111827] overflow-hidden flex items-center justify-center">
                <img 
                  src={activePartner.avatar} 
                  alt={activePartner.name}
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* User credentials & selector switch */}
            <div className="header-text text-left flex flex-col gap-0.5 relative">
              <button 
                onClick={() => setShowPartnerSelector(!showPartnerSelector)}
                className="username font-semibold text-[#ffffff] flex items-center gap-1 hover:text-[#2fffaa] text-[16px] tracking-wide cursor-pointer text-left bg-transparent border-none"
                style={{ fontFamily: '"Rajdhani", sans-serif' }}
              >
                @{activePartner.username}
                <ChevronDown size={14} className="opacity-70 mt-0.5" />
              </button>

              <div className="status-row flex items-center gap-1.5 text-[11px] text-[#2fffaa]">
                <span className="online-dot w-2 h-2 rounded-full bg-[#2fffaa] custom-online-dot" />
                <span style={{ color: '#2fffaa' }}>Online Agora</span>
              </div>
            </div>
          </div>

          {/* Right Header Options (Clear History / Close) */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={clearChatHistory} 
              title="Limpar Histórico"
              className="p-1 text-[#ffffff] hover:text-red-400 text-xs font-mono rounded cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              Limpar
            </button>
            <button 
              onClick={onClose} 
              className="text-white p-1 rounded-full bg-[#ff0000] hover:bg-[#cc0000] transition-colors cursor-pointer flex items-center justify-center font-bold"
              style={{
                backgroundColor: '#ff0000',
                color: '#ffffff',
                fontWeight: 'bold',
                lineHeight: '26px',
                fontSize: '18px',
                width: '26px',
                height: '26px',
              }}
              title="Fechar Chat"
            >
              <X size={16} style={{ color: '#ffffff', fontWeight: 'bold' }} />
            </button>
          </div>

          {/* Dropdown custom partner selector floating menu */}
          <AnimatePresence>
            {showPartnerSelector && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-4 top-14 bg-[#111827] border border-[#a855f7]/30 rounded-lg shadow-xl p-2 z-50 w-56 text-left"
              >
                <div className="text-[9px] font-bold text-indigo-400 p-1 uppercase tracking-wider">Conversar com:</div>
                <div className="space-y-1">
                  {fullCharactersList.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePartnerId(item.id);
                        setShowPartnerSelector(false);
                      }}
                      className={`w-full p-1.5 text-xs flex items-center gap-2 rounded text-left transition-colors cursor-pointer ${
                        activePartnerId === item.id ? 'bg-[#a855f7]/15 text-[#00d4ff] font-bold' : 'hover:bg-white/5 text-neutral-300'
                      }`}
                    >
                      <img src={item.avatar} className="w-5 h-5 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[11px]">{item.name}</p>
                        <p className="text-[9px] text-neutral-500 truncate">@{item.username}</p>
                      </div>
                      <Circle size={8} className="fill-[#00e676] text-[#00e676] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── TICKER COLOURED TEXT LETREIRO ────────────── */}
        <div 
          className="ticker-band overflow-hidden flex items-center h-8 relative select-none"
          style={{
            backgroundColor: '#070810',
            borderTop: '1px solid rgba(248, 40, 200, 0.3)',
            borderBottom: '1px solid rgba(248, 40, 200, 0.3)'
          }}
        >
          {/* Scanline overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.15)_50%,_rgba(0,0,0,0)_50%)] bg-[length:100%_4px] pointer-events-none z-10" />

          <div className="custom-ticker-track flex whitespace-nowrap">
            <span 
              className="ticker-item px-10 text-[11px] uppercase tracking-[3px] font-bold"
              style={{
                fontFamily: '"DotGothic16", sans-serif',
                color: '#ff38c8',
                textShadow: '0 0 6px #ff38c8, 0 0 18px #c800ff'
              }}
            >
              ⚠ essa conversa apaga permanente em 48 horas &nbsp;·&nbsp; ⚠ essa conversa apaga permanente em 48 horas &nbsp;·&nbsp; ⚠ essa conversa apaga permanente em 48 horas &nbsp;·&nbsp;
            </span>
            <span 
              className="ticker-item px-10 text-[11px] uppercase tracking-[3px] font-bold"
              style={{
                fontFamily: '"DotGothic16", sans-serif',
                color: '#ff38c8',
                textShadow: '0 0 6px #ff38c8, 0 0 18px #c800ff'
              }}
            >
              ⚠ essa conversa apaga permanente em 48 horas &nbsp;·&nbsp; ⚠ essa conversa apaga permanente em 48 horas &nbsp;·&nbsp; ⚠ essa conversa apaga permanente em 48 horas &nbsp;·&nbsp;
            </span>
          </div>
        </div>

        {/* ── MESSAGES FEED ───────────────────── */}
        <div 
          ref={feedRef}
          className="messages-feed flex-1 p-4 flex flex-col gap-3 overflow-y-auto min-h-[220px] max-h-[340px] scrollbar-thin scrollbar-thumb-indigo-200"
          style={{
            backgroundColor: '#9cbad5'
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 text-neutral-400 italic text-xs">
              <Shield className="text-indigo-400 mb-1.5 opacity-60" size={20} />
              <p style={{ color: '#080808' }}>Nenhuma mensagem ativa.</p>
              <p className="text-[10px] mt-1" style={{ color: '#001235' }}>Conversas expiram totalmente após 48 horas.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMeMsg = isMe(msg);

              return (
                <div 
                  key={msg.id}
                  className={`bubble max-w-[78%] p-2.5 px-3.5 text-[13px] leading-relaxed rounded-[16px] relative break-all text-left shadow-sm ${
                    isMeMsg 
                      ? 'self-end bg-[#e4fcfc] text-black rounded-br-[4px] border border-[#a855f7]/15' 
                      : 'self-start bg-[#fcfcfc] text-black rounded-bl-[4px] border border-[#00d4ff]/12'
                  }`}
                >
                  {(() => {
                    const isPhoto = msg.text.startsWith('📸 [Foto Anexada]');
                    if (isPhoto) {
                      const urlMatch = msg.text.match(/\((https?:\/\/[^\s]+)\)/);
                      const photoUrl = urlMatch ? urlMatch[1] : '';
                      const captionMatch = msg.text.match(/Referência: (.*) \(/);
                      const photoCaption = captionMatch ? captionMatch[1] : 'Foto';
                      const actualText = msg.text.replace('📸 [Foto Anexada] ', '').replace(/ - Referência: .*\(.*\)/, '');
                      
                      return (
                        <div className="flex flex-col gap-2">
                           <p className="font-bold">📸 Foto Compartilhada</p>
                           {photoUrl && (
                             <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                                <img src={photoUrl} alt={photoCaption} loading="lazy" className="max-w-full h-auto" />
                             </a>
                           )}
                           <p className="font-semibold text-xs">{photoCaption}</p>
                           {actualText && <p className="whitespace-pre-line font-sans font-medium" style={{ color: '#080808' }}>"{actualText}"</p>}
                           <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline cursor-pointer">
                               Abrir Foto
                           </a>
                        </div>
                      );
                    }
                    return <p className="whitespace-pre-line font-sans font-medium" style={{ color: '#080808' }}>{msg.text}</p>;
                  })()}
                  <span 
                    className="bubble-time text-[8px] block mt-1 tracking-wider"
                    style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      textAlign: isMeMsg ? 'right' : 'left',
                      color: '#001235'
                    }}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              );
            })
          )}

          {/* Typing state bubble */}
          {isTyping && (
            <div className="self-start max-w-[70%] p-2.5 px-3.5 bg-[#fcfcfc] text-black rounded-[16px] rounded-bl-[4px] border border-[#00d4ff]/10 text-xs italic flex items-center gap-1.5 shadow-sm text-left">
              <span className="w-1.5 h-1.5 bg-[#3b61b4] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#3b61b4] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-[#3b61b4] rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="font-sans font-medium ml-1 text-neutral-600">@{activePartner.username} está digitando...</span>
            </div>
          )}
        </div>

        {/* ── INPUT ZONE ─────────────────────── */}
        <div 
          className="input-zone p-4 border-t border-[#a855f7]/12 flex flex-col gap-2.5 text-left"
          style={{
            backgroundColor: '#3b61b4'
          }}
        >
          <div className="textarea-wrap relative">
            <textarea
              id="chat-message-input"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value.slice(0, 300))}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={2}
              className="msg-input w-full border border-[#a855f7]/20 rounded-xl p-3 text-[#ffffff] placeholder-neutral-400 text-xs focus:outline-none focus:border-[#a855f7]/60 focus:ring-1 focus:ring-[#a855f7]/20 resize-none font-sans leading-relaxed"
              style={{
                backgroundColor: '#323232'
              }}
            />
          </div>

          <div className="input-footer flex justify-between items-center sm:gap-2">
            {/* Limit counter */}
            <span 
              className="char-count text-[10px] select-none"
              style={{
                fontFamily: '"Share Tech Mono", monospace',
                color: '#6efffc'
              }}
            >
              {messageInput.length} / 300
            </span>

            {/* Expire alert icon next to button */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] hidden sm:flex items-center gap-1 opacity-75 select-none uppercase font-bold" style={{ color: '#ffffff' }}>
                <Clock size={10} /> Canal Temporário
              </span>
              <button 
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="send-btn px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
                style={{
                  background: '#123661',
                  fontFamily: '"Rajdhani", sans-serif',
                  boxShadow: messageInput.trim() ? '0 0 16px rgba(18,54,97,0.4)' : 'none'
                }}
              >
                <Send size={11} />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>

        </div>

      </div>
    </div>
  );
}
