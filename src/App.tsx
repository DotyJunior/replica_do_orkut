import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Calendar, Lock, BookOpen, RefreshCw } from 'lucide-react';
import OrkutHeader from './components/OrkutHeader';
import OrkutFooter from './components/OrkutFooter';
import { CustomGothicCursor } from './components/CustomGothicCursor';
import PrivacyModal from './components/PrivacyModal';
import ProfileLayout from './components/ProfileLayout';
import Scrapbook from './components/Scrapbook';
import ScrapbookBuilder from './components/ScrapbookBuilder';
import Testimonials from './components/Testimonials';
import Communities from './components/Communities';
import SearchResults from './components/SearchResults';
import RustSecLab from './components/RustSecLab';
import PhotoAlbums from './components/PhotoAlbums';
import MsnToastSystem from './components/MsnToastSystem';
import SecretChat from './components/SecretChat';
import { getInitialAlbums } from './data/initialAlbums';
import { DEFAULT_COMMUNITIES_SEED } from './data/initialCommunities';
import { Profile, Friend, Community, Scrap, Testimonial, Album, SharedMemory, FriendRequest, Relationship } from './types';
import { getThemeStyles } from './lib/theme';
import OrkutLogin from './components/OrkutLogin';
import AssetsManager from './components/AssetsManager';

// Firebase imports
import { collection, doc, setDoc, onSnapshot, getDoc, getDocFromServer, addDoc, deleteDoc, query, where, or, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

const safeJsonParse = (str: string | null, fallback: any = []) => {
  if (!str) return fallback;
  try {
    const val = JSON.parse(str);
    if (val === undefined || val === null) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(val)) {
      console.warn("safeJsonParse: Expected an array format, but loaded:", typeof val, ". Falling back.");
      return fallback;
    }
    return val;
  } catch (e) {
    console.warn("JSON parse failed, using fallback:", e);
    return fallback;
  }
};

const DEFAULT_PROFILES: Record<string, Profile> = {
  me: {
    id: 'me',
    name: 'Junior Sombra',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    location: 'Curitiba, PR - Brasil',
    relationship: 'Namorando com compilador Rust',
    humor: 'Focado em memory safety',
    hereFor: 'Amigos e hackathons',
    fashion: 'Capuz preto e jeans básico',
    religion: 'Borrow Checker da Salvação',
    ethnicity: 'Latino Criptográfico',
    languages: 'Português, Rust, TypeScript, Assembly',
    hometown: 'Curitiba',
    webpage: 'http://orky.net/scrapzone_galera2008',
    passions: 'Cibersegurança, pinhão cozido, criptografia AES e herança zero-custo',
    aboutMe: 'Eae galera! Sou um entusiasta de segurança da informação e Rust de Curitiba. Estou reescrevendo todo o Scrapzone de forma robusta e livre de buffer overflow para consertar os erros que ajudaram a quebrar esse gigante de 2004. Sejam muito bem-vindos ao meu perfil criptografado, deixem um scrap ou depoimento seguro!',
    trusty: 3,
    cool: 3,
    sexy: 2,
    fans: 18,
    username: 'scrapzone_galera2008',
    statusOnline: '● programando em Rust',
    theme: 'default'
  },
  alexandre: {
    id: 'alexandre',
    name: 'Alexandre Curi',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    location: 'Curitiba, PR - Brasil',
    relationship: 'Casado legalmente',
    humor: 'Político / Diplomático',
    hereFor: 'Serviço público e cibersegurança do Paraná',
    fashion: 'Terno parlamentar sob medida',
    religion: 'Católico',
    ethnicity: 'Italiano-Brasileiro',
    languages: 'Português, Inglês',
    hometown: 'Curitiba',
    webpage: 'https://www.assembleia.pr.leg.br',
    passions: 'Leis estaduais do Paraná, infraestrutura de votação, ecossistema Rust',
    aboutMe: 'Deputado e presidente da Assembleia Legislativa do Paraná. Defensor inabalável do desenvolvimento tecnológico do sul. Apoiando a reconstrução criptografada do Scrapzone para mostrar que no Paraná, segurança cibernética e memória computacional limpa são tratadas como leis de estado! Chapa, quer debater as últimas do pinhão parlamentar? Deixe seu recado seguro!',
    trusty: 3,
    cool: 2,
    sexy: 2,
    fans: 1337,
    username: 'alexandre.curi',
    statusOnline: '● na assembleia do Paraná',
    theme: 'rock-underground'
  },
  orkut: {
    id: 'orkut',
    name: 'Orkut Büyükkökten',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    location: 'San Francisco, CA - USA',
    relationship: 'Married to social networks',
    humor: 'Extremely friendly & excited',
    hereFor: 'Connecting humanity securely',
    fashion: 'Silicon Valley retro',
    religion: 'Universal love',
    ethnicity: 'Turkish',
    languages: 'English, Turkish, Portuglês',
    hometown: 'Ankara',
    webpage: 'https://hello.com',
    passions: 'Algorithms, E2E Encryption, community building, WASM sandbox',
    aboutMe: 'Hello my friends! I am the original founder of Orkut. In 2004, internet security was very basic. We had cookie theft, XSS injections, and bad server policies. But today, seeing this Scrapzone replica backed by Rust performance, WebCrypto AES, and zero-knowledge communities, I am fully amazed! You are awesome. Be safe and leave me a scrap!',
    trusty: 3,
    cool: 3,
    sexy: 2,
    fans: 412521,
    username: 'orkut.b',
    statusOnline: '● no café com donuts',
    theme: 'vaporwave'
  },
  hacker: {
    id: 'hacker',
    name: 'H3_Elit3_Hacker',
    avatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150',
    location: 'Deep Web, Tor Network',
    relationship: 'Solteiro Criptográfico',
    humor: 'Sarcástico',
    hereFor: 'Pentesting e engenharia reversa',
    fashion: 'Hoodie preto e óculos escuros indoor',
    religion: 'Zero-Trace Entropy',
    ethnicity: 'Anonymous',
    languages: 'C, Rust, Python, Bash, Binary Hex',
    hometown: 'localhost',
    webpage: 'http://h3_elit3_tor.onion',
    passions: 'Invasões de depoimento, roubo de cookies, quebra de hashes obsoletos',
    aboutMe: 'Ex-script kiddie que virou InfoSec auditor. Fui testar as vulnerabilidades clássicas de depoimentos "hackeados" de 2004 nessa réplica e adivinha? O compilador Rust WASM de vocês isolou toda a pilha de memória de uma forma que meu Wireshark chora. Vocês estragaram a fofoca, mas elevaram a criptografia ao limite. Parabéns aos envolvidos.',
    trusty: 1,
    cool: 3,
    sexy: 1,
    fans: 13,
    username: 'elit3.hacker',
    statusOnline: '● analisando vulnerabilidades',
    theme: 'neon-hacker'
  },
  lucas: {
    id: 'lucas',
    name: 'Lucas Santos',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    location: 'São Paulo, SP - Brasil',
    relationship: 'Solteiro',
    humor: 'Sempre conectado',
    hereFor: 'Bater papo em canais criptografados',
    fashion: 'Camiseta de banda e tênis clássico',
    religion: 'Tecnologia livre',
    ethnicity: 'Brasileiro',
    languages: 'Português, C#',
    hometown: 'São Paulo',
    webpage: 'https://github.com/lucas-santos',
    passions: 'Música retro, chats secretos, Scrapzone 2004',
    aboutMe: 'Eae parça! Sou o Lucas, curto muito bater papo de madrugada e relembrar as comunidades clássicas. Ativei meu canal seguro com criptografia de 48 horas!',
    trusty: 3,
    cool: 3,
    sexy: 2,
    fans: 15,
    username: 'Lucas_Santos',
    statusOnline: '● livre para chat',
    theme: 'default'
  },
  marina: {
    id: 'marina',
    name: 'Marina Costa',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    location: 'Belo Horizonte, MG - Brasil',
    relationship: 'Solteira',
    humor: 'Super animada',
    hereFor: 'Fazer novos amigos',
    fashion: 'Floral e vintage',
    religion: 'Nenhuma',
    ethnicity: 'Brasileira',
    languages: 'Português, Inglês',
    hometown: 'Belo Horizonte',
    webpage: 'http://marina-retratos.net',
    passions: 'Fotografia retro, design de interfaces e passeios de bicicleta',
    aboutMe: 'Oi gente! Sou a Marina, fotógrafa entusiasta e designer nas horas vagas. Adoro resgatar a estética clássica dos anos 2000! Se quiser conversar sobre fotografia analógica ou design vintage, me adiciona e deixe um scrap!',
    trusty: 3,
    cool: 3,
    sexy: 3,
    fans: 24,
    username: 'marina_costa',
    statusOnline: '● Online Agora',
    theme: 'default'
  },
  carlos: {
    id: 'carlos',
    name: 'Carlos Mendes',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    location: 'Rio de Janeiro, RJ - Brasil',
    relationship: 'Casado',
    humor: 'Trabalhador',
    hereFor: 'Trocar ideias sobre código',
    fashion: 'Bermuda e sandália',
    religion: 'Espírita',
    ethnicity: 'Carioca',
    languages: 'Português',
    hometown: 'Rio de Janeiro',
    webpage: 'https://github.com/carlosm_dev',
    passions: 'Futebol clássico, colecionar discos de vinil e desenvolvimento front-end',
    aboutMe: 'E aí pessoal! Sou o Carlos, desenvolvedor web carioca. Adoro ouvir uma boa MPB em vinil e jogar uma pelada com os amigos no fim de semana. Sejam bem-vindos!',
    trusty: 3,
    cool: 2,
    sexy: 1,
    fans: 8,
    username: 'carlos_mendes',
    statusOnline: '● escutando Jorge Ben',
    theme: 'rock-underground'
  },
  ana: {
    id: 'ana',
    name: 'Ana Ribeiro',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    location: 'Porto Alegre, RS - Brasil',
    relationship: 'Namorando',
    humor: 'Curiosa',
    hereFor: 'Amizade e novidades',
    fashion: 'Casaco quente e cachecol',
    religion: 'Nenhuma',
    ethnicity: 'Gaúcha',
    languages: 'Português, Inglês',
    hometown: 'Porto Alegre',
    webpage: 'http://quimica-estudos.cafe',
    passions: 'Café de alta qualidade, ciência, e jogos eletrônicos independentes',
    aboutMe: 'Olá! Me chamo Ana, estudo engenharia química e sou apaixonada por barismo de café espresso de especialidade. Adoro testar novos jogos indie e ler ficção científica de madrugada!',
    trusty: 3,
    cool: 3,
    sexy: 2,
    fans: 19,
    username: 'ana_ribeiro1',
    statusOnline: '● tomando café coado',
    theme: 'vaporwave'
  },
  felipe: {
    id: 'felipe',
    name: 'Felipe Rocha',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    location: 'Salvador, BA - Brasil',
    relationship: 'Solteiro',
    humor: 'Zen',
    hereFor: 'Contatos acadêmicos e surfe',
    fashion: 'Pé na areia e bermuda de banho',
    religion: 'Sincretismo baiano',
    ethnicity: 'Negro',
    languages: 'Português, Espanhol',
    hometown: 'Salvador',
    webpage: 'http://academicflow.ba',
    passions: 'Pegar ondas de manhã bem cedo, pesquisa em física de partículas e música axé de raiz',
    aboutMe: 'Fala galera! Sou o Felipe da Bahia, pesquisador de física teórica. Minha terapia favorita é pegar uma onda cedo e depois tomar uma água de coco na areia. Vamos bater um papo no Scrapzone!',
    trusty: 3,
    cool: 3,
    sexy: 2,
    fans: 11,
    username: 'felipe_surf',
    statusOnline: '● de volta da praia',
    theme: 'default'
  },
  juliana: {
    id: 'juliana',
    name: 'Juliana Alves',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    location: 'Brasília, DF - Brasil',
    relationship: 'Solteira',
    humor: 'Intensa',
    hereFor: 'Discussões literárias e nerdice',
    fashion: 'Jeans escuro e jaqueta puffer',
    religion: 'Budista',
    ethnicity: 'Brasileira',
    languages: 'Português',
    hometown: 'Brasília',
    webpage: 'https://juliana-books.com',
    passions: 'Mitologia nórdica, automação industrial com CLP, gatos vira-latas e RPG de mesa',
    aboutMe: 'Oi oi! Me chamo Ju, trabalho com engenharia mecânica e automação em Brasília. Moro com meus 3 gatos adotados e jogo RPG todo sábado à noite. O Scrapzone retro é bom demais!',
    trusty: 3,
    cool: 3,
    sexy: 2,
    fans: 15,
    username: 'juliana_alves',
    statusOnline: '● programando CLP',
    theme: 'default'
  },
  bruno: {
    id: 'bruno',
    name: 'Bruno Lima',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    location: 'Recife, PE - Brasil',
    relationship: 'Solteiro',
    humor: 'Zoeiro',
    hereFor: 'Diversão e ensaios musicais',
    fashion: 'Camiseta cavada preta e coturno',
    religion: 'Do Rock n Roll',
    ethnicity: 'Nordestino',
    languages: 'Português, Inglês',
    hometown: 'Recife',
    webpage: 'https://www.garage-band-bruno.com',
    passions: 'Guitarras distorcidas, comer hambúrguer com muito bacon e Recife Antigo',
    aboutMe: 'Eae! Sou o Bruno, guitarrista de bueiro e desenvolvedor Python por obrigação. Adoro passear pelo Recife Antigo escutando heavy metal dos anos 80. Deixe o metal rolar!',
    trusty: 2,
    cool: 3,
    sexy: 1,
    fans: 31,
    username: 'bruno_lima_guitar',
    statusOnline: '● tirando solo de guitarra',
    theme: 'rock-underground'
  },
  patricia: {
    id: 'patricia',
    name: 'Patricia Souza',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    location: 'Fortaleza, CE - Brasil',
    relationship: 'Casada',
    humor: 'Tranquila',
    hereFor: 'Compartilhar receitas saudáveis',
    fashion: 'Roupas leves de fibra natural',
    religion: 'Espiritualista',
    ethnicity: 'Cearense',
    languages: 'Português, Francês',
    hometown: 'Fortaleza',
    webpage: 'http://vida-patricia.natureza',
    passions: 'Yoga na praia, meliponicultura, cozinhar pães rústicos de fermentação natural',
    aboutMe: 'Sejam bem-vindos! Sou a Patrícia, cearense fã do vento e do sol do Nordeste. Pratico yoga, cuido de colônias de abelhas sem ferrão nativas do Brasil e adoro assar pães franceses artesanais.',
    trusty: 3,
    cool: 2,
    sexy: 2,
    fans: 14,
    username: 'patricia_souza',
    statusOnline: '● meditando silenciosamente',
    theme: 'vaporwave'
  },
  ricardo: {
    id: 'ricardo',
    name: 'Ricardo Martins',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    location: 'Florianópolis, SC - Brasil',
    relationship: 'Solteiro',
    humor: 'Tech geek',
    hereFor: 'Networking de hacker seguro',
    fashion: 'Moletom techwear com capuz e tênis esportivo',
    religion: 'Nenhuma',
    ethnicity: 'Sulista',
    languages: 'Português, Inglês, Go',
    hometown: 'Florianópolis',
    webpage: 'http://ricardo-infosec.cafe',
    passions: 'Escalada indoor, segurança em cloud, café gelado e servidores Linux',
    aboutMe: 'Eae! Sou o Ricardo, faço estágio de InfoSec/DevOps em Floripa. Quando não estou auditando logs de contêineres, estou escalando paredões de treino ou correndo à beira-mar de Floripa.',
    trusty: 3,
    cool: 3,
    sexy: 1,
    fans: 5,
    username: 'ricardo_martins_99',
    statusOnline: '● corrigindo bugs na nuvem',
    theme: 'neon-hacker'
  }
};

const DEFAULT_SCRAPS: Scrap[] = [
  {
    id: 's1',
    fromId: 'alexandre',
    fromName: 'Alexandre Curi',
    fromAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    toId: 'me',
    timestamp: '27/05/2026 - 10:15',
    rawContent: 'Fala, Júnior! Tudo certo? Passando aqui pra te convencer a participar da conferência de criptografia e Rust na Assembleia Legislativa em Curitiba. Traga pinhão cozido chapa! Um abraço.',
    isEncrypted: false
  },
  {
    id: 's2',
    fromId: 'orkut',
    fromName: 'Orkut Büyükkökten',
    fromAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    toId: 'me',
    timestamp: '27/05/2026 - 11:20',
    rawContent: 'Hello Junior! Your secure platform is so sweet! In 2004 we had very simple servers. But with WebCrypto and Rust safety, your scrapbooking is beautiful! Cheers!',
    isEncrypted: false
  }
];

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    fromId: 'alexandre',
    fromName: 'Alexandre Curi',
    fromAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    toId: 'me',
    timestamp: '27/05/2026 - 09:30',
    content: 'Esse júnior é de confiança! Trabalhador de Curitiba que entende de Rust e segurança parlamentar mais do que qualquer outro chapa da região.',
    isEncrypted: false,
    unlocked: true
  },
  {
    id: 't2',
    fromId: 'hacker',
    fromName: 'H3_Elit3_Hacker',
    fromAvatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150',
    toId: 'me',
    timestamp: '27/05/2026 - 14:45',
    content: 'Tentativa de sequestrar sessão: Fracassada. Depoimento isolado no heap.',
    isEncrypted: true,
    ciphertext: '0x_sec_depo_54656e74617469766120646520736571756573747261722073657373e36f3a20467261636173736164612e204465706f696d656e746f2069736f6c61646f206e6f20686561702e',
    aesKeyHex: 'hacker-1234',
    unlocked: false
  }
];

const DEFAULT_SHARED_MEMORIES: SharedMemory[] = [
  {
    id: "sh1",
    sharerName: "Alexandre Curi",
    sharerAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150",
    itemType: "album",
    itemTitle: "Rolês 2008 de Curitiba chapa! 🌲",
    timestamp: "27/05/2026 - 15:00",
    likes: 5,
    likedByMe: false
  },
  {
    id: "sh2",
    sharerName: "Orkut Büyükkökten",
    sharerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    itemType: "photo",
    itemTitle: "Silicon Valley Memories (2004) 💻",
    timestamp: "27/05/2026 - 13:40",
    likes: 12,
    likedByMe: true
  },
  {
    id: "sh3",
    sharerName: "H3_Elit3_Hacker",
    sharerAvatar: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150",
    itemType: "post",
    itemTitle: "Compilador Rust WASM heap safety audit 🧬",
    timestamp: "27/05/2026 - 10:11",
    likes: 9,
    likedByMe: false
  }
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('profile');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProfileId, setActiveProfileId] = useState<string>('me');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(['1', '3']);
  const [visitedProfileJoinedCommIds, setVisitedProfileJoinedCommIds] = useState<string[]>([]);
  const [userPublicKey, setUserPublicKey] = useState<string>('04f9810b14c3e2182fe91da938b82dfc394ca0e2193bde1a5928d1ac297b47e2b1029c');

  const [siteConfig, setSiteConfig] = useState({
    siteLogo: '/assets/branding/logo-original-scrap-zone.svg',
    favicon: '/assets/branding/favicon.ico'
  });

  // Load site visual branding config on mount
  useEffect(() => {
    fetch('/assets/config.json')
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data && (data.siteLogo || data.favicon)) {
          setSiteConfig(prev => ({
            ...prev,
            ...data
          }));
          
          if (data.favicon) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.favicon;
          }
        }
      })
      .catch(() => {
        // Fallback silently if config is not customized yet
      });
  }, []);

  // Secret Chat modal state
  const [isSecretChatOpen, setIsSecretChatOpen] = useState<boolean>(false);
  const [secretChatFriendId, setSecretChatFriendId] = useState<string>('lucas');
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  // Set up event listener for opening MSN conversations programmatically
  useEffect(() => {
    const handleMsnOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.partnerId) {
        setSecretChatFriendId(customEvent.detail.partnerId);
        setIsSecretChatOpen(true);
      }
    };
    window.addEventListener('msn-open-chat', handleMsnOpenChat);
    return () => {
      window.removeEventListener('msn-open-chat', handleMsnOpenChat);
    };
  }, []);

  // Photo Albums Nostalgic state engine
  const [albums, setAlbums] = useState<Album[]>(() => getInitialAlbums());
  const rawDbAlbumsRef = useRef<Album[]>([]);
  const [isVisitorMode, setIsVisitorMode] = useState<boolean>(false);
  const [autoOpenUpload, setAutoOpenUpload] = useState<boolean>(false);
  const [sharedMemories, setSharedMemories] = useState<SharedMemory[]>(() => DEFAULT_SHARED_MEMORIES);

  // Dynamic Friend Requests State
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Authentication & Session States
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const currentUserProfileRef = useRef<Profile | null>(null);
  const profilesRef = useRef<Record<string, Profile>>({});

  useEffect(() => {
    currentUserProfileRef.current = currentUserProfile;
  }, [currentUserProfile]);

  // Restrict Assets Manager tab strictly to darkjuniorsombra@gmail.com
  useEffect(() => {
    if (currentTab === 'assets-manager' && currentUserProfile) {
      const isAssetsAdmin = auth.currentUser?.email === 'darkjuniorsombra@gmail.com' || (currentUserProfile as any)?.email === 'darkjuniorsombra@gmail.com';
      if (!isAssetsAdmin) {
        setCurrentTab('profile');
      }
    }
  }, [currentTab, currentUserProfile]);

  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  const [users, setUsers] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);

  // Real-time snapshot loader and hydration controller
  const [initDone, setInitDone] = useState<boolean>(false);
  const [isRequestPanelOpen, setIsRequestPanelOpen] = useState<boolean>(false);
  const initFlags = useRef({
    profiles: false,
    users: false,
    relationships: false,
    photos: false,
    scraps: false,
    testimonials: false,
    albums: false,
    memories: false,
    communities: false,
  });

  const checkInitDone = () => {
    const allReady =
      initFlags.current.profiles &&
      initFlags.current.users &&
      initFlags.current.relationships &&
      initFlags.current.photos &&
      initFlags.current.scraps &&
      initFlags.current.testimonials &&
      initFlags.current.albums &&
      initFlags.current.memories &&
      initFlags.current.communities;

    if (allReady) {
      setInitDone(true);
      setIsAppReady(true);
    }
  };

  // Google Firebase Auth listener
  useEffect(() => {
    let unsubscribeDemoProfile: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setIsAuthLoading(true);

      // Clean up previous demo snapshot listener if auth state changes
      if (unsubscribeDemoProfile) {
        unsubscribeDemoProfile();
        unsubscribeDemoProfile = null;
      }

      if (firebaseUser) {
        // Watch user profile in firestore
        const docRef = doc(db, 'profiles', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUserProfile(data as Profile);
          } else {
            // If registration is in progress, do not seed defaultMe.
            // Wait for the register process to write newUserProfile first.
            if (localStorage.getItem('scrapzone_registering_in_progress') === 'true') {
              setIsAuthLoading(false);
              return;
            }

            // First time seeding fallback (for console/dev manual auth accounts)
            const defaultMe = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Novo Usuário',
              nome_exibicao: firebaseUser.displayName || 'Novo Usuário',
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              location: 'Curitiba, PR - Brasil',
              relationship: 'Solteiro',
              humor: 'Amigável',
              hereFor: 'Amigos',
              fashion: 'Básico',
              religion: 'Nenhuma',
              ethnicity: 'Latino Criptográfico',
              languages: 'Português',
              hometown: 'Curitiba',
              webpage: '',
              passions: 'Scrapzone Seguro',
              aboutMe: 'Oi! Sou novo por aqui no Scrapzone Seguro. Deixe um recado!',
              trusty: 3,
              cool: 3,
              sexy: 3,
              fans: 0,
              username: firebaseUser.email?.split('@')[0] || 'membro',
              theme: 'default',
              statusOnline: '● Online Agora',
              isEmailVerified: true
            };
            setDoc(docRef, defaultMe).catch(err => console.error(err));
            setCurrentUserProfile(defaultMe);
          }
          setIsAuthLoading(false);
        }, (error) => {
          console.error("Profile snap error: ", error);
          setIsAuthLoading(false);
        });
        return () => unsubscribeProfile();
      } else {
        // Not logged in with Firebase Auth. Check for static demo login cache
        const cachedDemoId = localStorage.getItem('orkut_demo_me_id');
        if (cachedDemoId && DEFAULT_PROFILES[cachedDemoId]) {
          const docRef = doc(db, 'profiles', cachedDemoId);
          unsubscribeDemoProfile = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              setCurrentUserProfile(docSnap.data() as Profile);
            } else {
              setDoc(docRef, DEFAULT_PROFILES[cachedDemoId]).catch(err => console.error(err));
              setCurrentUserProfile(DEFAULT_PROFILES[cachedDemoId]);
            }
            setIsAuthLoading(false);
          }, (err) => {
            console.error("Demo Profile snap error, falling back static:", err);
            setCurrentUserProfile(DEFAULT_PROFILES[cachedDemoId]);
            setIsAuthLoading(false);
          });
        } else {
          setCurrentUserProfile(null);
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeDemoProfile) {
        unsubscribeDemoProfile();
      }
    };
  }, []);

  // Sync profiles['me'] dynamically whenever the authenticated currentUserProfile changes
  useEffect(() => {
    if (currentUserProfile) {
      setProfiles((prev) => {
        return {
          ...prev,
          [currentUserProfile.id]: currentUserProfile,
          me: currentUserProfile
        };
      });

      // Synchronize albums under the active profile's localStorage key
      const activeId = currentUserProfile.id;
      const localAlbumsJson = localStorage.getItem(`local_albums_${activeId}`);
      const localAlbums = safeJsonParse(localAlbumsJson);
      
      const baseAlbums = rawDbAlbumsRef.current.length > 0 ? rawDbAlbumsRef.current : getInitialAlbums();
      const merged = [...baseAlbums];
      localAlbums.forEach((la: Album) => {
        const dbIndex = merged.findIndex(a => a.id === la.id);
        if (dbIndex === -1) {
          merged.push(la);
        } else {
          // Merge photos of the same album to avoid losing local-only additions
          const dbAlbum = merged[dbIndex];
          const dbPhotos = Array.isArray(dbAlbum?.photos) ? dbAlbum.photos : [];
          const mergedPhotos = [...dbPhotos];
          const localPhotos = Array.isArray(la?.photos) ? la.photos : [];
          localPhotos.forEach((lp: any) => {
            if (!mergedPhotos.some(p => p.id === lp.id)) {
              mergedPhotos.push(lp);
            }
          });
          merged[dbIndex] = {
            ...dbAlbum,
            photos: mergedPhotos
          };
        }
      });
      setAlbums(merged);
    } else {
      // Revert/load general/demo profile albums
      const localAlbumsJson = localStorage.getItem('local_albums_me');
      const localAlbums = safeJsonParse(localAlbumsJson);
      if (localAlbums.length > 0) {
        setAlbums(localAlbums);
      } else {
        setAlbums(getInitialAlbums());
      }
    }
  }, [currentUserProfile]);

  // Automatic Presence Heartbeat Tracker (online/away/offline)
  useEffect(() => {
    if (!currentUserProfile) return;
    
    // Skip built-in characters presence triggers
    const builtInIds = ['alexandre', 'orkut', 'hacker', 'lucas'];
    if (builtInIds.includes(currentUserProfile.id)) return;

    let lastActive = Date.now();
    const handleActive = () => { lastActive = Date.now(); };
    const listenEvents = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    listenEvents.forEach(ev => window.addEventListener(ev, handleActive, { passive: true }));

    // Determine initial state to only trigger update on real transition
    let initialState: 'online' | 'away' | 'offline' = 'online';
    if (currentUserProfile.statusOnline?.includes("Offline")) {
      initialState = 'offline';
    } else if (currentUserProfile.statusOnline?.includes("Ausente")) {
      initialState = 'away';
    }

    let currentSavedState = initialState;

    const interval = setInterval(async () => {
      const now = Date.now();
      const diff = now - lastActive;
      const isAway = diff > 40000; // 40s
      const isOf = diff > 90000; // 90s

      let nextState: 'online' | 'away' | 'offline' = 'online';
      if (isOf) {
        nextState = 'offline';
      } else if (isAway) {
        nextState = 'away';
      }

      if (currentSavedState !== nextState) {
        let targetStatus = "● Online Agora";
        if (nextState === 'offline') {
          const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          targetStatus = `⚫ Offline desde ${timeStr}`;
        } else if (nextState === 'away') {
          targetStatus = "● Ausente da máquina";
        }

        try {
          console.log(`Presence transition writing in Firestore: ${currentSavedState} -> ${nextState} (status: ${targetStatus})`);
          //await setDoc(doc(db, 'profiles', currentUserProfile.id), {
          //  ...currentUserProfile,
          //  statusOnline: targetStatus
          //});
          currentSavedState = nextState;
        } catch (e) {
          console.error("Auto heartbeat update failed: ", e);
        }
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      listenEvents.forEach(ev => window.removeEventListener(ev, handleActive));
    };
  }, [currentUserProfile]);

  const handleLoginSuccess = (userProfile: Profile, isDemo: boolean) => {
    setCurrentUserProfile(userProfile);
    if (isDemo) {
      localStorage.setItem('orkut_demo_me_id', userProfile.id);
    } else {
      localStorage.removeItem('orkut_demo_me_id');
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('orkut_demo_me_id');
    localStorage.removeItem('orkut_remember_uid');
    try {
      await auth.signOut();
    } catch (e) {
      console.error(e);
    }
    setCurrentUserProfile(null);
    setActiveProfileId('me');
    setCurrentTab('profile');
  };

  // Firestore Connection Test & Sync Effect
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test_connection', 'ping'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or network status.");
        }
      }
    }
    testConnection();

    // Attach real-time snapshot listeners for total full-stack auto-sync
    const unsubscribeProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      console.log(`[LOG] onSnapshot profiles RECEIVED - hasPendingWrites: ${snapshot.metadata.hasPendingWrites}, timestamp: ${new Date().toISOString()}`);
      const fetched: Record<string, Profile> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id === 'N3l736pVCdShgnG5Z39kd647oUN2') {
          console.log(`[DEBUG] Analyzing huge document: ${docSnap.id}`);
          Object.keys(data).forEach(key => {
            const val = data[key];
            const size = JSON.stringify(val).length;
            console.log(`[DEBUG] Field: ${key}, Size approx: ${size} bytes`);
          });
        }
        fetched[docSnap.id] = {
          id: docSnap.id,
          name: data.name || '',
          avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          location: data.location || 'Paraná, Brasil',
          relationship: data.relationship || 'Solteiro',
          humor: data.humor || 'Sempre Alegre',
          hereFor: data.hereFor || 'Fazer Amizades',
          fashion: data.fashion || 'Clássico 2004',
          religion: data.religion || 'Universal',
          ethnicity: data.ethnicity || 'Brasileiro',
          languages: data.languages || 'Português',
          hometown: data.hometown || 'Curitiba',
          webpage: data.webpage || '',
          passions: data.passions || 'Música retro, scraps seguros',
          aboutMe: data.aboutMe || 'Oi, acabei de criar minha conta!',
          trusty: data.trusty ?? 3,
          cool: data.cool ?? 3,
          sexy: data.sexy ?? 3,
          fans: data.fans ?? 0,
          username: data.username || docSnap.id,
          theme: data.theme || 'default',
          nome_exibicao: data.nome_exibicao || data.name || '',
          ...data
        } as Profile;
      });

      setProfiles((prev) => {
        const cachedDemoId = localStorage.getItem('orkut_demo_me_id');
        const authUid = auth.currentUser?.uid;
        const currentUid = authUid || cachedDemoId;
        
        if (currentUid && fetched[currentUid]) {
          fetched['me'] = fetched[currentUid];
        } else if (prev && prev.me) {
          fetched['me'] = prev.me;
        }
        return {
          ...prev,
          ...fetched
        };
      });
      initFlags.current.profiles = true;
      checkInitDone();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      initFlags.current.profiles = true;
      checkInitDone();
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
      
      setProfiles((prev) => {
        const updated = { ...prev };
        list.forEach((u: any) => {
          const uId = u.id;
          if (updated[uId]) {
            // Merge carefully: do not overwrite established profile traits
            updated[uId] = {
              ...u,
              ...updated[uId]
            };
          } else {
            // Fallback safe default profile
            updated[uId] = {
              id: uId,
              name: u.name || '',
              avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              location: u.location || 'Paraná, Brasil',
              relationship: u.relationship || 'Solteiro',
              humor: u.humor || 'Sempre Alegre',
              hereFor: u.hereFor || 'Fazer Amizades',
              fashion: u.fashion || 'Clássico 2004',
              religion: u.religion || 'Universal',
              ethnicity: u.ethnicity || 'Brasileiro',
              languages: u.languages || 'Português',
              hometown: u.hometown || 'Curitiba',
              webpage: u.webpage || '',
              passions: u.passions || 'Música retro, scraps seguros',
              aboutMe: u.aboutMe || 'Oi, acabei de criar minha conta!',
              trusty: u.trusty ?? 3,
              cool: u.cool ?? 3,
              sexy: u.sexy ?? 3,
              fans: u.fans ?? 0,
              username: u.username || uId,
              theme: u.theme || 'default',
              ...u
            };
          }
        });
        return updated;
      });
      initFlags.current.users = true;
      checkInitDone();
    }, (error) => {
      console.error("Error listening to users collection:", error);
      initFlags.current.users = true;
      checkInitDone();
    });

    const unsubscribeRelationships = onSnapshot(collection(db, 'friend_requests'), (snapshot) => {
      const list = snapshot.docs.map(d => {
        const data = d.data();
        const fromVal = data.fromUserId || data.senderId || '';
        const toVal = data.toUserId || data.receiverId || '';
        return {
          id: d.id,
          fromUserId: fromVal,
          senderId: fromVal,
          toUserId: toVal,
          receiverId: toVal,
          status: data.status || 'pending',
          type: 'friend',
          createdAt: data.createdAt || Date.now()
        };
      }) as any;
      setRelationships(list);
      setFriendRequests(list);
      initFlags.current.relationships = true;
      checkInitDone();
    }, (error) => {
      console.error("Error listening to friend_requests collection:", error);
      initFlags.current.relationships = true;
      checkInitDone();
    });

    const unsubscribePhotos = onSnapshot(collection(db, 'photos'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPhotos(list);
      initFlags.current.photos = true;
      checkInitDone();
    }, (error) => {
      console.error("Error listening to photos collection:", error);
      initFlags.current.photos = true;
      checkInitDone();
    });

    const unsubscribeScraps = onSnapshot(collection(db, 'scraps'), (snapshot) => {
      const list: Scrap[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Scrap);
      });
      const isFirstLoad = !initFlags.current.scraps;
      if (!isFirstLoad || !snapshot.empty) {
        setScraps(list);
      }
      initFlags.current.scraps = true;
      checkInitDone();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'scraps');
      initFlags.current.scraps = true;
      checkInitDone();
    });

    const unsubscribeTestimonials = onSnapshot(collection(db, 'testimonials'), (snapshot) => {
      const list: Testimonial[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Testimonial);
      });
      const isFirstLoad = !initFlags.current.testimonials;
      if (!isFirstLoad || !snapshot.empty) {
        setTestimonials(list);
      }
      initFlags.current.testimonials = true;
      checkInitDone();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'testimonials');
      initFlags.current.testimonials = true;
      checkInitDone();
    });

    const unsubscribeAlbums = onSnapshot(collection(db, 'albums'), (snapshot) => {
      const list: Album[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Album);
      });
      
      rawDbAlbumsRef.current = list;
      
      const activeId = currentUserProfileRef.current?.id || 'me';
      const localAlbumsJson = localStorage.getItem(`local_albums_${activeId}`);
      const localAlbums = safeJsonParse(localAlbumsJson);
      
      const mergedAlbums = [...list];
      localAlbums.forEach((la: Album) => {
        const dbIndex = mergedAlbums.findIndex(a => a.id === la.id);
        if (dbIndex === -1) {
          mergedAlbums.push(la);
        } else {
          // Merge photos of the same album to avoid losing local-only additions
          const dbAlbum = mergedAlbums[dbIndex];
          const dbPhotos = Array.isArray(dbAlbum?.photos) ? dbAlbum.photos : [];
          const mergedPhotos = [...dbPhotos];
          const localPhotos = Array.isArray(la?.photos) ? la.photos : [];
          localPhotos.forEach((lp: any) => {
            if (!mergedPhotos.some(p => p.id === lp.id)) {
              mergedPhotos.push(lp);
            }
          });
          mergedAlbums[dbIndex] = {
            ...dbAlbum,
            photos: mergedPhotos
          };
        }
      });

      setAlbums(mergedAlbums);
      initFlags.current.albums = true;
      checkInitDone();
    }, (error) => {
      console.warn("Could not read albums from Firestore. Fallback to localStorage.", error);
      const activeId = currentUserProfileRef.current?.id || 'me';
      const localAlbumsJson = localStorage.getItem(`local_albums_${activeId}`);
      const localAlbums = safeJsonParse(localAlbumsJson);
      if (localAlbums.length > 0) {
        setAlbums(localAlbums);
      }
      initFlags.current.albums = true;
      checkInitDone();
    });

    const unsubscribeSharedMemories = onSnapshot(collection(db, 'shared_memories'), (snapshot) => {
      const list: SharedMemory[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SharedMemory);
      });
      const isFirstLoad = !initFlags.current.memories;
      if (!isFirstLoad || !snapshot.empty) {
        setSharedMemories(list);
      }
      initFlags.current.memories = true;
      checkInitDone();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shared_memories');
      initFlags.current.memories = true;
      checkInitDone();
    });

    const unsubscribeCommunities = onSnapshot(collection(db, 'communities'), (snapshot) => {
      const list: Community[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Community);
      });
      
      const localCommsJson = localStorage.getItem('local_communities');
      const localComms = safeJsonParse(localCommsJson);
      
      const mergedList = [...list];
      localComms.forEach((lc: any) => {
        if (!mergedList.some(c => c.id === lc.id)) {
          mergedList.push(lc);
        }
      });

      setCommunities(mergedList);
      initFlags.current.communities = true;
      checkInitDone();
    }, (error) => {
      console.warn("Error subscribing to communities. Falling back onto local list...", error);
      const localCommsJson = localStorage.getItem('local_communities');
      const localComms = safeJsonParse(localCommsJson);
      setCommunities(localComms);
      initFlags.current.communities = true;
      checkInitDone();
    });

    return () => {
      unsubscribeProfiles();
      unsubscribeUsers();
      unsubscribeRelationships();
      unsubscribePhotos();
      unsubscribeScraps();
      unsubscribeTestimonials();
      unsubscribeAlbums();
      unsubscribeSharedMemories();
      unsubscribeCommunities();
    };
  }, []);

  // Synchronize friendRequests state dynamically from the real-time relationships list dependent on currentUserProfile
  useEffect(() => {
    if (!currentUserProfile?.id) {
      setFriendRequests([]);
      return;
    }
    const activeId = currentUserProfile.id;
    const mapped = relationships
      .filter((rel: any) => rel.type === 'friend')
      .map((rel: any) => ({
        id: rel.id,
        fromUserId: rel.fromUserId,
        toUserId: rel.toUserId,
        status: rel.status,
        createdAt: rel.createdAt || Date.now()
      }));
    setFriendRequests(mapped);
  }, [relationships, currentUserProfile?.id]);

  // Dynamic subscription to Joined Communities depending on current logged-in identity
  useEffect(() => {
    const activeId = currentUserProfile?.id || 'me';
    const docRef = doc(db, 'joined_communities', activeId);
    
    const unsubscribeJoinedCommunities = onSnapshot(docRef, (docSnap) => {
      let isLoaded = false;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.communityIds)) {
          const localJoinedJson = localStorage.getItem(`local_joined_${activeId}`);
          const localJoined = safeJsonParse(localJoinedJson);
          const merged = Array.from(new Set([...data.communityIds, ...localJoined]));
          setJoinedCommunities(merged);
          isLoaded = true;
        }
      }
      if (!isLoaded) {
        // Use local storage
        const localJoinedJson = localStorage.getItem(`local_joined_${activeId}`);
        const localJoined = safeJsonParse(localJoinedJson);
        if (localJoined.length > 0) {
          setJoinedCommunities(localJoined);
        } else {
          setJoinedCommunities(['1', '3', 'pendrive_perdido']);
        }
      }
    }, (error) => {
      console.warn("Could not synchronize joined_communities from Firestore, falling back to locally saved list:", error);
      const localJoinedJson = localStorage.getItem(`local_joined_${activeId}`);
      const localJoined = safeJsonParse(localJoinedJson);
      setJoinedCommunities(localJoined.length > 0 ? localJoined : ['1', '3', 'pendrive_perdido']);
    });

    return () => {
      unsubscribeJoinedCommunities();
    };
  }, [currentUserProfile?.id]);

  // Subscription to Visited Profile's Joined Communities List
  useEffect(() => {
    const targetProfileId = activeProfileId === 'me'
      ? (currentUserProfile?.id || 'me')
      : activeProfileId;

    if (!targetProfileId) return;
    const docRef = doc(db, 'joined_communities', targetProfileId);
    
    const unsubscribeVisitedJoinedCommunities = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.communityIds)) {
          setVisitedProfileJoinedCommIds(data.communityIds);
        }
      } else {
        // Seed standard classic defaults when missing
        const targetId = targetProfileId;
        const myRealId = currentUserProfile?.id || 'me';
        let defs = ['1', '3'];
        if (targetId === myRealId || targetId === 'me') defs = ['1', '3', 'pendrive_perdido'];
        else if (targetId === 'orkut') defs = ['1', '3', 'orkut_devs', '2']; 
        else if (targetId === 'alexandre') defs = ['1', '2', 'sec_pr'];
        else if (targetId === 'hacker') defs = ['1', 'hacker_guild'];
        setVisitedProfileJoinedCommIds(defs);
      }
    }, (error) => {
      console.error("Error loading visited profile joined communities:", error);
      const targetId = targetProfileId;
      const myRealId = currentUserProfile?.id || 'me';
      let defs = ['1', '3'];
      if (targetId === myRealId || targetId === 'me') defs = ['1', '3', 'pendrive_perdido'];
      else if (targetId === 'orkut') defs = ['1', '3', 'orkut_devs', '2']; 
      else if (targetId === 'alexandre') defs = ['1', '2', 'sec_pr'];
      else if (targetId === 'hacker') defs = ['1', 'hacker_guild'];
      setVisitedProfileJoinedCommIds(defs);
    });

    return () => {
      unsubscribeVisitedJoinedCommunities();
    };
  }, [activeProfileId, currentUserProfile?.id]);

  // Synchronize browser Hash URL with React States (Simulating router navigation cleanly)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash) return;

      if (hash.startsWith('#/profile/')) {
        const parts = hash.substring('#/profile/'.length).split('/');
        const rawProfileId = parts[0];
        const subTab = parts[1]; // e.g. 'communities'

        if (rawProfileId) {
          // Check if rawProfileId matches a username or nickname in profiles, otherwise find by name
          const currentProfilesList = Object.values(profilesRef.current || {}) as Profile[];
          
          let resolvedId = rawProfileId;
          const matchedByUsername = currentProfilesList.find(
            (p) => p.username?.toLowerCase() === rawProfileId.toLowerCase()
          );
          const matchedByName = currentProfilesList.find(
            (p) => p.name ? p.name.toLowerCase().replace(/\s+/g, '') === rawProfileId.toLowerCase().replace(/\s+/g, '') : false
          );
          
          if (matchedByUsername) {
            resolvedId = matchedByUsername.id;
          } else if (matchedByName) {
            resolvedId = matchedByName.id;
          }

          const myRealId = currentUserProfileRef.current?.id;
          const finalId = (resolvedId === 'me' || (myRealId && resolvedId === myRealId)) ? 'me' : resolvedId;

          console.log("🗺️ [Rota Gerada - HashMatch] Resolvido:", rawProfileId, "-> ID:", finalId);

          setActiveProfileId(finalId);
          if (subTab === 'communities') {
            setCurrentTab('communities');
          } else {
            setCurrentTab('profile');
          }
        }
      } else if (hash.startsWith('#/communities')) {
        setCurrentTab('communities');
      } else if (hash.startsWith('#/scrapbook-builder')) {
        setCurrentTab('scrapbook-builder');
      } else if (hash.startsWith('#/scrapbook')) {
        setCurrentTab('scrapbook');
      } else if (hash.startsWith('#/testimonials')) {
        setCurrentTab('testimonials');
      } else if (hash.startsWith('#/privacy') || hash.startsWith('#privacy')) {
        setShowPrivacyModal(true);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Trigger on mount

    const handleOpenSecretChatEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ friendId: string }>;
      if (customEvent.detail && customEvent.detail.friendId) {
        setSecretChatFriendId(customEvent.detail.friendId);
        setIsSecretChatOpen(true);
      }
    };
    window.addEventListener('open-secret-chat', handleOpenSecretChatEvent);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('open-secret-chat', handleOpenSecretChatEvent);
    };
  }, []);

  // Update hash when states change
  useEffect(() => {
    if (currentTab === 'profile') {
      window.location.hash = `#/profile/${activeProfileId}`;
    } else if (currentTab === 'communities') {
      window.location.hash = `#/profile/${activeProfileId}/communities`;
    } else {
      window.location.hash = `#/${currentTab}`;
    }
  }, [currentTab, activeProfileId]);

  const handleLikeScrap = async (id: string, liked: boolean, count: number) => {
    const item = scraps.find(s => s.id === id);
    if (item) {
      const updated = { ...item, likes: count, likedByMe: liked };
      try {
        await setDoc(doc(db, 'scraps', id), updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `scraps/${id}`);
      }
    }
  };

  const handleLikeTestimonial = async (id: string, liked: boolean, count: number) => {
    const item = testimonials.find(t => t.id === id);
    if (item) {
      const updated = { ...item, likes: count, likedByMe: liked };
      try {
        await setDoc(doc(db, 'testimonials', id), updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `testimonials/${id}`);
      }
    }
  };

  const handleAddNewShare = async (itemTitle: string, itemType: any, friendName?: string) => {
    const timestampStr = new Date().toLocaleString('pt-BR', { timeZone: 'UTC' }).slice(0, 16).replace(',', ' -');
    const newId = 'sh_' + Math.random().toString(36).substr(2, 9);
    const newShare: SharedMemory = {
      id: newId,
      sharerName: profiles.me.nome_exibicao || profiles.me.name,
      sharerAvatar: profiles.me.avatar,
      itemType: itemType,
      itemTitle: itemTitle,
      targetUser: friendName,
      timestamp: timestampStr,
      likes: 0,
      likedByMe: false
    };
    try {
      await setDoc(doc(db, 'shared_memories', newId), newShare);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `shared_memories/${newId}`);
    }
  };

  const handleLikeShare = async (id: string, liked: boolean, count: number) => {
    const item = sharedMemories.find(sm => sm.id === id);
    if (item) {
      const updated = { ...item, likes: count, likedByMe: liked };
      try {
        await setDoc(doc(db, 'shared_memories', id), updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `shared_memories/${id}`);
      }
    }
  };

  const handleUpdateAlbums = async (newAlbums: Album[] | ((prev: Album[]) => Album[])) => {
    const resolvedAlbums = typeof newAlbums === 'function' ? newAlbums(albums) : newAlbums;
    
    // Validate sizes of all remaining/updated albums before ANY write occurs to Firestore or local state
    for (const album of resolvedAlbums) {
      const payloadSize = new Blob([JSON.stringify(album)]).size;
      console.log("[ALBUM SIZE]", album.id, payloadSize);
      if (payloadSize > 900000) {
        alert("Álbum excede tamanho seguro de armazenamento.");
        console.error("ABORTING SAVE: Album size too large:", album.id, payloadSize);
        return; // ABORT COMPLETELY!
      }
    }

    // Find albums that were deleted
    const newAlbumIds = new Set(resolvedAlbums.map(a => a.id));
    const deletedAlbums = albums.filter(a => !newAlbumIds.has(a.id));
    
    setAlbums(resolvedAlbums);
    
    // Always persist locally first so there's zero chance of losing data
    const activeId = currentUserProfile?.id || 'me';
    localStorage.setItem(`local_albums_${activeId}`, JSON.stringify(resolvedAlbums));
    
    // Delete removed albums from firestore (restricted to owned albums)
    for (const album of deletedAlbums) {
      if (album.profileId === activeId) {
        try {
          await deleteDoc(doc(db, 'albums', album.id));
        } catch (err) {
          console.warn("Failed to delete album in Firestore, saved locally:", err);
        }
      }
    }
    
    // Save/update remaining albums (restricted to owned albums, only write if changed)
    const existingAlbumsMap = new Map((albums || []).map(a => [a.id, a]));
    for (const album of resolvedAlbums) {
      if (album.profileId === activeId) {
        const existing = existingAlbumsMap.get(album.id);
        const hasChanged = !existing || JSON.stringify(existing) !== JSON.stringify(album);
        
        if (hasChanged) {
          try {
            console.log(`Writing new/modified album ${album.id} to Firestore`);
            await setDoc(doc(db, 'albums', album.id), album);
          } catch (err) {
            console.error("Failed to save album in Firestore:", err);
            throw err; // DO NOT mask error!
          }
        } else {
          console.log(`Album ${album.id} unchanged, skipping Firestore write.`);
        }
      }
    }
    console.log("ALBUM SAVED");
  };

  const [featuredPhotoIds, setFeaturedPhotoIds] = useState<Record<string, string | null>>({
    me: 'me_photo_1',
    alexandre: 'ale_photo_1',
    orkut: 'ork_photo_1',
    hacker: 'hac_photo_1'
  });

  // Orkut Profiles Data
  const [profiles, setProfiles] = useState<Record<string, Profile>>({
    me: {
      id: 'me',
      name: 'Junior Sombra',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      location: 'Curitiba, PR - Brasil',
      relationship: 'Namorando com compilador Rust',
      humor: 'Focado em memory safety',
      hereFor: 'Amigos e hackathons',
      fashion: 'Capuz preto e jeans básico',
      religion: 'Borrow Checker da Salvação',
      ethnicity: 'Latino Criptográfico',
      languages: 'Português, Rust, TypeScript, Assembly',
      hometown: 'Curitiba',
      webpage: 'http://orky.net/scrapzone_galera2008',
      passions: 'Cibersegurança, pinhão cozido, criptografia AES e herança zero-custo',
      aboutMe: 'Eae galera! Sou um entusiasta de segurança da informação e Rust de Curitiba. Estou reescrevendo todo o Scrapzone de forma robusta e livre de buffer overflow para consertar os erros que ajudaram a quebrar esse gigante de 2004. Sejam muito bem-vindos ao meu perfil criptografado, deixem um scrap ou depoimento seguro!',
      trusty: 3,
      cool: 3,
      sexy: 2,
      fans: 18,
      username: 'scrapzone_galera2008',
      statusOnline: '● programando em Rust',
      theme: 'default'
    },
    alexandre: {
      id: 'alexandre',
      name: 'Alexandre Curi',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      location: 'Curitiba, PR - Brasil',
      relationship: 'Casado legalmente',
      humor: 'Político / Diplomático',
      hereFor: 'Serviço público e cibersegurança do Paraná',
      fashion: 'Terno parlamentar sob medida',
      religion: 'Católico',
      ethnicity: 'Italiano-Brasileiro',
      languages: 'Português, Inglês',
      hometown: 'Curitiba',
      webpage: 'https://www.assembleia.pr.leg.br',
      passions: 'Leis estaduais do Paraná, infraestrutura de votação, ecossistema Rust',
      aboutMe: 'Deputado e presidente da Assembleia Legislativa do Paraná. Defensor inabalável do desenvolvimento tecnológico do sul. Apoiando a reconstrução criptografada do Scrapzone para mostrar que no Paraná, segurança cibernética e memória computacional limpa são tratadas como leis de estado! Chapa, quer debater as últimas do pinhão parlamentar? Deixe seu recado seguro!',
      trusty: 3,
      cool: 2,
      sexy: 2,
      fans: 1337,
      username: 'alexandre.curi',
      statusOnline: '● na assembleia do Paraná',
      theme: 'rock-underground'
    },
    orkut: {
      id: 'orkut',
      name: 'Orkut Büyükkökten',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      location: 'San Francisco, CA - USA',
      relationship: 'Married to social networks',
      humor: 'Extremely friendly & excited',
      hereFor: 'Connecting humanity securely',
      fashion: 'Silicon Valley retro',
      religion: 'Universal love',
      ethnicity: 'Turkish',
      languages: 'English, Turkish, Portuglês',
      hometown: 'Ankara',
      webpage: 'https://hello.com',
      passions: 'Algorithms, E2E Encryption, community building, WASM sandbox',
      aboutMe: 'Hello my friends! I am the original founder of Orkut. In 2004, internet security was very basic. We had cookie theft, XSS injections, and bad server policies. But today, seeing this Scrapzone replica backed by Rust performance, WebCrypto AES, and zero-knowledge communities, I am fully amazed! You are awesome. Be safe and leave me a scrap!',
      trusty: 3,
      cool: 3,
      sexy: 2,
      fans: 412521,
      username: 'orkut.b',
      statusOnline: '● no café com donuts',
      theme: 'vaporwave'
    },
    hacker: {
      id: 'hacker',
      name: 'H3_Elit3_Hacker',
      avatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150',
      location: 'Deep Web, Tor Network',
      relationship: 'Solteiro Criptográfico',
      humor: 'Sarcástico',
      hereFor: 'Pentesting e engenharia reversa',
      fashion: 'Hoodie preto e óculos escuros indoor',
      religion: 'Zero-Trace Entropy',
      ethnicity: 'Anonymous',
      languages: 'C, Rust, Python, Bash, Binary Hex',
      hometown: 'localhost',
      webpage: 'http://h3_elit3_tor.onion',
      passions: 'Invasões de depoimento, roubo de cookies, quebra de hashes obsoletos',
      aboutMe: 'Ex-script kiddie que virou InfoSec auditor. Fui testar as vulnerabilidades clássicas de depoimentos "hackeados" de 2004 nessa réplica e adivinha? O compilador Rust WASM de vocês isolou toda a pilha de memória de uma forma que meu Wireshark chora. Vocês estragaram a fofoca, mas elevaram a criptografia ao limite. Parabéns aos envolvidos.',
      trusty: 1,
      cool: 3,
      sexy: 1,
      fans: 13,
      username: 'elit3.hacker',
      statusOnline: '● analisando vulnerabilidades',
      theme: 'neon-hacker'
    },
    lucas: {
      id: 'lucas',
      name: 'Lucas Santos',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      location: 'São Paulo, SP - Brasil',
      relationship: 'Solteiro',
      humor: 'Sempre conectado',
      hereFor: 'Bater papo em canais criptografados',
      fashion: 'Camiseta de banda e tênis clássico',
      religion: 'Tecnologia livre',
      ethnicity: 'Brasileiro',
      languages: 'Português, C#',
      hometown: 'São Paulo',
      webpage: 'https://github.com/lucas-santos',
      passions: 'Música retro, chats secretos, Scrapzone 2004',
      aboutMe: 'Eae parça! Sou o Lucas, curto muito bater papo de madrugada e relembrar as comunidades clássicas. Ativei meu canal seguro com criptografia de 48 horas!',
      trusty: 3,
      cool: 3,
      sexy: 2,
      fans: 15,
      username: 'Lucas_Santos',
      statusOnline: '● livre para chat',
      theme: 'default'
    }
  });

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  // Dynamic Friends list getter
  const getFriendsForProfile = (uid: string) => {
    const myRealId = currentUserProfile?.id || 'me';
    const isCurrentMe = (uid === 'me' || uid === myRealId);
    
    const friendsSet = new Set<string>();
    
    // Always add default friends for everyone
    ['lucas', 'alexandre', 'orkut', 'hacker'].forEach(id => friendsSet.add(id));
    
    // Add dynamic friends from accepted requests
    console.log(`[DEBUG] Processando friendRequests para ${uid}. Total: ${friendRequests.length}`);
    console.log(`[DEBUG] UID sendo visitado: ${uid}`);
    friendRequests.forEach(req => {
      if (req.status === 'accepted') {
        const fromId = req.fromUserId || req.senderId;
        const toId = req.toUserId || req.receiverId;
        
        if (fromId === uid && toId) {
            console.log(`[DEBUG] Adicionando amigo ${toId} (via fromId) para ${uid}`);
            friendsSet.add(toId);
        }
        if (toId === uid && fromId) {
            console.log(`[DEBUG] Adicionando amigo ${fromId} (via toId) para ${uid}`);
            friendsSet.add(fromId);
        }
      }
    });
    console.log(`[DEBUG] Resultado final da lista de amigos para ${uid}:`, Array.from(friendsSet));
    
    // Remove self just in case
    friendsSet.delete(uid);
    friendsSet.delete('me'); // Keep clean representation
    
    if (isCurrentMe && myRealId) {
      friendsSet.delete(myRealId);
    }
    
    // Map back to Friend objects
    const list: Friend[] = [];
    friendsSet.forEach(id => {
      const profile = profiles[id];
      console.log(`[DEBUG] Mapeando amigo ${id}. Perfil encontrado: ${!!profile}`);
      if (profile) {
        list.push({
          id,
          name: profile.nome_exibicao || profile.name,
          avatar: profile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          location: profile.location || 'Brasil'
        });
      } else {
        const defaultProf = DEFAULT_PROFILES[id];
        if (defaultProf) {
          list.push({
            id,
            name: defaultProf.nome_exibicao || defaultProf.name,
            avatar: defaultProf.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            location: defaultProf.location || 'Brasil'
          });
        } else {
          console.log(`[DEBUG] Amigo ${id} sem perfil e sem perfil padrão.`);
        }
      }
    });
    return list;
  };

  // Friend Requests handlers
  const handleAddFriend = async (receiverId: string) => {
    const currentUserId = currentUserProfile?.id || 'me';
    if (!currentUserId || !receiverId) return;

    if (currentUserId === receiverId) {
      console.warn("Você não pode adicionar a si mesmo como amigo.");
      return;
    }

    // Check if there is already any request between sender and receiver in either direction
    const existingReq = friendRequests.find(req => 
      (req.fromUserId === currentUserId && req.toUserId === receiverId) ||
      (req.toUserId === currentUserId && req.fromUserId === receiverId)
    );

    if (existingReq) {
      if (existingReq.status === 'pending') {
        if (existingReq.fromUserId === currentUserId) {
          console.warn("Você já enviou uma solicitação de amizade para este usuário que está pendente.");
        } else {
          console.warn("Este usuário já enviou uma solicitação de amizade para você. Por favor, verifique suas notificações.");
        }
        return;
      } else if (existingReq.status === 'accepted') {
        console.warn("Vocês já são amigos!");
        return;
      }
    }

    try {
      await addDoc(collection(db, 'friend_requests'), {
        fromUserId: currentUserId,
        senderId: currentUserId,
        toUserId: receiverId,
        receiverId: receiverId,
        status: 'pending',
        createdAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'friend_requests');
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      const targetReq = friendRequests.find(r => r.id === requestId);
      if (!targetReq) return;

      // 1. Accept the current request
      await setDoc(doc(db, 'friend_requests', requestId), { status: 'accepted' }, { merge: true });

      // 2. Ensure opposite request exists and is accepted
      // Query for all requests between these two users to be safe about field names
      const oppositeQuery = query(collection(db, 'friend_requests'));
      
      const allRequestsSnap = await getDocs(oppositeQuery);
      
      let oppositeDoc: any = null;
      let oppositeId: string | null = null;
      
      allRequestsSnap.forEach(d => {
        const data = d.data();
        const fromVal = data.fromUserId || data.senderId;
        const toVal = data.toUserId || data.receiverId;
        
        if (fromVal === targetReq.toUserId && toVal === targetReq.fromUserId) {
            oppositeDoc = d;
            oppositeId = d.id;
        }
      });
      
      if (oppositeDoc) {
        // Exists, update it
        await setDoc(oppositeDoc.ref, { status: 'accepted' }, { merge: true });
      } else {
        // Doesn't exist, create it
        const newDoc = await addDoc(collection(db, 'friend_requests'), {
          fromUserId: targetReq.toUserId,
          senderId: targetReq.toUserId,
          toUserId: targetReq.fromUserId,
          receiverId: targetReq.fromUserId,
          status: 'accepted',
          createdAt: Date.now()
        });
        oppositeId = newDoc.id;
      }
      
      // Update local state to force UI update without waiting for snapshot
      setFriendRequests(prev => prev.map(req => {
          if (req.id === requestId) return { ...req, status: 'accepted' };
          if (oppositeId && req.id === oppositeId) return { ...req, status: 'accepted' };
          return req;
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `friend_requests/${requestId}`);
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    try {
      const reqRef = doc(db, 'friend_requests', requestId);
      await setDoc(reqRef, { status: 'rejected' }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `friend_requests/${requestId}`);
    }
  };

  const handleRemoveFriend = async (targetId: string) => {
    const currentUserId = currentUserProfile?.id || 'me';
    if (!currentUserId || !targetId) return;

    try {
      // Get any friend requests matching these users in both directions (including accepted or pending)
      const matches = friendRequests.filter(req => 
        ((req.fromUserId === currentUserId && req.toUserId === targetId) ||
         (req.fromUserId === targetId && req.toUserId === currentUserId))
      );

      for (const req of matches) {
        if (req.id) {
          await deleteDoc(doc(db, 'friend_requests', req.id));
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `friend_requests_delete_${targetId}`);
    }
  };

  // Real-time Communities List
  const [communities, setCommunities] = useState<Community[]>(() => [
    { id: '1', name: 'Eu odeio acordar cedo', description: 'Porque o sono pós-compilação em Rust é sagrado.', members: 42152, avatar: '⏰', category: 'Lazer', secureMode: false },
    { id: '2', name: 'Digo "Oi" e continuo programando', description: 'Ative sua chave simétrica e não interrompa meu raciocínio.', members: 12510, avatar: '💻', category: 'Tecnologia', secureMode: false },
    { id: '3', name: 'Eu amo chocolate preto', description: 'Combina muito bem com café preto e revisões estritas de código.', members: 8920, avatar: '🍫', category: 'Culinária', secureMode: false },
    { id: 'sec_pr', name: 'Assembleia Segura PR (Rust)', description: 'Fórum da Assembleia Legislativa do Paraná para debater leis de cibersegurança do pinhão.', members: 1337, avatar: '🌲', category: 'Governo', secureMode: true },
    { id: 'hacker_guild', name: 'Hacker Elite - Anti-XSS Guild', description: 'Debates puros sobre buffer safety e como aniquilar XSS com isolamento de WebAssembly linear-memory.', members: 777, avatar: '🕵️', category: 'Segurança', secureMode: true },
    { id: 'orkut_devs', name: 'Scrapzone Devs & Zero-Knowledge', description: 'Simulações de zk-SNARKs e criptossistemas de alto gabarito sob governança descentralizada.', members: 502, avatar: '🔑', category: 'Cripto', secureMode: true },
    { id: 'pendrive_perdido', name: 'QUEM NUNCA PERDEU O PENDRIVE?', description: 'Pra quem já sofreu perdendo arquivos importantes ou a chave de criptografia do pendrive de backup.', members: 3638, avatar: '💾', category: 'Nostalgia', secureMode: false }
  ]);

  // Scraps State
  const [scraps, setScraps] = useState<Scrap[]>([
    {
      id: 's1',
      fromId: 'alexandre',
      fromName: 'Alexandre Curi',
      fromAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      toId: 'me',
      timestamp: '27/05/2026 - 10:15',
      rawContent: 'Fala, Júnior! Tudo certo? Passando aqui pra te convencer a participar da conferência de criptografia e Rust na Assembleia Legislativa em Curitiba. Traga pinhão cozido chapa! Um abraço.',
      isEncrypted: false
    },
    {
      id: 's2',
      fromId: 'orkut',
      fromName: 'Orkut Büyükkökten',
      fromAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      toId: 'me',
      timestamp: '27/05/2026 - 11:20',
      rawContent: 'Hello Junior! Your secure platform is so sweet! In 2004 we had very simple servers. But with WebCrypto and Rust safety, your scrapbooking is beautiful! Cheers!',
      isEncrypted: false
    }
  ]);

  // Testimonials State
  const [testimonials, setTestimonials] = useState<Testimonial[]>([
    {
      id: 't1',
      fromId: 'alexandre',
      fromName: 'Alexandre Curi',
      fromAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      toId: 'me',
      timestamp: '27/05/2026 - 09:30',
      content: 'Esse júnior é de confiança! Trabalhador de Curitiba que entende de Rust e segurança parlamentar mais do que qualquer outro chapa da região.',
      isEncrypted: false,
      unlocked: true
    },
    {
      id: 't2',
      fromId: 'hacker',
      fromName: 'H3_Elit3_Hacker',
      fromAvatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150',
      toId: 'me',
      timestamp: '27/05/2026 - 14:45',
      content: 'Tentativa de sequestrar sessão: Fracassada. Depoimento isolado no heap.',
      isEncrypted: true,
      ciphertext: '0x_sec_depo_54656e74617469766120646520736571756573747261722073657373e36f3a20467261636173736164612e204465706f696d656e746f2069736f6c61646f206e6f20686561702e',
      aesKeyHex: 'hacker-1234',
      unlocked: false
    }
  ]);

  // Save editable profile locally and sync to Firestore
  const handleSaveProfile = async (updatedProfile: Partial<Profile>) => {
    console.log(`[LOG] handleSaveProfile START - userId: ${currentUserProfile?.id}, avatar: ${updatedProfile.avatar}, timestamp: ${new Date().toISOString()}`);
    const baseSource = currentUserProfile || profiles.me;
    const targetName = updatedProfile.nome_exibicao || updatedProfile.name || baseSource.nome_exibicao || baseSource.name || '';
    const updatedMe = {
      ...baseSource,
      ...updatedProfile,
      name: targetName,
      nome_exibicao: targetName
    };
    const realId = currentUserProfile?.id || profiles.me?.id || 'me';
    setProfiles(prev => ({
      ...prev,
      me: updatedMe,
      [realId]: updatedMe
    }));
    if (currentUserProfile) {
      setCurrentUserProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
    }
    try {
      console.log('[DEBUG] handleSaveProfile - About to call setDoc with updatedMe:', updatedMe);
      await setDoc(doc(db, 'profiles', realId), updatedMe);
      console.log(`[LOG] handleSaveProfile setDoc SUCCESS - userId: ${realId}, avatar: ${updatedMe.avatar}, timestamp: ${new Date().toISOString()}`);
      console.log("[PASSO 4 OK] setDoc profiles concluído");
      if (realId && realId !== 'me') {
        try {
          await setDoc(doc(db, 'users', realId), updatedMe);
          console.log("[PASSO 5 OK] setDoc users concluído");
        } catch (usersErr: any) {
          console.error("[PASSO 5 ERRO] setDoc users falhou. Motivo:", usersErr.message || usersErr);
          console.error("Non-blocking error syncing to users collection: ", usersErr);
        }
      }
    } catch (err: any) {
      console.error("[PASSO 4 ERRO] setDoc profiles falhou. Motivo:", err.message || err);
      handleFirestoreError(err, OperationType.WRITE, `profiles/${realId}`);
    }
  };

  // Rate another user's profile and synchronize with Firebase Firestore
  const handleRateProfile = async (profileId: string, type: 'trusty' | 'cool' | 'sexy' | 'fans', deltaOrValue: number) => {
    if (!profileId || profileId === 'me' || (currentUserProfile && profileId === currentUserProfile.id)) {
      return; // Can't self-rate
    }

    const currentProfile = profiles[profileId];
    if (!currentProfile) return;

    let updatedValue = currentProfile[type] || 0;
    if (type === 'fans') {
      updatedValue += deltaOrValue; // delta is +1 or -1
    } else {
      updatedValue = deltaOrValue; // 1, 2, or 3
    }

    // Guard negative ranges
    updatedValue = Math.max(0, updatedValue);

    const updatedProfile = {
      ...currentProfile,
      [type]: updatedValue
    };

    setProfiles(prev => ({
      ...prev,
      [profileId]: updatedProfile
    }));

    try {
      await setDoc(doc(db, 'profiles', profileId), updatedProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles/${profileId}`);
    }
  };

  // Switch visited profile
  const handleNavigateToFriend = (id: string) => {
    const myRealId = currentUserProfile?.id;
    const finalId = (id === 'me' || (myRealId && id === myRealId)) ? 'me' : id;
    console.log("🗺️ [Rota Gerada] Navegando para o perfil ID:", finalId, `(Roteamento Hash: #/profile/${finalId})`);
    setActiveProfileId(finalId);
    setCurrentTab('profile');
  };

  // Add new Scrap with real-time Express Gemini proxy response and sync to Firestore
  const handleAddScrap = async (scrap: Omit<Scrap, 'id' | 'timestamp'> & { needsAiResponse?: boolean }) => {
    const timestampStr = new Date().toLocaleString('pt-BR', { timeZone: 'UTC' }).slice(0, 16).replace(',', ' -');
    const newId = 'sc_' + Math.random().toString(36).substr(2, 9);
    
    const newScrapItem: Scrap = {
      id: newId,
      ...scrap,
      timestamp: timestampStr
    };

    try {
      await setDoc(doc(db, 'scraps', newId), newScrapItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `scraps/${newId}`);
    }

    if (scrap.needsAiResponse) {
      const activeChar = activeProfileId; // 'alexandre', 'orkut', 'hacker'
      
      const typingId = 'typing_' + Math.random().toString(36).substr(2, 9);
      const typingItem: Scrap = {
        id: typingId,
        fromId: activeChar,
        fromName: profiles[activeChar]?.name || activeChar,
        fromAvatar: profiles[activeChar]?.avatar || '',
        toId: 'me',
        timestamp: 'Digitando...',
        rawContent: '✍️ Processando criptografia e pensando em uma resposta memory-safe...',
        isEncrypted: false
      };

      setScraps(prev => [...prev, typingItem]);

      try {
        const response = await fetch('/api/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: activeChar,
            userName: profiles.me.nome_exibicao || profiles.me.name,
            userProfile: profiles.me.aboutMe,
            text: scrap.rawContent,
            encrypt: scrap.isEncrypted
          })
        });

        const data = await response.json();
        
        const aiScrap: Scrap = {
          id: 'ai_rep_' + Math.random().toString(36).substr(2, 9),
          fromId: activeChar,
          fromName: profiles[activeChar]?.name || activeChar,
          fromAvatar: profiles[activeChar]?.avatar || '',
          toId: 'me',
          timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'UTC' }).slice(0, 16).replace(',', ' -'),
          rawContent: data.reply || "Resposta assinada criptograficamente.",
          isEncrypted: false
        };

        await setDoc(doc(db, 'scraps', aiScrap.id), aiScrap);
        setScraps(prev => prev.filter(s => s.id !== typingId));
      } catch (err) {
        console.error("Express Gemini Proxy Error:", err);
        const fallbackScrap: Scrap = {
          id: 'fallback_rep_' + Math.random().toString(36).substr(2, 9),
          fromId: activeChar,
          fromName: profiles[activeChar]?.name || activeChar,
          fromAvatar: profiles[activeChar]?.avatar || '',
          toId: 'me',
          timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'UTC' }).slice(0, 16).replace(',', ' -'),
          rawContent: `[Secure Local Fallback] Recebi seu recado chapa! Desculpe, não consegui me conectar ao cérebro inteligente do servidor agora, mas garanto que o Borrow Checker de Curitiba está rodando.`,
          isEncrypted: false
        };
        await setDoc(doc(db, 'scraps', fallbackScrap.id), fallbackScrap);
        setScraps(prev => prev.filter(s => s.id !== typingId));
      }
    }
  };

  const handleAddTestimonial = async (testimonial: Omit<Testimonial, 'id' | 'timestamp' | 'unlocked'>) => {
    const timestampStr = new Date().toLocaleString('pt-BR', { timeZone: 'UTC' }).slice(0, 16).replace(',', ' -');
    const newId = 'test_' + Math.random().toString(36).substr(2, 9);
    const newTest: Testimonial = {
      id: newId,
      ...testimonial,
      timestamp: timestampStr,
      unlocked: !testimonial.isEncrypted
    };
    try {
      await setDoc(doc(db, 'testimonials', newId), newTest);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `testimonials/${newId}`);
    }
  };

  const handleJoinCommunity = async (id: string) => {
    if (!joinedCommunities.includes(id)) {
      const updated = [...joinedCommunities, id];
      setJoinedCommunities(updated);
      
      const activeId = currentUserProfile?.id || 'me';
      // Always store locally as fallback
      localStorage.setItem(`local_joined_${activeId}`, JSON.stringify(updated));
      
      try {
        await setDoc(doc(db, 'joined_communities', activeId), { communityIds: updated });
      } catch (err) {
        console.warn("Could not save joined communities in firestore, saved locally instead:", err);
      }
    }
  };

  const handleToggleJoinCommunity = async (id: string, join: boolean) => {
    let updated: string[];
    if (join) {
      if (joinedCommunities.includes(id)) return;
      updated = [...joinedCommunities, id];
    } else {
      updated = joinedCommunities.filter(cid => cid !== id);
    }
    setJoinedCommunities(updated);
    
    const activeId = currentUserProfile?.id || 'me';
    // Always store locally as fallback
    localStorage.setItem(`local_joined_${activeId}`, JSON.stringify(updated));
    
    try {
      await setDoc(doc(db, 'joined_communities', activeId), { communityIds: updated });
    } catch (err) {
      console.warn("Could not save toggled joined communities in firestore, saved locally instead:", err);
    }
  };

  const currentViewedProfile = profiles[activeProfileId] || profiles.me || DEFAULT_PROFILES.me;

  useEffect(() => {
    if (currentViewedProfile) {
      console.log("📖 [Perfil Carregado] Dados carregados:", {
        id: currentViewedProfile.id,
        name: currentViewedProfile.name,
        username: currentViewedProfile.username,
        theme: currentViewedProfile.theme
      });
    }
  }, [currentViewedProfile]);

  // Set custom Windows 95/98 cursor when theme is active
  useEffect(() => {
    const currentTheme = currentViewedProfile?.theme || 'default';
    if (currentTheme === 'minimal-oldweb') {
      document.body.classList.add('minimal-oldweb-cursor-active');
    } else {
      document.body.classList.remove('minimal-oldweb-cursor-active');
    }
    return () => {
      document.body.classList.remove('minimal-oldweb-cursor-active');
    };
  }, [currentViewedProfile?.theme]);

  // Loading state during session check and app bootstrap
  if (isAuthLoading || !initDone) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#cbdcf3] to-[#fbcfe8] flex flex-col items-center justify-center font-sans gap-4 select-none">
        <div className="flex items-center gap-1.5 mb-1.5 animate-pulse">
          <h1 className="text-5xl font-extrabold text-[#ed3fa7] tracking-tighter">
            orkut
          </h1>
          <span className="bg-[#1b4372] text-[8px] text-white font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
            secure
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1b4372] bg-white border border-[#92afd9] rounded-full py-1.5 px-4 shadow-sm">
          <RefreshCw className="animate-spin text-pink-600" size={13} strokeWidth={2.5} />
          <span>Sincronizando integridade de sessão...</span>
        </div>
      </div>
    );
  }

  // Session gate
  if (!currentUserProfile || currentUserProfile.isEmailVerified === false) {
    return (
      <OrkutLogin 
        onLoginSuccess={handleLoginSuccess} 
        defaultProfiles={DEFAULT_PROFILES} 
        isEmailUnverifiedProfile={currentUserProfile}
        onLogout={handleLogout}
        siteLogo={siteConfig.siteLogo}
      />
    );
  }

  const themeStyles = getThemeStyles(currentViewedProfile.theme);
  console.log(`[DEBUG] Visita: ${currentViewedProfile.id}, Me: ${currentUserProfile?.id}`);
  const friends = getFriendsForProfile(currentViewedProfile.id);

  const isOwnProfile = activeProfileId === 'me' || (currentUserProfile && activeProfileId === currentUserProfile.id);

  // Filter communities joined by the visited profile applying privacy rules
  const visitorId = currentUserProfile?.id || 'me';
  const isOwner = visitorId === activeProfileId || isOwnProfile;
  const friendsPool = ["me", "lucas", "alexandre", "orkut", "hacker"];
  const isFriend = friendsPool.includes(visitorId) && friendsPool.includes(activeProfileId);

  const filteredVisitedCommunities = communities.filter(comm => {
    const isJoinedByVisited = visitedProfileJoinedCommIds.includes(comm.id);
    if (!isJoinedByVisited) return false;
    
    if (isOwner || isFriend) {
      return true; // Return all joined communities for owner and friend
    } else {
      // Guest / Non-friend sees only public communities (secureMode is false/undefined)
      return !comm.secureMode;
    }
  });

  return (
    <div className={`min-h-screen ${themeStyles.bg} flex flex-col justify-between transition-colors duration-300 selection:bg-pink-100 antialiased`}>
      <CustomGothicCursor themeId={currentViewedProfile.theme} />
      {/* 1. Header */}
      <OrkutHeader
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'communities') {
            setSelectedCommunityId(null);
          }
          setActiveProfileId('me');
          setCurrentTab(tab);
        }}
        userName={profiles.me?.name || currentUserProfile.name}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={handleLogout}
        themeStyles={themeStyles}
        siteLogo={siteConfig.siteLogo}
        showAssets={auth.currentUser?.email === 'darkjuniorsombra@gmail.com' || (currentUserProfile as any)?.email === 'darkjuniorsombra@gmail.com'}
        themeId={currentViewedProfile.theme}
      />

      {/* 2. Main content container */}
      <main 
        className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 font-sans"
        style={currentViewedProfile.theme === 'cyberdeck' ? { backgroundColor: 'transparent' } : undefined}
      >
        {/* If viewing a friend's profile, show a nice retro ribbon allowing return to my own profile */}
        {!isOwnProfile && (
          <div 
            className={`${
              currentViewedProfile.theme === 'gotico-retro'
                ? 'bg-[#120a14]/80 border-[#b08d57]/30 text-[#b08d57]'
                : 'bg-[#fffbeb] border border-amber-200 text-amber-800'
            } rounded p-3 mb-5 flex justify-between items-center text-xs transition-colors duration-300`}
            style={currentViewedProfile.theme === 'gotico-retro' ? { boxShadow: '0 4px 15px rgba(0,0,0,0.4)' } : undefined}
          >
            <span className="font-semibold font-sans">
              🔍 Você está visualizando o perfil seguro de: <strong>{currentViewedProfile.name}</strong>
            </span>
            <button
              id="btn-return-myprofile"
              onClick={() => setActiveProfileId('me')}
              className={`px-2.5 py-1 ${
                currentViewedProfile.theme === 'gotico-retro'
                  ? 'bg-[#2d1533] hover:bg-[#ff00a0] text-[#b08d57] hover:text-white border border-[#b08d57]/40 font-mono'
                  : 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
              } rounded shadow-sm text-[11px] cursor-pointer transition-all`}
            >
              Voltar ao Meu Perfil
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        {currentTab === 'profile' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentViewedProfile.theme}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ProfileLayout
                profile={currentViewedProfile}
                friends={friends}
                communities={filteredVisitedCommunities}
                isOwnProfile={isOwnProfile}
                onSaveProfile={handleSaveProfile}
                onNavigateToFriend={handleNavigateToFriend}
                onNavigateToTab={(tab, forceVisitor = false, autoTriggerUpload = false, communityId) => {
                  setCurrentTab(tab);
                  setIsVisitorMode(forceVisitor);
                  setAutoOpenUpload(autoTriggerUpload);
                  if (tab === 'communities') {
                    setSelectedCommunityId(communityId || null);
                  }
                  if (!forceVisitor) {
                    setActiveProfileId('me');
                  }
                }}
                userPublicKey={userPublicKey}
                currentTab={currentTab}
                albums={albums}
                featuredPhotoId={featuredPhotoIds[currentViewedProfile.id] || null}
                sharedMemories={sharedMemories}
                onShareToFeed={handleAddNewShare}
                onLikeShare={handleLikeShare}
                onOpenSecretChat={(targetFriendId) => {
                  setSecretChatFriendId(targetFriendId || 'lucas');
                  setIsSecretChatOpen(true);
                }}
                onRateProfile={handleRateProfile}
                friendRequests={friendRequests}
                onAddFriend={handleAddFriend}
                onAcceptFriendRequest={handleAcceptFriendRequest}
                onRejectFriendRequest={handleRejectFriendRequest}
                onRemoveFriend={handleRemoveFriend}
                profiles={profiles}
                loggedInUserId={currentUserProfile?.id || ''}
              />
            </motion.div>
          </AnimatePresence>
        )}
 
        {currentTab === 'photos' && (
          <PhotoAlbums
            profileId={currentViewedProfile.id}
            profileName={currentViewedProfile.name}
            profileAvatar={currentViewedProfile.avatar}
            profileTheme={currentViewedProfile.theme}
            albums={albums}
            isOwnProfile={isOwnProfile && !isVisitorMode}
            isVisitorMode={isVisitorMode}
            onUpdateAlbums={handleUpdateAlbums}
            featuredPhotoId={featuredPhotoIds[currentViewedProfile.id] || null}
            onSetFeaturedPhoto={(photoId) => {
              setFeaturedPhotoIds(prev => ({
                ...prev,
                [currentViewedProfile.id]: photoId
              }));
            }}
            onShareToFeed={handleAddNewShare}
            initialOpenUpload={autoOpenUpload}
            onResetUploadTrigger={() => setAutoOpenUpload(false)}
            currentUserId={currentUserProfile?.id || 'me'}
            currentUserName={currentUserProfile?.name || 'orkut'}
            currentUserFriends={getFriendsForProfile(currentUserProfile?.id || 'me')}
          />
        )}

        {currentTab === 'scrapbook' && (
          <Scrapbook
            scraps={scraps}
            onAddScrap={handleAddScrap}
            activeProfile={currentViewedProfile}
            isOwnProfile={isOwnProfile}
            currentUser={{ id: currentUserProfile?.id || profiles.me.id || 'me', name: profiles.me.nome_exibicao || profiles.me.name, avatar: profiles.me.avatar }}
            onLikeScrap={handleLikeScrap}
            onShareToFeed={handleAddNewShare}
            onGoToBuilder={() => setCurrentTab('scrapbook-builder')}
            profiles={profiles}
          />
        )}

        {currentTab === 'scrapbook-builder' && (
          <ScrapbookBuilder
            profiles={profiles}
            currentUser={{ id: currentUserProfile?.id || profiles.me.id || 'me', name: profiles.me.nome_exibicao || profiles.me.name, avatar: profiles.me.avatar }}
            onPostScrap={handleAddScrap}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            theme={currentViewedProfile.theme}
          />
        )}

        {currentTab === 'testimonials' && (
          <Testimonials
            testimonials={testimonials}
            onAddTestimonial={handleAddTestimonial}
            activeProfile={currentViewedProfile}
            isOwnProfile={isOwnProfile}
            currentUser={{ id: currentUserProfile?.id || profiles.me.id || 'me', name: profiles.me.nome_exibicao || profiles.me.name, avatar: profiles.me.avatar }}
            onLikeTestimonial={handleLikeTestimonial}
            onShareToFeed={handleAddNewShare}
            profiles={profiles}
          />
        )}

        {currentTab === 'communities' && (
          <Communities
            communities={communities}
            onJoinCommunity={handleJoinCommunity}
            onToggleJoinCommunity={handleToggleJoinCommunity}
            joinedIds={joinedCommunities}
            profiles={profiles}
            currentUser={{ id: currentUserProfile?.id || profiles.me.id || 'me', name: profiles.me.nome_exibicao || profiles.me.name, avatar: profiles.me.avatar }}
            visitedProfileId={currentViewedProfile.id}
            onNavigateToFriend={handleNavigateToFriend}
            onNavigateToTab={(tab, forceVisitor = false, autoTriggerUpload = false, communityId) => {
              setCurrentTab(tab);
              setIsVisitorMode(forceVisitor);
              setAutoOpenUpload(autoTriggerUpload);
              if (tab === 'communities') {
                setSelectedCommunityId(communityId || null);
              }
              if (!forceVisitor) {
                setActiveProfileId('me');
              }
            }}
            activeCommunityId={selectedCommunityId}
            setActiveCommunityId={setSelectedCommunityId}
          />
        )}

        {currentTab === 'search' && (
          <SearchResults
            query={searchQuery}
            profiles={profiles}
            communities={communities}
            scraps={scraps}
            onNavigateToFriend={handleNavigateToFriend}
            onJoinCommunity={handleJoinCommunity}
            joinedCommunityIds={joinedCommunities}
            onNavigateToTab={setCurrentTab}
            onClearSearch={() => {
              setSearchQuery('');
              setCurrentTab('profile');
            }}
          />
        )}

        {currentTab === 'rust-sec-lab' && (
          <RustSecLab />
        )}

        {currentTab === 'assets-manager' && (auth.currentUser?.email === 'darkjuniorsombra@gmail.com' || (currentUserProfile as any)?.email === 'darkjuniorsombra@gmail.com') && (
          <AssetsManager 
            currentTheme={currentViewedProfile.theme}
            onConfigChange={(newConfig) => {
              setSiteConfig(newConfig);
            }}
          />
        )}
      </main>

      {/* 3. Footer */}
      <OrkutFooter onPrivacyClick={() => setShowPrivacyModal(true)} />

      {/* Privacy modal */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => {
          setShowPrivacyModal(false);
          if (window.location.hash.startsWith('#/privacy') || window.location.hash.startsWith('#privacy')) {
            window.location.hash = `#/profile/${activeProfileId}`;
          }
        }}
        onGoToProfile={() => {
          setShowPrivacyModal(false);
          setActiveProfileId('me');
          setCurrentTab('profile');
        }}
      />

      {/* MSN Alert Toast Notification System */}
      <MsnToastSystem />

      {/* Secret Privacidade Chat Modal */}
      <SecretChat
        isOpen={isSecretChatOpen}
        onClose={() => setIsSecretChatOpen(false)}
        currentUser={{
          id: currentUserProfile?.id || profiles.me.id || 'me',
          name: profiles.me.nome_exibicao || profiles.me.name,
          avatar: profiles.me.avatar,
          username: profiles.me.username || 'junior.sombra'
        }}
        initialTargetFriendId={secretChatFriendId}
        friendsList={friends}
      />
    </div>
  );
}
