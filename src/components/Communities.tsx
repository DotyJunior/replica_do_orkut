import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Lock, Unlock, Users, PlusCircle, Search, HelpCircle, 
  MessageSquare, Plus, Minus, ChevronLeft, ChevronRight, Image, 
  ThumbsUp, Trash2, Edit, Pin, Settings, AlertCircle, Calendar, 
  Globe, Info, Camera, PinOff, LogOut, ArrowLeft, RefreshCw,
  MapPin, Sparkles, Palette, KeyRound, ShieldAlert, Check, UserMinus, 
  UserCheck, UserX, X, Bell
} from 'lucide-react';
import GlossyRetroButton from './GlossyRetroButton';
import ExternalMediaModal from './ExternalMediaModal';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, addDoc, deleteDoc, query, where, getDocs, writeBatch, arrayUnion, getDoc, increment } from 'firebase/firestore';
import { Profile, Community, ExternalMedia } from '../types';
import { getThemeStyles } from '../lib/theme';
import { DEFAULT_COMMUNITIES_SEED } from '../data/initialCommunities';
import { detectExternalMedia } from '../utils/mediaUtils';

const getFontStyleClass = (style?: string) => {
  switch (style) {
    case 'gothic':
      return 'font-gothic';
    case 'medieval':
      return 'font-medieval';
    case 'cursivo':
      return 'font-cursivo';
    case 'cyber':
      return 'font-cyber tracking-wider';
    case 'vaporwave':
      return 'font-vaporwave tracking-widest';
    case 'smallcaps':
      return 'font-smallcaps tracking-tight font-extrabold';
    default:
      return 'font-sans';
  }
};

const safeJsonParse = (str: string | null, fallback: any = []) => {
  if (!str) return fallback;
  try {
    const val = JSON.parse(str);
    if (val === undefined || val === null) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(val)) {
      console.warn("safeJsonParse Communities: Expected an array format, but loaded:", typeof val, ". Falling back.");
      return fallback;
    }
    return val;
  } catch (e) {
    console.warn("JSON parse failed, using fallback in Communities:", e);
    return fallback;
  }
};

interface CommunitiesProps {
  communities: Community[]; // unused except as reference/fallback
  onJoinCommunity?: (id: string) => void; // fallback
  onToggleJoinCommunity?: (id: string, join: boolean) => void;
  joinedIds: string[];
  profiles: Record<string, Profile>;
  currentUser?: { id: string; name: string; avatar: string };
  visitedProfileId?: string;
  onNavigateToFriend: (id: string) => void;
  onNavigateToTab?: (tab: string, forceVisitor?: boolean, autoTriggerUpload?: boolean, communityId?: string) => void;
  activeCommunityId?: string | null;
  setActiveCommunityId?: (id: string | null) => void;
}

interface Topic {
  id: string;
  communityId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  imageUrl?: string;
  createdAt: string; // ISO string or readable
  views: number;
  repliesCount: number;
  isPinned?: boolean;
  isLocked?: boolean;
  isApproved?: boolean;
  externalMedia?: ExternalMedia;
}

interface Reply {
  id: string;
  topicId: string;
  communityId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  imageUrl?: string;
  createdAt: string; // ISO string
  likes: number;
  likedBy: string[]; // List of user IDs who liked
}

interface Notification {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  read: boolean;
}

// 12 Nostalgic users to populate our communities realistically!
const MOCK_OR_EXTRA_MEMBERS = [
  { id: 'lucas', name: 'Lucas Santos', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', location: 'São Paulo, SP' },
  { id: 'alexandre', name: 'Alexandre Curi', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', location: 'Curitiba, PR' },
  { id: 'orkut', name: 'Orkut Büyükkökten', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', location: 'San Francisco, CA' },
  { id: 'hacker', name: 'H3_Elit3_Hacker', avatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150', location: 'Deep Web' },
  { id: 'mariana', name: 'Mariana Goth99', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', location: 'Belo Horizonte, MG' },
  { id: 'thiago', name: 'Thiago Webmaster', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', location: 'Rio de Janeiro, RJ' },
  { id: 'carla', name: 'Carla Coder', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', location: 'Porto Alegre, RS' },
  { id: 'felipe', name: 'Felipe Retro', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', location: 'Recife, PE' },
  { id: 'aline', name: 'Aline Glitter', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', location: 'Salvador, BA' },
  { id: 'bruno', name: 'Bruno Pinhão', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', location: 'Ponta Grossa, PR' },
  { id: 'gabriela', name: 'Gabi MSN', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', location: 'Vitória, ES' },
  { id: 'roberto', name: 'Roberto Sysadmin', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', location: 'Joinville, SC' }
];

export default function Communities({ 
  onJoinCommunity, 
  onToggleJoinCommunity,
  joinedIds = [], 
  profiles, 
  currentUser, 
  visitedProfileId,
  onNavigateToFriend,
  onNavigateToTab,
  activeCommunityId,
  setActiveCommunityId
}: CommunitiesProps) {
  // Real active user identifier
  const activeUserId = currentUser?.id || 'me';
  const activeUserName = currentUser?.name || 'Administrador';
  const activeUserAvatar = currentUser?.avatar || '👤';

  // Component States
  const [dbCommunities, setDbCommunities] = useState<any[]>([]);
  const targetProfileId = visitedProfileId || activeUserId;
  const [displayedCommunities, setDisplayedCommunities] = useState<any[]>([]);
  const [isLoadingProfileComms, setIsLoadingProfileComms] = useState<boolean>(false);

  useEffect(() => {
    if (dbCommunities.length === 0) return;

    setIsLoadingProfileComms(true);
    const docRef = doc(db, 'joined_communities', targetProfileId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      let userCommIds: string[] = ['1', '3'];
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.communityIds)) {
          userCommIds = data.communityIds;
        }
      } else {
        // Fallback for default users if document does not exist yet
        if (targetProfileId === 'me' || targetProfileId === activeUserId) userCommIds = ['1', '3', 'pendrive_perdido'];
        else if (targetProfileId === 'orkut') userCommIds = ['1', '3', 'orkut_devs', '2'];
        else if (targetProfileId === 'alexandre') userCommIds = ['1', '2', 'sec_pr'];
        else if (targetProfileId === 'hacker') userCommIds = ['1', 'hacker_guild'];
      }

      // Merge userCommIds with localStorage local_joined_${targetProfileId}
      const localJoinedJson = localStorage.getItem(`local_joined_${targetProfileId}`);
      const localJoined = safeJsonParse(localJoinedJson);
      const mergedCommIds = Array.from(new Set([...userCommIds, ...localJoined]));

      const isOwner = activeUserId === targetProfileId;
      const friendsPool = ["me", "lucas", "alexandre", "orkut", "hacker"];
      const isFriend = friendsPool.includes(activeUserId) && friendsPool.includes(targetProfileId);

      const localFiltered = dbCommunities.filter(c => {
        if (!mergedCommIds.includes(c.id)) return false;
        if (isOwner || isFriend) return true;
        return !c.secureMode;
      });
      setDisplayedCommunities(localFiltered);
      setIsLoadingProfileComms(false);
    }, (err) => {
      console.warn("Error listening to profile communities. Falling back onto localStorage.", err);
      // Fallback
      let fallbackIds = ['1', '3'];
      if (targetProfileId === 'me' || targetProfileId === activeUserId) fallbackIds = ['1', '3', 'pendrive_perdido'];
      else if (targetProfileId === 'orkut') fallbackIds = ['1', '3', 'orkut_devs', '2'];
      else if (targetProfileId === 'alexandre') fallbackIds = ['1', '2', 'sec_pr'];
      else if (targetProfileId === 'hacker') fallbackIds = ['1', 'hacker_guild'];

      const localJoinedJson = localStorage.getItem(`local_joined_${targetProfileId}`);
      const localJoined = safeJsonParse(localJoinedJson);
      const mergedCommIds = Array.from(new Set([...fallbackIds, ...localJoined]));

      const isOwner = activeUserId === targetProfileId;
      const friendsPool = ["me", "lucas", "alexandre", "orkut", "hacker"];
      const isFriend = friendsPool.includes(activeUserId) && friendsPool.includes(targetProfileId);

      const localFiltered = dbCommunities.filter(c => {
        if (!mergedCommIds.includes(c.id)) return false;
        if (isOwner || isFriend) return true;
        return !c.secureMode;
      });
      setDisplayedCommunities(localFiltered);
      setIsLoadingProfileComms(false);
    });

    return () => {
      unsubscribe();
    };
  }, [targetProfileId, dbCommunities, activeUserId]);
  const [activeCommId, setActiveCommId] = useState<string | null>(
    activeCommunityId !== undefined ? activeCommunityId : null
  );

  useEffect(() => {
    if (activeCommunityId !== undefined) {
      setActiveCommId(activeCommunityId);
    }
  }, [activeCommunityId]);

  const handleSelectCommunity = (id: string | null) => {
    if (id) {
      console.log("SELECT COMMUNITY", id);
    }
    setActiveCommId(id);
    if (setActiveCommunityId) {
      setActiveCommunityId(id);
    }
  };
  const [activeComm, setActiveComm] = useState<any>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [activeMedia, setActiveMedia] = useState<ExternalMedia | null>(null);

  // Use a React Ref to prevent stale closures in real-time listeners without causing infinite re-render loops
  const activeTopicRef = useRef(activeTopic);
  useEffect(() => {
    activeTopicRef.current = activeTopic;
  }, [activeTopic]);

  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-time forum posts
  const [forumTopics, setForumTopics] = useState<Topic[]>([]);
  const [topicReplies, setTopicReplies] = useState<Reply[]>([]);
  const [repliesPage, setRepliesPage] = useState(1);
  const repliesPerPage = 20;

  // Modals Toggles

  // Check if current logged user is owner or moderator
  const isUserModerator = () => {
    if (!activeComm) return false;
    return activeComm.ownerId === activeUserId || 
           (activeComm.moderators && activeComm.moderators.includes(activeUserId)) || 
           activeUserId === 'me'; // Developer overall moderation bypass
  };

  const [showAdmissionModal, setShowAdmissionModal] = useState<string | null>(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<any | null>(null);
  const [isSubmittingAdmission, setIsSubmittingAdmission] = useState(false);
  const [admissionAnswers, setAdmissionAnswers] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [communityRequests, setCommunityRequests] = useState<any[]>([]);
  const [isClosingCreateModal, setIsClosingCreateModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showEditCommModal, setShowEditCommModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showRelatedCommsModal, setShowRelatedCommsModal] = useState(false);
  const [showModsPanel, setShowModsPanel] = useState(false);
  const [modAddSelectId, setModAddSelectId] = useState('');
  
  // Create / Edit Form states
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommCat, setNewCommCat] = useState('Nostalgia');
  const [newCommLang, setNewCommLang] = useState('Português');
  const [newCommType, setNewCommType] = useState('Pública');
  const [newCommSecureMode, setNewCommSecureMode] = useState(false);
  const [newCommAvatar, setNewCommAvatar] = useState('💬');
  const [newCommRules, setNewCommRules] = useState('');
  const [newCommAdmissionQuestionsText, setNewCommAdmissionQuestionsText] = useState('');

  // Post Thread Form states
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postLink, setPostLink] = useState('');
  const [postImg, setPostImg] = useState('');
  const [isPostingTopic, setIsPostingTopic] = useState(false);

  // Reply Form states
  const [replyContent, setReplyContent] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState('');

  // Scroll references for assistant scrolling + / -
  const membersScrollRef = useRef<HTMLDivElement>(null);
  const relatedScrollRef = useRef<HTMLDivElement>(null);
  const modalMembersScrollRef = useRef<HTMLDivElement>(null);
  const modalRelatedScrollRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editCommFileInputRef = useRef<HTMLInputElement>(null);
  const topicFileInputRef = useRef<HTMLInputElement>(null);

  // Categories list
  const CATEGORIES = [
    'Nostalgia', 'Humor', 'Tecnologia', 'Jogos', 'Internet Anos 2000', 
    'Escola', 'Filmes', 'Música', 'Memes', 'TV', 'Outros'
  ];

  // 1. Sync communities from Firestore in real-time (READ ONLY, NO SEEDING OR WRITING)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'communities'), (snapshot) => {
      console.log("COMMUNITIES SNAPSHOT SIZE", snapshot.size);
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id });
      });
      console.log("DB COMMUNITIES IDS", list.map(c => c.id));
      
      const localCommsJson = localStorage.getItem('local_communities');
      const localComms = safeJsonParse(localCommsJson);
      
      const mergedList = [...list];
      localComms.forEach((lc: any) => {
        if (!mergedList.some(c => c.id === lc.id)) {
          mergedList.push(lc);
        }
      });

      console.log("COMMUNITY OPEN", activeCommId);
      console.log("TOPICS", 0);
      console.log("ACTIVE TOPIC", activeTopic);
      console.log("CURRENT USER", currentUser);
      setDbCommunities(mergedList);

      // Auto-select starting community if set but missing
      if (activeCommId !== null && mergedList.length > 0 && !mergedList.find(c => c.id === activeCommId)) {
        handleSelectCommunity(mergedList[0].id);
      }
    }, (error) => {
      console.error("Error loading communities onSnapshot, falling back to local storage:", error);
      const localCommsJson = localStorage.getItem('local_communities');
      const localComms = safeJsonParse(localCommsJson);
      setDbCommunities(localComms);
    });

    return () => unsubscribe();
  }, []);

  // 2. Set active community and sync its sub-resource topics
  useEffect(() => {
    if (dbCommunities.length > 0) {
      const selected = dbCommunities.find(c => c.id === activeCommId);
      if (selected) {
        console.log("COMMUNITY OPEN", activeCommId);
        console.log("TOPICS", 0);
        console.log("ACTIVE TOPIC", activeTopic);
        console.log("CURRENT USER", currentUser);
        setActiveComm(selected);
      } else {
        console.log("COMMUNITY OPEN", activeCommId);
        console.log("TOPICS", 0);
        console.log("ACTIVE TOPIC", activeTopic);
        console.log("CURRENT USER", currentUser);
        setActiveComm(null);
      }
    } else {
      console.log("COMMUNITY OPEN", activeCommId);
      console.log("TOPICS", 0);
      console.log("ACTIVE TOPIC", activeTopic);
      console.log("CURRENT USER", currentUser);
      setActiveComm(null);
    }
  }, [activeCommId, dbCommunities]);

  // 3. Pending requests
  useEffect(() => {
    if (!activeUserId) return;
    const q = query(collection(db, 'community_requests'), where('userId', '==', activeUserId), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingRequests(snapshot.docs.map(doc => doc.data().communityId));
    });
    return unsubscribe;
  }, [activeUserId]);

  // Listener for incoming requests (for moderators)
  useEffect(() => {
    if (!activeCommId || !isUserModerator()) {
      setCommunityRequests([]);
      return;
    }
    const q = query(collection(db, 'community_requests'), where('communityId', '==', activeCommId), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCommunityRequests(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    return unsubscribe;
  }, [activeCommId, isUserModerator()]);

  // 3. Sync Topics for Active Community in real-time (READ ONLY, NO SEEDING)
  useEffect(() => {
    if (!activeCommId) return;

    const q = query(
      collection(db, 'community_topics'),
      where('communityId', '==', activeCommId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Topic[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Topic);
      });
      
      // Sort topics (pinned at top, then by date descending)
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      console.log("COMMUNITY OPEN", activeCommId);
      console.log("TOPICS", list.length);
      console.log("ACTIVE TOPIC", activeTopicRef.current);
      console.log("CURRENT USER", currentUser);
      setForumTopics(list);

      // Keep active topic synchronized if open
      const currentActive = activeTopicRef.current;
      if (currentActive) {
        const refreshed = list.find(t => t.id === currentActive.id);
        if (refreshed) {
          console.log("COMMUNITY OPEN", activeCommId);
          console.log("TOPICS", list.length);
          console.log("ACTIVE TOPIC", currentActive);
          console.log("CURRENT USER", currentUser);
          setActiveTopic(refreshed);
        }
      }
    }, (error) => {
      console.error("Error loading community topics onSnapshot:", error);
      setForumTopics([]);
    });

    return () => unsubscribe();
  }, [activeCommId]);

  // 4. Sync Replies for Active Topic in real-time (READ ONLY, NO SEEDING)
  useEffect(() => {
    if (!activeTopic) {
      setTopicReplies([]);
      return;
    }

    const q = query(
      collection(db, 'community_replies'),
      where('topicId', '==', activeTopic.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Reply[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Reply);
      });

      // Sort by message time ascending (classical forum chronological order)
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      setTopicReplies(list);
    }, (error) => {
      console.error("Error loading community replies onSnapshot:", error);
      setTopicReplies([]);
    });

    return () => unsubscribe();
  }, [activeTopic]);

  // Handle Joining or Leaving active community
  const handleToggleJoin = async () => {
    if (!activeComm) return;

    const isJoined = joinedIds.includes(activeComm.id);
    let updated: string[];

    if (isJoined) {
      // Leave
      updated = joinedIds.filter(id => id !== activeComm.id);
      if (onToggleJoinCommunity) {
        onToggleJoinCommunity(activeComm.id, false);
      }
      
      // Update members counter dynamically in Firestore
      try {
        await updateDoc(doc(db, 'communities', activeComm.id), {
          members: Math.max(0, (activeComm.members || 1) - 1)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `communities/${activeComm.id}`);
      }
    } else {
      // Join
      if (activeComm.admissionQuestions && activeComm.admissionQuestions.length > 0) {
        setShowAdmissionModal(activeComm.id);
        return;
      }
      // entrada normal

      updated = [...joinedIds, activeComm.id];
      if (onToggleJoinCommunity) {
        onToggleJoinCommunity(activeComm.id, true);
      }
      
      try {
        await updateDoc(doc(db, 'communities', activeComm.id), {
          members: (activeComm.members || 0) + 1
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `communities/${activeComm.id}`);
      }
    }

  // Call state update on parent App.tsx through the Firebase synchronization collection 'joined_communities'
    try {
      await setDoc(doc(db, 'joined_communities', activeUserId), { communityIds: updated });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `joined_communities/${activeUserId}`);
    }
  };

  const handleSubmitAdmissionRequest = async () => {
    if (!activeComm) return;

    // Validate answers
    const unanswered = activeComm.admissionQuestions?.some((q: any) => !admissionAnswers[q.id] || !admissionAnswers[q.id].trim());
    if (unanswered) {
      alert("Por favor, responda a todas as perguntas de admissão antes de enviar!");
      return;
    }

    setIsSubmittingAdmission(true);
    try {
      const requestData = {
        communityId: activeComm.id,
        communityName: activeComm.name,
        userId: activeUserId,
        userName: activeUserName,
        userPhoto: activeUserAvatar,
        status: 'pending',
        answers: activeComm.admissionQuestions.map((q: any) => ({
          question: q.question,
          answer: (admissionAnswers[q.id] || '').trim()
        })),
        createdAt: Date.now()
      };

      await addDoc(collection(db, 'community_requests'), requestData);

      // Create notification for owner and moderators
      const modIds = [...(activeComm.moderators || []), activeComm.ownerId];
      const uniqueModIds = Array.from(new Set(modIds)).filter(id => id && id !== 'me');

      for (const modId of uniqueModIds) {
        await addDoc(collection(db, 'community_notifications'), {
          targetUserId: modId,
          type: 'request',
          content: `Nova solicitação de entrada na comunidade ${activeComm.name} por ${activeUserName}`,
          communityId: activeComm.id,
          read: false,
          createdAt: Date.now()
        });
      }

      setShowAdmissionModal(null);
      setAdmissionAnswers({});
      alert("Solicitação enviada com sucesso. Aguardando aprovação da comunidade.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'community_requests');
    } finally {
      setIsSubmittingAdmission(false);
    }
  };

  const handleApproveRequest = async (req: any) => {
    try {
      // 1. Add communityId to user's joined_communities document
      const userJoinedDocRef = doc(db, 'joined_communities', req.userId);
      const userJoinedDoc = await getDoc(userJoinedDocRef);
      let userJoinedIds: string[] = [];
      if (userJoinedDoc.exists()) {
        userJoinedIds = userJoinedDoc.data().communityIds || [];
      }
      if (!userJoinedIds.includes(req.communityId)) {
        userJoinedIds.push(req.communityId);
        await setDoc(userJoinedDocRef, { communityIds: userJoinedIds });
      }

      // 2. Increment community members counter
      const commDocRef = doc(db, 'communities', req.communityId);
      await updateDoc(commDocRef, {
        members: increment(1)
      });

      // 3. Change request status to approved
      await updateDoc(doc(db, 'community_requests', req.id), {
        status: 'approved'
      });

      // 4. Create notification for applicant
      await addDoc(collection(db, 'community_notifications'), {
        targetUserId: req.userId,
        type: 'approval',
        content: `Sua solicitação de entrada na comunidade ${req.communityName} foi aprovada!`,
        communityId: req.communityId,
        read: false,
        createdAt: Date.now()
      });

      // Close details modal
      setViewingRequest(null);
      alert("Solicitação aprovada com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'community_requests');
    }
  };

  const handleRejectRequest = async (req: any) => {
    try {
      // 1. Change request status to rejected
      await updateDoc(doc(db, 'community_requests', req.id), {
        status: 'rejected'
      });

      // 2. Create notification for applicant
      await addDoc(collection(db, 'community_notifications'), {
        targetUserId: req.userId,
        type: 'rejection',
        content: `Sua solicitação de entrada na comunidade ${req.communityName} foi recusada.`,
        communityId: req.communityId,
        read: false,
        createdAt: Date.now()
      });

      // Close details modal
      setViewingRequest(null);
      alert("Solicitação recusada com sucesso.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'community_requests');
    }
  };



  // Filter communities by search
  const filteredCommunities = dbCommunities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Active community similarity / related list (same category or similar)
  const relatedCommunities = dbCommunities.filter(c => 
    c.id !== activeCommId && 
    (c.category === activeComm?.category || c.description.toLowerCase().includes('segur') || c.name.toLowerCase().includes('odeio') || Math.random() > 0.6)
  ).slice(0, 5);

  // Get current community members
  const getCommunityMembers = () => {
    // Generate simulated members + real joined identities
    const baseList = [...MOCK_OR_EXTRA_MEMBERS];
    
    // Add logged user if joined
    if (joinedIds.includes(activeCommId)) {
      const isAlready = baseList.some(m => m.id === activeUserId);
      if (!isAlready) {
        baseList.unshift({
          id: activeUserId,
          name: activeUserName,
          avatar: activeUserAvatar,
          location: 'Meu computador'
        });
      }
    }

    // Always ensure Owner of that community is first
    if (activeComm?.ownerId) {
      const ownerIndex = baseList.findIndex(m => m.id === activeComm.ownerId);
      if (ownerIndex > -1) {
        const ownerObj = baseList.splice(ownerIndex, 1)[0];
        baseList.unshift(ownerObj);
      }
    }

    return baseList;
  };

  const communityMembers = getCommunityMembers();
  const totalMembresiaExibicao = (activeComm?.members || 2847);

  // Scroll assistant function for scrollable boxes
  const handleSmoothScroll = (ref: React.RefObject<HTMLDivElement>, direction: 'up' | 'down') => {
    if (ref.current) {
      const scrollStep = 180;
      ref.current.scrollBy({
        top: direction === 'up' ? -scrollStep : scrollStep,
        behavior: 'smooth'
      });
    }
  };

  // Base64 file format converter for dynamic community avatar/capa
  const handleImageUploadReader = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'topicImage' | 'editAvatar') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Apenas JPG, PNG, WEBP ou GIF são suportados chapa!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const resultString = event.target.result as string;
        if (target === 'avatar') {
          setNewCommAvatar(resultString);
        } else if (target === 'topicImage') {
          setPostImg(resultString);
        } else if (target === 'editAvatar') {
          // Only community owner or moderators are allowed to change community photos/avatars
          if (!isUserModerator()) {
            alert("Operação não permitida: Apenas o dono ou os moderadores podem alterar a foto da comunidade!");
            return;
          }
          // Update immediately or save in state
          updateDoc(doc(db, 'communities', activeCommId), { avatar: resultString }).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `communities/${activeCommId}`);
          });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Action: Create New Community
  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Botão Salvar clicado");

    if (!newCommName.trim()) {
      console.warn("Validação falhou: nome da comunidade vazio");
      return;
    }

    const creatorUid = auth.currentUser?.uid;
    if (!creatorUid) {
      console.error("CREATE COMMUNITY ERROR: No authenticated Firebase user UID found!");
      alert("Você precisa estar autenticado no Firebase para criar uma comunidade.");
      return;
    }

    console.log("Validação passou");
    console.log("Iniciando criação da comunidade para o UID autenticado:", creatorUid);

    // Start 1.5s transition immediately
    setIsClosingCreateModal(true);

    const newId = 'comm_' + Math.random().toString(36).substr(2, 9);
    
    const communityData = {
      id: newId,
      name: newCommName,
      description: newCommDesc,
      members: 1, // creator is member
      avatar: newCommAvatar || '📁',
      category: newCommCat,
      language: newCommLang,
      type: newCommType,
      secureMode: newCommSecureMode,
      ownerId: creatorUid,
      moderators: [creatorUid],
      createdAt: new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', ''),
      rules: newCommRules || '1. Respeite todos os membros.\n2. Sem spam.',
      admissionQuestions: newCommAdmissionQuestionsText
        .split('\n')
        .filter(q => q.trim())
        .map((q, i) => ({ id: `q${i}`, question: q.trim(), type: 'text' }))
    };

    try {
      console.log("AUTH UID:", creatorUid);
      console.log("OWNER ID:", communityData.ownerId);
      console.log("COMMUNITY DATA TO WRITE:", communityData);
      console.log("Escrevendo documento de comunidade no Firestore para ID:", newId);
      await setDoc(doc(db, 'communities', newId), communityData);
      console.log("CREATE COMMUNITY SUCCESS", newId);
      console.log("- communityId criado:", newId);
      console.log("Documento enviado ao Firestore");
    } catch (error) {
      console.error("CREATE COMMUNITY ERROR:", error);
      console.warn("Firestore write for community failed, saving to local storage fallback instead:", error);
      const localCommsJson = localStorage.getItem('local_communities');
      const localComms = safeJsonParse(localCommsJson);
      localComms.push(communityData);
      localStorage.setItem('local_communities', JSON.stringify(localComms));
      
      // Merge instantly into local dbCommunities state
      setDbCommunities(prev => {
        if (!prev.some(c => c.id === newId)) {
          return [...prev, communityData];
        }
        return prev;
      });
    }

    try {
      // Autojoin newly created community using arrayUnion to prevent duplication
      const joinedRef = doc(db, 'joined_communities', creatorUid);
      await setDoc(joinedRef, { communityIds: arrayUnion(newId) }, { merge: true });
      console.log("- resultado do update em joined_communities: SUCCESS");

      // Fetch the updated communityIds document to show the new content
      const updatedSnap = await getDoc(joinedRef);
      const newCommunityIds = updatedSnap.exists() ? (updatedSnap.data()?.communityIds || []) : [];
      console.log("- novo conteúdo de communityIds:", JSON.stringify(newCommunityIds));
    } catch (err) {
      console.warn("Firestore joined_communities list update failed, autojoining locally:", err);
    } finally {
      const localJoinedJson = localStorage.getItem(`local_joined_${creatorUid}`);
      const localJoined = safeJsonParse(localJoinedJson);
      localJoined.push(newId);
      localStorage.setItem(`local_joined_${creatorUid}`, JSON.stringify(Array.from(new Set(localJoined))));
      
      // Force update of displayedCommunities instantly for crisp reactivity
      setDisplayedCommunities(prev => {
        if (!prev.some(c => c.id === newId)) {
          return [...prev, communityData];
        }
        return prev;
      });

      // Reset forms (hold the modal close until transition completes)
      setTimeout(() => {
        setIsClosingCreateModal(false);
        setShowCreateModal(false);
        setActiveCommId(newId);
        
        setNewCommName('');
        setNewCommDesc('');
        setNewCommAvatar('💬');
        setNewCommRules('');
        setNewCommSecureMode(false);
      }, 1500);
    }
  };

  // Action: Create New Topic Thread
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
        return;
    }

    let externalMedia;
    if (postLink.trim()) {
      externalMedia = await detectExternalMedia(postLink.trim());
    }

    const topicId = 'top_' + Math.random().toString(36).substr(2, 9);
    const newTopic: any = {
      id: topicId,
      communityId: activeCommId,
      title: postTitle,
      content: postContent,
      authorId: activeUserId,
      authorName: activeUserName,
      authorAvatar: activeUserAvatar,
      createdAt: new Date().toISOString(),
      views: 1,
      repliesCount: 0,
      isPinned: false
    };

    if (postImg) newTopic.imageUrl = postImg;
    if (externalMedia) newTopic.externalMedia = externalMedia;

    try {
      await setDoc(doc(db, 'community_topics', topicId), newTopic);
      setIsPostingTopic(false);
      setPostTitle('');
      setPostContent('');
      setPostImg('');
      setPostLink('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `community_topics/${topicId}`);
    }
  };

  // Action: Add Reply to Thread
  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeTopic) return;

    const replyId = 'rep_' + Math.random().toString(36).substr(2, 9);
    const newReply: Reply = {
      id: replyId,
      topicId: activeTopic.id,
      communityId: activeCommId,
      content: replyContent,
      authorId: activeUserId,
      authorName: activeUserName,
      authorAvatar: activeUserAvatar,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: []
    };

    try {
      await setDoc(doc(db, 'community_replies', replyId), newReply);
      
      // Update replies count in main topic document
      await updateDoc(doc(db, 'community_topics', activeTopic.id), {
        repliesCount: (activeTopic.repliesCount || 0) + 1
      });

      // Save a retro notification into DB if author of the thread is online
      if (activeTopic.authorId !== activeUserId) {
        const notifId = 'not_' + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'community_notifications', notifId), {
          id: notifId,
          targetUserId: activeTopic.authorId,
          type: 'reply',
          content: `${activeUserName} respondeu seu tópico "${activeTopic.title}" na comunidade ${activeComm?.name}`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }

      setReplyContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `community_replies/${replyId}`);
    }
  };

  // Action: Edit Reply
  const handleSaveEditedReply = async (replyId: string) => {
    if (!editingReplyText.trim()) return;

    try {
      await updateDoc(doc(db, 'community_replies', replyId), {
        content: editingReplyText
      });
      setEditingReplyId(null);
      setEditingReplyText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `community_replies/${replyId}`);
    }
  };

  // Action: Delete Reply
  const handleDeleteReply = async (reply: Reply) => {
    if (!window.confirm("Deseja realmente apagar esta resposta?")) return;

    try {
      await deleteDoc(doc(db, 'community_replies', reply.id));
      
      // Decrement replies Count in Topic
      if (activeTopic) {
        await updateDoc(doc(db, 'community_topics', activeTopic.id), {
          repliesCount: Math.max(0, (activeTopic.repliesCount || 1) - 1)
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `community_replies/${reply.id}`);
    }
  };

  // Action: Like Reply
  const handleLikeReply = async (reply: Reply) => {
    const isLiked = reply.likedBy?.includes(activeUserId) || false;
    let newLikedBy = reply.likedBy || [];
    
    if (isLiked) {
      newLikedBy = newLikedBy.filter(uid => uid !== activeUserId);
    } else {
      newLikedBy = [...newLikedBy, activeUserId];
    }

    try {
      await updateDoc(doc(db, 'community_replies', reply.id), {
        likedBy: newLikedBy,
        likes: newLikedBy.length
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `community_replies/${reply.id}`);
    }
  };

  // Action: Toggle Pinned state of Topic (Moderators/Owners only)
  const handleTogglePinTopic = async (topic: Topic) => {
    try {
      await updateDoc(doc(db, 'community_topics', topic.id), {
        isPinned: !topic.isPinned
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `community_topics/${topic.id}`);
    }
  };

  // Action: Delete Topic (Moderators/Owners only)
  const handleDeleteTopic = async (topicId: string) => {
    if (!window.confirm("Atenção: Apagar o tópico também excluirá suas respostas. Confirmar exclusão?")) return;

    try {
      await deleteDoc(doc(db, 'community_topics', topicId));
      
      // Close active topic view if open
      if (activeTopic?.id === topicId) {
        setActiveTopic(null);
      }

      // Read replies and prune them
      const q = query(collection(db, 'community_replies'), where('topicId', '==', topicId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (repDoc) => {
        await deleteDoc(doc(db, 'community_replies', repDoc.id));
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `community_topics/${topicId}`);
    }
  };

  // Check if current user is owner
  const isUserOwner = () => {
    if (!activeComm) return false;
    return activeComm.ownerId === activeUserId || activeUserId === 'me';
  };

  // Action: Edit Community Details
  const handleSaveCommunityEdits = async () => {
    if (!activeComm) return;

    const isOwner = isUserOwner();
    const isMod = isUserModerator();

    if (!isOwner && !isMod) {
      alert("Operação não permitida: Você não tem permissão para editar esta comunidade.");
      return;
    }

    // Find original community in database copy before edit took place
    const originalComm = dbCommunities.find(c => c.id === activeCommId);
    let targetName = activeComm.name;

    // NOMES DE COMUNIDADES SÓ POSSIVEL ALTERAÇÃO PELO ( DONO) Da comunidade.
    if (originalComm && originalComm.name !== activeComm.name) {
      if (!isOwner) {
        alert("Operação não permitida: Apenas o dono (proprietário) da comunidade possui permissão para alterar seu nome!");
        targetName = originalComm.name;
      }
    }

    // Close the modal instantly upon clicking Save Changes!
    setShowConfirmDelete(false);
    setShowEditCommModal(false);

    try {
      await updateDoc(doc(db, 'communities', activeCommId), {
        description: activeComm.description,
        rules: activeComm.rules || '',
        name: targetName,
        avatar: activeComm.avatar || '💬',
        category: activeComm.category || 'Nostalgia'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `communities/${activeCommId}`);
    }
  };

  // Resolve complete information for moderators list
  const getModeratorsList = () => {
    if (!activeComm) return [];
    const list: any[] = [];
    
    // 1. Resolve Owner info
    const ownerId = activeComm.ownerId;
    if (ownerId) {
      const foundInProfiles = profiles[ownerId];
      if (foundInProfiles) {
        list.push({
          id: ownerId,
          name: foundInProfiles.nome_exibicao || foundInProfiles.name,
          avatar: foundInProfiles.avatar,
          type: 'Proprietário',
          joinedAt: activeComm.createdAt || 'Maio de 2004'
        });
      } else {
        const foundInMembers = communityMembers.find(m => m.id === ownerId);
        list.push({
          id: ownerId,
          name: foundInMembers?.name || (ownerId === 'me' ? activeUserName : 'Proprietário'),
          avatar: foundInMembers?.avatar || (ownerId === 'me' ? activeUserAvatar : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
          type: 'Proprietário',
          joinedAt: activeComm.createdAt || 'Maio de 2004'
        });
      }
    }
    
    // 2. Resolve additional moderators from activeComm.moderators
    const extraModIds = (activeComm.moderators || []).filter((id: string) => id !== ownerId);
    
    extraModIds.forEach((id: string) => {
      const foundInProfiles = profiles[id];
      if (foundInProfiles) {
        list.push({
          id,
          name: foundInProfiles.nome_exibicao || foundInProfiles.name,
          avatar: foundInProfiles.avatar,
          type: 'Moderador',
          joinedAt: 'Junho de 2004'
        });
      } else {
        const foundInMembers = communityMembers.find(m => m.id === id);
        list.push({
          id,
          name: foundInMembers?.name || (id === 'me' ? activeUserName : `Moderador Retro (${id})`),
          avatar: foundInMembers?.avatar || (id === 'me' ? activeUserAvatar : 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150'),
          type: 'Moderador',
          joinedAt: 'Junho de 2004'
        });
      }
    });

    return list;
  };

  // Promote member to moderator (Limit 5 extra moderators)
  const handleAddModerator = async (memberId: string) => {
    if (!activeComm) return;
    if (!memberId) return;

    // Filter out active community owner from additional moderators count
    const extraMods = (activeComm.moderators || []).filter((id: string) => id !== activeComm.ownerId);
    if (extraMods.length >= 5) {
      alert("Limite máximo de moderadores atingido (máximo de 5).");
      return;
    }

    try {
      const currentMods = activeComm.moderators || [];
      if (currentMods.includes(memberId)) {
        alert("Este usuário já é um moderador.");
        return;
      }

      const newMods = [...currentMods, memberId];
      await updateDoc(doc(db, 'communities', activeComm.id), {
        moderators: newMods
      });
      setModAddSelectId(''); // Reset select field
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `communities/${activeComm.id}`);
    }
  };

  // Revoke moderator permissions
  const handleRemoveModerator = async (memberId: string) => {
    if (!activeComm) return;
    if (memberId === activeComm.ownerId) {
      alert("Não é possível remover privilégios de moderação do proprietário.");
      return;
    }
    const memberName = communityMembers.find(m => m.id === memberId)?.name || memberId;
    if (!window.confirm(`Deseja remover as permissões de moderador de ${memberName}?`)) return;

    try {
      const currentMods = activeComm.moderators || [];
      const newMods = currentMods.filter((id: string) => id !== memberId);
      await updateDoc(doc(db, 'communities', activeComm.id), {
        moderators: newMods
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `communities/${activeComm.id}`);
    }
  };

  // Ban community member (Removes from community and mods, blocks rejoining)
  const handleBanMember = async (memberId: string) => {
    if (!activeComm) return;
    if (memberId === activeComm.ownerId) {
      alert("Você não pode banir o proprietário da comunidade!");
      return;
    }
    const memberName = communityMembers.find(m => m.id === memberId)?.name || memberId;
    if (!window.confirm(`Tem certeza de que deseja banir ${memberName} desta comunidade?`)) return;

    try {
      const currentBanned = activeComm.bannedMembers || [];
      if (currentBanned.includes(memberId)) return;
      const newBanned = [...currentBanned, memberId];
      
      const newMods = (activeComm.moderators || []).filter((id: string) => id !== memberId);
      
      // Force exit community join list if active user is being banned
      if (memberId === activeUserId && onToggleJoinCommunity) {
        onToggleJoinCommunity(activeComm.id, false);
      }

      await updateDoc(doc(db, 'communities', activeComm.id), {
        bannedMembers: newBanned,
        moderators: newMods,
        members: Math.max(1, (activeComm.members || 1) - 1)
      });
      
      alert(`${memberName} foi banido com sucesso.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `communities/${activeComm.id}`);
    }
  };

  // Unban community member
  const handleUnbanMember = async (memberId: string) => {
    if (!activeComm) return;
    try {
      const currentBanned = activeComm.bannedMembers || [];
      const newBanned = currentBanned.filter((id: string) => id !== memberId);
      
      await updateDoc(doc(db, 'communities', activeComm.id), {
        bannedMembers: newBanned
      });
      alert("Usuário desbanido.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `communities/${activeComm.id}`);
    }
  };

  // Close / Delete Community permanently
  const handleCloseCommunity = async () => {
    if (!activeComm) return;

    try {
      const commIdToDelete = activeCommId;
      // 1. Delete associated topics and replies
      const topicsQuery = query(collection(db, 'community_topics'), where('communityId', '==', commIdToDelete));
      const topicsSnapshot = await getDocs(topicsQuery);
      
      for (const tDoc of topicsSnapshot.docs) {
        await deleteDoc(doc(db, 'community_topics', tDoc.id));
        const repliesQuery = query(collection(db, 'community_replies'), where('topicId', '==', tDoc.id));
        const repliesSnapshot = await getDocs(repliesQuery);
        for (const rDoc of repliesSnapshot.docs) {
          await deleteDoc(doc(db, 'community_replies', rDoc.id));
        }
      }

      // 2. Delete the parent community document
      await deleteDoc(doc(db, 'communities', commIdToDelete!));
      
      // 3. Clear states
      setShowConfirmDelete(false);
      setShowEditCommModal(false);
      setActiveCommId(null);
      if (setActiveCommunityId) {
        setActiveCommunityId(null);
      }
      setActiveTopic(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `communities/${activeCommId}`);
    }
  };

  // Lock Topic status
  const handleToggleLockTopic = async (topic: Topic) => {
    try {
      await updateDoc(doc(db, 'community_topics', topic.id), {
        isLocked: !topic.isLocked
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `community_topics/${topic.id}`);
    }
  };

  // Toggle Approved Status on Topic
  const handleToggleApproveTopic = async (topic: Topic) => {
    try {
      await updateDoc(doc(db, 'community_topics', topic.id), {
        isApproved: !topic.isApproved
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `community_topics/${topic.id}`);
    }
  };

  // Find current user profile
  const myProfile: any = profiles[targetProfileId] || profiles['me'] || Object.values(profiles)[0] || {
    name: activeUserName,
    avatar: activeUserAvatar,
    username: 'scrapzone_mender',
    location: 'Curitiba, PR - Brasil',
    theme: 'default',
    nome_exibicao: '',
    estilo_fonte: 'default'
  };

  const themeStyles = getThemeStyles(myProfile.theme || 'default');
  const isOwnProfile = targetProfileId === activeUserId;
  const displayNameText = myProfile.nome_exibicao && myProfile.nome_exibicao.trim() ? myProfile.nome_exibicao.trim() : myProfile.name;
  const displayNameClass = myProfile.nome_exibicao && myProfile.nome_exibicao.trim() ? getFontStyleClass(myProfile.estilo_fonte) : 'font-sans';

  // Render Pinned Star icon or pin logo
  const isJoined = activeComm ? joinedIds.includes(activeComm.id) : false;

  return (
    <div id="scrapzone-communities-main" className={`flex flex-col gap-4 font-sans text-left max-w-7xl mx-auto w-full p-4 rounded-lg ${themeStyles.communitiesBg}`}>
      
      {/* 1. TOP HEADER & SEARCH SEARCH BAR - Match Mockup styling */}
      <div 
        className={`border border-neutral-300 rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
          myProfile.theme === 'minimal-oldweb' 
            ? 'bg-gradient-to-r from-[#18237c] to-[#2480cf]' 
            : 'bg-[#dee7f4]'
        }`}
      >
        
        {/* Page title and nostalgic brand tagline */}
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-1.5 leading-none ${
            myProfile.theme === 'rock-underground' ? '!text-[#deda26]' : (myProfile.theme === 'minimal-oldweb' ? 'text-white' : 'text-neutral-800')
          }`}>
            👥 Comunidades
          </h2>
          <p className={`text-[10px] font-sans mt-1 ${
            myProfile.theme === 'minimal-oldweb' ? 'text-[#00ffcc] font-semibold' : 'text-neutral-500'
          }`}>
            Volte para a era MSN / Orkut das comunidades clássicas do Brasil.
          </p>
        </div>

        {/* Global actions: Search input and Create button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded border border-neutral-300 bg-white shadow-inner overflow-hidden">
            <input
              id="comm-mockup-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar comunidade"
              className="px-2.5 py-1 text-xs w-[240px] focus:outline-none placeholder-neutral-400 text-neutral-700"
            />
            <button className="bg-[#dee7f4] px-3 hover:bg-neutral-200 border-l border-neutral-300 text-neutral-600 transition-colors">
              <Search size={14} className="stroke-[2.5]" />
            </button>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-pink-600 text-white font-extrabold text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm shadow border border-pink-700 hover:bg-pink-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle size={13} className="stroke-[3]" />
            Criar Comunidade
          </button>
        </div>

      </div>

      {/* Grid of All matching or filtered communities if we are not looking at a detail profile, styled as a handy scroller before active */}
      {searchQuery && (
        <div className="bg-[#f0f4fa] border-2 border-dashed border-neutral-300 rounded p-3">
          <h3 className="text-xs font-bold text-neutral-600 mb-2 uppercase tracking-tight">
            Resultados de Busca ({filteredCommunities.length}):
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredCommunities.map(comm => (
              <div 
                key={comm.id}
                onClick={() => {
                  setActiveCommId(comm.id);
                  setActiveTopic(null);
                  setSearchQuery('');
                }}
                className={`bg-white border rounded p-2 flex items-center gap-3.5 hover:border-pink-400 cursor-pointer transition-all shadow-sm ${themeStyles.bg.includes('bg-checkerboard') ? 'bg-[#0c4b24] border-[#0ef46f] text-[#16fc21]' : 'bg-white'}`}
              >
                <div className="w-10 h-10 rounded bg-[#eff6ff] flex items-center justify-center text-xl shadow-inner border overflow-hidden">
                  {comm.avatar && comm.avatar.startsWith('data:') ? (
                    <img src={comm.avatar} alt={comm.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{comm.avatar || '👥'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-xs font-bold ${themeStyles.bg.includes('bg-checkerboard') ? 'text-[#16fc21]' : 'text-indigo-900'} truncate`}>{comm.name}</h4>
                  <p className={`text-[9.5px] ${themeStyles.bg.includes('bg-checkerboard') ? 'text-[#16fc21]' : 'text-neutral-400'} truncate`}>{comm.description}</p>
                  <span className="text-[8.5px] font-mono text-pink-600 font-bold bg-pink-50 px-1 rounded">
                    {comm.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeComm ? (
        (activeComm.bannedMembers && activeComm.bannedMembers.includes(activeUserId)) ? (
          <div className="bg-red-50 border-4 border-red-350 rounded p-8 max-w-lg mx-auto text-center my-12 font-sans shadow-xl">
            <span className="text-5xl block">🚫</span>
            <h2 className="text-red-900 font-extrabold text-lg mt-4 uppercase tracking-tight">Acesso Bloqueado!</h2>
            <p className="text-red-700 text-xs mt-2 leading-relaxed font-sans">
              Você foi banido desta comunidade por um de seus Moderadores ou pelo Proprietário. Seu acesso aos tópicos e discussões foi bloqueado permanentemente de acordo com as regras de convivência.
            </p>
            <button 
              onClick={() => handleSelectCommunity(null)}
              className="mt-6 bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded text-xs transition-all tracking-tight cursor-pointer shadow-md"
            >
              Voltar para Minhas Comunidades
            </button>
          </div>
        ) : (
        <div className="flex flex-col gap-3">
          {/* Back button to Minhas Comunidades list */}
          <div className="text-left select-none">
            <button
              onClick={() => handleSelectCommunity(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border-2 border-neutral-300 rounded-lg text-xs font-extrabold text-neutral-700 tracking-tight transition-all cursor-pointer font-sans shadow-xs"
            >
              <ArrowLeft size={13} className="stroke-[3]" />
              <span>◀ Voltar para Minhas Comunidades</span>
            </button>
          </div>

          {/* 2. THE THREE-COLUMN LAYOUT - Core Requirement */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* ================= COLUMN 1 (LEFT): PHOTO AND META INFO ================= */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* A. PHOTO BOX */}
            <div className="bg-white border-2 border-neutral-300 rounded p-2.5 shadow-sm text-center flex flex-col items-center">
              
              <div className="w-full aspect-square bg-[#dee7f4] rounded-sm border-2 border-dashed border-neutral-400 overflow-hidden relative flex items-center justify-center text-8xl shadow-inner group">
                
                {activeComm.avatar && activeComm.avatar.startsWith('data:') ? (
                  <img src={activeComm.avatar} alt="Nostalgia" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : activeComm.avatar && (activeComm.avatar.startsWith('http://') || activeComm.avatar.startsWith('https://')) ? (
                  <img src={activeComm.avatar} alt="Community avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="select-none filter drop-shadow font-sans pr-2">
                    {activeComm.avatar || '⏰'}
                  </span>
                )}
                
                {/* Upload override trigger overlay if user has moderation role */}
                {isUserModerator() && (
                  (() => {
                    const isRealCommImage = activeComm.avatar && (
                      activeComm.avatar.startsWith('data:') ||
                      activeComm.avatar.startsWith('http://') ||
                      activeComm.avatar.startsWith('https://') ||
                      activeComm.avatar.startsWith('/')
                    );

                    return isRealCommImage ? (
                      /* COM FOTO: Floating menu, semi-transparent, only shows on hover */
                      <div 
                        className="absolute bottom-2.5 left-2.5 right-2.5 h-8 bg-black/25 backdrop-blur-xs border border-white/10 rounded-full flex items-center justify-between px-3 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 select-none font-sans"
                      >
                        <button 
                          type="button"
                          onClick={() => editCommFileInputRef.current?.click()}
                          className="text-[9px] font-black uppercase tracking-wider text-left hover:text-pink-300 flex items-center gap-1 cursor-pointer bg-transparent border-none text-white p-0 outline-none"
                        >
                          Alterar Foto <Camera size={10} />
                        </button>
                        <button 
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Deseja realmente remover a foto da comunidade?')) {
                              try {
                                await updateDoc(doc(db, 'communities', activeCommId), { avatar: '⏰' });
                              } catch (err) {
                                handleFirestoreError(err, OperationType.WRITE, `communities/${activeCommId}`);
                              }
                            }
                          }}
                          title="Remover Foto"
                          className="text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center outline-none"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ) : (
                      /* SEM FOTO: Menu visible by default, semi-transparent */
                      <div 
                        onClick={() => editCommFileInputRef.current?.click()}
                        className="absolute bottom-2.5 left-2.5 right-2.5 h-8 bg-[#1e293b]/70 backdrop-blur-xs border border-white/10 rounded-full flex items-center justify-between px-3 text-white cursor-pointer select-none font-sans hover:bg-black/45 active:scale-[0.98] transition-all"
                      >
                        <span className="text-[9.5px] font-black uppercase tracking-wide flex items-center gap-1.5">📷 Adicionar Foto</span>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Hidden file selector tag */}
              <input 
                type="file"
                ref={editCommFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageUploadReader(e, 'editAvatar')}
              />

              {isUserModerator() && (
                <button 
                  onClick={() => setShowEditCommModal(true)}
                  className="mt-2 text-[9px] font-bold text-neutral-500 hover:text-black flex items-center gap-1 cursor-pointer bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded"
                >
                  <Settings size={10} />
                  Editar Dados da Comunidade
                </button>
              )}

            </div>

            {/* B. DETAILED INFORMACÕES INFO CARD (Light blue/purple retro table styling) */}
            <div className="bg-white border-2 border-neutral-300 rounded p-3 shadow-sm flex flex-col gap-1 font-sans text-[11px]">
              
              <div className="grid grid-cols-2 gap-y-2 text-left">
                
                {/* Category */}
                <div>
                  <span className="block text-[9px] font-extrabold text-pink-600 uppercase">Categoria:</span>
                  <span className="font-bold text-indigo-950 font-sans">{activeComm.category || 'Nostalgia'}</span>
                </div>

                {/* Total Members */}
                <div>
                  <span className="block text-[9px] font-extrabold text-pink-600 uppercase">Membros:</span>
                  <span className="font-bold text-neutral-800 font-mono">{totalMembresiaExibicao}</span>
                </div>

                {/* Create/Launch Date */}
                <div className="border-t border-neutral-100 pt-1.5">
                  <span className="block text-[9px] font-extrabold text-pink-600 uppercase">Criada em:</span>
                  <span className="font-bold text-neutral-600">{activeComm.createdAt || 'Jan 2025'}</span>
                </div>

                {/* Language */}
                <div className="border-t border-neutral-100 pt-1.5">
                  <span className="block text-[9px] font-extrabold text-pink-600 uppercase">Idioma:</span>
                  <span className="font-bold text-neutral-600">{activeComm.language || 'Português'}</span>
                </div>

                {/* Type block */}
                <div className="col-span-2 border-t border-dashed border-neutral-200 pt-1.5">
                  <span className="block text-[9px] font-extrabold text-pink-600 uppercase">Tipo:</span>
                  <span className="font-bold text-neutral-700 flex items-center gap-1 mt-0.5">
                    {activeComm.secureMode ? (
                      <span className="bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200 px-1.5 py-0.5 rounded text-[8.5px] font-black flex items-center gap-0.5">
                        <Lock size={9} /> PRIVADA (CRIPTOGRAFADA)
                      </span>
                    ) : (
                      <span className="bg-blue-50 text-blue-800 border border-blue-100 px-1.5 py-0.5 rounded text-[8.5px] font-black flex items-center gap-0.5">
                        <Globe size={9} /> PÚBLICA
                      </span>
                    )}
                  </span>
                </div>

              </div>

            </div>

          </div>

          {/* ================= COLUMN 2 (CENTER): MAIN HEADER, ACTION BUTTONS & FORUM ================= */}
          <div className="lg:col-span-6 flex flex-col gap-4">

            {/* A. CABEÇALHO DA COMUNIDADE (Community Title & Description box) */}
            <div className="bg-white border border-neutral-300 rounded p-4 shadow-sm flex flex-col gap-2 relative">
              
              <div className="flex justify-between items-start">
                <h1 className="text-lg md:text-xl font-bold font-sans text-[#1d4ed8] uppercase tracking-wide">
                  {activeComm.name}
                </h1>
              </div>

              <p className="text-xs md:text-[13px] text-neutral-700 leading-relaxed font-sans pr-2">
                {activeComm.description}
              </p>

              {/* B. ACTION BUTTONS ROW */}
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-dashed border-neutral-200">
                
                <button 
                  onClick={() => setShowRulesModal(true)}
                  className="bg-[#cbd5e1] hover:bg-[#b8c9df] text-neutral-800 border border-neutral-400 rounded px-4 py-1 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Info size={13} />
                  Regras
                </button>

                <button 
                  onClick={handleToggleJoin}
                  disabled={pendingRequests.includes(activeComm.id)}
                  className={`border font-bold rounded px-4 py-1 text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer ${
                    pendingRequests.includes(activeComm.id)
                      ? 'bg-neutral-100 border-neutral-300 text-neutral-500 cursor-not-allowed'
                      : isJoined 
                        ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100' 
                        : 'bg-green-600 border-green-700 text-white hover:bg-green-700'
                  }`}
                >
                  {pendingRequests.includes(activeComm.id) ? (
                    <>
                      <AlertCircle size={13} />
                      Solicitação Pendente
                    </>
                  ) : isJoined ? (
                    <>
                      <LogOut size={13} />
                      Sair da Comunidade
                    </>
                  ) : (
                    <>
                      <Users size={13} />
                      Participar
                    </>
                  )}
                </button>

                <button 
                  disabled={!isJoined}
                  onClick={() => {
                    setIsPostingTopic(!isPostingTopic);
                    setActiveTopic(null); // Close topic details
                  }}
                  className={`font-semibold rounded px-4 py-1 text-xs transition-all shadow-sm flex items-center gap-1 text-[#0f172a] border border-neutral-400 bg-white hover:bg-neutral-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <PlusCircle size={13} className="text-[#10b981]" />
                  Postar
                </button>

                {isUserModerator() && (
                  <button
                    onClick={() => setShowRequestsModal(true)}
                    className={`font-bold rounded px-4 py-1.5 text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                      communityRequests.length > 0 
                        ? 'bg-pink-600 hover:bg-pink-700 border border-pink-700 text-white shadow-[0_0_15px_rgba(236,72,153,0.7)] animate-pulse' 
                        : 'bg-white hover:bg-neutral-100 border border-neutral-400 text-neutral-700'
                    }`}
                  >
                    <Bell size={13} className={communityRequests.length > 0 ? 'text-white fill-white' : 'text-neutral-500'} />
                    AVISO {communityRequests.length > 0 && communityRequests.length}
                  </button>
                )}

              </div>

            </div>

            {/* C. TOPIC CREATION FORM (COLLAPSED OR EXPANDED STATE) */}
            {isPostingTopic && isJoined && (
              <div className="bg-white border-2 border-pink-400 rounded p-4 shadow-md text-left anim-fade">
                <h2 className="text-xs font-extrabold uppercase text-pink-600 border-b pb-1.5 mb-3.5 flex items-center justify-between">
                  <span>📝 Novo Tópico no Fórum</span>
                  <button 
                    onClick={() => setIsPostingTopic(false)}
                    className="hover:text-red-500 font-bold font-mono"
                  >
                    fechar (x)
                  </button>
                </h2>

                <form onSubmit={handleCreateTopic} className="flex flex-col gap-3 text-xs">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">TÍTULO DO TÓPICO:</label>
                    <input
                      id="forum-topic-title-input"
                      type="text"
                      required
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Ex: Quem mais odeia o barulho do despertador?"
                      className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">LINK DE VÍDEO OU MÚSICA (OPCIONAL):</label>
                    <input
                      type="url"
                      value={postLink}
                      onChange={(e) => setPostLink(e.target.value)}
                      placeholder="Cole um link do YouTube, Spotify ou SoundCloud..."
                      className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">MENSAGEM:</label>
                    <textarea
                      id="forum-topic-content-input"
                      required
                      rows={4}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Escreva seu ponto de vista para iniciar o debate..."
                      className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-pink-500 font-sans"
                    />
                  </div>

                  {/* Optional Image uploaded manually via reader */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">IMAGEM OPCIONAL (ANEXO):</label>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => topicFileInputRef.current?.click()}
                        className="bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded font-extrabold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Image size={11} />
                        Escolher Arquivo
                      </button>
                      <input 
                        type="file"
                        ref={topicFileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUploadReader(e, 'topicImage')}
                      />
                      {postImg ? (
                        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px]">
                          <span className="truncate max-w-[120px]">Imagem carregada (Base64)</span>
                          <button type="button" onClick={() => setPostImg('')} className="text-red-500 font-extrabold">x</button>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-[10px]">Nenhuma foto anexada</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="self-start mt-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold px-4 py-2 rounded shadow transition-all cursor-pointer"
                  >
                    Publicar Tópico
                  </button>

                </form>
              </div>
            )}

            {/* D. THE FORUM SYSTEM: LIST VIEW OR DETAIL VIEW (THE MAIN VISUAL ENGINE) */}
            {!activeTopic ? (
              
              /* ====== MODE D1: LIST OF TOPICS ====== */
              <div className="bg-white border border-neutral-300 rounded overflow-hidden shadow-sm flex flex-col">
                
                {/* Forum banner stats */}
                <div className="bg-[#eff6ff] px-4 py-2 border-b border-neutral-200 flex items-center justify-between font-sans">
                  <h3 className="text-sm font-extrabold text-neutral-800">
                    Fórum de Debates
                  </h3>
                  <div className="text-[10px] font-mono font-bold text-neutral-500 flex gap-2">
                    <span>Tópicos: {forumTopics.length}</span>
                    <span className="text-pink-600">Posts Hoje: {forumTopics.filter(t => new Date(t.createdAt).toDateString() === new Date().toDateString()).length}</span>
                  </div>
                </div>

                {/* Topics Container */}
                <div className="flex flex-col">
                  {forumTopics.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 text-xs flex flex-col items-center gap-1 font-mono">
                      <AlertCircle size={24} className="text-neutral-300" />
                      Nenhum tópico criado neste fórum ainda.
                    </div>
                  ) : (
                    forumTopics.map((topic, index) => (
                      <div key={topic.id} className="flex flex-col">
                        
                        {/* Dot separator line in-between rows (Mockup style) */}
                        {index > 0 && (
                          <div className="text-[#a1a1aa] overflow-hidden text-[9px] font-mono leading-none py-1 select-none flex justify-center tracking-widest bg-slate-50 border-t border-b border-dotted border-zinc-200">
                            ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                          </div>
                        )}

                        <div 
                          onClick={() => {
                            setActiveTopic(topic);
                            setIsPostingTopic(false);
                            setRepliesPage(1);
                            // Increment views count in database TEMPORARILY DISABLED to preserve Firestore write quota
                            console.log("Topic view count update temporarily skipped to save write quota:", topic.id);
                          }}
                          className={`p-3 flex items-start gap-3 hover:bg-neutral-50 cursor-pointer transition-colors ${
                            topic.isPinned ? 'bg-yellow-50/70 border-l-4 border-yellow-400' : ''
                          }`}
                        >
                          {/* Folder Emoji/Icon */}
                          <div className="w-8 h-8 rounded bg-indigo-50 border border-slate-200 text-slate-600 flex-shrink-0 flex items-center justify-center text-md shadow-inner select-none font-sans">
                            {topic.isPinned ? '📌' : '💬'}
                          </div>

                          {/* Body details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-xs hover:underline text-neutral-800 font-sans tracking-tight leading-tight">
                                {topic.title}
                              </h4>
                              {topic.isPinned && (
                                <span className="bg-yellow-200 text-yellow-800 border border-yellow-300 font-black tracking-wide text-[8.5px] px-1 py-0.2 rounded font-sans uppercase">
                                  FIXADO
                                </span>
                              )}
                            </div>
                            
                            {topic.externalMedia && (
                              <div 
                                onClick={(e) => { e.stopPropagation(); setActiveMedia(topic.externalMedia || null); }}
                                className="mt-2 p-2 border border-neutral-200 rounded bg-neutral-50 flex gap-2 cursor-pointer hover:bg-neutral-100"
                              >
                                {topic.externalMedia.thumbnail && <img src={topic.externalMedia.thumbnail} className="w-16 h-12 object-cover rounded" />}
                                <div>
                                  <div className="text-xs font-bold truncate">{topic.externalMedia.title}</div>
                                  <div className="text-[10px] text-neutral-500 uppercase">{topic.externalMedia.provider}</div>
                                </div>
                              </div>
                            )}
                            
                            <p className="text-[10px] text-neutral-400 font-sans mt-0.5">
                              Por: <span className="font-bold text-neutral-600">{topic.authorName}</span> • {new Date(topic.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          {/* Thread Stats block */}
                          <div className="text-right text-[10px] font-mono text-neutral-400 min-w-[70px] self-center">
                            <div className="font-bold text-[#1d4ed8]">{topic.repliesCount || 0} resps</div>
                            <div className="text-[8.5px]">{topic.views || 0} visitas</div>
                          </div>

                          {/* Moderator Controls */}
                          {isUserModerator() && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => handleTogglePinTopic(topic)}
                                title={topic.isPinned ? "Desfixar Tópico" : "Fixar Tópico"}
                                className={`p-1 rounded text-neutral-400 hover:text-black hover:bg-neutral-100`}
                              >
                                {topic.isPinned ? <PinOff size={11} /> : <Pin size={11} />}
                              </button>
                              <button 
                                onClick={() => handleDeleteTopic(topic.id)}
                                title="Deletar Tópico"
                                className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            ) : (

              /* ====== MODE D2: DETAILED TOPIC THREAD ====== */
              <div className="bg-white border border-neutral-300 rounded p-4 shadow-sm flex flex-col gap-4 text-xs font-sans">
                
                {/* Back button */}
                <button 
                  onClick={() => setActiveTopic(null)}
                  className="self-start text-[#1d4ed8] hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={12} className="stroke-[2.5]" />
                  Voltar ao Fórum
                </button>

                {/* 1. ORIGINAL POST (Header card) */}
                <div className="border border-neutral-200 bg-neutral-50/50 rounded-sm p-3.5 relative">
                  
                  <div className="flex items-start justify-between gap-2.5">
                    
                    {/* Author block */}
                    <div className="flex items-center gap-2">
                      <img 
                        src={activeTopic.authorAvatar} 
                        alt={activeTopic.authorName} 
                        className="w-7 h-7 rounded border object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="font-extrabold text-[11px] text-[#1d4ed8] hover:underline cursor-pointer" onClick={() => onNavigateToFriend(activeTopic.authorId)}>
                          {activeTopic.authorName}
                        </span>
                        <span className="block text-[8.5px] text-neutral-400">
                          {new Date(activeTopic.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {isUserModerator() && (
                      <div className="flex gap-1.5 flex-wrap">
                        {/* Lock / Unlock Toggle */}
                        <button 
                          onClick={() => handleToggleLockTopic(activeTopic)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 border ${
                            activeTopic.isLocked
                              ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                          }`}
                        >
                          {activeTopic.isLocked ? <Unlock size={10} /> : <Lock size={10} />}
                          {activeTopic.isLocked ? 'Desbloquear' : 'Trancar'}
                        </button>

                        {/* Pin / Unpin Toggle */}
                        <button 
                          onClick={() => handleTogglePinTopic(activeTopic)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 border ${
                            activeTopic.isPinned
                              ? 'bg-yellow-100 text-yellow-900 border-yellow-300'
                              : 'bg-[#eff6ff] hover:bg-blue-100 text-[#1e40af] border-blue-200'
                          }`}
                        >
                          <Pin size={10} />
                          {activeTopic.isPinned ? 'Desfixar' : 'Fixar'}
                        </button>

                        {/* Approve / Disapprove Toggle */}
                        <button 
                          onClick={() => handleToggleApproveTopic(activeTopic)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 border ${
                            activeTopic.isApproved
                              ? 'bg-green-100 text-green-900 border-green-300'
                              : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                          }`}
                        >
                          <ShieldCheck size={10} />
                          {activeTopic.isApproved ? 'Desvincular Selo' : 'Aprovar'}
                        </button>

                        {/* Delete Topic (Existing) */}
                        <button 
                          onClick={() => handleDeleteTopic(activeTopic.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 border border-red-200"
                        >
                          <Trash2 size={10} /> Deletar
                        </button>
                      </div>
                    )}

                  </div>

                  <h3 className="font-black text-sm text-indigo-900 mt-3 border-b-2 border-slate-200 pb-1.5 mb-2 uppercase flex items-center gap-1.5 flex-wrap leading-tight">
                    <span>{activeTopic.title}</span>
                    {activeTopic.isPinned && (
                      <span className="bg-yellow-250 text-yellow-900 border border-yellow-350 font-black tracking-wide text-[8.5px] px-1.5 py-0.5 rounded shadow-xs">📌 FIXADO</span>
                    )}
                    {activeTopic.isLocked && (
                      <span className="bg-amber-200 text-amber-950 border border-amber-300 font-black tracking-wide text-[8.5px] px-1.5 py-0.5 rounded shadow-xs animate-pulse">🔒 TRANCADO</span>
                    )}
                    {activeTopic.isApproved && (
                      <span className="bg-green-250 text-green-900 border border-green-300 font-black tracking-wide text-[8.5px] px-1.5 py-0.5 rounded shadow-xs">🛡️ CONTEÚDO VERIFICADO</span>
                    )}
                  </h3>

                  <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                    {activeTopic.content}
                  </p>

                  {/* Attachment drawing */}
                  {activeTopic.imageUrl && (
                    <div className="mt-2 text-center bg-black border border-dashed border-neutral-700 p-1 rounded inline-block max-w-sm">
                      <img src={activeTopic.imageUrl} className="max-h-72 object-contain mx-auto border-2 border-white" alt="Thread attachment" referrerPolicy="no-referrer" />
                    </div>
                  )}

                </div>

                {/* 2. REPLIES LIST */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-black uppercase text-pink-600 border-b pb-1 tracking-wider">
                    Respostas ({topicReplies.length})
                  </h4>

                  {topicReplies.length === 0 ? (
                    <div className="p-4 text-center text-neutral-400 font-mono text-[10px]">
                      Seja o primeiro a responder a este tópico!
                    </div>
                  ) : (
                    topicReplies.map((reply) => {
                      const isLikedByMe = reply.likedBy?.includes(activeUserId) || false;
                      const isMyReply = reply.authorId === activeUserId;

                      return (
                        <div 
                          key={reply.id} 
                          className="border border-neutral-150 p-2.5 rounded-sm flex gap-3 text-xs bg-white text-left font-sans hover:bg-slate-50 transition-colors"
                        >
                          {/* Avatar icon */}
                          <div className="text-center font-sans">
                            <img 
                              onClick={() => onNavigateToFriend(reply.authorId)}
                              src={reply.authorAvatar} 
                              alt={reply.authorName} 
                              className="w-10 h-10 rounded border object-cover cursor-pointer hover:opacity-85 shadow-sm mx-auto" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="max-w-[70px] truncate leading-tight mt-1 text-[9.5px]">
                              <span className="font-extrabold text-[#1d4ed8] hover:underline cursor-pointer" onClick={() => onNavigateToFriend(reply.authorId)}>
                                {reply.authorName}
                              </span>
                            </div>
                          </div>

                          {/* Chat bubble body */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            
                            {/* Text section */}
                            <div>
                              
                              <div className="text-[8px] text-neutral-400 flex items-center justify-between">
                                <span>{new Date(reply.createdAt).toLocaleString('pt-BR')}</span>
                                
                                {/* Edit & Delete Operations for owner or author */}
                                <div className="flex items-center gap-1.5 font-sans">
                                  {isMyReply && (
                                    <button 
                                      onClick={() => {
                                        setEditingReplyId(reply.id);
                                        setEditingReplyText(reply.content);
                                      }}
                                      className="text-[#1d4ed8] hover:underline hover:text-blue-800 font-bold"
                                    >
                                      Editar
                                    </button>
                                  )}
                                  {(isMyReply || isUserModerator()) && (
                                    <button 
                                      onClick={() => handleDeleteReply(reply)}
                                      className="text-red-600 hover:underline hover:text-red-800 font-bold"
                                    >
                                      Excluir
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Content text */}
                              {editingReplyId === reply.id ? (
                                <div className="mt-1.5 flex flex-col gap-1.5 font-sans">
                                  <textarea
                                    id={`edit-reply-content-${reply.id}`}
                                    className="w-full px-2 py-1 border rounded"
                                    rows={3}
                                    value={editingReplyText}
                                    onChange={(e) => setEditingReplyText(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleSaveEditedReply(reply.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white rounded px-2.5 py-1 text-[10px] font-extrabold cursor-pointer"
                                    >
                                      Salvar
                                    </button>
                                    <button 
                                      onClick={() => setEditingReplyId(null)}
                                      className="bg-neutral-200 hover:bg-neutral-300 rounded px-2.5 py-1 text-[10px] text-neutral-700 font-bold cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-neutral-700 text-[11px] whitespace-pre-wrap leading-relaxed mt-1 font-sans">
                                  {reply.content}
                                </p>
                              )}

                            </div>

                            {/* Likes system */}
                            <div className="flex items-center gap-3 border-t border-dotted border-neutral-100 pt-1.5 mt-2 text-[10px]">
                              
                              <button 
                                onClick={() => handleLikeReply(reply)}
                                className={`flex items-center gap-1 cursor-pointer font-extrabold transition-all ${
                                  isLikedByMe ? 'text-pink-600 scale-105' : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                              >
                                <ThumbsUp size={11} />
                                <span>{isLikedByMe ? 'Gostei!' : 'Curtir'}</span>
                              </button>

                              {reply.likes > 0 && (
                                <span className="text-[#a1a1aa] font-mono text-[9px]">
                                  👍 {reply.likes} pessoa(s) curtiram isso
                                </span>
                              )}

                            </div>

                          </div>

                        </div>
                      )
                    })
                  )}
                </div>

                {/* 3. PAGINATION BUTTONS FOR RESPONSES */}
                {topicReplies.length > repliesPerPage && (
                  <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                    <button 
                      disabled={repliesPage === 1}
                      onClick={() => setRepliesPage(repliesPage - 1)}
                      className="px-2 py-1 bg-neutral-100 text-[#0f172a] hover:bg-neutral-200 rounded text-[10px] font-black disabled:opacity-40"
                    >
                      <ChevronLeft size={12} className="inline mr-1" /> Anterior
                    </button>
                    <span className="text-[10px] text-neutral-400 font-mono">Página {repliesPage} de {Math.ceil(topicReplies.length / repliesPerPage)}</span>
                    <button 
                      disabled={repliesPage * repliesPerPage >= topicReplies.length}
                      onClick={() => setRepliesPage(repliesPage + 1)}
                      className="px-2 py-1 bg-neutral-100 text-[#0f172a] hover:bg-neutral-200 rounded text-[10px] font-black disabled:opacity-40"
                    >
                      Próxima <ChevronRight size={12} className="inline ml-1" />
                    </button>
                  </div>
                )}

                {/* 4. REPLY FORM FOOTER */}
                {isJoined ? (
                  activeTopic.isLocked ? (
                    <div className="mt-4 p-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded text-center text-xs text-amber-800 font-sans flex flex-col items-center gap-1.5 animate-pulse">
                      <span className="text-xl">🔒</span>
                      <h5 className="font-extrabold uppercase tracking-wide">Tópico Trancado pela Moderação</h5>
                      <span className="text-[10px] text-amber-600 font-medium">Este assunto foi encerrado e não aceita mais comentários adicionais.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleAddReply} className="mt-2.5 border-t-2 border-neutral-100 pt-3 flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-neutral-600 uppercase">📝 Enviar Resposta como {activeUserName}:</label>
                    <textarea
                      id="forum-reply-textarea-input"
                      required
                      rows={3}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Diga o que você pensa sobre este tópico..."
                      className="w-full px-2.5 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs"
                    />
                    <button
                      type="submit"
                      className="self-start mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded transition-all cursor-pointer"
                    >
                      Responder Tópico
                    </button>
                  </form>
                )
                ) : (
                  <div className="text-center p-3.5 bg-neutral-50/70 border rounded border-dashed text-neutral-500 italic mt-2.5 font-mono">
                    ⚠️ Você precisa participar desta comunidade para poder postar respostas.
                  </div>
                )}

              </div>
            )}

          </div>

          {/* ================= COLUMN 3 (RIGHT): MEMBERS & RELATED COMMUNITIES ================= */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* A. CARD MEMBROS */}
            <div className="bg-white border-2 border-neutral-300 rounded shadow-sm text-left relative flex flex-col">
              
              {/* Header Grid area */}
              <div 
                className="p-3 border-b border-neutral-200 flex items-center justify-between bg-zinc-50 cursor-pointer hover:bg-neutral-100/70 transition-colors"
                onClick={() => setShowMembersModal(true)}
              >
                <div className="flex flex-col font-sans">
                  <span className="font-extrabold text-[13px] text-neutral-800">Membros</span>
                  <span className="text-[10px] text-pink-600 font-black tracking-tight underline select-none">
                    Ver todos ({totalMembresiaExibicao})
                  </span>
                </div>
                
                {/* Minus / Plus scroll actions directly embedded in layout */}
                <div className="flex items-center gap-1 select-none" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleSmoothScroll(membersScrollRef, 'up')}
                    className="w-5 h-5 bg-white border border-neutral-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold text-neutral-500 text-xs shadow-sm"
                    title="Subir"
                  >
                    <Minus size={10} className="stroke-[3]" />
                  </button>
                  <button 
                    onClick={() => handleSmoothScroll(membersScrollRef, 'down')}
                    className="w-5 h-5 bg-white border border-neutral-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold text-neutral-500 text-xs shadow-sm"
                    title="Descer"
                  >
                    <Plus size={10} className="stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Members Grid with customizable scroll assistant */}
              <div 
                ref={membersScrollRef}
                className="p-3 overflow-y-auto max-h-[290px] scroll-smooth relative"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div className="grid grid-cols-3 gap-2.5">
                  {communityMembers.slice(0, 18).map((member) => (
                    <div 
                      key={member.id}
                      onClick={() => onNavigateToFriend(member.id)}
                      className="flex flex-col items-center cursor-pointer group"
                      title={member.name}
                    >
                      <div className="w-12 h-12 rounded bg-neutral-100 border overflow-hidden shadow-inner group-hover:scale-105 group-hover:border-pink-400 transition-all">
                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[9px] text-neutral-500 text-center truncate w-full mt-1 group-hover:text-blue-700 tracking-tight leading-none">
                        {member.name.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* C. CARD MODERADORES */}
            <div className="bg-white border-2 border-neutral-300 rounded shadow-sm text-left relative flex flex-col">
              
              <div 
                className="p-3 border-b border-neutral-200 flex items-center justify-between bg-zinc-50 cursor-pointer hover:bg-neutral-100/70 transition-colors"
                onClick={() => setShowModsPanel(true)}
              >
                <div className="flex flex-col font-sans">
                  <span className="font-extrabold text-[13px] text-neutral-800">Moderadores</span>
                  <span className="text-[10px] text-pink-600 font-black tracking-tight underline select-none">
                    Ver todos / Gerenciar ({getModeratorsList().length})
                  </span>
                </div>
              </div>

              {/* Moderadores Grid view */}
              <div 
                className="p-3 overflow-y-auto max-h-[220px]"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div className="flex flex-col gap-2">
                  {getModeratorsList().map((mod) => (
                    <div 
                      key={mod.id}
                      onClick={() => onNavigateToFriend(mod.id)}
                      className="flex items-center gap-2.5 p-1 rounded hover:bg-neutral-50 border border-transparent hover:border-[#1d4ed8]/30 cursor-pointer transition-all"
                    >
                      <div className="w-8 h-8 rounded bg-neutral-100 border overflow-hidden shadow-inner flex-shrink-0">
                        <img 
                          src={mod.avatar} 
                          alt={mod.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0 font-sans">
                        <div className="font-bold text-[11px] text-neutral-800 truncate flex items-center gap-1">
                          {mod.id === activeComm?.ownerId ? '👑' : '🛡️'} {mod.name}
                        </div>
                        <span className="text-[8.5px] font-black text-[#1d4ed8] uppercase tracking-tight">
                          {mod.id === activeComm?.ownerId ? 'Proprietário' : 'Moderador'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* B. RELATED COMMUNITIES (CPMUNIDDES RELACIONADAS AS WRITTEN IN MOCKUP) */}
            <div className="bg-white border-2 border-neutral-300 rounded shadow-sm text-left relative flex flex-col">
              
              {/* Header CPMUNIDDES RELACIONADAS */}
              <div 
                className="p-3 border-b border-neutral-200 flex items-center justify-between bg-zinc-50 cursor-pointer hover:bg-neutral-100/70 transition-colors"
                onClick={() => setShowRelatedCommsModal(true)}
              >
                <div className="flex flex-col font-sans">
                  <span className="font-extrabold text-[12px] text-neutral-800 uppercase tracking-tight">Comunidades Relacionadas</span>
                  <span className="text-[9.5px] text-pink-600 font-extrabold tracking-tight underline">Recomendações clássicas</span>
                </div>

                <div className="flex items-center gap-1 select-none" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleSmoothScroll(relatedScrollRef, 'up')}
                    className="w-5 h-5 bg-white border border-neutral-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold text-neutral-500 text-xs shadow-sm"
                  >
                    <Minus size={10} className="stroke-[3]" />
                  </button>
                  <button 
                    onClick={() => handleSmoothScroll(relatedScrollRef, 'down')}
                    className="w-5 h-5 bg-white border border-neutral-300 rounded hover:bg-slate-100 flex items-center justify-center font-bold text-neutral-500 text-xs shadow-sm"
                  >
                    <Plus size={10} className="stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Related container list */}
              <div 
                ref={relatedScrollRef}
                className="p-3 overflow-y-auto max-h-[300px] scroll-smooth flex flex-col gap-2.5"
                style={{ scrollbarWidth: 'thin' }}
              >
                {relatedCommunities.map((comm) => (
                  <div 
                    key={comm.id}
                    onClick={() => {
                      setActiveCommId(comm.id);
                      setActiveTopic(null);
                    }}
                    className="flex items-center gap-2.5 p-1.5 rounded hover:bg-neutral-50 border border-transparent hover:border-pink-300 cursor-pointer transition-all shadow-inner"
                  >
                    <div className="w-9 h-9 rounded bg-[#eff6ff] text-[#4f46e5] flex items-center justify-center text-lg border flex-shrink-0 select-none overflow-hidden">
                      {comm.avatar && comm.avatar.startsWith('data:') ? (
                        <img src={comm.avatar} alt={comm.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{comm.avatar || '👥'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11.5px] font-bold text-neutral-800 leading-tight hover:underline truncate">{comm.name}</h4>
                      <p className="text-[9.5px] text-neutral-400 truncate">{comm.description}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>
      </div>
      )
      ) : dbCommunities.length === 0 ? (
        <div className="p-16 border rounded bg-white text-center font-mono flex flex-col items-center justify-center gap-2">
          <RefreshCw size={24} className="text-pink-500 animate-spin" />
          <span>Sincronizando banco de dados de comunidades clássicas do Orkut...</span>
        </div>
      ) : (
        /* MINHAS COMUNIDADES LIST PORTAL - Matches Mockup perfectly */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
          {/* ================= COLUMN 1 (LEFT): USER PROFILE PANEL ================= */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            
            {/* Profile Card Only - Photo Container (Enlarged and aligned to Profile layout) */}
            <div className={`border rounded p-3 text-center transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass}`}>
              <div className={`relative group mx-auto w-full aspect-square overflow-hidden rounded-lg flex items-center justify-center shadow-xs ${
                myProfile.theme === 'cyberdeck' 
                  ? 'cyber-neon-border-container p-[2px]' 
                  : 'border-2 border-neutral-300 bg-neutral-100'
              }`}>
                {myProfile.avatar && myProfile.avatar !== '👤' && myProfile.avatar.trim() !== '' ? (
                  <img
                    src={myProfile.avatar}
                    alt={myProfile.nome_exibicao || myProfile.name}
                    className="w-full h-full object-cover z-10 rounded-[5px]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-[#dee7f4] flex flex-col items-center justify-center text-neutral-400 gap-2 select-none z-10 rounded-[5px]">
                    <span className="text-6xl">👤</span>
                    <span className="text-xs font-bold tracking-widest uppercase text-neutral-500">Sem Foto</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Details Container Below Photo */}
            <div className={`border rounded p-4 text-center transition-all ${themeStyles.cardBg} ${themeStyles.glow} ${themeStyles.borderClass} space-y-3.5`}>
              {myProfile.theme === 'gotico-retro' ? (
                <div className="flex flex-col items-center">
                  <div 
                    className="relative mx-auto w-full flex flex-col items-center justify-center select-none"
                    style={{
                      backgroundImage: "url('/assets/themes/plaqueta-gotica.webp')",
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      minHeight: '118px',
                      padding: '26px 20px 20px 20px',
                      marginTop: '-10px',
                    }}
                  >
                    <h2 
                      className={`font-black flex items-center justify-center gap-1 break-all tracking-wide text-[#100703] ${displayNameClass}`}
                      style={{
                        fontSize: '12px',
                        lineHeight: '18px',
                        textShadow: '0 0 4px rgba(255, 63, 44, 0.15)',
                      }}
                    >
                      {displayNameText}
                    </h2>
                    {myProfile.username && (
                      <span 
                        className="block font-sans font-bold text-[#220d04] tracking-normal mt-0.5"
                        style={{
                          fontSize: '8px',
                        }}
                      >
                        @{myProfile.username}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[12px] md:text-[13px] font-medium font-sans flex items-center justify-center gap-1.5 mt-2.5 tracking-wider uppercase text-[#ad2fff]">
                    <MapPin size={14} className="text-[#ad2fff] shrink-0" />
                    {myProfile.location || 'Curitiba, PR - Brasil'}
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  <h2 className={`text-base md:text-lg font-bold flex items-center justify-center gap-1.5 break-all tracking-wide ${
                    myProfile.theme === 'emo-2008'
                      ? 'text-[#f6339a] [text-shadow:1px_1px_2px_rgba(0,0,0,0.8)]'
                      : myProfile.theme === 'cyberdeck'
                        ? 'text-[#55ff94]'
                        : 'text-neutral-800'
                  } ${displayNameClass}`}>
                    {displayNameText}
                  </h2>
                  {myProfile.username && (
                    <p className="text-xs font-mono text-neutral-500 opacity-95 mt-1 tracking-normal">
                      @{myProfile.username}
                    </p>
                  )}
                  
                  <p className={`text-[12px] md:text-[13px] font-medium font-sans flex items-center justify-center gap-1.5 mt-2.5 tracking-wider uppercase ${
                    myProfile.theme === 'emo-2008' 
                      ? 'text-[#be2efd]' 
                      : 'text-neutral-700'
                  }`}>
                    <MapPin size={14} className={
                      myProfile.theme === 'emo-2008' 
                        ? 'text-[#be2efd] shrink-0' 
                        : 'text-pink-600 shrink-0'
                    } />
                    {myProfile.location || 'Curitiba, PR - Brasil'}
                  </p>
                </div>
              )}

              <div className="border-t border-dashed border-neutral-300 pt-3.5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 opacity-70">Criptografia Local</span>
                <div className="flex items-center gap-1.5 p-1 px-2 bg-green-500/10 border border-green-500/40 rounded text-[10px] text-green-700 font-semibold font-mono">
                  <ShieldCheck size={14} className="text-green-650 flex-shrink-0" />
                  Chave RSA Ativa
                </div>
                <div className="flex items-center gap-1.5 p-1 px-2 mt-1.5 bg-blue-500/15 border border-blue-500/30 rounded text-[9px] text-[#1d4ed8] font-semibold font-mono">
                  🛡️ Protegido contra Exploit Antigo
                </div>
              </div>

              {/* Gerenciar Imagens */}
              {isOwnProfile && (
                <div className="border-t border-dashed border-neutral-300 pt-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-neutral-500 mb-2 font-sans tracking-wider">
                    Gerenciar Imagens
                  </div>
                  <GlossyRetroButton
                    id="portal-btn-photos"
                    onClick={() => {
                      if (onNavigateToTab) onNavigateToTab('photos');
                    }}
                    variant="action"
                    className="w-full text-[10px] h-11 py-0 uppercase"
                  >
                    Add Fotos
                  </GlossyRetroButton>
                </div>
              )}

              {/* Conversa Secreta */}
              <div className="border-t border-dashed border-neutral-300 pt-3 text-center">
                <div className="text-[10px] uppercase font-bold text-neutral-500 mb-2 font-sans tracking-wider">
                  Conversa Secreta (48h)
                </div>
                <GlossyRetroButton
                  id="portal-btn-msg"
                  onClick={() => {
                    if (onNavigateToTab) {
                      onNavigateToTab('profile');
                    }
                  }}
                  variant="action"
                  className="w-full text-[10px] h-11 py-0 uppercase bg-pink-600 hover:bg-pink-700 text-white"
                >
                  💬 Mensagem
                </GlossyRetroButton>
              </div>

              {/* Menu Social */}
              <div className={`border mt-4 rounded p-2 text-left text-[11px] font-sans transition-all ${
                myProfile.theme === 'gotico-retro' 
                  ? 'bg-[#30060e]/90 border-[#b08d57] text-[#b08d57]' 
                  : myProfile.theme === 'minimal-oldweb'
                    ? 'bg-[#d5d0c9] border-black text-black'
                    : 'bg-zinc-50 border-neutral-300 text-neutral-800'
              }`}>
                <span className={`text-[9.5px] uppercase font-black block mb-1 ${
                  myProfile.theme === 'gotico-retro' 
                    ? 'text-[#b08d57]/60' 
                    : myProfile.theme === 'minimal-oldweb'
                      ? 'text-black/60'
                      : 'text-neutral-400'
                }`}>Menu Social</span>
                <div className={`flex flex-col gap-1 font-semibold ${
                  myProfile.theme === 'gotico-retro' 
                    ? 'text-[#b08d57]' 
                    : myProfile.theme === 'minimal-oldweb'
                      ? 'text-[#000080]'
                      : 'text-blue-700'
                }`}>
                  <button onClick={() => onNavigateToTab?.('profile')} className="hover:underline text-left cursor-pointer">Meu Perfil</button>
                  <button onClick={() => onNavigateToTab?.('scrapbook')} className="hover:underline text-left cursor-pointer">Recados</button>
                  <button onClick={() => onNavigateToTab?.('testimonials')} className="hover:underline text-left cursor-pointer">Depoimentos</button>
                  <button onClick={() => handleSelectCommunity(null)} className={`hover:underline text-left cursor-pointer ${
                    myProfile.theme === 'gotico-retro' 
                      ? 'text-[#ffd700]' 
                      : 'text-pink-600'
                  }`}>📚 Minhas Comunidades</button>
                </div>
              </div>

            </div>

          </div>

          {/* ================= COLUMN 2 (RIGHT): DETAILED GRID OF PARTICIPATING COMMUNITIES ================= */}
          <div className="lg:col-span-9 flex flex-col gap-4">
            
            {/* Header / Sub-banner for list section */}
            <div className="bg-[#dee7f4] border border-neutral-300 rounded p-3 text-left">
              <span className="text-xs font-black text-neutral-800 font-sans tracking-tight">
                {targetProfileId === activeUserId ? (
                  `📚 Você participa de ${displayedCommunities.length} comunidades clássicas`
                ) : (
                  `📚 ${myProfile.nome_exibicao || myProfile.name || 'Este usuário'} participa de ${displayedCommunities.length} comunidades clássicas`
                )}
              </span>
            </div>

            {/* Communities Grid in 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedCommunities
                .filter(c =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((comm) => {
                  const realComm = dbCommunities.find(dbC => dbC.id === comm.id) || comm;
                  // Formatting of Short description limit (up to 2 lines, around 80 chars)
                  let shortDesc = realComm.description || '';
                  if (shortDesc.length > 80) {
                    shortDesc = shortDesc.substring(0, 77) + '...';
                  }

                  return (
                    <div 
                      key={realComm.id}
                      onClick={() => {
                        handleSelectCommunity(realComm.id);
                        setActiveTopic(null);
                      }}
                      className="bg-white border-2 border-neutral-300 rounded-lg p-3 hover:border-pink-500 hover:shadow-md cursor-pointer transition-all flex gap-3 h-[115px] select-none relative group"
                    >
                      {/* Thumbnail: Left Side, brick color/brown rounded square ~90x90px */}
                      <div className="w-[90px] h-[90px] bg-[#a88a79] rounded-sm border border-neutral-300 overflow-hidden flex-shrink-0 flex items-center justify-center text-4xl shadow-inner group-hover:scale-102 transition-transform select-none">
                        {realComm.avatar && (
                          realComm.avatar.startsWith('data:') ||
                          realComm.avatar.startsWith('http://') ||
                          realComm.avatar.startsWith('https://') ||
                          realComm.avatar.startsWith('/')
                        ) ? (
                          <img src={realComm.avatar} alt={realComm.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="filter drop-shadow-sm select-none">{realComm.avatar || '👥'}</span>
                        )}
                      </div>

                      {/* Meta info: Right Side */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between text-left">
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-black text-[#1d4ed8] group-hover:underline truncate uppercase tracking-tight">
                            {realComm.name}
                          </h3>
                          <p className="text-[11px] text-neutral-600 font-sans leading-snug line-clamp-2">
                            {shortDesc}
                          </p>
                        </div>

                        {/* Number of Members (Lowercase right align inside card) */}
                        <div className="text-right">
                          <span className="text-[10px] font-mono font-bold text-[#db2777] bg-pink-50/75 px-1.5 py-0.5 rounded border border-pink-200">
                            {(realComm.members || 3638).toLocaleString('pt-BR')} membros
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {displayedCommunities.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 && (
                <div className="col-span-2 p-12 border-2 border-dashed border-neutral-300 rounded bg-white text-center text-neutral-500 font-sans text-xs">
                  Nenhuma comunidade encontrada com os termos informados.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* =============================================================================================== */}
      {/* ==================================== MODALS ENGINE CONSTELLATION ================================ */}
      {/* =============================================================================================== */}



      {/* 1. ADMISSION REQUEST MODAL */}
      {showAdmissionModal && activeComm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-indigo-400 rounded p-6 max-w-md w-full shadow-[0_0_25px_rgba(99,102,241,0.4)] anim-scale text-left font-sans text-xs">
            <h3 className="text-sm font-black text-indigo-700 uppercase border-b pb-2 mb-3.5 flex items-center gap-1">
              <ShieldCheck size={15} /> Perguntas de Admissão
            </h3>
            {activeComm.admissionQuestions?.map((q: any) => (
              <div key={q.id} className="mb-3">
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">{q.question}</label>
                <input
                  type="text"
                  className="w-full px-2 py-1.5 border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  onChange={(e) => setAdmissionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2.5 mt-4">
              <button 
                disabled={isSubmittingAdmission} 
                onClick={() => setShowAdmissionModal(null)} 
                className="px-3 py-1.5 bg-neutral-200 text-neutral-600 font-bold rounded text-xs cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                disabled={isSubmittingAdmission} 
                onClick={handleSubmitAdmissionRequest} 
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded shadow-sm cursor-pointer text-xs disabled:opacity-50 flex items-center gap-1"
              >
                {isSubmittingAdmission ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUESTS MODAL */}
      {showRequestsModal && activeComm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-pink-400 rounded p-6 max-w-md w-full shadow-2xl anim-scale text-left font-sans text-xs">
            <h3 className="text-sm font-black text-pink-700 uppercase border-b pb-2 mb-3.5">Solicitações de Entrada</h3>
            {communityRequests.length === 0 ? (
              <p className="text-neutral-500 italic">Nenhuma solicitação pendente.</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto pr-1">
                {communityRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-2 py-2.5 border-b border-neutral-100 last:border-none">
                    <div className="flex items-center gap-2">
                      <img src={req.userPhoto || '👤'} alt={req.userName} className="w-8 h-8 rounded-full border border-neutral-200" />
                      <span className="font-bold text-neutral-800">{req.userName}</span>
                    </div>
                    <button 
                      className="px-2.5 py-1 bg-pink-100 text-pink-700 hover:bg-pink-200 font-bold rounded text-xs transition-colors cursor-pointer" 
                      onClick={() => setViewingRequest(req)}
                    >
                      Ver
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4 pt-2 border-t border-dashed">
              <button onClick={() => setShowRequestsModal(false)} className="px-3 py-1.5 bg-neutral-200 text-neutral-600 font-bold rounded text-xs cursor-pointer">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* 1.1 VIEWING REQUEST ANALYSIS MODAL */}
      {viewingRequest && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-pink-500 rounded p-6 max-w-md w-full shadow-2xl anim-scale text-left font-sans text-xs">
            <h3 className="text-sm font-black text-pink-700 uppercase border-b pb-2 mb-3.5 flex items-center gap-1">
              SOLICITAÇÃO DE ENTRADA
            </h3>
            
            <div className="mb-4 flex items-center gap-2 border-b pb-2">
              <img src={viewingRequest.userPhoto || '👤'} alt={viewingRequest.userName} className="w-10 h-10 rounded-full border border-neutral-300" />
              <div>
                <span className="block text-[10px] font-bold text-neutral-500 uppercase">Usuário</span>
                <span className="font-extrabold text-neutral-800 text-sm">{viewingRequest.userName}</span>
              </div>
            </div>

            <div className="max-h-[250px] overflow-y-auto mb-4 pr-1">
              {viewingRequest.answers?.map((ans: any, idx: number) => (
                <div key={idx} className="mb-3.5 bg-neutral-50 p-2.5 rounded border border-neutral-200">
                  <p className="font-bold text-neutral-700 mb-1">Pergunta:</p>
                  <p className="text-neutral-600 mb-2 italic">"{ans.question}"</p>
                  <p className="font-bold text-indigo-700 mb-1">Resposta:</p>
                  <p className="text-neutral-800 font-medium font-mono bg-white p-1.5 border border-neutral-200 rounded">{ans.answer || '(Sem resposta)'}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center gap-2 border-t pt-3.5">
              <button 
                onClick={() => setViewingRequest(null)} 
                className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-600 font-bold rounded text-xs cursor-pointer"
              >
                Voltar
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRejectRequest(viewingRequest)} 
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded shadow-sm cursor-pointer text-xs uppercase"
                >
                  Recusar
                </button>
                <button 
                  onClick={() => handleApproveRequest(viewingRequest)} 
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded shadow-sm cursor-pointer text-xs uppercase"
                >
                  Aprovar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REGULAMENTO / MANUAL RULES MODAL */}
      {showRulesModal && activeComm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#eff6ff] border-4 border-indigo-700/60 rounded p-6 max-w-lg w-full shadow-2xl anim-scale text-left">
            
            <h3 className="text-md font-bold text-indigo-900 border-b-2 border-indigo-200 pb-2.5 mb-4 uppercase flex items-center gap-1.5">
              <ShieldCheck size={18} className="text-indigo-600" />
              Diretrizes Oficiais de Convivência
            </h3>

            <div className="bg-white p-4 rounded border font-sans text-neutral-700 max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-xs">
              {activeComm.rules || "Nenhuma regra específica cadastrada pela moderação para esta comunidade.\n\nRegras Padrão:\n1. Mantenha o ecossistema livre de assédios e spams.\n2. É recomendável rir ou usar gírias retro (chapa, bacana, de gabarito)."}
            </div>

            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setShowRulesModal(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded shadow cursor-pointer transition-colors"
              >
                Entendi, Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. NEW COMMUNITY FORM MODAL */}
      {showCreateModal && (
        <div className={`fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto transition-opacity duration-[1500ms] ease-out ${
          isClosingCreateModal ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <div className={`bg-[#dee7f4] border-4 border-slate-300 rounded p-6 max-w-md w-full shadow-2xl text-left flex flex-col my-8 transition-all duration-[1500ms] ease-out ${
            isClosingCreateModal ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'
          }`}>
            
            <h3 className="text-md font-extrabold text-neutral-800 border-b border-neutral-300 pb-2 mb-4 uppercase flex items-center gap-1.5 leading-none">
              <PlusCircle size={17} className="text-pink-600" />
              Fundar Nova Comunidade
            </h3>

            <form onSubmit={handleCreateCommunity} className="flex flex-col gap-3 text-xs font-sans">
              
              <div>
                <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5">Nome da Comunidade:</label>
                <input
                  id="create-comm-name"
                  type="text"
                  required
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  placeholder="Ex: Eu tenho um Hotmail até hoje!"
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5">Descrição Curta:</label>
                <textarea
                  id="create-comm-desc"
                  required
                  rows={3}
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="Explique o espírito desta comunidade em poucas palavras..."
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800 text-xs"
                />
              </div>

              {/* Sub-grid of selections */}
              <div className="grid grid-cols-2 gap-3">
                
                <div>
                  <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5">Categoria:</label>
                  <select
                    id="create-comm-category"
                    value={newCommCat}
                    onChange={(e) => setNewCommCat(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5">Idioma:</label>
                  <select
                    id="create-comm-language"
                    value={newCommLang}
                    onChange={(e) => setNewCommLang(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800"
                  >
                    <option value="Português">Português</option>
                    <option value="Inglês">Inglês</option>
                    <option value="Espanhol">Espanhol</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5">Capa Emoji (Representativa):</label>
                  <input
                    id="create-comm-avatar"
                    type="text"
                    maxLength={5}
                    value={newCommAvatar}
                    onChange={(e) => setNewCommAvatar(e.target.value)}
                    placeholder="Altere o emoji!"
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-center text-md font-bold text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5">Upload Foto (Selecione):</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#cbd5e1] hover:bg-neutral-300 text-neutral-800 px-1 py-2 border rounded font-black text-[9.5px] uppercase cursor-pointer"
                  >
                    Foto de Disco
                  </button>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageUploadReader(e, 'avatar')}
                  />
                </div>

              </div>

              {newCommAvatar && newCommAvatar.startsWith('data:') && (
                <div className="text-[10px] text-green-700 bg-green-50 p-2.5 rounded border border-green-200 mt-1 flex items-center justify-between">
                  <span>Foto carregada com sucesso do seu disco!</span>
                  <button type="button" onClick={() => setNewCommAvatar('💬')} className="text-red-500 font-extrabold">Excluir</button>
                </div>
              )}

              <div>
                <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5 font-sans flex items-center gap-1.5 select-none cursor-pointer">
                  <input
                    id="create-comm-secure-toggle"
                    type="checkbox"
                    checked={newCommSecureMode}
                    onChange={(e) => setNewCommSecureMode(e.target.checked)}
                    className="w-3.5 h-3.5 border text-pink-600 cursor-pointer"
                  />
                  <span>Chave Segura (Ativar Desafio Zero-Conhecimento)</span>
                </label>
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5">Manual de Regras da Comunidade:</label>
                <textarea
                  id="create-comm-rules"
                  rows={2}
                  value={newCommRules}
                  onChange={(e) => setNewCommRules(e.target.value)}
                  placeholder="Código de conduta para os membros..."
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-neutral-600 uppercase mb-0.5">Perguntas de Admissão (uma por linha):</label>
                <textarea
                  id="create-comm-admission-questions"
                  rows={3}
                  value={newCommAdmissionQuestionsText}
                  onChange={(e) => setNewCommAdmissionQuestionsText(e.target.value)}
                  placeholder="Ex: Por que deseja entrar?&#10;Qual sua idade?"
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 mt-4 border-t pt-3 border-neutral-300">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-neutral-200 text-neutral-700 hover:bg-neutral-300 px-4 py-2 rounded text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-[#2563eb] text-white hover:bg-blue-700 px-5 py-2 rounded text-xs font-black shadow-md cursor-pointer transition-colors"
                >
                  Fundar Comunidade
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 4. MODERATOR/OWNER COMMUNITY PROFILE EDITOR MODAL */}
      {showEditCommModal && activeComm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#dee7f4] border-4 border-slate-300 rounded p-6 max-w-md w-full shadow-2xl anim-scale text-left">
            
            <h3 className="text-sm font-black text-neutral-700 border-b border-neutral-300 pb-2 mb-4 uppercase flex items-center gap-1.5">
              <Settings size={15} /> Ajustes da Moderação
            </h3>

            <div className="flex flex-col gap-3 font-sans text-xs">
              
              {isUserOwner() && (
                <div>
                  <label className="block text-[9px] font-extrabold text-neutral-500 mb-1">NOME DA COMUNIDADE:</label>
                  <input
                    type="text"
                    id="edit-comm-name"
                    value={activeComm.name}
                    onChange={(e) => setActiveComm({ ...activeComm, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded focus:outline-none font-bold text-neutral-800"
                  />
                </div>
              )}

              <div>
                <label className="block text-[9px] font-extrabold text-neutral-500 mb-1">EDITAR DESCRIÇÃO:</label>
                <textarea
                  id="edit-comm-description"
                  rows={3}
                  value={activeComm.description}
                  onChange={(e) => setActiveComm({ ...activeComm, description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-neutral-500 mb-1">REGULAMENTO / REGRAS DE CONVIVÊNCIA:</label>
                <textarea
                  id="edit-comm-rules-text"
                  rows={4}
                  value={activeComm.rules || ''}
                  onChange={(e) => setActiveComm({ ...activeComm, rules: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded focus:outline-none"
                />
              </div>

              {isUserOwner() && (
                <div className="border border-red-300 bg-red-50 p-2.5 rounded text-[10px] font-sans text-red-800 flex flex-col gap-1.5 mt-1">
                  <span className="font-extrabold text-[9px] uppercase tracking-wide flex items-center gap-1 text-red-600">⚠ Zona de Perigo</span>
                  <span>Deseja encerrar definitivamente esta comunidade? Esta ação apagará todos os tópicos e respostas de forma irreversível!</span>
                  {!showConfirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(true)}
                      className="self-start px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded shadow-xs transition-colors cursor-pointer"
                    >
                      Excluir Comunidade
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center mt-1">
                      <button
                        type="button"
                        onClick={handleCloseCommunity}
                        className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-black rounded uppercase text-[9px] tracking-wide animate-pulse cursor-pointer"
                      >
                        SIM, CONFIRMAR EXCLUSÃO DEFINITIVA
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="px-2.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold rounded cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2.5 mt-4 border-t border-neutral-300 pt-3">
                <button 
                  onClick={() => {
                    setShowEditCommModal(false);
                    setShowConfirmDelete(false);
                  }}
                  className="bg-neutral-200 text-neutral-700 hover:bg-neutral-300 px-4 py-2 rounded text-xs font-bold font-sans cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveCommunityEdits}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded text-xs font-extrabold shadow-md cursor-pointer transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* SLIDING PANEL: MODERADORES & CARGOS (DRAWER) */}
      <AnimatePresence>
        {showModsPanel && activeComm && (
          <div className="fixed inset-0 z-50 flex justify-end font-sans">
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModsPanel(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-xs"
            />

            {/* Sliding Drawer Body */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-full max-w-md h-full bg-[#dee7f4] border-l-4 border-slate-300 shadow-2xl p-5 flex flex-col justify-between z-10"
            >
              
              <div className="flex flex-col h-full min-w-0">
                {/* Header inside drawer */}
                <div className="flex items-center justify-between border-b border-neutral-300 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#1d4ed8]" />
                    <span className="font-black text-sm text-neutral-800 uppercase tracking-tight">🛡️ Moderação & Cargos</span>
                  </div>
                  <button 
                    onClick={() => setShowModsPanel(false)}
                    className="p-1 hover:bg-slate-200 rounded text-neutral-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Subtitle / context info */}
                <p className="text-[10.5px] text-neutral-600 leading-normal mb-3">
                  Gerencie os donos, moderadores e banimentos da comunidade <strong>{activeComm.name}</strong>.
                </p>

                {/* Body Content - Scrollable container */}
                <div 
                  className="flex-1 overflow-y-auto pr-1 mb-3 space-y-4 text-xs font-sans"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {/* SECTION 1: PROPRIETÁRIO */}
                  <div className="bg-white border border-neutral-200 rounded p-3">
                    <span className="font-extrabold text-[10.5px] text-indigo-900 uppercase block mb-2 tracking-wide">👑 Dono / Criador</span>
                    {getModeratorsList().filter(m => m.id === activeComm.ownerId).map(owner => (
                      <div key={owner.id} className="flex items-center gap-2.5">
                        <img 
                          src={owner.avatar} 
                          alt={owner.name} 
                          className="w-10 h-10 rounded border object-cover shadow-sm animate-fade-in"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-black text-xs text-neutral-800">{owner.name}</p>
                          <span className="text-[8.5px] font-bold text-neutral-400">Criado em {owner.joinedAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SECTION 2: LISTA DE MODERADORES */}
                  <div className="bg-white border border-neutral-200 rounded p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-[10.5px] text-[#1d4ed8] uppercase tracking-wide">🛡️ Moderadores AuxiliareS</span>
                      <span className="text-[9.5px] font-bold text-neutral-400">
                        ({getModeratorsList().filter(m => m.id !== activeComm.ownerId).length} / 5)
                      </span>
                    </div>

                    {getModeratorsList().filter(m => m.id !== activeComm.ownerId).length === 0 ? (
                      <span className="text-[10px] text-neutral-400 italic py-1 block">Nenhum moderador nomeado para esta comunidade.</span>
                    ) : (
                      <div className="space-y-2">
                        {getModeratorsList().filter(m => m.id !== activeComm.ownerId).map(mod => (
                          <div key={mod.id} className="flex items-center justify-between p-1.5 border border-neutral-100 rounded hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <img 
                                src={mod.avatar} 
                                alt={mod.name} 
                                className="w-8 h-8 rounded border object-cover shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="font-bold text-xs text-neutral-800">{mod.name}</p>
                                <span className="text-[8.5px] text-indigo-700 font-extrabold uppercase">MODERADOR</span>
                              </div>
                            </div>
                            {isUserOwner() && (
                              <button 
                                onClick={() => handleRemoveModerator(mod.id)} 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                title="Remover cargo de moderador"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: MANAGEMENT (ADD MODERATOR) / EXCLUSIVO PARA O DONO */}
                  {isUserOwner() && (
                    <div className="bg-amber-50/50 border border-amber-200 rounded p-3 flex flex-col gap-2">
                      <span className="font-extrabold text-[10px] text-amber-800 uppercase block tracking-wider">🌟 Nomear Novo Moderador</span>
                      
                      {/* Check limit of 5 */}
                      {getModeratorsList().filter(m => m.id !== activeComm.ownerId).length >= 5 ? (
                        <div className="text-[10px] text-amber-700 bg-amber-100 border border-amber-300 rounded p-2 text-center font-bold">
                          ⚠️ Limite máximo de 5 moderadores atingido. Remova um moderator para admitir outro.
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select 
                            value={modAddSelectId}
                            onChange={(e) => setModAddSelectId(e.target.value)}
                            className="flex-1 bg-white border border-neutral-300 rounded p-1.5 text-[11px] focus:outline-none"
                          >
                            <option value="">Selecione um membro da comunidade...</option>
                            {communityMembers
                              .filter(m => m.id !== activeComm.ownerId && !(activeComm.moderators || []).includes(m.id) && !(activeComm.bannedMembers || []).includes(m.id))
                              .map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))
                            }
                          </select>
                          <button 
                            onClick={() => handleAddModerator(modAddSelectId)}
                            disabled={!modAddSelectId}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10.5px] px-3.5 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            Conceder Cargo
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 4: BAN MEMBERS (PERMITIDO PARA DONO & MODERADORES DE ACORDO COM REQUISITOS) */}
                  <div className="bg-red-50/40 border border-red-200 rounded p-3 flex flex-col gap-2">
                    <span className="font-extrabold text-[10.5px] text-red-800 uppercase tracking-widest flex items-center gap-1">
                      <UserX size={12} /> Banimento de Membros
                    </span>
                    <p className="text-[9.5px] text-neutral-500 leading-tight">
                      Administradores e moderadores podem banir usuários comuns. Usuários banidos são ejetados da comunidade e bloqueados de reingressar.
                    </p>

                    {/* Selector / Search to Ban */}
                    <div className="flex gap-2 mt-1">
                      <select 
                        id="ban-member-select-picker"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBanMember(e.target.value);
                            e.target.value = ""; // Reset selecting field
                          }
                        }}
                        className="flex-1 bg-white border border-red-300 rounded p-1.5 text-[11px] focus:ring-1 focus:ring-red-400 focus:outline-none"
                      >
                        <option value="">Escolha um membro para banir...</option>
                        {communityMembers
                          // Cannot ban the owner, and moderators cannot ban other moderators or owner
                          .filter(m => {
                            if (m.id === activeComm.ownerId) return false;
                            const isSelectedMod = (activeComm.moderators || []).includes(m.id);
                            if (isUserOwner()) {
                              // Owner can ban moderators too!
                              return true;
                            } else if (isUserModerator()) {
                              // Moderators cannot ban other moderators (nor owner)
                              return !isSelectedMod;
                            }
                            return false;
                          })
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* Banned lists with option to Unban */}
                    {activeComm.bannedMembers && activeComm.bannedMembers.length > 0 && (
                      <div className="mt-2.5">
                        <span className="font-bold text-[9px] text-neutral-600 block mb-1 uppercase tracking-wider">Lista de Banidos ({activeComm.bannedMembers.length})</span>
                        <div className="max-h-24 overflow-y-auto space-y-1 bg-white border border-red-100 rounded p-1.5">
                          {activeComm.bannedMembers.map((bannedId: string) => {
                            const foundProfile = profiles[bannedId];
                            const nameStr = foundProfile?.name || communityMembers.find(m => m.id === bannedId)?.name || bannedId;
                            return (
                              <div key={bannedId} className="flex items-center justify-between text-[10.5px] p-1 border-b border-neutral-50 last:border-b-0 font-sans">
                                <span className="text-neutral-700 truncate max-w-[150px]">{nameStr}</span>
                                <button 
                                  onClick={() => handleUnbanMember(bannedId)}
                                  className="text-[9px] font-extrabold text-blue-600 hover:underline hover:text-blue-800"
                                >
                                  Desbanir
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Info Footer inside drawer */}
                <div className="bg-neutral-100 p-2.5 rounded-sm border border-neutral-200 mt-2 text-center text-[10px] text-neutral-500 font-sans flex items-center justify-center gap-1.5">
                  <ShieldAlert size={12} className="text-[#1d4ed8]" />
                  <span>Configurações administrativas de nível de Servidor</span>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. INDEPENDENT MEMBERS MODAL WITH THE +/- VERTICAL SCROLL ASSISTANCE INSTRUCTIONS */}
      {showMembersModal && activeComm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#dee7f4] border-4 border-neutral-300 rounded p-6 max-w-lg w-full shadow-2xl anim-scale text-left relative flex flex-col md:flex-row gap-4 h-[500px]">
            
            {/* Modal Middle Body */}
            <div className="flex-1 flex flex-col h-full min-w-0">
              
              <h3 className="text-md font-extrabold text-[#1e3a8a] border-b border-indigo-200 pb-2 mb-3.5 uppercase flex items-center justify-between">
                <span>👥 Membros da Comunidade ({totalMembresiaExibicao})</span>
                <button 
                  onClick={() => setShowMembersModal(false)} 
                  className="hover:text-red-500 font-extrabold font-mono text-[10px]"
                >
                  FECHAR (x)
                </button>
              </h3>

              {/* Scrollable Container with standard styling */}
              <div 
                ref={modalMembersScrollRef}
                className="flex-1 overflow-y-auto pr-3 scroll-smooth text-neutral-800 bg-white border-2 border-dashed border-neutral-300 p-4 rounded-sm"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {communityMembers.map((member) => (
                    <div 
                      key={member.id}
                      onClick={() => {
                        onNavigateToFriend(member.id);
                        setShowMembersModal(false);
                      }}
                      className="border rounded p-2.5 flex flex-col items-center gap-1 bg-neutral-50 hover:bg-pink-50/50 hover:border-pink-300 cursor-pointer group transition-all"
                    >
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-12 h-12 rounded-sm object-cover border group-hover:scale-105 transition-transform shadow" 
                        referrerPolicy="no-referrer"
                      />
                      <span className="font-extrabold text-[10px] text-[#1d4ed8] group-hover:underline truncate w-full text-center mt-1">
                        {member.name}
                      </span>
                      <span className="text-[8px] text-neutral-400 font-mono italic leading-none">{member.location}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Float Scroll-assistant bar specifically requested by user to help navigate side modal using + and - icons */}
            <div className="flex flex-col justify-center items-center gap-2 select-none border-l pl-2 border-neutral-300 self-center md:h-full">
              <span className="text-[8px] uppercase tracking-wide font-black text-neutral-500 orientation-tb rotate-180 md:my-2 hidden md:block">ROLOGE</span>
              <button 
                onClick={() => handleSmoothScroll(modalMembersScrollRef, 'up')}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                title="Rolar para Cima (-)"
              >
                <Minus size={16} className="stroke-[3]" />
              </button>
              <button 
                onClick={() => handleSmoothScroll(modalMembersScrollRef, 'down')}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                title="Rolar para Baixo (+)"
              >
                <Plus size={16} className="stroke-[3]" />
              </button>
              <span className="text-[10px] font-bold text-indigo-700 font-mono mt-1 hidden md:block">Scroll</span>
            </div>

          </div>
        </div>
      )}

      {/* 6. INDEPENDENT RELATED COMMUNITIES MODAL WITH THE +/- VERTICAL SCROLL ASSISTANCE */}
      {showRelatedCommsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#dee7f4] border-4 border-neutral-300 rounded p-6 max-w-lg w-full shadow-2xl anim-scale text-left relative flex flex-col md:flex-row gap-4 h-[500px]">
            
            {/* Modal Related content container */}
            <div className="flex-1 flex flex-col h-full min-w-0">
              
              <h3 className="text-md font-extrabold text-[#1e3a8a] border-b border-indigo-200 pb-2 mb-3.5 uppercase flex items-center justify-between">
                <span>📂 Comunidades Relacionadas</span>
                <button 
                  onClick={() => setShowRelatedCommsModal(false)}
                  className="hover:text-red-500 font-extrabold font-mono text-[10px]"
                >
                  FECHAR (x)
                </button>
              </h3>

              <div 
                ref={modalRelatedScrollRef}
                className="flex-1 overflow-y-auto pr-3 scroll-smooth bg-white border-2 border-dashed border-neutral-300 p-4 rounded-sm"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div className="flex flex-col gap-3">
                  {dbCommunities.map((comm) => (
                    <div 
                      key={comm.id}
                      onClick={() => {
                        setActiveCommId(comm.id);
                        setActiveTopic(null);
                        setShowRelatedCommsModal(false);
                      }}
                      className="border rounded p-3 flex gap-3 bg-neutral-50 hover:bg-pink-100/35 hover:border-pink-300 cursor-pointer transition-all"
                    >
                      <div className="w-12 h-12 bg-indigo-50 border border-neutral-200 rounded flex-shrink-0 flex items-center justify-center text-2xl shadow-inner select-none overflow-hidden">
                        {comm.avatar && comm.avatar.startsWith('data:') ? (
                          <img src={comm.avatar} alt={comm.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{comm.avatar || '👥'}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 text-xs">
                        <h4 className="font-bold text-neutral-800 text-xs hover:underline">{comm.name}</h4>
                        <p className="text-neutral-500 text-[10.5px] mt-0.5 whitespace-pre-wrap truncate">{comm.description}</p>
                        <div className="flex items-center gap-2 mt-2 pt-1 font-mono text-[9px] text-[#2563eb]">
                          <span>📂 Categoria: {comm.category}</span>
                          <span className="text-zinc-400">•</span>
                          <span>👥 Membros: {comm.members || 2847}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Float Scroll-assistant bar specifically requested by user using + and - icons */}
            <div className="flex flex-col justify-center items-center gap-2 select-none border-l pl-2 border-neutral-300 self-center md:h-full">
              <span className="text-[8px] uppercase tracking-wide font-black text-neutral-500 orientation-tb rotate-180 md:my-2 hidden md:block">ROLOGE</span>
              <button 
                onClick={() => handleSmoothScroll(modalRelatedScrollRef, 'up')}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                title="Rolar para Cima (-)"
              >
                <Minus size={16} className="stroke-[3]" />
              </button>
              <button 
                onClick={() => handleSmoothScroll(modalRelatedScrollRef, 'down')}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                title="Rolar para Baixo (+)"
              >
                <Plus size={16} className="stroke-[3]" />
              </button>
              <span className="text-[10px] font-bold text-indigo-700 font-mono mt-1 hidden md:block">Scroll</span>
            </div>

          </div>
        </div>
      )}

      {/* External Media Modal */}
      {activeMedia && (
        <ExternalMediaModal media={activeMedia} onClose={() => setActiveMedia(null)} />
      )}

    </div>
  );
}
