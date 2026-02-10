// ============================================================================
// TYPES - Tech Theater Application
// ============================================================================

/**
 * Stan aplikacji - reprezentuje aktualny stan interakcji
 */
export type AppState = 'waiting' | 'listening' | 'processing' | 'responding';

/**
 * Stan intro wideo (wejściowego)
 */
export type IntroStatus = 'idle' | 'armed' | 'playing';

/**
 * Stan wideo końcowego
 */
export type OutroStatus = 'idle' | 'playing' | 'ended';

/**
 * Wiadomość w konwersacji
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;           // Tekst (transkrypcja lub odpowiedź)
  audioUrl?: string;         // Opcjonalne audio (dla asystenta)
  timestamp: number;
}

/**
 * Konfiguracja postaci
 */
export interface Character {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;      // Instrukcje jak ma rozmawiać
  voiceId: string;            // Legacy/optional (nieużywane w Realtime-only)
  videoSet: {
    waiting: string;          // Ścieżka do wideo waiting
    listening: string;        // Ścieżka do wideo listening
    responding: string;       // Ścieżka do wideo responding
  };
  llmConfig: {
    temperature: number;      // 0.7-1.0 dla kreatywności
    maxTokens: number;        // Max długość odpowiedzi
    model: string;            // gpt-4o, gpt-4-turbo, claude-3-opus, etc.
  };
}

/**
 * Request do API transkrypcji
 */
export interface TranscriptionRequest {
  audio: Blob;
}

/**
 * Response z API transkrypcji
 */
export interface TranscriptionResponse {
  text: string;
  language?: string;
}

/**
 * Request do API LLM
 */
export interface LLMChatRequest {
  messages: Message[];
  characterId: string;
}

/**
 * Response z API LLM
 */
export interface LLMChatResponse {
  text: string;
  characterId: string;
}

/**
 * Stan Zustand store
 */
export interface AppStore {
  // Stan aplikacji
  state: AppState;
  introStatus: IntroStatus;
  outroStatus: OutroStatus;
  
  // Dane konwersacji
  messages: Message[];
  currentCharacter: Character | null;
  
  // Actions
  setState: (state: AppState) => void;
  setIntroStatus: (status: IntroStatus) => void;
  setOutroStatus: (status: OutroStatus) => void;
  addMessage: (message: Message) => void;
  setCurrentCharacter: (character: Character) => void;
  resetConversation: () => void;
}

