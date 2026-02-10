// ============================================================================
// ZUSTAND STORE - Global State Management
// ============================================================================

import { create } from 'zustand';
import { AppStore, AppState, Message, Character, IntroStatus, OutroStatus } from './types';

/**
 * Główny store aplikacji używający Zustand
 */
export const useAppStore = create<AppStore>((set) => ({
  // Stan początkowy
  state: 'waiting',
  introStatus: 'armed',
  outroStatus: 'idle',
  messages: [],
  currentCharacter: null,

  // Actions
  setState: (state: AppState) => set({ state }),
  setIntroStatus: (status: IntroStatus) => set({ introStatus: status }),
  setOutroStatus: (status: OutroStatus) => set({ outroStatus: status }),
  
  addMessage: (message: Message) => 
    set((state) => ({ 
      messages: [...state.messages, message] 
    })),
  
  setCurrentCharacter: (character: Character) => 
    set({ currentCharacter: character }),
  
  resetConversation: () => 
    set({ 
      messages: [],
      state: 'waiting',
    }),
}));

