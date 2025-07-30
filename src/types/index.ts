export interface SubChapter {
  id: string;
  title: string;
  description: string;
  content?: string;
  status: 'pending' | 'generating' | 'completed';
}

export interface BookChapter {
  id: string;
  title: string;
  description: string;
  subChapters?: SubChapter[];
  status: 'pending' | 'generating' | 'completed';
  expanded?: boolean;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  description: string;
  genre: string;
  subGenre?: string;
  tone: string;
  heatLevel?: string;
  perspective?: string;
  targetAudience?: string;
  coverUrl?: string;
  chapters: BookChapter[];
  status: 'draft' | 'generating' | 'completed';
  audiobook?: AudiobookData;
  writingPersonaId?: string;
  writingPersona?: WritingPersona;
}

export interface AudiobookData {
  id: string;
  selectedVoice?: string;
  audioChapters: AudioChapter[];
  totalDuration?: number;
  generatedAt: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export interface AudioChapter {
  id: string;
  chapterId: string;
  title: string;
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  isRecommended?: boolean;
}

export interface WritingPersona {
  id: string;
  name: string;
  description: string;
  authorName?: string;
  sampleText?: string;
  analysisResults?: PersonaAnalysis;
  preferences: PersonaPreferences;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonaAnalysis {
  writingStyle: {
    sentenceLength: 'short' | 'medium' | 'long' | 'varied';
    vocabulary: 'simple' | 'moderate' | 'complex' | 'academic';
    tone: string[];
    voiceCharacteristics: string[];
  };
  structuralElements: {
    paragraphLength: 'short' | 'medium' | 'long';
    dialogueStyle: string;
    descriptiveStyle: string;
    pacing: 'fast' | 'moderate' | 'slow' | 'varied';
  };
  genreSpecialty: string[];
  strengthsAndQuirks: string[];
  confidence: number;
}

export interface PersonaPreferences {
  preferredGenres: string[];
  avoidedTopics: string[];
  specialInstructions: string;
  targetAudience: string[];
}