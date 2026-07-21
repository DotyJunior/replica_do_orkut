import React from 'react';
import { ExternalMedia } from '../types';

interface ExternalMediaModalProps {
  media: ExternalMedia;
  onClose: () => void;
}

export default function ExternalMediaModal({ media, onClose }: ExternalMediaModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">{media.title}</h2>
          <button onClick={onClose} className="font-bold">X</button>
        </div>
        <div className="aspect-video">
          {media.type === 'youtube' && (
            <iframe 
              width="100%" height="100%" 
              src={`https://www.youtube.com/embed/${media.url.split('v=')[1] || media.url.split('/').pop()}`} 
              frameBorder="0" allowFullScreen>
            </iframe>
          )}
          {media.type === 'spotify' && (
            <iframe 
              src={`https://open.spotify.com/embed/track/${media.url.split('/').pop()}`}
              width="100%" height="100%" frameBorder="0" allow="encrypted-media">
            </iframe>
          )}
          {media.type === 'soundcloud' && (
            <iframe 
              width="100%" height="100%" scrolling="no" frameBorder="no" 
              src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(media.url)}`}>
            </iframe>
          )}
        </div>
      </div>
    </div>
  );
}
