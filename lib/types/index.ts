// ============================================================================
// TYPES - Tech Theater Application
// ============================================================================

/**
 * Stan aplikacji - reprezentuje aktualny stan interakcji
 */
export type AppState = 'waiting' | 'listening' | 'processing' | 'responding';

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
    waiting: string;          // Ścieżka do waiting.mp4
    listening: string;        // Ścieżka do listening.mp4
    responding: string;       // Ścieżka do responding.mp4
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
  
  // Dane konwersacji
  messages: Message[];
  currentCharacter: Character | null;
  
  // Actions
  setState: (state: AppState) => void;
  addMessage: (message: Message) => void;
  setCurrentCharacter: (character: Character) => void;
  resetConversation: () => void;
}

