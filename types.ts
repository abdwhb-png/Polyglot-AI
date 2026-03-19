export interface Language {
  code: string;
  name: string;
  flag?: string;
}

export interface TranslationResult {
  detectedSourceLanguage: string;
  transcribedText?: string;
  translatedText: string;
}

export type InputMode = 'text' | 'image' | 'document' | 'audio_file';

export interface TranslationHistoryItem extends TranslationResult {
  id: string;
  timestamp: number;
  targetLanguage: string;
  type: InputMode | 'live_session';
  preview?: string; // Text snippet or image thumbnail base64
}
