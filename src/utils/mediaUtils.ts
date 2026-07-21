export interface ExternalMedia {
  type: 'youtube' | 'spotify' | 'soundcloud';
  url: string;
  title: string;
  artist?: string;
  thumbnail?: string;
  provider: 'youtube' | 'spotify' | 'soundcloud';
}

export const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle shorts format: youtube.com/shorts/VIDEO_ID
  if (url.includes('/shorts/')) {
    const parts = url.split('/shorts/');
    if (parts[1]) {
      return parts[1].split(/[?&]/)[0];
    }
  }
  
  // Handle shared format: youtu.be/VIDEO_ID
  if (url.includes('youtu.be/')) {
    const parts = url.split('youtu.be/');
    if (parts[1]) {
      return parts[1].split(/[?&]/)[0];
    }
  }

  // Handle standard query parameter v=
  const regExp = /^.*(?:(?:v|embed|vi)\/|vi?=|\/v\/|watch\?v(?:i)?=|\&v(?:i)?=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  // Handle embed format: youtube.com/embed/VIDEO_ID
  if (url.includes('/embed/')) {
    const parts = url.split('/embed/');
    if (parts[1]) {
      return parts[1].split(/[?&]/)[0];
    }
  }

  return null;
};

export const detectExternalMedia = async (url: string): Promise<ExternalMedia | null> => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    const videoId = getYouTubeId(url);
    if (videoId) {
      return {
        type: 'youtube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: 'Vídeo do YouTube',
        provider: 'youtube',
        thumbnail: `https://img.youtube.com/vi/${videoId}/0.jpg`
      };
    }
  }
  
  if (lowerUrl.includes('spotify.com')) {
    return {
      type: 'spotify',
      url,
      title: 'Música do Spotify',
      provider: 'spotify',
      artist: 'Artista'
    };
  }

  if (lowerUrl.includes('soundcloud.com')) {
    return {
      type: 'soundcloud',
      url,
      title: 'Faixa do SoundCloud',
      provider: 'soundcloud'
    };
  }
  
  return null;
};
