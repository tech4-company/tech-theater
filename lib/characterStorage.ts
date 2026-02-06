'use client';

// ============================================================================
// CHARACTER STORAGE (localStorage)
// ============================================================================
// Zapis i odczyt edycji postaci po stronie klienta

import type { Character } from './types';

const STORAGE_PREFIX = 'tech-theater.characterOverride';

export type CharacterOverride = {
  name?: string;
  description?: string;
  systemPrompt?: string;
  llmConfig?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
};

export function getCharacterOverride(characterId: string): CharacterOverride | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${characterId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const override: CharacterOverride = {};

    if (typeof parsed.name === 'string') override.name = parsed.name;
    if (typeof parsed.description === 'string') override.description = parsed.description;
    if (typeof parsed.systemPrompt === 'string') override.systemPrompt = parsed.systemPrompt;

    const llm = parsed.llmConfig;
    if (llm && typeof llm === 'object') {
      const llmOverride: CharacterOverride['llmConfig'] = {};
      if (typeof llm.temperature === 'number') llmOverride.temperature = llm.temperature;
      if (typeof llm.maxTokens === 'number') llmOverride.maxTokens = llm.maxTokens;
      if (typeof llm.model === 'string') llmOverride.model = llm.model;
      if (Object.keys(llmOverride).length > 0) {
        override.llmConfig = llmOverride;
      }
    }

    return Object.keys(override).length > 0 ? override : null;
  } catch {
    return null;
  }
}

export function saveCharacterOverride(
  characterId: string,
  override: CharacterOverride,
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${characterId}`, JSON.stringify(override));
  } catch {
    // Ignore storage errors
  }
}

export function clearCharacterOverride(characterId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}:${characterId}`);
  } catch {
    // Ignore storage errors
  }
}

export function applyCharacterOverride(
  base: Character,
  override: CharacterOverride | null,
): Character {
  if (!override) return base;

  const merged: Character = {
    ...base,
    llmConfig: {
      ...base.llmConfig,
      ...(override.llmConfig ?? {}),
    },
  };

  if (typeof override.name === 'string') merged.name = override.name;
  if (typeof override.description === 'string') merged.description = override.description;
  if (typeof override.systemPrompt === 'string') merged.systemPrompt = override.systemPrompt;

  return merged;
}
