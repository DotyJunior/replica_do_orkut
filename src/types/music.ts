export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string; // URL deve ser validada e sanitizada
  addedBy: string;
  createdAt: number;
}
