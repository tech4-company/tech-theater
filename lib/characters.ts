// ============================================================================
// CHARACTERS CONFIGURATION
// ============================================================================
// Tu dodasz instrukcje postaci (system prompts) gdy będą gotowe

import { Character } from './types';

/**
 * Domyślna postać (placeholder)
 * Wypełnij to gdy będziesz miał:
 * - System prompt postaci
 * - (opcjonalnie) Voice ID (legacy po ElevenLabs)
 * - Filmy animacji
 */
export const defaultCharacter: Character = {
  id: 'default',
  name: 'Postać Teatralna',
  description: 'Domyślna postać z występu',
  
  // TODO: Dodaj system prompt postaci (możesz to dostosować później)
  systemPrompt: `Jesteś postacią teatralną biorącą udział w występie na żywo. 
Rozmawiasz naturalnie i angażująco z publicznością.

ZASADY ODPOWIEDZI:
- Odpowiadaj KRÓTKO i na temat (max 2-3 zdania)
- Używaj naturalnego, rozmównego języka
- Bądź ekspresywny i emocjonalny
- Nie używaj długich opisów czy wyjaśnień
- Mów tak jakbyś był na scenie przed publicznością
- Jeśli nie rozumiesz pytania, zapytaj o wyjaśnienie

PRZYKŁADY:
User: "Jak się masz?"
Assistant: "Świetnie! Cieszę się, że mogę z tobą porozmawiać. Co cię tutaj sprowadza?"

User: "Opowiedz mi o sobie"
Assistant: "Jestem postacią z tego przedstawienia. Moją pasją jest łączenie ludzi przez sztukę. A ty, co lubisz robić?"`,
  
  // Legacy: kiedyś używane w trybie ElevenLabs. W Realtime-only może zostać dowolna wartość.
  voiceId: 'legacy',
  
  // Ścieżki do filmów animacji
  videoSet: {
    waiting: '/videos/waiting.mp4',
    listening: '/videos/listening.mp4',
    responding: '/videos/responding.mp4',
  },
  
  // Konfiguracja LLM
  llmConfig: {
    temperature: 0.8,        // Kreatywność (0.7-1.0)
    maxTokens: 500,          // Więcej tokenów dla pełnych odpowiedzi
    model: 'gpt-5.2',        // Najnowszy model OpenAI (11.12.2025)
  },
};

/**
 * Lista wszystkich dostępnych postaci
 * Możesz dodać więcej postaci tutaj
 */
export const characters: Character[] = [
  defaultCharacter,
  
  // Dodaj więcej postaci tutaj w przyszłości:
  // {
  //   id: 'character2',
  //   name: 'Druga Postać',
  //   ...
  // },
];

/**
 * Pobierz postać po ID
 */
export function getCharacterById(id: string): Character | undefined {
  return characters.find(char => char.id === id);
}

/**
 * Pobierz domyślną postać
 */
export function getDefaultCharacter(): Character {
  return defaultCharacter;
}

