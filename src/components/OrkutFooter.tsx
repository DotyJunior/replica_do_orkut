import React from 'react';
import { ShieldAlert, Fingerprint, LockKeyhole } from "lucide-react";

interface OrkutFooterProps {
  onPrivacyClick?: (e: React.MouseEvent) => void;
}

export default function OrkutFooter({ onPrivacyClick }: OrkutFooterProps) {
  return (
    <footer className="bg-[#dee7f4] border-t border-[#b2cbeb] py-6 select-none mt-8">
      <div className="max-w-6xl mx-auto px-4 text-center">
        {/* Foot links */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-sans text-[#1d4ed8] font-semibold mb-4">
          <a href="#about" className="hover:underline">Sobre o Scrapzone</a>
          <span className="text-neutral-400">·</span>
          <a 
            href="#/privacy" 
            onClick={(e) => {
              if (onPrivacyClick) {
                e.preventDefault();
                onPrivacyClick(e);
              }
            }}
            className="hover:underline flex items-center gap-0.5"
          >
            <Fingerprint size={12} />
            [ POLITICA DE PRIVACIDADES ]
          </a>
          <span className="text-neutral-400">·</span>
          <a href="#security-center" className="hover:underline flex items-center gap-0.5 text-pink-600">
            <LockKeyhole size={12} />
            Centro de Segurança Contra Worms
          </a>
          <span className="text-neutral-400">·</span>
          <a href="#terms" className="hover:underline">Termos de Criptografia de Ponta a Ponta</a>
          <span className="text-neutral-400">·</span>
          <a href="#developers" className="hover:underline">Desenvolvedores Rust Co.</a>
        </div>

        {/* Foot details */}
        <div className="text-[11px] text-neutral-500 font-sans leading-relaxed">
          <p>© 2004 - 2026 Scrapzone Secure Inc. Todos os scraps e recados enviados são encriptados na origem via AES-256-GCM.</p>
          <p className="flex justify-center items-center gap-1 mt-1 font-mono text-[9px] text-[#2563eb]">
            <ShieldAlert size={10} />
            Memory-safe protection: BORROW_CHECK_OK — sandbox isolated linear WebAssembly boundaries.
          </p>
        </div>
      </div>
    </footer>
  );
}
