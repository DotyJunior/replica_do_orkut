export interface ExternalMedia {
  type: 'youtube' | 'spotify' | 'soundcloud';
  url: string;
  title: string;
  artist?: string;
  thumbnail?: string;
  provider: 'youtube' | 'spotify' | 'soundcloud';
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  location: string;
  relationship: string;
  humor: string;
  hereFor: string;
  fashion: string;
  religion: string;
  ethnicity: string;
  languages: string;
  hometown: string;
  webpage: string;
  passions: string;
  aboutMe: string;
  // Trust/Cool/Sexy/Fans meters
  trusty: number; // 0 to 3 yellow smileys
  cool: number;   // 0 to 3 blue ice cubes
  sexy: number;   // 0 to 3 red hearts
  fans: number;   // star counts
  username?: string;
  theme?: string;
  statusOnline?: string;
  nome_exibicao?: string;
  estilo_fonte?: string;
  preserve_formatting?: boolean;
  isEmailVerified?: boolean;
  isTwoFactorEnabled?: boolean;
  emailCode?: string | null;
  emailCodeExpiresAt?: number | null;
  emailCodeAttempts?: number;
  emailCodeResendsCount?: number;
  emailCodeLastSentAt?: number;
  listeningNow?: {
    title: string;
    artist: string;
    source: string;
    url: string;
    coverUrl?: string;
    embedHtml?: string;
    isPlaying: boolean;
    timestamp: number;
  } | null;
  lastPlayedMusic?: {
    title: string;
    artist: string;
    source: string;
    url: string;
    embedHtml?: string;
    timestamp: number;
    likesList?: string[];
  } | null;
  premiumStatus?: "free" | "pro";
  uploadedMusicSize?: number;
  uploadedTracks?: any[];
  coverType?: "library" | "custom";
  coverId?: string;
  coverUrl?: string;
}

export interface Scrap {
  id: string;
  fromName: string;
  fromAvatar: string;
  fromId: string;
  toId: string;
  timestamp: string;
  rawContent: string;
  ciphertext?: string;
  isEncrypted: boolean;
  algorithm?: string;
  signature?: string;
  likes?: number;
  likedByMe?: boolean;
  sharesCount?: number;
  imageUrl?: string;
}

export interface Testimonial {
  id: string;
  fromName: string;
  fromAvatar: string;
  fromId: string;
  toId: string;
  timestamp: string;
  content: string;
  isEncrypted: boolean;
  ciphertext?: string;
  aesKeyHex?: string;
  unlocked: boolean;
  likes?: number;
  likedByMe?: boolean;
  sharesCount?: number;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  avatar: string; // custom color/emoji or icon
  category: string;
  secureMode: boolean; // Needs cryptographic key signature check to enter
  language?: string;
  type?: string;
  createdAt?: string;
  ownerId?: string;
  moderators?: string[];
  rules?: string;
  admissionQuestions?: { id: string; question: string; type: 'text' }[];
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  location: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  senderId?: string;
  receiverId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface RustConsoleLog {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'stdout' | 'comment';
  timestamp: string;
}

export interface PhotoComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  date: string;
}

export interface Photo {
  id: string;
  url: string;
  caption: string;
  song?: string;
  gifUrl?: string;
  effect?: string;
  likes: number;
  likedByMe?: boolean;
  loves?: number;
  lovedByMe?: boolean;
  comments: PhotoComment[];
  date: string;
}

export interface Album {
  id: string;
  profileId: string;
  name: string;
  description: string;
  theme: 'neon-hacker' | 'emo-2008' | 'vhs' | 'cyberpunk' | 'glitter' | 'gotico' | 'polaroid' | 'old-camera';
  photos: Photo[];
  createdAt: string;
  likes?: number;
  likedByMe?: boolean;
  sharesCount?: number;
}

export interface SharedMemory {
  id: string;
  sharerName: string;
  sharerAvatar: string;
  itemType: 'photo' | 'scrap' | 'testimonial' | 'album' | 'post';
  itemTitle: string;
  targetUser?: string;
  timestamp: string;
  likes: number;
  likedByMe?: boolean;
}

export interface Relationship {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: "friend" | "follow" | "block";
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}


