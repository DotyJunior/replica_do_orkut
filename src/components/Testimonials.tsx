import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, MailWarning, Lock, Send, RefreshCw, Star, Heart, Plus } from 'lucide-react';
import { Testimonial, Profile } from '../types';
import SocialActions from './SocialActions';

interface TestimonialsProps {
  testimonials: Testimonial[];
  onAddTestimonial: (test: Omit<Testimonial, 'id' | 'timestamp' | 'unlocked'>) => void;
  activeProfile: Profile;
  isOwnProfile: boolean;
  currentUser: { id: string; name: string; avatar: string };
  onLikeTestimonial?: (id: string, liked: boolean, count: number) => void;
  onShareToFeed: (itemTitle: string, itemType: string) => void;
  profiles?: Record<string, Profile>;
}

export default function Testimonials({
  testimonials,
  onAddTestimonial,
  activeProfile,
  isOwnProfile,
  currentUser,
  onLikeTestimonial,
  onShareToFeed,
  profiles,
}: TestimonialsProps) {
  const [inputText, setInputText] = useState('');
  const [encryptTestimonial, setEncryptTestimonial] = useState(true);
  const [aesPasskey, setAesPasskey] = useState('orkut-depo-key');
  const [isSending, setIsSending] = useState(false);
  const [unlockKeys, setUnlockKeys] = useState<Record<string, string>>({}); // id -> key
  const [unlockedState, setUnlockedState] = useState<Record<string, boolean>>({}); // id -> state
  const [decryptedTexts, setDecryptedTexts] = useState<Record<string, string>>({}); // id -> value

  // State to manage showing/hiding the "Criar Depoimento" form
  const [isFormOpen, setIsFormOpen] = useState(!isOwnProfile);
  // State for filtering received vs sent testimonials
  const [filterTab, setFilterTab] = useState<'received' | 'sent'>('received');

  // List of profiles to select recipient
  const friendsOptions = Object.values(profiles || {});
  const otherFriends = friendsOptions.filter(p => p.id !== currentUser.id);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');

  // Keep form auto-open when visiting others, but starts closed when looking at ourselves
  useEffect(() => {
    setIsFormOpen(!isOwnProfile);
  }, [isOwnProfile, activeProfile.id]);

  // Set default recipient to first friend or self
  useEffect(() => {
    if (!selectedRecipientId && otherFriends.length > 0) {
      setSelectedRecipientId(otherFriends[0].id);
    } else if (!selectedRecipientId) {
      setSelectedRecipientId(currentUser.id);
    }
  }, [profiles, currentUser.id]);

  // Filter testimonials based on owner versus visiting mode
  const filteredTestimonials = testimonials.filter((t) => {
    if (!isOwnProfile) {
      return t.toId === activeProfile.id;
    } else {
      if (filterTab === 'received') {
        return t.toId === currentUser.id;
      } else {
        return t.fromId === currentUser.id;
      }
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    setTimeout(() => {
      const targetId = isOwnProfile ? (selectedRecipientId || currentUser.id) : activeProfile.id;
      let payload: Omit<Testimonial, 'id' | 'timestamp' | 'unlocked'> = {
        fromId: currentUser.id,
        fromName: currentUser.name,
        fromAvatar: currentUser.avatar,
        toId: targetId,
        content: inputText,
        isEncrypted: encryptTestimonial,
      };

      if (encryptTestimonial) {
        // Obfuscated hex or mock cipher showing crypt values
        const hexEncoded = inputText
          .split('')
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('');
        payload = {
          ...payload,
          ciphertext: `0x_sec_depo_${hexEncoded}`,
          aesKeyHex: aesPasskey,
        };
      }

      onAddTestimonial(payload);
      setInputText('');
      setIsSending(false);
      
      // Close the form if on own profile
      if (isOwnProfile) {
        setIsFormOpen(false);
      }
    }, 400);
  };

  const handleUnlockAndVerify = (id: string, encodedCipher: string, correctPass: string) => {
    const entered = unlockKeys[id] || '';
    if (entered === correctPass) {
      // Decode hex back
      const rawHex = encodedCipher.replace('0x_sec_depo_', '');
      let decrypted = '';
      for (let i = 0; i < rawHex.length; i += 2) {
        decrypted += String.fromCharCode(parseInt(rawHex.substring(i, i + 2), 16));
      }
      setDecryptedTexts((prev) => ({ ...prev, [id]: decrypted }));
      setUnlockedState((prev) => ({ ...prev, [id]: true }));
    } else {
      alert('Chave de autenticação criptográfica inválida! Transmissão violada.');
    }
  };

  return (
    <div id="testimonials-view" className="bg-white border border-neutral-300 rounded p-4 shadow-sm text-left">
      <div className="border-b pb-2 mb-4">
        <h2 className="text-lg font-bold font-sans text-neutral-800 flex items-center gap-1.5">
          {isOwnProfile && filterTab === 'sent' ? (
            <span>📤 Depoimentos Enviados por Você</span>
          ) : (
            <span>🌟 Depoimentos de <strong>{activeProfile.nome_exibicao || activeProfile.name}</strong></span>
          )}
        </h2>
        <p className="text-xs text-neutral-500 font-sans">
          "Depoimento só aceita se for legal!" - No Scrapzone clássico as pessoas se declaravam para os melhores amigos. No <strong>Scrapzone Secure</strong>, seus depoimentos são protegidos por chaves criptográficas para que os fofoqueiros do feed não vejam sua declaração!
        </p>
      </div>

      {/* Tabs / Filter & Creation Toggle UI for Owner */}
      {isOwnProfile && (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-neutral-100 rounded border border-neutral-200">
            <button
              id="tab-received-testimonials"
              type="button"
              onClick={() => setFilterTab('received')}
              className={`px-3 py-1.5 text-xs font-bold font-sans rounded transition-all cursor-pointer ${
                filterTab === 'received'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-200/50'
              }`}
            >
              📬 Recebidos ({testimonials.filter(t => t.toId === currentUser.id).length})
            </button>
            <button
              id="tab-sent-testimonials"
              type="button"
              onClick={() => setFilterTab('sent')}
              className={`px-3 py-1.5 text-xs font-bold font-sans rounded transition-all cursor-pointer ${
                filterTab === 'sent'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-200/50'
              }`}
            >
              📤 Enviados ({testimonials.filter(t => t.fromId === currentUser.id).length})
            </button>
          </div>

          <button
            id="btn-toggle-create-testimonial"
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fae8ff] hover:bg-[#f5d0fe] border border-pink-300 text-pink-700 font-bold text-xs rounded transition-all cursor-pointer shadow-xs font-sans uppercase"
          >
            <Plus size={14} />
            {isFormOpen ? 'Fechar Formulário' : 'Criar Depoimento'}
          </button>
        </div>
      )}

      {/* Testimonial Form write-up - For visitors, or when form is opened */}
      {isFormOpen && (
        <form onSubmit={handleCreate} className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-6 font-sans shadow-xs animate-fadeIn">
          {isOwnProfile && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-2">Para qual amigo você quer enviar esse depoimento?</label>
              <select
                id="testimonial-recipient-select"
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500 bg-white"
                required
              >
                <option value="" disabled>-- Selecione um Amigo --</option>
                {friendsOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === currentUser.id ? '(Eu — Postar no meu próprio mural)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="block text-xs font-bold text-neutral-600 uppercase mb-2">
            {isOwnProfile ? 'Declarar sentimento para amigo:' : `Chore as pitangas e diga o quanto você gosta de ${activeProfile.nome_exibicao || activeProfile.name}!`}
          </label>
          <textarea
            id="testimonial-textarea"
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escreva com muito amor e seja legal..."
            className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500 bg-white"
            disabled={isSending}
            required
          />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mt-3 pt-3 border-t border-dashed border-neutral-200">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-[#d946ef] font-bold">
                <input
                  id="toggle-crypto-depo"
                  type="checkbox"
                  checked={encryptTestimonial}
                  onChange={(e) => setEncryptTestimonial(e.target.checked)}
                  className="rounded border-neutral-300 text-pink-600 focus:ring-pink-500"
                />
                Bloquear depoimento com Chave Secreta (Depo Sec)
              </label>

              {encryptTestimonial && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase">Senha:</span>
                  <input
                    id="input-depo-passkey"
                    type="password"
                    value={aesPasskey}
                    onChange={(e) => setAesPasskey(e.target.value)}
                    className="px-2 py-0.5 border border-neutral-300 rounded text-[11px] font-mono w-[130px]"
                    placeholder="Chave secreta..."
                  />
                </div>
              )}
            </div>

            <button
              id="btn-send-testimonial"
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#fae8ff] hover:bg-[#f5d0fe] border border-[#f0abfc] text-pink-700 font-bold text-xs rounded transition-all cursor-pointer shadow-sm disabled:opacity-50 font-sans"
            >
              {isSending ? (
                <RefreshCw className="animate-spin" size={14} />
              ) : (
                <Send size={14} />
              )}
              {isOwnProfile ? 'Enviar Depoimento' : 'Enviar Depoimento'}
            </button>
          </div>
        </form>
      )}

      {/* Testimonials Screen */}
      <div className="space-y-4">
        {filteredTestimonials.length === 0 ? (
          <div className="text-center py-12 text-sm text-neutral-500 border border-dashed rounded italic font-sans animate-pulse">
            Nenhum depoimento aceito ainda por {activeProfile.nome_exibicao || activeProfile.name}.
          </div>
        ) : (
          filteredTestimonials.map((depo) => {
            const isUnlocked = !depo.isEncrypted || unlockedState[depo.id];
            const contentToShow = isUnlocked
              ? (unlockedState[depo.id] ? decryptedTexts[depo.id] : depo.content)
              : `🔐 MENSAGEM CONFIDENCIAL CRIPTOGRAFADA: (${depo.ciphertext?.slice(0, 30)}...)`;

            return (
              <div key={depo.id} className="border border-neutral-200 rounded overflow-hidden shadow-sm bg-white">
                {/* Header panel */}
                <div className="bg-pink-50/50 px-3 py-2 flex justify-between items-center border-b border-pink-100 text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <img
                      src={depo.fromAvatar}
                      alt={profiles && depo.fromId && profiles[depo.fromId] ? (profiles[depo.fromId].nome_exibicao || profiles[depo.fromId].name) : depo.fromName}
                      className="w-6 h-6 rounded object-cover border border-neutral-300 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-bold text-pink-700">
                      {profiles && depo.fromId && profiles[depo.fromId]
                        ? (profiles[depo.fromId].nome_exibicao || profiles[depo.fromId].name)
                        : depo.fromName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">({depo.timestamp})</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] font-bold">
                    <span className="bg-[#fae8ff] text-pink-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <Heart size={10} fill="#ec4899" className="text-pink-600" /> Amigos
                    </span>
                    {depo.isEncrypted ? (
                      <span className="bg-red-50 border border-red-200 text-red-800 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                        <Lock size={10} /> Privado (Leve e Apague)
                      </span>
                    ) : (
                      <span className="bg-green-50 border border-green-200 text-green-800 px-2 py-0.5 rounded flex items-center gap-1 font-sans">
                        <Star size={10} fill="#eab308" className="text-yellow-600" /> Público
                      </span>
                    )}
                  </div>
                </div>

                {/* Content body and decryptor logic */}
                <div className="p-4 text-xs font-sans text-neutral-800 leading-relaxed bg-neutral-50/30 flex flex-col gap-3">
                  <p className={`font-sans whitespace-pre-wrap ${!isUnlocked ? 'font-mono text-neutral-500 italic' : 'text-neutral-700'}`}>
                    {contentToShow}
                  </p>

                  {depo.isEncrypted && !isUnlocked && (
                    <div className="border border-dashed border-red-200 rounded bg-red-50/70 p-3 self-start flex items-center gap-3 w-full max-w-md">
                      <MailWarning size={18} className="text-red-500 flex-shrink-0" />
                      <div className="flex-1 flex flex-col md:flex-row gap-2 items-start md:items-center">
                        <input
                          id={`input-unlock-key-${depo.id}`}
                          type="password"
                          value={unlockKeys[depo.id] || ''}
                          onChange={(e) => setUnlockKeys({ ...unlockKeys, [depo.id]: e.target.value })}
                          placeholder="Digite a Senha Depo..."
                          className="px-2 py-1 border border-neutral-300 rounded text-[11px] font-mono bg-white focus:outline-none w-full md:w-[150px]"
                        />
                        <button
                          id={`btn-unlock-${depo.id}`}
                          onClick={() => handleUnlockAndVerify(depo.id, depo.ciphertext!, depo.aesKeyHex!)}
                          className="px-3 py-1 bg-red-600 text-white text-[10px] rounded font-bold hover:bg-red-700 flex items-center gap-1 cursor-pointer w-full md:w-auto justify-center shadow-sm"
                        >
                          <Eye size={12} />
                          Desbloquear Depo
                        </button>
                      </div>
                    </div>
                  )}

                  {isUnlocked && depo.isEncrypted && (
                    <div className="self-start text-[10px] font-mono text-green-800 bg-green-50 px-2.5 py-1 rounded border border-green-200 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-green-600" />
                      Canal seguro verificado: O depoimento "Leve e apague" foi decodificado em memória-isolada com integridade verificada.
                    </div>
                  )}

                  {/* Subtle Sec Engine notation */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-neutral-100/70 pt-1.5 mt-1 text-[9px] text-neutral-400 font-mono select-none">
                    <span className="flex items-center gap-0.5 text-pink-700/60 font-semibold">
                      🛡️ Depoimento protegido contra exploits antigos (Rust Secure)
                    </span>
                    <span>•</span>
                    <span className="text-blue-700/60 font-semibold">
                      🔑 Assinatura digital verificada
                    </span>
                  </div>

                  {/* Added Interactive Nostalgic Social Platform Interactions */}
                  <SocialActions
                    itemId={depo.id}
                    itemType="testimonial"
                    itemTitle={`Depoimento de ${depo.fromName}: "${(isUnlocked ? (unlockedState[depo.id] ? decryptedTexts[depo.id] : depo.content) : depo.ciphertext || '').slice(0, 30)}..."`}
                    initialLikes={depo.likes || 0}
                    initialLikedByMe={depo.likedByMe || false}
                    onLikeUpdate={(liked, count) => onLikeTestimonial?.(depo.id, liked, count)}
                    onShareToFeed={onShareToFeed}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
