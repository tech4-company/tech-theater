'use client';

// ============================================================================
// CHARACTER EDITOR
// ============================================================================
// Edycja instrukcji postaci przed rozpoczęciem rozmowy

import { useEffect, useState } from 'react';
import type { Character } from '@/lib/types';

interface CharacterEditorProps {
  character: Character;
  onSave: (updated: Character) => void;
  onContinue: () => void;
}

export function CharacterEditor({
  character,
  onSave,
  onContinue,
}: CharacterEditorProps) {
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description);
  const [systemPrompt, setSystemPrompt] = useState(character.systemPrompt);

  useEffect(() => {
    setName(character.name);
    setDescription(character.description);
    setSystemPrompt(character.systemPrompt);
  }, [character.id, character.name, character.description, character.systemPrompt]);

  const canSave = systemPrompt.trim().length > 0;

  const handleSave = () => {
    const updated: Character = {
      ...character,
      name: name.trim() || character.name,
      description: description.trim() || character.description,
      systemPrompt,
    };

    onSave(updated);
  };

  return (
    <div
      className="
        w-full max-w-4xl
        bg-gray-900 text-gray-100
        rounded-2xl shadow-2xl
        border border-gray-800
        p-6 sm:p-8
        max-h-[85vh] overflow-y-auto
      "
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Ustawienia postaci</h2>
        <p className="text-sm text-gray-400 mt-2">
          Edytuj instrukcje postaci przed rozpoczęciem rozmowy. Zapis zostanie
          zapamiętany w tej przeglądarce.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="character-name">
            Nazwa postaci
          </label>
          <input
            id="character-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="
              w-full px-4 py-3
              bg-gray-950/60 text-white
              rounded-lg border border-gray-700
              focus:outline-none focus:ring-4 focus:ring-blue-300/30 focus:border-blue-500
            "
            placeholder="Wpisz nazwę postaci..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="character-description">
            Krótki opis
          </label>
          <input
            id="character-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="
              w-full px-4 py-3
              bg-gray-950/60 text-white
              rounded-lg border border-gray-700
              focus:outline-none focus:ring-4 focus:ring-blue-300/30 focus:border-blue-500
            "
            placeholder="Krótki opis postaci..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="character-system-prompt">
            Instrukcje (system prompt)
          </label>
          <textarea
            id="character-system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            spellCheck={false}
            className="
              w-full min-h-[260px] px-4 py-3
              bg-gray-950/60 text-white
              rounded-lg border border-gray-700
              focus:outline-none focus:ring-4 focus:ring-blue-300/30 focus:border-blue-500
              font-mono text-sm
            "
            placeholder="Wpisz instrukcje postaci..."
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
        <button
          onClick={onContinue}
          className="
            px-5 py-3
            bg-gray-700 hover:bg-gray-600
            text-white text-sm font-medium
            rounded-lg
            transition-all duration-200
            focus:outline-none focus:ring-4 focus:ring-gray-300/30
          "
        >
          Przejdź bez zapisu
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="
            px-6 py-3
            bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:hover:bg-blue-600/40
            text-white text-sm font-semibold
            rounded-lg
            transition-all duration-200
            shadow-lg hover:shadow-xl
            focus:outline-none focus:ring-4 focus:ring-blue-300/40
            disabled:cursor-not-allowed disabled:shadow-none
          "
        >
          Zapisz i przejdź do rozmowy
        </button>
      </div>
    </div>
  );
}
