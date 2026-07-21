import React, { useState, useEffect, useRef } from 'react';
import processingSvgRaw from '../../public/assets/themes/windows-98/ui/nostalgia-installer/processing-w-98.svg?raw';
import completedSvgRaw from '../../public/assets/themes/windows-98/ui/nostalgia-installer/instalacao-concluida.svg?raw';

interface Windows95InstallerProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function Windows95Installer({ isOpen, onClose, onComplete }: Windows95InstallerProps) {
  const [step, setStep] = useState<number>(1); // 1: Threat detected, 2: Processing, 3: Completed
  const [progress, setProgress] = useState<number>(0); // 0 to 9
  const [processingSvg, setProcessingSvg] = useState<string>(processingSvgRaw);
  const [completedSvg, setCompletedSvg] = useState<string>(completedSvgRaw);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // SVGs are imported directly at compile-time as raw text strings to guarantee offline-first operation and prevent runtime fetch failures

  // Handle single play audio on Step 1 start
  useEffect(() => {
    if (isOpen && step === 1) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/themes/windows-98/ui/nostalgia-installer/audio-ameaca-detectada.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Audio playback status/delay:', err));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen, step]);

  // Handle Step 2 progress bar animation
  useEffect(() => {
    if (step === 2) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 9) {
            clearInterval(interval);
            // Auto advance to step 3 after progress is full
            setTimeout(() => {
              setStep(3);
            }, 600);
            return 9;
          }
          return prev + 1;
        });
      }, 400); // ~400ms per segment, total installation animation time ~3.6s

      return () => clearInterval(interval);
    }
  }, [step]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 select-none">
      {/* Step 1: Threat Warning */}
      {step === 1 && (
        <div className="relative max-w-[380px] w-full flex flex-col items-center bg-transparent animate-fadeIn p-4">
          {/* Main warning SVG image */}
          <div className="relative w-full h-auto">
            <img 
              src="/assets/themes/windows-98/ui/nostalgia-installer/ameaca-detectada.svg" 
              alt="Ameaça Detectada"
              className="w-full h-auto pointer-events-none select-none"
            />
            
            {/* Overlay transparent click area on top of the visual "Instalar mesmo assim" button inside the graphic */}
            <button
              onClick={() => setStep(2)}
              className="absolute bottom-[6%] left-1/2 -translate-x-1/2 w-[70%] h-[10%] bg-transparent border-0 outline-none cursor-pointer focus:outline-none"
              title="Instalar mesmo assim"
            />
          </div>
        </div>
      )}

      {/* Step 2: Progress Animation */}
      {step === 2 && (
        <div className="relative max-w-[420px] w-full flex flex-col items-center bg-transparent animate-fadeIn p-4">
          <div className="relative w-full h-auto">
            {/* Inject dynamic CSS style rules next to raw SVG to toggle progress bar blocks sequentially */}
            <style dangerouslySetInnerHTML={{ __html: `
              #rect59, #rect60, #rect61, #rect62, #rect63, #rect64, #rect65, #rect66, #rect67 {
                display: none !important;
              }
              ${progress >= 1 ? '#rect59 { display: block !important; }' : ''}
              ${progress >= 2 ? '#rect60 { display: block !important; }' : ''}
              ${progress >= 3 ? '#rect61 { display: block !important; }' : ''}
              ${progress >= 4 ? '#rect62 { display: block !important; }' : ''}
              ${progress >= 5 ? '#rect63 { display: block !important; }' : ''}
              ${progress >= 6 ? '#rect64 { display: block !important; }' : ''}
              ${progress >= 7 ? '#rect65 { display: block !important; }' : ''}
              ${progress >= 8 ? '#rect66 { display: block !important; }' : ''}
              ${progress >= 9 ? '#rect67 { display: block !important; }' : ''}
            `}} />
            
            {processingSvg ? (
              <div 
                dangerouslySetInnerHTML={{ __html: processingSvg }} 
                className="w-full h-auto"
              />
            ) : (
              <div className="text-white text-xs bg-[#c0c0c0] text-black p-6 rounded border-2 border-white shadow-[2px_2px_0px_#000]">
                Processando... Aguarde.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Installation Completed Confirmation */}
      {step === 3 && (
        <div className="relative max-w-[450px] w-full flex flex-col items-center bg-transparent animate-fadeIn p-4">
          <div className="relative w-full h-auto">
            <img 
              src="/assets/themes/windows-98/ui/nostalgia-installer/instalacao-concluida.svg" 
              alt="Instalação Concluída"
              className="w-full h-auto pointer-events-none select-none"
            />

            {/* Click spot aligned perfectly with the OK button in vector graphic space */}
            <button
              onClick={onComplete}
              className="absolute left-[39.21%] top-[68.71%] w-[18.49%] h-[16.57%] bg-transparent border-0 outline-none cursor-pointer focus:outline-none"
              title="OK"
            />
          </div>
        </div>
      )}
    </div>
  );
}
