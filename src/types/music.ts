import { EntityId, ISODateString, Timestamps } from './common';

export type RecognizedSong = Timestamps & {
  id: EntityId;
  userId: EntityId;
  title: string;
  artist?: string;
  album?: string;
  recognizedAt: ISODateString;
  source: 'manual' | 'recognition' | 'chat';
  confidence?: number;
  mood?: string;
  notes?: string;
};

export type CreateRecognizedSongInput = {
  userId: EntityId;
  title: string;
  artist?: string;
  album?: string;
  source?: RecognizedSong['source'];
  confidence?: number;
  mood?: string;
  notes?: string;
};

export type MusicRecognitionResult = {
  title: string;
  artist?: string;
  album?: string;
  confidence: number;
  releaseYear?: number;
  genre?: string;
  artworkUrl?: string;
  streamingLinks?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
  };
  provider?: string;
};
