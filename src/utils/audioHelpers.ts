
let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;


let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;

export const getActiveAudio = () => activeAudio;
export const getActiveUrl = () => activeUrl;
export const getAudioContext = () => audioContext;
export const getAnalyser = () => analyser;

export const playAudio = (
  url: string,
  onPlaySuccess?: () => void,
  onEnded?: () => void,
  onTimeUpdate?: (currentTime: number, duration: number) => void
): HTMLAudioElement => {
  // Initialize global AudioContext on first user gesture
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch((err) => console.warn("Failed to resume audio context:", err));
  }

  if (audioContext && !analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64; // Small fft for few bars
  }

  // If we already have this URL loaded, just update the dynamic callbacks and play it
  if (activeAudio && activeUrl === url) {
    (activeAudio as any)._onPlaySuccess = onPlaySuccess;
    (activeAudio as any)._onEnded = onEnded;
    (activeAudio as any)._onTimeUpdate = onTimeUpdate;

    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch((err) => console.warn("Failed to resume audio context:", err));
    }

    activeAudio.play()
      .then(() => {
        if (onPlaySuccess) onPlaySuccess();
      })
      .catch((err) => {
        console.warn("Audio resume was blocked by browser autoplay policy:", err);
      });
    return activeAudio;
  }

  // Get the current progress time if we are resuming the same URL
  let resumeTime = 0;
  if (activeAudio && activeUrl === url) {
    resumeTime = activeAudio.currentTime;
  }

  // Stop previous audio completely to release resources and avoid browser/iframe bugs
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }

  const isIndexedDB = url.startsWith("indexeddb://");
  activeAudio = new Audio();
  activeUrl = url;

  // Store dynamic callbacks on the activeAudio element so they don't get stale
  (activeAudio as any)._onPlaySuccess = onPlaySuccess;
  (activeAudio as any)._onEnded = onEnded;
  (activeAudio as any)._onTimeUpdate = onTimeUpdate;

  // Set up events once per Audio element instance
  activeAudio.addEventListener("ended", () => {
    if (activeAudio && (activeAudio as any)._onEnded) {
      (activeAudio as any)._onEnded();
    }
  });

  activeAudio.addEventListener("timeupdate", () => {
    if (activeAudio && (activeAudio as any)._onTimeUpdate) {
      (activeAudio as any)._onTimeUpdate(activeAudio.currentTime, activeAudio.duration || 0);
    }
  });

  // Load the actual source
  if (isIndexedDB) {
    const id = url.replace("indexeddb://", "");
    getAudioBlob(id).then((blob) => {
      if (blob) {
        const localBlobUrl = URL.createObjectURL(blob);
        if (activeAudio && activeUrl === url) {
          activeAudio.src = localBlobUrl;
          activeAudio.play()
            .then(() => {
              if ((activeAudio as any)._onPlaySuccess) {
                (activeAudio as any)._onPlaySuccess();
              }
            })
            .catch((err) => {
              console.warn("Audio playback was blocked by browser autoplay policy:", err);
            });
        }
      } else {
        console.warn("IndexedDB track blob not found for ID:", id);
      }
    }).catch((err) => {
      console.error("Failed to load audio from IndexedDB:", err);
    });
  } else {
    activeAudio.src = url;
    // Enable standard cross-origin properties for AudioContext analysers
    if (!url.startsWith("blob:") && !url.startsWith("data:")) {
      activeAudio.crossOrigin = "anonymous";
    }
  }

  // If we have a resume time, apply it safely once metadata/canplay is available
  if (resumeTime > 0) {
    let timeApplied = false;
    const applyResumeTime = () => {
      if (timeApplied) return;
      if (activeAudio) {
        try {
          activeAudio.currentTime = resumeTime;
          timeApplied = true;
        } catch (e) {
          console.warn("Failed to set currentTime on load:", e);
        }
      }
    };

    if (activeAudio.readyState >= 1) {
      applyResumeTime();
    } else {
      activeAudio.addEventListener("loadedmetadata", applyResumeTime, { once: true });
      activeAudio.addEventListener("canplay", applyResumeTime, { once: true });
    }
  }

  // Connect activeAudio to the global analyser
  if (audioContext && analyser) {
    try {
      if (sourceNode) {
        sourceNode.disconnect();
      }
    } catch (e) {
      console.warn("Error disconnecting old sourceNode:", e);
    }
    try {
      sourceNode = audioContext.createMediaElementSource(activeAudio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
    } catch (err) {
      console.warn("Could not connect audio to analyser:", err);
    }
  }

  if (!isIndexedDB) {
    activeAudio.play()
      .then(() => {
        if (onPlaySuccess) onPlaySuccess();
      })
      .catch((err) => {
        console.warn("Audio playback was blocked by browser autoplay policy:", err);
      });
  }

  return activeAudio;
};

export const pauseAudio = () => {
  if (activeAudio) {
    activeAudio.pause();
  }
};

export const stopAudio = () => {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    // Release completely so a brand new element is built on play
    activeAudio.src = "";
    activeAudio = null;
    activeUrl = null;
  }
};

export const seekAudio = (seconds: number) => {
  if (activeAudio) {
    activeAudio.currentTime = seconds;
  }
};

