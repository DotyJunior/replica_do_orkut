import React, { useState, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, Trash2, CheckCircle, Image, Star, Sparkles, FileCode, Check, AlertCircle } from 'lucide-react';

interface AssetsConfig {
  siteLogo: string;
  favicon: string;
}

interface AssetsData {
  categories: Record<string, string[]>;
  config: AssetsConfig;
}

interface AssetsManagerProps {
  onConfigChange?: (config: AssetsConfig) => void;
  currentTheme?: string;
}

export default function AssetsManager({ onConfigChange, currentTheme }: AssetsManagerProps) {
  const [assetsData, setAssetsData] = useState<AssetsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('branding');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all assets and global configuration
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/assets');
      if (!res.ok) throw new Error('Falha ao carregar assets do servidor');
      const data = await res.json();
      setAssetsData(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao carregar assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Show a temporary success message
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file uploads
  const handleFileUpload = async (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.svg', '.png', '.webp', '.ico'];
    
    if (!allowed.includes(ext)) {
      setError(`Extensão ${ext} não é suportada. Use apenas SVG, PNG, WEBP ou ICO.`);
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const base64 = await fileToBase64(file);
      
      const res = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          category: uploadCategory,
          base64Data: base64
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao fazer upload');

      triggerSuccess(`Arquivo "${file.name}" enviado com sucesso para a pasta "${uploadCategory}"!`);
      await fetchAssets();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Update site dynamic config (siteLogo or favicon)
  const handleSetConfig = async (type: 'siteLogo' | 'favicon', value: string) => {
    if (!assetsData) return;
    
    const updatedConfig = {
      ...assetsData.config,
      [type]: value
    };

    try {
      setError(null);
      const res = await fetch('/api/admin/assets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao salvar configuração');

      setAssetsData(prev => prev ? { ...prev, config: updatedConfig } : null);
      triggerSuccess(`Configuração de ${type === 'siteLogo' ? 'Logo' : 'Favicon'} atualizada!`);
      
      if (onConfigChange) {
        onConfigChange(updatedConfig);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configuração.');
    }
  };

  // Delete an uploaded asset
  const handleDeleteAsset = async (url: string) => {
    if (!confirm('Deseja realmente excluir este asset permanente? Esta ação não pode ser desfeita.')) return;

    try {
      setError(null);
      const res = await fetch(`/api/admin/assets?url=${encodeURIComponent(url)}`, {
        method: 'DELETE'
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao deletar asset');

      triggerSuccess('Asset excluído com sucesso!');
      await fetchAssets();
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar asset.');
    }
  };

  const categoryNames: Record<string, string> = {
    branding: 'Branding (Identidade)',
    icons: 'Icons (Ícones)',
    emojis: 'Emojis (Carinhas)',
    badges: 'Badges (Medalhas)',
    themes: 'Themes (Temas Visuais)'
  };

  return (
    <div id="assets-manager-root" className="w-full flex flex-col gap-6 animate-fade-in font-sans">
      
      {/* 1. Dashboard Info Bar */}
      <div className="bg-[#eef4fc] border border-[#a2c5ed] rounded p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm select-none">
        <div>
          <h2 className="text-lg font-bold text-[#1b4372] flex items-center gap-2">
            🗂️ Central de Assets do ScrapZone
          </h2>
          <p className="text-xs text-[#555] mt-1">
            Biblioteca oficial para armazenamento, upload e gestão de logos, carinhas, ícones e medalhas nativas da rede.
          </p>
        </div>
        
        {/* Dynamic preview of active brand assets */}
        <div className="flex items-center gap-4 bg-white/95 border border-[#a2c5ed] p-2.5 rounded shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-bold text-neutral-500">Logo Ativo</span>
            <div className="h-10 w-24 flex items-center justify-center p-1 bg-neutral-900 rounded mt-1.5 border border-zinc-700">
              <img 
                src={assetsData?.config.siteLogo || '/assets/branding/logo-original-scrap-zone.svg'} 
                alt="Logo Ativo" 
                className="max-h-full max-w-full object-contain" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }} 
              />
            </div>
          </div>
          <div className="h-10 w-px bg-neutral-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-bold text-neutral-500">Favicon</span>
            <div className="h-10 w-10 flex items-center justify-center p-1 bg-white rounded mt-1.5 border border-neutral-300">
              <img 
                src={assetsData?.config.favicon || '/assets/branding/favicon.ico'} 
                alt="Favicon Ativo" 
                className="h-6 w-6 object-contain" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications and Alerts */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3.5 rounded text-xs flex items-center gap-2 shadow-sm animate-shake">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3.5 rounded text-xs flex items-center gap-2 shadow-sm animate-pulse-once">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Grid for Uploader & File explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Asset Uploader Widget */}
        <div className="lg:col-span-4 bg-white border border-[#a2c5ed] rounded shadow-sm">
          <div className="bg-[#d4e6f1] border-b border-[#a2c5ed] px-3.5 py-2 font-bold text-xs text-[#1e3a8a] select-none flex items-center gap-1.5">
            <Upload size={13} /> ENVIAR NOVO ASSET
          </div>
          
          <div className="p-4 flex flex-col gap-4">
            
            {/* Category selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-neutral-600 uppercase">Selecione o destino:</label>
              <select 
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-400 font-sans"
              >
                {Object.entries(categoryNames).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            {/* Drag and Drop Zone */}
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50/70 scale-98 shadow-inner' 
                  : 'border-neutral-300 hover:border-[#1b4372] bg-neutral-50/60 hover:bg-neutral-50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileInputChange} 
                accept=".svg,.png,.webp,.ico" 
                className="hidden" 
              />
              <Upload size={28} className={dragActive ? 'text-blue-500 animate-bounce' : 'text-neutral-400 mb-2'} />
              <p className="text-xs font-bold text-neutral-700">Arrastar &amp; Soltar arquivo</p>
              <p className="text-[10px] text-neutral-500 mt-1">ou clique para selecionar do PC</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1">
                {['.SVG', '.PNG', '.WEBP', '.ICO'].map(ext => (
                  <span key={ext} className="bg-neutral-200 text-neutral-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                    {ext}
                  </span>
                ))}
              </div>
            </div>

            {uploading && (
              <div className="flex items-center justify-center gap-2 text-xs text-blue-600 py-1.5 bg-blue-50 rounded border border-blue-100 animate-pulse font-mono">
                <Sparkles size={13} className="animate-spin" /> ENVIANDO ARQUIVO...
              </div>
            )}

            {/* Platform rules / guidelines */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-[10px] leading-relaxed text-amber-900 select-none">
              <span className="font-extrabold flex items-center gap-1 mb-1 text-amber-800">
                ⚠️ DIRETRIZES DE ASSETS NATIVOS
              </span>
              - SVG é o formato ideal por manter qualidade infinita e peso leve.<br />
              - PNG e WEBP são ótimos para medalhas e fotos detalhadas.<br />
              - Arquivos são salvos permanentemente na pasta escolhida no servidor.<br />
              - Ícones e logotipos substituídos atualizarão automaticamente toda a plataforma.
            </div>
          </div>
        </div>

        {/* Right column: Categories Explorer */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {loading ? (
            <div className="bg-white border border-[#a2c5ed] rounded p-12 text-center text-xs text-[#1e3a8a] flex flex-col items-center gap-3 shadow-sm select-none font-mono">
              <Sparkles size={24} className="animate-spin text-blue-500" />
              <span>CARREGANDO BIBLIOTECA DE ASSETS...</span>
            </div>
          ) : assetsData ? (
            <div className="flex flex-col gap-6">
              
              {/* Explorer per category */}
              {Object.entries(categoryNames).map(([catKey, catName]) => {
                const files = assetsData.categories[catKey] || [];
                return (
                  <div key={catKey} className="bg-white border border-[#a2c5ed] rounded shadow-sm">
                    <div className="bg-[#f0f4f8] border-b border-[#a2c5ed] px-3.5 py-2 font-bold text-xs text-[#1e3a8a] select-none flex justify-between items-center">
                      <span className="flex items-center gap-1.5 uppercase font-sans">
                        📁 {catName}
                      </span>
                      <span className="bg-[#1e3a8a]/10 text-[#1e3a8a] text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                        {files.length} {files.length === 1 ? 'ARQUIVO' : 'ARQUIVOS'}
                      </span>
                    </div>

                    <div className="p-4">
                      {files.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-neutral-200 rounded text-neutral-400 text-xs select-none flex flex-col items-center gap-1 font-mono">
                          <Image size={20} className="stroke-[1.5]" />
                          <span>Esta pasta está vazia</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {files.map((fileUrl) => {
                            const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
                            const isSiteLogo = assetsData.config.siteLogo === fileUrl;
                            const isFavicon = assetsData.config.favicon === fileUrl;
                            const ext = fileUrl.substring(fileUrl.lastIndexOf('.')).toLowerCase();

                            return (
                              <div 
                                key={fileUrl} 
                                className={`border rounded group relative flex flex-col items-center p-2.5 transition-all bg-neutral-50/50 hover:bg-neutral-50 ${
                                  isSiteLogo || isFavicon 
                                    ? 'border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50/20' 
                                    : 'border-neutral-200 hover:border-neutral-400'
                                }`}
                              >
                                {/* Asset Type Badge */}
                                <span className="absolute top-1 left-1 bg-neutral-900/80 text-white text-[7.5px] font-extrabold px-1 rounded font-mono select-none">
                                  {ext.replace('.', '').toUpperCase()}
                                </span>

                                {/* Set config buttons for branding category */}
                                {catKey === 'branding' && (
                                  <div className="absolute top-1 right-1 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleSetConfig('siteLogo', fileUrl)}
                                      title="Definir como logotipo principal"
                                      className={`p-1 rounded cursor-pointer ${
                                        isSiteLogo ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-yellow-400 hover:bg-neutral-700'
                                      }`}
                                    >
                                      <Star size={10} fill={isSiteLogo ? 'currentColor' : 'none'} />
                                    </button>
                                    <button
                                      onClick={() => handleSetConfig('favicon', fileUrl)}
                                      title="Definir como favicon do site"
                                      className={`p-1 rounded cursor-pointer ${
                                        isFavicon ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-sky-400 hover:bg-neutral-700'
                                      }`}
                                    >
                                      <Check size={10} />
                                    </button>
                                  </div>
                                )}

                                {/* Preview wrapper */}
                                <div className="h-20 w-full flex items-center justify-center p-1.5 bg-white border border-neutral-100 rounded shadow-inner select-none overflow-hidden">
                                  {ext === '.svg' || ext === '.png' || ext === '.webp' || ext === '.ico' ? (
                                    <img 
                                      src={fileUrl} 
                                      alt={fileName} 
                                      className="max-h-full max-w-full object-contain"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        // Handle fallback if image fail
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <FileCode size={24} className="text-neutral-400" />
                                  )}
                                </div>

                                {/* Text Details */}
                                <div className="w-full mt-2 text-center">
                                  <p 
                                    className="text-[10px] font-bold text-neutral-700 truncate font-mono select-all" 
                                    title={fileName}
                                  >
                                    {fileName}
                                  </p>
                                  <p className="text-[8px] text-neutral-400 truncate mt-0.5 font-mono">
                                    {fileUrl}
                                  </p>
                                </div>

                                {/* Active labels */}
                                {isSiteLogo && (
                                  <span className="mt-1.5 bg-emerald-600 text-white text-[7.5px] font-extrabold px-1.5 py-0.5 rounded select-none uppercase tracking-wider flex items-center gap-0.5 font-sans">
                                    <CheckCircle size={8} /> LOGO ATIVO
                                  </span>
                                )}
                                {isFavicon && (
                                  <span className="mt-1.5 bg-sky-600 text-white text-[7.5px] font-extrabold px-1.5 py-0.5 rounded select-none uppercase tracking-wider flex items-center gap-0.5 font-sans">
                                    <CheckCircle size={8} /> FAVICON ATIVO
                                  </span>
                                )}

                                {/* Delete button */}
                                {fileName !== 'logo-original-scrap-zone.svg' && fileName !== 'LOGO-ORIIGINAL-scrap-zone.svg' && fileName !== 'logo-scrap-zone.svg' && fileName !== 'logo-scrapzone.svg' && fileName !== 'favicon.ico' && (
                                  <button
                                    onClick={() => handleDeleteAsset(fileUrl)}
                                    title="Excluir arquivo"
                                    className="absolute bottom-1 right-1 p-1 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
            </div>
          ) : (
            <div className="bg-white border border-[#a2c5ed] rounded p-6 text-center text-xs text-[#555] shadow-sm select-none">
              Nenhum dado de asset carregado. Tente reiniciar a aplicação.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
