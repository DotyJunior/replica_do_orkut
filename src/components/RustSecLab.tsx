import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal as TerminalIcon, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Cpu, 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  Check, 
  Compass, 
  Send 
} from 'lucide-react';

export default function RustSecLab() {
  // 1. Scrap Blindado State
  const [scrapInput, setScrapInput] = useState('');
  const [isBlinding, setIsBlinding] = useState(false);
  const [blindStep, setBlindStep] = useState(0); // 0: Idle, 1: Borrow Check, 2: XSS Filter, 3: Encrypted, 4: Finished
  const [blindedResult, setBlindedResult] = useState<{ original: string; hash: string; sig: string } | null>(null);

  // 2. Virus depoimento simulation state
  const [simRunning, setSimRunning] = useState(true);
  const [oldNetPopups, setOldNetPopups] = useState<string[]>([
    '🔥 VIRUS DEPO: SEU SCRAPZONE FOI HACKEADO!',
    '🚨 CLIQUE AQUI PARA VER QUEM VISITOU SEU PERFIL',
    '💀 ERRO: BUFFER OVERFLOW EM DEPOIMENTO.EXE'
  ]);
  const [isMitigated, setIsMitigated] = useState(true);
  const [interceptLog, setInterceptLog] = useState<string[]>([
    '[Rust Secure]: Escuta ativada na porta heap.wasm',
    '[WASM Isolation]: Buffer linear alocado de forma segura',
    '[Borrow Checker]: Referências mutáveis invalidadas preventivamente'
  ]);

  // 3. Comunidades Secretas State
  const [zkpVerified, setZkpVerified] = useState(false);
  const [zkpStep, setZkpStep] = useState('');

  // 4. Terminal State
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '==================================================',
    '     RUST SECURE ENGINE (WASM SANDBOX v2.04)     ',
    '==================================================',
    'Digite "help" para ver os comandos de segurança disponíveis.',
    'Sua sessão Scrapzone-Secure é emulada de forma isolada.',
  ]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Auto Scroll Terminal
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Scrap blinding sequence
  const startBlinding = () => {
    if (!scrapInput.trim()) return;
    setIsBlinding(true);
    setBlindStep(1);
    setBlindedResult(null);

    setTimeout(() => {
      setBlindStep(2);
      setTimeout(() => {
        setBlindStep(3);
        setTimeout(() => {
          setBlindStep(4);
          setIsBlinding(false);
          const mockHash = 'SHA256::' + Math.random().toString(16).substring(2, 18).toUpperCase();
          const mockSig = 'SIG_ED25519::' + Math.random().toString(16).substring(2, 14).toUpperCase();
          setBlindedResult({
            original: scrapInput,
            hash: mockHash,
            sig: mockSig
          });
        }, 1200);
      }, 1000);
    }, 1000);
  };

  // Simulate ZKP verification
  const handleZkpVerify = () => {
    setZkpVerified(false);
    setZkpStep('Gerando prova criptográfica zero-knowledge...');
    
    setTimeout(() => {
      setZkpStep('Ocultando dados de nascimento e e-mail...');
      setTimeout(() => {
        setZkpStep('Verificando chave pública na blockchain local simulada...');
        setTimeout(() => {
          setZkpStep('');
          setZkpVerified(true);
        }, 1200);
      }, 1000);
    }, 1000);
  };

  // Terminal command executor
  const runCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.toLowerCase().trim();
    if (!cmd) return;

    setTerminalLogs(prev => [...prev, `guest@scrapzone-sec:~$ ${terminalInput}`]);
    setTerminalInput('');

    switch (cmd) {
      case 'help':
        setTerminalLogs(prev => [
          ...prev,
          'Comandos disponíveis:',
          '  help      - Explica as funções secretas do laboratório',
          '  encrypt   - Simula a criação de chaves descartáveis em Rust',
          '  scan      - Verifica vulnerabilidades conhecidas instaladas em 2004',
          '  verify    - Valida o estado do Borrow Checker do navegador',
          '  secure    - Ativa ou exibe o isolamento de sandbox WebAssembly',
          '  clear     - Limpa o histórico do terminal'
        ]);
        break;
      case 'clear':
        setTerminalLogs([]);
        break;
      case 'encrypt':
        setTerminalLogs(prev => [
          ...prev,
          '🔒 [STARTING] Gerando nova chave simétrica ephemeral em Rust...',
          '🔑 [SUCCESS] Chave AES-256 gerada perfeitamente no heap do WebAssembly!',
          '⚙️  Chave gerada: 0xe4f981...193bde (Isolada de vazamentos de memória)'
        ]);
        break;
      case 'scan':
        setTerminalLogs(prev => [
          ...prev,
          '🔎 [ANALYZING] Varrendo scripts perigosos e XSS de 2004 no scrapbook...',
          '🛡️ [SHIELD] 3 exploits clássicos de cookie-hijack neutralizados de forma hermética!',
          '✅ Sistema limpo e livre de Buffer Overflows.'
        ]);
        break;
      case 'verify':
        setTerminalLogs(prev => [
          ...prev,
          '🦀 [BORROW CHECKER] Compilando grafo de tempo de vida de dados...',
          '📎 Referências ativas: 0 mutáveis, 12 imutáveis.',
          '🏆 [Memory Safe] Sucesso obtido! Nenhum vazamento ou dangling pointer encontrado.'
        ]);
        break;
      case 'secure':
        setTerminalLogs(prev => [
          ...prev,
          '⚙️ [WASM] Sandbox virtualizado do WebAssembly rodando sob regras de isolamento linear.',
          '🚀 Desempenho nativo: 99.8% do desempenho original do browser.',
          '🛡️ Injeções de Javascript na página de depoimentos são rebaixadas e desarmadas automaticamente.'
        ]);
        break;
      default:
        setTerminalLogs(prev => [
          ...prev,
          `Comando inválido: "${cmd}". Digite "help" para ver as opções suportadas.`
        ]);
    }
  };

  return (
    <div className="anim-fade bg-white border border-[#9ebade] rounded-lg p-5 md:p-6 shadow-sm font-sans space-y-8 max-w-5xl mx-auto">
      {/* 1. Header Geek Banner */}
      <div className="bg-[#1e1b4b] text-indigo-100 rounded-lg p-6 relative overflow-hidden border-2 border-indigo-500 shadow-md">
        {/* Subtle retro Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,48,0.92),rgba(18,16,48,0.92)),linear-gradient(0deg,rgba(99,102,241,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.08)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        
        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_50%,rgba(0,0,0,0.08)_50%)] bg-[size:100%_4px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧪</span>
            <div>
              <h2 className="text-2xl font-extrabold text-[#d946ef] tracking-tight flex items-center gap-2 font-mono">
                RUST SEC LAB
              </h2>
              <p className="text-xs text-indigo-300 font-mono mt-0.5">
                Laboratório experimental de segurança cibernética
              </p>
            </div>
          </div>
          <p className="text-xs text-indigo-200 mt-4 max-w-2xl leading-relaxed">
            “Criamos uma internet mais difícil de quebrar. Sem vírus de scraps. Sem exploits clássicos. Sem o caos cibernético que derrubou as gigantes de 2004. O motor invisível da segurança roda de forma silenciosa e divertida.”
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seção 1: Scrap Blindado */}
        <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-indigo-100 pb-2 mb-3">
              <span className="text-lg">🛡️</span>
              <h3 className="font-bold text-sm text-indigo-950 font-sans">1. Canal de Scrapbook Blindado</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-3 font-sans">
              Escreva qualquer recado abaixo e veja como a engine blinda sua escrita isolando scripts maliciosos instantaneamente.
            </p>

            <textarea
              id="lab-scrap-input"
              value={scrapInput}
              onChange={(e) => setScrapInput(e.target.value)}
              placeholder="Digite um scrap divertido ou contendo tags HTML de mentira..."
              className="w-full h-24 p-2.5 text-xs border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-sans"
            />

            <div className="mt-3">
              <button
                onClick={startBlinding}
                disabled={isBlinding || !scrapInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isBlinding ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                Blindar Recado
              </button>
            </div>
          </div>

          <div className="mt-4 bg-[#0c0a0f] text-neutral-300 rounded p-3 font-mono text-[11px] border border-indigo-900 leading-relaxed min-h-[110px] flex flex-col justify-center">
            {isBlinding && (
              <div className="space-y-1">
                <p className="text-pink-400 font-bold animate-pulse">⚙️ PROCESSANDO BLINDAGEM...</p>
                {blindStep >= 1 && <p className="text-indigo-300">✓ [Borrow Checker] Validação estrita de referências ao heap</p>}
                {blindStep >= 2 && <p className="text-yellow-400">⚡ [XSS Filter] Destruindo injeções de JavaScript retroativas</p>}
                {blindStep >= 3 && <p className="text-green-400">🔐 [WebCrypto] Assinando payload com Hash Único</p>}
              </div>
            )}

            {!isBlinding && blindedResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-green-400 font-bold">
                  <ShieldCheck size={14} />
                  <span>Recado protegido pela Rust Secure Engine</span>
                </div>
                <div className="text-[10px] text-neutral-400 space-y-0.5 border-t border-neutral-800 pt-1.5 mt-1">
                  <div><strong className="text-neutral-300">Texto Sanitizado:</strong> "{blindedResult.original}"</div>
                  <div className="truncate"><strong className="text-neutral-300">Impressão Digital:</strong> {blindedResult.hash}</div>
                  <div className="truncate"><strong className="text-neutral-300">Assinatura WASM:</strong> {blindedResult.sig}</div>
                </div>
              </div>
            )}

            {!isBlinding && !blindedResult && (
              <div className="text-center text-neutral-500 italic py-6">
                Insira texto e clique em blindar para gerar sandbox isolada.
              </div>
            )}
          </div>
        </div>

        {/* Seção 2: Defesa contra o vírus dos depoimentos */}
        <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 mb-3">
              <span className="text-lg">💥</span>
              <h3 className="font-bold text-sm text-neutral-800 font-sans">2. Defesa contra "Vírus dos Depoimentos"</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-3">
              Em 2004, depoimentos que continham bugs propagavam vírus que travavam o navegador. Compare a robustez da nossa arquitetura isolada:
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Internet Antiga */}
              <div className="bg-red-50 border border-red-200 rounded p-3 text-center relative overflow-hidden h-36 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-red-700 block mb-1">INTERNET CORROMPIDA</span>
                  <p className="text-[10px] text-red-600 leading-tight">Exploits livres por falta de isolamento de memória.</p>
                </div>
                <div className="animate-bounce text-xl">⚠️</div>
                <div className="bg-red-600 text-white text-[9px] font-mono py-1 rounded-sm uppercase tracking-wider font-bold animate-pulse">
                  POPUP LOOP CRASHED
                </div>
              </div>

              {/* Rust Secure */}
              <div className="bg-green-50 border border-green-200 rounded p-3 text-center relative overflow-hidden h-36 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-green-800 block mb-1">ENGINE RUST-SECURE</span>
                  <p className="text-[10px] text-green-700 leading-tight">Detecção estática de scripts maliciosos e sandbox.</p>
                </div>
                <div className="text-xl mx-auto flex h-10 w-10 items-center justify-center bg-green-100 rounded-full text-green-600 animate-pulse">
                  🛡️
                </div>
                <div className="bg-green-700 text-white text-[9px] font-mono py-1 rounded-sm uppercase tracking-wider font-bold">
                  Tentativa XSS Neutralizada!
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[10px] bg-neutral-900 text-neutral-400 p-2 border border-neutral-700 rounded font-mono">
            <div className="flex items-center justify-between text-neutral-300 font-bold border-b border-neutral-800 pb-1 mb-1">
              <span>EXPLOTATION LOGS SYSTEM</span>
              <span className="text-[8px] bg-green-900 text-green-300 px-1 rounded">ATIVADO</span>
            </div>
            <p className="text-amber-500">[INTERCPED] script tag detectada ➔ desarmada.</p>
            <p className="text-green-400">[WASM] Variável rebaixada para string limpa em 0.4ms.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seção 3: Comunidades Secretas */}
        <div className="border border-pink-200 rounded-lg p-4 bg-pink-50/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-pink-100 pb-2 mb-3">
              <span className="text-lg">🗝️</span>
              <h3 className="font-bold text-sm text-pink-950 font-sans">3. Verificação Zero-Knowledge (ZKP)</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-4 h-12">
              Entre em comunidades discretas sem precisar revelar quem você é. Validamos sua idade e assinatura criptográfica localmente via WebCrypto de forma invisível.
            </p>

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex items-center justify-between gap-4 mt-2 h-24">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${zkpVerified ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-600'}`}>
                  {zkpVerified ? <ShieldCheck size={28} /> : <Unlock size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-neutral-800">Comunidade Oculta: "Borrow Checkers do Sul"</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {zkpVerified ? '🔒 Identidade validada sem revelar dados.' : '🛡️ Chave de acesso criptográfica necessária'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleZkpVerify}
                className="px-3 py-1.5 bg-[#d946ef] hover:bg-fuchsia-700 text-white font-bold text-xs rounded shadow-xs cursor-pointer whitespace-nowrap"
              >
                Simular Entrada
              </button>
            </div>
          </div>

          <div className="mt-4 text-[10px] font-mono bg-neutral-900 border border-pink-900 text-neutral-300 p-2.5 rounded h-14 flex items-center justify-center">
            {zkpStep ? (
              <span className="text-pink-400 animate-pulse font-bold">⚙️ {zkpStep}</span>
            ) : zkpVerified ? (
              <span className="text-green-400 font-bold flex items-center gap-1">
                ✓ Validado Localmente via Ephemeral ZK-Proof! Membro #1337 inscrito de forma anônima.
              </span>
            ) : (
              <span className="text-neutral-500 italic">Pressione "Simular Entrada" para gerar prova zero-knowledge</span>
            )}
          </div>
        </div>

        {/* Seção 4: Terminal Cyberpunk */}
        <div className="border-2 border-neutral-800 rounded-lg overflow-hidden bg-black shadow-lg flex flex-col justify-between h-[310px]">
          {/* Top terminal bar */}
          <div className="bg-neutral-900 border-b border-neutral-800 px-3 py-1.5 flex justify-between items-center select-none">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-mono text-neutral-400 ml-2">secure_shell_guest@rust:~$</span>
            </div>
            <div className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 font-bold font-mono rounded">
              WASM RUNNING
            </div>
          </div>

          {/* Terminal log output */}
          <div className="flex-1 p-3 font-mono text-xs text-green-400 overflow-y-auto space-y-1 h-36 bg-black scrollbar-thin scrollbar-thumb-neutral-800">
            {terminalLogs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap leading-relaxed">{log}</div>
            ))}
            <div ref={terminalBottomRef} />
          </div>

          {/* Terminal Input Form */}
          <form onSubmit={runCommand} className="bg-neutral-900 border-t border-neutral-800 flex items-center px-3 py-2">
            <span className="text-green-400 font-bold font-mono mr-1.5 text-xs select-none">$</span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Digite scan, encrypt, verify ou help..."
              className="flex-1 bg-transparent text-green-400 text-xs font-mono outline-none focus:outline-none placeholder:text-neutral-700"
            />
            <button
              type="submit"
              className="p-1 px-2.5 bg-green-900 text-green-300 rounded hover:bg-green-800 transition-colors text-xs font-bold"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
