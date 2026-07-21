import React, { useState, useEffect } from "react";
import { PREDEFINED_LIBRARY_TRACKS, MUSIC_CATEGORIES, LibraryTrack } from "../../data/musicLibrary";
import { db, auth, storage, ref, uploadBytes, getDownloadURL } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Search, Music, Upload, Link, Check, AlertTriangle, Disc, Heart, Shield, HelpCircle, X, MoreVertical } from "lucide-react";
import { MusicCoverTab } from "./MusicCoverTab";
import { Profile } from "../../types";

interface MusicConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: {
    title: string;
    artist: string;
    source: string;
    url: string;
    coverUrl?: string;
  } | null;
  premiumStatus: "free" | "pro";
  profile: Profile;
  onSave: (trackData: {
    title: string;
    artist: string;
    source: string;
    url: string;
    coverUrl?: string;
    embedHtml?: string;
    premiumStatus: "free" | "pro";
  }) => Promise<void>;
  onSaveProfile?: (updatedProfile: Partial<Profile>) => Promise<void> | void;
  coverType: "library" | "custom";
  coverId: string;
  coverUrl: string;
  onCoverChange: (type: "library" | "custom", id: string, url: string) => void;
  onSaveCover: () => void;
}

export const MusicConfigModal: React.FC<MusicConfigModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  premiumStatus,
  profile,
  onSave,
  onSaveProfile,
  coverType,
  coverId,
  coverUrl,
  onCoverChange,
  onSaveCover,
}) => {
  if (!isOpen) return null;

  // Active Tab: 'library' | 'my_music' | 'upload' | 'cover'
  const [activeTab, setActiveTab] = useState<"library" | "my_music" | "upload" | "cover">("library");
  
  // Library specific view: 'all' (Standard Predefined) | 'uploads' (Minhas Músicas)
  const [activeLibraryView, setActiveLibraryView] = useState<"all" | "uploads">("all");
  
  // Sub-tabs inside "Minhas Músicas" view as requested
  const [myMusicSubTab, setMyMusicSubTab] = useState<"upload" | "cover">("upload");
  
  // Premium Plan Selection
  const [plan, setPlan] = useState<"free" | "pro">(premiumStatus);

  // Library State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTrack, setSelectedTrack] = useState<LibraryTrack | null>(null);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [storageUsed, setStorageUsed] = useState<number>(profile?.uploadedMusicSize ?? 0); // Initialize realistically from profile, defaulting to 0
  const storageLimit = 50.0; // 50MB storage limit

  // State for deleting tracks
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [showExcluirOptions, setShowExcluirOptions] = useState<boolean>(false);
  const [showConfirmationBox, setShowConfirmationBox] = useState<boolean>(false);

  // User uploaded tracks state
  const [userUploadedTracks, setUserUploadedTracks] = useState<any[]>(profile?.uploadedTracks || []);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  // Sync userUploadedTracks state with profile prop updates
  useEffect(() => {
    if (profile?.uploadedTracks) {
      setUserUploadedTracks(profile.uploadedTracks);
    }
  }, [profile?.uploadedTracks]);

  useEffect(() => {
    let active = true;
    const resolveUploads = async () => {
      const urls: Record<string, string> = {};
      const tracksToResolve = userUploadedTracks || [];
      for (const track of tracksToResolve) {
        if (track.url && track.url.startsWith("indexeddb://")) {
          const id = track.url.replace("indexeddb://", "");
          try {
            const url = await getResolvedAudioUrl(id);
            if (url) {
              urls[track.url] = url;
            }
          } catch (err) {
            console.warn("Failed to pre-resolve track:", id, err);
          }
        }
      }
      if (active) {
        setResolvedUrls(urls);
      }
    };
    resolveUploads();
    return () => {
      active = false;
    };
  }, [userUploadedTracks]);

  // Initialize form with existing values if any
  useEffect(() => {
    if (currentTrack) {
      if (currentTrack.source === "library") {
        const found = PREDEFINED_LIBRARY_TRACKS.find(t => t.url === currentTrack.url);
        if (found) {
          setSelectedTrack(found);
        }
      } else if (currentTrack.source === "upload") {
        setActiveTab("my_music");
        setUploadTitle(currentTrack.title);
        setUploadArtist(currentTrack.artist);
        const tracks = userUploadedTracks || [];
        const mapped = tracks.map((t: any) => ({
          id: t.id || `upload-${t.timestamp || Date.now()}`,
          title: t.title,
          artist: t.artist,
          category: "uploads",
          url: t.url,
          playableUrl: t.url.startsWith("indexeddb://") ? (resolvedUrls[t.url] || t.url) : t.url,
          coverUrl: t.coverUrl || "",
        }));
        const found = mapped.find(t => t.title === currentTrack.title && t.artist === currentTrack.artist);
        if (found) {
          setSelectedTrack(found);
        } else if (tracks.length > 0) {
          // Fallback if not mapped yet
          setSelectedTrack({
            id: currentTrack.id || "current-uploaded-track",
            title: currentTrack.title,
            artist: currentTrack.artist,
            category: "uploads",
            url: currentTrack.url,
            playableUrl: currentTrack.playableUrl || currentTrack.url,
            coverUrl: currentTrack.coverUrl || "",
          });
        }
      }
    }
  }, [currentTrack, userUploadedTracks, resolvedUrls]);

  // Load actual storage stats from Firestore if exists
  useEffect(() => {
    const fetchStorageStats = async () => {
      const uid = profile?.id === "me" ? (auth.currentUser?.uid || "me") : (profile?.id || auth.currentUser?.uid || "me");
      if (!uid) return;
      try {
        const userDoc = await getDoc(doc(db, "profiles", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          const tracks = data.uploadedTracks || [];
          setUserUploadedTracks(tracks);
          
          let size = 0;
          if (data.uploadedMusicSize !== undefined) {
            size = data.uploadedMusicSize;
          } else if (tracks.length > 0) {
            size = Number((tracks.length * 4.5).toFixed(1));
          }
          setStorageUsed(size);

          if (onSaveProfile) {
            await onSaveProfile({
              uploadedMusicSize: size,
              uploadedTracks: tracks,
            });
          }
        } else {
          setStorageUsed(0);
          setUserUploadedTracks([]);
        }
      } catch (e) {
        console.warn("Could not retrieve user storage stats:", e);
      }
    };
    if (isOpen) {
      fetchStorageStats();
    }
  }, [isOpen]);

  const handleDeleteTrack = async (trackId: string) => {
    try {
      const uid = profile?.id === "me" ? (auth.currentUser?.uid || "me") : (profile?.id || auth.currentUser?.uid || "me");
      if (!uid) return;

      // 1. Delete from IndexedDB
      try {
        await deleteAudioBlob(trackId);
        console.log("[IndexedDB] Track audio deleted successfully");
      } catch (dbErr) {
        console.warn("Could not delete audio from IndexedDB:", dbErr);
      }

      // 2. Filter out deleted track from list
      const remainingTracks = userUploadedTracks.filter((t: any) => t.id !== trackId);

      // 3. Recalculate storage used
      let newStorageUsed = 0;
      if (remainingTracks.length > 0) {
        const perTrackEst = userUploadedTracks.length > 0 ? (storageUsed / userUploadedTracks.length) : 4.5;
        newStorageUsed = Number(Math.max(0, storageUsed - perTrackEst).toFixed(2));
      }

      // 4. Update Firestore
      const profileDocRef = doc(db, "profiles", uid);
      await updateDoc(profileDocRef, {
        uploadedMusicSize: newStorageUsed,
        uploadedTracks: remainingTracks,
      });
      console.log("[Firestore] Track deleted successfully");

      // 5. Update local state
      setUserUploadedTracks(remainingTracks);
      setStorageUsed(newStorageUsed);

      // 6. Notify parent via onSaveProfile if provided
      if (onSaveProfile) {
        await onSaveProfile({
          uploadedMusicSize: newStorageUsed,
          uploadedTracks: remainingTracks,
        });
      }

      // 7. If the deleted track was the currently selected/playing track, reset it
      if (selectedTrack?.id === trackId) {
        setSelectedTrack(null);
      }
    } catch (err: any) {
      console.error("Error deleting track:", err.message || err);
    }
  };

  const handleSelectPredefined = (track: LibraryTrack) => {
    setSelectedTrack(track);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileSizeMB = file.size / (1024 * 1024);

      // Rule: 10-15MB per file limit
      if (fileSizeMB > 15) {
        setUploadError("Limite excedido: Músicas por upload devem ter no máximo 15 MB.");
        return;
      }

      // Rule: Total 50MB storage check
      if (storageUsed + fileSizeMB > storageLimit) {
        setUploadError("Limite excedido: Você excederá os 50 MB totais do plano PRO.");
        return;
      }

      setUploadFile(file);
      // Auto-populate title/artist if name matches format "Artist - Title"
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      if (nameWithoutExt.includes(" - ")) {
        const parts = nameWithoutExt.split(" - ");
        setUploadArtist(parts[0]);
        setUploadTitle(parts[1]);
      } else {
        setUploadTitle(nameWithoutExt);
        setUploadArtist(auth.currentUser?.displayName || "Meu Computador");
      }
    }
  };

  const handleSaveUpload = async () => {
    setUploadError("");
    if (plan !== "pro") {
      setUploadError("O envio de arquivos está disponível apenas no plano PRO.");
      return;
    }

    if (!uploadFile) {
      setUploadError("Selecione um arquivo MP3 para enviar.");
      return;
    }

    if (!uploadTitle.trim() || !uploadArtist.trim()) {
      setUploadError("Por favor, preencha o título e artista.");
      return;
    }

    try {
      setUploadProgress(true);
      const uid = profile?.id === "me" ? (auth.currentUser?.uid || "me") : (profile?.id || auth.currentUser?.uid || "me");
      const trackId = `upload-${Date.now()}`;

      // Upload directly to Firebase Storage first
      const fileExt = uploadFile.name.split(".").pop();
      const storagePath = `music_uploads/${uid}/${trackId}.${fileExt}`;
      const fileRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(fileRef, uploadFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log("[PASSO 1 OK] Storage salvo:", downloadUrl);

      const newTrack = {
        id: trackId,
        title: uploadTitle.trim(),
        artist: uploadArtist.trim(),
        source: "upload",
        url: downloadUrl,
        timestamp: Date.now(),
        category: "uploads",
      };

      const fileSizeMB = uploadFile.size / (1024 * 1024);
      const newStorageUsed = Number((storageUsed + fileSizeMB).toFixed(2));

      // 2. Instantly save to Firestore profile document: uploadedTracks & listeningNow
      let finalUpdatedTracks = [newTrack];
      try {
        const profileDocRef = doc(db, "profiles", uid);
        const profileDoc = await getDoc(profileDocRef);
        let existingTracks = [];
        if (profileDoc.exists()) {
          existingTracks = profileDoc.data().uploadedTracks || [];
        }

        const filteredTracks = existingTracks.filter((t: any) => 
          !(t.title === newTrack.title && t.artist === newTrack.artist)
        );

        finalUpdatedTracks = [...filteredTracks, newTrack];

        await updateDoc(profileDocRef, {
          uploadedMusicSize: newStorageUsed,
          uploadedTracks: finalUpdatedTracks,
        });
        console.log("[PASSO 3 OK] updateDoc uploadedTracks concluído");
      } catch (firestoreErr: any) {
        console.error("[PASSO 3 ERRO] updateDoc uploadedTracks falhou. Motivo:", firestoreErr.message || firestoreErr);
        alert("Erro ao salvar música na sua biblioteca. Tente novamente mais tarde.");
      }

      setStorageUsed(newStorageUsed);

      // Update local modal state of uploaded tracks so it renders instantly
      setUserUploadedTracks(finalUpdatedTracks);

      if (onSaveProfile) {
        await onSaveProfile({
          uploadedMusicSize: newStorageUsed,
          uploadedTracks: finalUpdatedTracks,
        });
      }

      // 3. Complete modal flow and set current playing track to the local track URL
      const playableBlobUrl = URL.createObjectURL(uploadFile);
      setCachedAudioUrl(trackId, playableBlobUrl);

      await onSave({
        title: uploadTitle.trim(),
        artist: uploadArtist.trim(),
        source: "upload",
        url: downloadUrl,
        playableUrl: playableBlobUrl, // Pass synchronous local object URL for instant playback
        premiumStatus: plan,
      });

      // Permanece no modal, mas muda para a aba "Minhas Músicas" e seleciona a nova faixa
      setSelectedTrack(newTrack);
      setActiveTab("my_music");
    } catch (e: any) {
      console.error(e);
      alert("Falha ao processar música: " + (e.message || "Erro desconhecido."));
      setUploadError(e.message || "Falha ao processar música.");
    } finally {
      setUploadProgress(false);
    }
  };

  const handleSaveLibrary = async () => {
    if (!selectedTrack) {
      alert("Por favor, selecione uma música!");
      return;
    }

    try {
      setUploadProgress(true);
      await onSave({
        title: selectedTrack.title,
        artist: selectedTrack.artist,
        source: selectedTrack.category === "uploads" ? "upload" : "library",
        url: selectedTrack.url,
        playableUrl: selectedTrack.playableUrl || selectedTrack.url,
        coverUrl: selectedTrack.coverUrl,
        premiumStatus: plan,
      });
      onClose();
    } catch (e: any) {
      alert("Erro ao salvar música: " + (e.message || "Erro desconhecido."));
    } finally {
      setUploadProgress(false);
    }
  };

  // Local categories list including the personal library category
  const localCategories = [
    { id: "uploads", name: "⭐ Biblioteca Pessoal (Meus Uploads)" },
    ...MUSIC_CATEGORIES,
  ];

  // Map userUploadedTracks to standard LibraryTrack
  const mappedUserTracks: LibraryTrack[] = userUploadedTracks.map((t: any) => ({
    id: t.id || `upload-${t.timestamp || Date.now()}`,
    title: t.title,
    artist: t.artist,
    category: "uploads",
    url: t.url,
    playableUrl: t.url.startsWith("indexeddb://") ? (resolvedUrls[t.url] || t.url) : t.url,
    coverUrl: t.coverUrl || "",
  }));

  const allTracks = [...mappedUserTracks, ...PREDEFINED_LIBRARY_TRACKS];

  // Filter both uploaded and predefined tracks
  const filteredTracks = allTracks.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || track.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-neutral-950/80 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in select-none">
      <div className="bg-[#f0f5fa] border-2 border-[#1d4ed8] shadow-[0_0_25px_rgba(29,78,216,0.4)] w-full max-w-4xl rounded-lg overflow-hidden flex flex-col font-sans">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white px-4 py-2 flex justify-between items-center select-none border-b border-[#1d4ed8]">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Disc className="w-4 h-4 animate-spin-slow" /> Configuração do Player de Música
          </span>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded p-1 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan Upgrade Banner / Feature */}
        <div className="bg-[#eff6ff] border-b border-[#bfdbfe] px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${plan === "pro" ? "text-purple-600" : "text-blue-500"}`} />
            <div>
              <span className="text-xs font-bold text-neutral-800">
                Plano Selecionado:{" "}
                <span className={`uppercase font-black ${plan === "pro" ? "text-purple-600 animate-pulse" : "text-blue-500"}`}>
                  {plan}
                </span>
              </span>
              <p className="text-[10px] text-neutral-500">
                {plan === "free"
                  ? "Suporta músicas da Biblioteca."
                  : "Desbloqueia uploads de MP3 (até 15MB/arquivo, 50MB total)."}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 bg-white p-1 border border-neutral-250 rounded shadow-xs w-full sm:w-auto">
            <button
              onClick={() => {
                setPlan("free");
                if (activeTab === "upload") setActiveTab("library");
              }}
              className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                plan === "free"
                  ? "bg-[#1d4ed8] text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              FREE
            </button>
            <button
              onClick={() => setPlan("pro")}
              className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-1 ${
                plan === "pro"
                  ? "bg-purple-700 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              ⭐ PRO
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-neutral-250 bg-[#e1eaf2] overflow-x-auto">
          <button
            onClick={() => setActiveTab("library")}
            className={`flex-1 min-w-[110px] py-2 text-xs font-bold transition-all border-r border-neutral-250 flex items-center justify-center gap-1.5 ${
              activeTab === "library"
                ? "bg-white text-[#1d4ed8] border-b-2 border-b-[#1d4ed8]"
                : "text-neutral-600 hover:bg-white/40"
            }`}
          >
            <Disc className="w-3.5 h-3.5" /> Biblioteca Retro
          </button>
          <button
            onClick={() => setActiveTab("my_music")}
            className={`flex-1 min-w-[110px] py-2 text-xs font-bold transition-all border-r border-neutral-250 flex items-center justify-center gap-1.5 ${
              activeTab === "my_music"
                ? "bg-white text-purple-700 border-b-2 border-b-purple-700"
                : "text-neutral-600 hover:bg-white/40"
            }`}
          >
            <Music className="w-3.5 h-3.5" /> Minhas Músicas
          </button>
          <button
            onClick={() => {
              if (plan !== "pro") {
                alert("O upload de arquivos está disponível apenas no plano PRO. Ative o plano PRO acima para testar esta funcionalidade!");
                return;
              }
              setActiveTab("upload");
            }}
            className={`flex-1 min-w-[100px] py-2 text-xs font-bold transition-all border-r border-neutral-250 flex items-center justify-center gap-1.5 ${
              plan !== "pro" ? "opacity-50 cursor-not-allowed" : ""
            } ${
              activeTab === "upload"
                ? "bg-white text-purple-700 border-b-2 border-b-purple-700"
                : "text-neutral-600 hover:bg-white/40"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Enviar MP3
          </button>
          <button
            onClick={() => setActiveTab("cover")}
            className={`flex-1 min-w-[100px] py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "cover"
                ? "bg-white text-pink-600 border-b-2 border-b-pink-600"
                : "text-neutral-600 hover:bg-white/40"
            }`}
          >
            <Disc className="w-3.5 h-3.5 text-pink-500 animate-spin-slow" /> Capa do CD
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className={`p-6 flex-1 overflow-y-auto max-h-[620px] transition-colors duration-300 ${activeTab === "cover" ? "bg-[#11111c]" : ""}`}>
          
          {/* 1. LIBRARY TAB */}
          {activeTab === "library" && (
            <div className="space-y-4 text-left">
              {/* Retro Directory Nav Style Submenu as requested: "Biblioteca Retro └── Minhas Músicas" */}
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded p-2.5 flex items-center justify-between select-none">
                <span className="text-[11px] font-bold text-[#1d4ed8] flex items-center gap-1">
                  📂 Biblioteca Retro ➔ <span className="text-neutral-500 font-normal">Músicas Oficiais do Sistema</span>
                </span>
                <button
                  onClick={() => setActiveTab("my_music")}
                  className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[10px] uppercase rounded cursor-pointer transition-all flex items-center gap-1"
                >
                  <Music className="w-3 h-3" /> Ver Minhas Músicas ➔
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Pesquisar na Biblioteca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm pl-10 pr-4 py-2.5 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] bg-white font-medium"
                  />
                  <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-3" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-sm px-3 py-2.5 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] bg-white min-w-[200px] font-semibold cursor-pointer"
                >
                  <option value="all">Todas as Categorias</option>
                  {MUSIC_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Predefined Track Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
                {PREDEFINED_LIBRARY_TRACKS.filter((track) => {
                  const matchesSearch =
                    track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    track.artist.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory = selectedCategory === "all" || track.category === selectedCategory;
                  return matchesSearch && matchesCategory;
                }).length === 0 ? (
                  <div className="col-span-full text-center py-12 text-sm text-neutral-500 italic">
                    Nenhuma música encontrada chapa.
                  </div>
                ) : (
                  PREDEFINED_LIBRARY_TRACKS.filter((track) => {
                    const matchesSearch =
                      track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      track.artist.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = selectedCategory === "all" || track.category === selectedCategory;
                    return matchesSearch && matchesCategory;
                  }).map((track) => {
                    const isSelected = selectedTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => handleSelectPredefined(track)}
                        className={`p-3.5 rounded-lg border-2 cursor-pointer flex items-center gap-3 transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-50 border-[#1d4ed8] shadow-md scale-[1.01]"
                            : "bg-white border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50/50"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-neutral-200 relative flex-shrink-0 border border-neutral-300">
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt="Cover"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-white font-bold text-sm">
                              💿
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h5 className="text-sm font-bold text-neutral-900 truncate leading-snug">
                            {track.title}
                          </h5>
                          <p className="text-xs text-neutral-500 truncate leading-tight mt-0.5">
                            {track.artist}
                          </p>
                          <span className="inline-block mt-1.5 text-[10px] font-bold uppercase text-[#1d4ed8] bg-blue-100/70 px-2 py-0.5 rounded">
                            {MUSIC_CATEGORIES.find((c) => c.id === track.category)?.name || "Geral"}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="bg-[#1d4ed8] text-white rounded-full p-1 shadow-xs flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Library Action */}
              <div className="pt-3 border-t border-neutral-250 flex justify-end">
                <button
                  onClick={handleSaveLibrary}
                  disabled={uploadProgress || !selectedTrack}
                  className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold text-sm rounded transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadProgress ? "Processando..." : "Definir Música de Perfil"}
                </button>
              </div>
            </div>
          )}

          {/* 1.1 MINHAS MÚSICAS TAB */}
          {activeTab === "my_music" && (
            <div className="space-y-4 text-left">
              {/* Breadcrumb style */}
              <div className="bg-purple-50 border border-purple-200 rounded p-2.5 flex items-center justify-between select-none">
                <span className="text-[11px] font-bold text-purple-700 flex items-center gap-1">
                  📂 Biblioteca Retro ➔ <span className="font-extrabold text-purple-800">Minhas Músicas</span>
                </span>
                <button
                  onClick={() => setActiveTab("library")}
                  className="px-3 py-1 bg-[#1d4ed8] hover:bg-blue-800 text-white font-extrabold text-[10px] uppercase rounded cursor-pointer transition-all flex items-center gap-1"
                >
                  ➔ Voltar para Biblioteca Oficiais
                </button>
              </div>

              {/* Filters */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar nas minhas músicas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-700 bg-white font-medium"
                />
                <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-3" />
              </div>

              {/* Track Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
                {mappedUserTracks.filter((track) => {
                  return track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchTerm.toLowerCase());
                }).length === 0 ? (
                  <div className="col-span-full text-center py-12 text-sm text-neutral-500 italic">
                    Você ainda não tem músicas enviadas chapa. Envie um MP3 na aba "Enviar MP3" acima!
                  </div>
                ) : (
                  mappedUserTracks.filter((track) => {
                    return track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           track.artist.toLowerCase().includes(searchTerm.toLowerCase());
                  }).map((track) => {
                    const isSelected = selectedTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => handleSelectPredefined(track)}
                        className={`p-3.5 rounded-lg border-2 cursor-pointer flex items-center gap-3 transition-all duration-200 relative ${
                          isSelected
                            ? "bg-purple-50 border-purple-700 shadow-md scale-[1.01]"
                            : "bg-white border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50/50"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-neutral-200 relative flex-shrink-0 border border-neutral-300">
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt="Cover"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-white font-bold text-sm">
                              💿
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h5 className="text-sm font-bold text-neutral-900 truncate leading-snug">
                            {track.title}
                          </h5>
                          <p className="text-xs text-neutral-500 truncate leading-tight mt-0.5">
                            {track.artist}
                          </p>
                          <span className="inline-block mt-1.5 text-[10px] font-bold uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                            Meus Uploads
                          </span>
                        </div>
                        {isSelected && (
                          <div className="bg-purple-700 text-white rounded-full p-1 shadow-xs flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}

                        {/* 3-dots button on the top-right corner of the card */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeMenuTrackId === track.id) {
                              setActiveMenuTrackId(null);
                              setShowExcluirOptions(false);
                              setShowConfirmationBox(false);
                            } else {
                              setActiveMenuTrackId(track.id);
                              setShowExcluirOptions(false);
                              setShowConfirmationBox(false);
                            }
                          }}
                          className="absolute top-1.5 right-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 p-1 rounded transition-all cursor-pointer z-10"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Backdrop overlay only for this open menu to handle click-outside */}
                        {activeMenuTrackId === track.id && (
                          <div 
                            className="fixed inset-0 z-20 cursor-default" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuTrackId(null);
                              setShowExcluirOptions(false);
                              setShowConfirmationBox(false);
                            }}
                          />
                        )}

                        {/* Floating menu on the right of the 3 dots */}
                        {activeMenuTrackId === track.id && (
                          <div 
                            className="absolute left-[92%] sm:left-[95%] md:left-full top-1.5 ml-1 z-30 flex flex-col items-start select-none font-sans"
                            onClick={(e) => e.stopPropagation()} // Prevent selecting the track when clicking inside the menu
                          >
                            {/* EXCLUIR Button */}
                            <button
                              onClick={() => {
                                setShowExcluirOptions(true);
                              }}
                              className="bg-white border border-neutral-300 rounded px-2.5 py-1 flex items-center gap-2 shadow-md hover:bg-neutral-50 transition-all cursor-pointer font-bold text-[10px] uppercase tracking-wider text-neutral-800 shrink-0"
                            >
                              <span className="text-red-600 font-bold">🗑️</span> EXCLUIR
                            </button>

                            {/* Options Tree under EXCLUIR */}
                            {showExcluirOptions && (
                              <div className="relative pl-0 mt-1 flex flex-col gap-1.5 w-full">
                                {/* Option SIM */}
                                <div className="relative flex items-center">
                                  {!showConfirmationBox ? (
                                    <button
                                      onClick={() => {
                                        setShowConfirmationBox(true);
                                      }}
                                      className="bg-white border border-neutral-300 rounded px-4 py-0.5 flex items-center justify-center shadow-sm hover:bg-neutral-50 transition-all cursor-pointer font-bold text-[10px] text-neutral-800 min-w-[70px] h-6"
                                    >
                                      SIM
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="bg-neutral-50 border border-neutral-200 rounded px-4 py-0.5 flex items-center justify-center shadow-none opacity-40 font-bold text-[10px] text-neutral-400 min-w-[70px] h-6"
                                    >
                                      SIM
                                    </button>
                                  )}
                                </div>

                                {/* Option NAO or Confirmation Gray Box */}
                                <div className="relative flex items-start">
                                  {!showConfirmationBox ? (
                                    <button
                                      onClick={() => {
                                        // Simply close menu and do nothing
                                        setActiveMenuTrackId(null);
                                        setShowExcluirOptions(false);
                                        setShowConfirmationBox(false);
                                      }}
                                      className="bg-white border border-neutral-300 rounded px-4 py-0.5 flex items-center justify-between shadow-sm hover:bg-neutral-50 transition-all cursor-pointer font-bold text-[10px] text-neutral-800 min-w-[70px] h-6 relative"
                                    >
                                      <span className="w-full text-center">NÃO</span>
                                      <span className="absolute right-1 top-0 text-[8px] font-normal text-neutral-400">x</span>
                                    </button>
                                  ) : (
                                    /* Confirmation box */
                                    <div className="bg-[#d9e2ec] border border-neutral-400 rounded p-2 flex flex-col items-center gap-2 shadow-md min-w-[130px] max-w-[150px] text-center relative font-sans animate-fade-in shrink-0">
                                      {/* Discrete close x button */}
                                      <button
                                        onClick={() => {
                                          // Simply close without deleting
                                          setActiveMenuTrackId(null);
                                          setShowExcluirOptions(false);
                                          setShowConfirmationBox(false);
                                        }}
                                        className="absolute top-0.5 right-1 text-neutral-500 hover:text-neutral-800 text-[9px] font-bold transition-all cursor-pointer"
                                      >
                                        x
                                      </button>
                                      
                                      <p className="text-[9px] font-semibold text-neutral-800 leading-tight">
                                        Esta ação removerá<br />a faixa da sua biblioteca.
                                      </p>
                                      
                                      <button
                                        onClick={async () => {
                                          await handleDeleteTrack(track.id);
                                          // Close menu
                                          setActiveMenuTrackId(null);
                                          setShowExcluirOptions(false);
                                          setShowConfirmationBox(false);
                                        }}
                                        className="bg-[#990000] hover:bg-[#b30000] text-white font-extrabold text-[9px] uppercase py-0.5 px-2.5 rounded shadow-sm cursor-pointer transition-all active:scale-95"
                                      >
                                        ok
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* My Music Action */}
              <div className="pt-3 border-t border-neutral-250 flex justify-end">
                <button
                  onClick={handleSaveLibrary}
                  disabled={uploadProgress || !selectedTrack}
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {uploadProgress ? "Processando..." : "DEFINIR MUSICA"}
                </button>
              </div>
            </div>
          )}

          {/* 2. EXTERNAL LINK TAB (REMOVED) */}
        
        {/* 3. ENVIAR MP3 TAB (PRO) */}
          {activeTab === "upload" && (
            <div className="space-y-3.5 text-left">
              {/* Storage Quota Bar */}
              <div className="bg-white p-3 border border-neutral-250 rounded shadow-xs">
                <div className="flex justify-between items-center text-[10.5px] font-bold text-neutral-600 mb-1 select-none">
                  <span>Armazenamento Total de Música PRO</span>
                  <span className="font-mono text-purple-700">
                    {storageUsed.toFixed(1)} MB / {storageLimit} MB ({Math.round((storageUsed / storageLimit) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all duration-500 rounded-full"
                    style={{ width: `${(storageUsed / storageLimit) * 100}%` }}
                  />
                </div>
                <p className="text-[9.5px] text-neutral-500 mt-1 select-none">
                  Cada upload está limitado a 10-15 MB por arquivo, com armazenamento de até 50 MB totais.
                </p>
              </div>

              {/* Drag and Drop Upload Area */}
              <div className="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-purple-50/20 rounded p-5 text-center transition-all relative">
                <input
                  type="file"
                  accept="audio/mp3,audio/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2 animate-bounce-slow" />
                <span className="text-xs font-bold text-neutral-800 block">
                  {uploadFile ? uploadFile.name : "Arraste seu arquivo MP3 ou clique para selecionar"}
                </span>
                <span className="text-[10px] text-neutral-500 mt-1 block select-none">
                  Formatos aceitos: .mp3, .wav, .m4a (Máximo de 15 MB)
                </span>
              </div>

              {/* Title & Artist fields */}
              {uploadFile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                      Título da Música:
                    </label>
                    <input
                      type="text"
                      placeholder="Nome da faixa"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                      Artista / Banda:
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do artista"
                      value={uploadArtist}
                      onChange={(e) => setUploadArtist(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-sans"
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="text-red-600 text-[11px] font-bold select-none">
                  ⚠️ {uploadError}
                </p>
              )}

              {/* Upload action */}
              <div className="pt-2 border-t border-neutral-250 flex justify-end">
                <button
                  onClick={handleSaveUpload}
                  disabled={uploadProgress || !uploadFile}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1"
                >
                  {uploadProgress ? (
                    <>
                      <Disc className="w-3.5 h-3.5 animate-spin" /> Fazendo Upload para o Storage...
                    </>
                  ) : (
                    "Enviar Mídia e Definir"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 4. CAPA DO CD TAB */}
          {activeTab === "cover" && (
            <div className="space-y-4 p-4 rounded-xl" style={{ backgroundColor: "#11111c" }}>
              <MusicCoverTab
                premiumStatus={plan}
                coverType={coverType}
                coverId={coverId}
                coverUrl={coverUrl}
                onChangeCover={onCoverChange}
                songTitle={currentTrack?.title || "Sensorium (Gothic Symphony)"}
                artistName={currentTrack?.artist || "EPICA"}
              />
              
              {/* Bottom footer button bar specifically for CD Cover config tab as requested */}
              <div className="pt-3 border-t border-blue-950/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-neutral-900/10 hover:bg-neutral-100 border border-neutral-300 text-neutral-600 hover:text-neutral-800 font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveCover();
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-pink-500 to-[#d946ef] hover:from-pink-600 hover:to-fuchsia-600 text-white font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.35)] hover:shadow-[0_0_20px_rgba(236,72,153,0.55)] transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3px]" /> Salvar Capa
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
