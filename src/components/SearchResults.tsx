import React from 'react';
import { Search, User, Users, MessageSquare, ArrowRight, CornerDownRight, Check, Plus, AlertCircle } from 'lucide-react';
import { Profile, Community, Scrap } from '../types';

interface SearchResultsProps {
  query: string;
  profiles: Record<string, Profile>;
  communities: Community[];
  scraps: Scrap[];
  onNavigateToFriend: (id: string) => void;
  onJoinCommunity: (id: string) => void;
  joinedCommunityIds: string[];
  onNavigateToTab: (tab: string) => void;
  onClearSearch: () => void;
}

export default function SearchResults({
  query,
  profiles,
  communities,
  scraps,
  onNavigateToFriend,
  onJoinCommunity,
  joinedCommunityIds,
  onNavigateToTab,
  onClearSearch
}: SearchResultsProps) {
  const normalizedQuery = query.toLowerCase().trim();

  // 1. Deduplicate & Filter Profiles
  const uniqueProfiles: Record<string, Profile> = {};
  Object.entries(profiles).forEach(([key, profile]) => {
    const realId = profile.id;
    if (key === 'me') {
      if (realId && realId !== 'me') {
        if (!uniqueProfiles[realId]) {
          uniqueProfiles[realId] = profile;
        }
      } else {
        uniqueProfiles['me'] = profile;
      }
    } else {
      uniqueProfiles[key] = profile;
    }
  });

  const matchedProfiles = Object.entries(uniqueProfiles).filter(([id, profile]) => {
    const nameToMatch = profile.nome_exibicao || profile.name || '';
    const nameMatch = nameToMatch.toLowerCase().includes(normalizedQuery);
    const aboutMatch = profile.aboutMe ? profile.aboutMe.toLowerCase().includes(normalizedQuery) : false;
    const locMatch = profile.location ? profile.location.toLowerCase().includes(normalizedQuery) : false;
    const passionMatch = profile.passions ? profile.passions.toLowerCase().includes(normalizedQuery) : false;
    const usernameMatch = profile.username ? profile.username.toLowerCase().includes(normalizedQuery) : false;
    const idMatch = id.toLowerCase().includes(normalizedQuery) || (profile.id && profile.id.toLowerCase().includes(normalizedQuery));

    return nameMatch || aboutMatch || locMatch || passionMatch || usernameMatch || idMatch;
  });

  // Task 6: Temporary logs showing details of searched term and matched users
  React.useEffect(() => {
    console.log("🔍 [Audit Pesquisa] Termo pesquisado:", query);
    console.log("👤 [Audit Pesquisa] Usuários correspondentes encontrados:", matchedProfiles.map(([id, p]) => ({
      id,
      name: p.name,
      username: p.username || 'N/A'
    })));
  }, [query, matchedProfiles]);

  // 2. Filter Communities
  const matchedCommunities = communities.filter(c => {
    return (
      (c.name || '').toLowerCase().includes(normalizedQuery) ||
      (c.description || '').toLowerCase().includes(normalizedQuery) ||
      (c.category || '').toLowerCase().includes(normalizedQuery)
    );
  });

  // 3. Filter Scraps
  const matchedScraps = scraps.filter(s => {
    return s.rawContent.toLowerCase().includes(normalizedQuery);
  });

  const totalResults = matchedProfiles.length + matchedCommunities.length + matchedScraps.length;

  return (
    <div className="anim-fade bg-white border border-[#9ebade] rounded-lg p-5 md:p-6 shadow-sm font-sans">
      {/* Search Header Banner */}
      <div className="bg-[#dee7f4] border border-[#b2cbeb] rounded p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1d4ed8] flex items-center gap-2">
            <Search size={20} className="text-[#d946ef]" />
            Resultados da Pesquisa Global
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            Encontramos <strong className="text-blue-700">{totalResults}</strong> correspondências para a busca: <span className="bg-white px-1.5 py-0.5 rounded border text-stone-700 font-mono text-[11px] font-semibold">"{query}"</span>
          </p>
        </div>
        <button
          onClick={onClearSearch}
          className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold text-xs rounded transition-colors cursor-pointer"
        >
          Limpar Pesquisa
        </button>
      </div>

      {totalResults === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500">
          <AlertCircle size={40} className="text-blue-400 mb-3 animate-pulse" />
          <h3 className="font-bold text-sm text-neutral-700">Nenhum resultado encontrado</h3>
          <p className="text-xs max-w-sm mt-1">
            Não encontramos amigos, comunidades ou recados contendo o termo pesquisado. Tente buscar algo diferente, como "pinhão", "Rust", "Scrapzone", "Curi" ou "odeio".
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Categorized Results Layout */}
          
          {/* Category A: Perfis / Amigos */}
          {matchedProfiles.length > 0 && (
            <div className="border border-[#b2cbeb] rounded overflow-hidden">
              <div className="bg-[#e4ecf7] px-4 py-2 border-b border-[#b2cbeb] flex items-center gap-2">
                <User size={16} className="text-[#1d4ed8]" />
                <h3 className="text-xs font-bold text-[#1d4ed8] uppercase tracking-wider">Pessoas e Perfis ({matchedProfiles.length})</h3>
              </div>
              <div className="divide-y divide-neutral-100 bg-white">
                {matchedProfiles.map(([id, profile]) => (
                  <div key={id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#dee7f4]/15 transition-colors">
                    <div className="flex gap-3">
                      <img
                        src={profile.avatar}
                        alt={profile.nome_exibicao || profile.name}
                        className="w-12 h-12 rounded bg-neutral-100 object-cover border border-[#bed2ed]"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-blue-800 hover:underline cursor-pointer" onClick={() => onNavigateToFriend(id)}>
                          {profile.nome_exibicao || profile.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 font-sans mt-0.5">
                          📍 {profile.location} | Humor: {profile.humor}
                        </p>
                        <p className="text-xs text-neutral-600 line-clamp-2 mt-1 italic pr-4">
                          "{profile.aboutMe}"
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateToFriend(id)}
                      className="self-start sm:self-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      Ir ao Perfil <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category B: Comunidades */}
          {matchedCommunities.length > 0 && (
            <div className="border border-[#b2cbeb] rounded overflow-hidden">
              <div className="bg-[#e4ecf7] px-4 py-2 border-b border-[#b2cbeb] flex items-center gap-2">
                <Users size={16} className="text-[#1d4ed8]" />
                <h3 className="text-xs font-bold text-[#1d4ed8] uppercase tracking-wider">Comunidades ({matchedCommunities.length})</h3>
              </div>
              <div className="divide-y divide-neutral-100 bg-white">
                {matchedCommunities.map((community) => {
                  const isJoined = joinedCommunityIds.includes(community.id);
                  return (
                    <div key={community.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#dee7f4]/15 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded bg-[#dee7f4] text-neutral-700 flex items-center justify-center text-lg border border-[#bed2ed]">
                          {community.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-xs text-blue-800 hover:underline cursor-pointer">
                              {community.name}
                            </h4>
                            {community.secureMode && (
                              <span className="bg-pink-100 text-pink-700 border border-pink-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                                SECURE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 font-sans mt-0.5">
                            Categoria: {community.category} | Membros: <strong className="text-neutral-700">{community.members.toLocaleString('pt-BR')}</strong>
                          </p>
                          <p className="text-xs text-neutral-600 mt-1">
                            {community.description}
                          </p>
                        </div>
                      </div>
                      <div className="self-start sm:self-center">
                        {isJoined ? (
                          <button
                            onClick={() => onNavigateToTab('communities')}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 px-3 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Check size={12} className="text-green-600" /> Já Participo
                          </button>
                        ) : (
                          <button
                            onClick={() => onJoinCommunity(community.id)}
                            className="bg-[#d946ef] hover:bg-[#c026d3] text-white px-3 py-1 rounded text-[11px] font-bold shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
                          >
                            <Plus size={12} /> Participar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category C: Recados / Scraps */}
          {matchedScraps.length > 0 && (
            <div className="border border-[#b2cbeb] rounded overflow-hidden">
              <div className="bg-[#e4ecf7] px-4 py-2 border-b border-[#b2cbeb] flex items-center gap-2">
                <MessageSquare size={16} className="text-[#1d4ed8]" />
                <h3 className="text-xs font-bold text-[#1d4ed8] uppercase tracking-wider">Recados do Scrapbook ({matchedScraps.length})</h3>
              </div>
              <div className="divide-y divide-neutral-100 bg-white">
                {matchedScraps.map((scrap) => (
                  <div key={scrap.id} className="p-4 hover:bg-[#dee7f4]/15 transition-colors">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={scrap.fromAvatar}
                          alt={scrap.fromName}
                          className="w-6 h-6 rounded-full object-cover border border-[#bed2ed]"
                        />
                        <span
                          onClick={() => onNavigateToFriend(scrap.fromId)}
                          className="font-bold text-xs text-blue-800 hover:underline cursor-pointer"
                        >
                          {scrap.fromName}
                        </span>
                        <CornerDownRight size={10} className="text-neutral-400" />
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {scrap.timestamp}
                        </span>
                      </div>
                      {scrap.isEncrypted && (
                        <span className="bg-green-100 border border-green-200 text-green-800 text-[10px] font-bold px-1.5 py-0.2 rounded font-mono">
                          Criptografado (AES)
                        </span>
                      )}
                    </div>
                    
                    {/* Excerpt with potential highlight */}
                    <div className="mt-2 text-xs text-neutral-700 bg-neutral-50 border border-neutral-150 rounded p-2.5 font-sans leading-relaxed">
                      {scrap.rawContent}
                    </div>

                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          onNavigateToFriend(scrap.fromId);
                          setTimeout(() => {
                            onNavigateToTab('scrapbook');
                          }, 50);
                        }}
                        className="text-[10px] text-blue-700 font-sans hover:underline flex items-center gap-0.5"
                      >
                        Ver página de scrapbook dele ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
