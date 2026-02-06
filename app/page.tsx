'use client';

// ============================================================================
// MAIN PAGE - Tech Theater Application
// ============================================================================

import { useEffect, useState } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { VoiceControlsRealtime } from './components/VoiceControlsRealtime';
import { AudioPermissionGate } from './components/AudioPermissionGate';
import { CharacterEditor } from './components/CharacterEditor';
import { useAppStore } from '@/lib/store';
import { getDefaultCharacter } from '@/lib/characters';
import {
  applyCharacterOverride,
  getCharacterOverride,
  saveCharacterOverride,
} from '@/lib/characterStorage';
import type { Character } from '@/lib/types';

export default function Home() {
  const setCurrentCharacter = useAppStore((s) => s.setCurrentCharacter);
  const currentCharacter = useAppStore((s) => s.currentCharacter);
  const [showCharacterEditor, setShowCharacterEditor] = useState(true);

  // Ustaw domyślną postać przy starcie
  useEffect(() => {
    if (!currentCharacter) {
      const baseCharacter = getDefaultCharacter();
      const override = getCharacterOverride(baseCharacter.id);
      const mergedCharacter = applyCharacterOverride(baseCharacter, override);
      setCurrentCharacter(mergedCharacter);
    }
  }, [currentCharacter, setCurrentCharacter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = sessionStorage.getItem('characterEditorDismissed');
    if (dismissed === 'true') {
      setShowCharacterEditor(false);
    }
  }, []);

  const handleSaveCharacter = (updated: Character) => {
    saveCharacterOverride(updated.id, {
      name: updated.name,
      description: updated.description,
      systemPrompt: updated.systemPrompt,
    });
    setCurrentCharacter(updated);
    sessionStorage.setItem('characterEditorDismissed', 'true');
    setShowCharacterEditor(false);
  };

  const handleContinue = () => {
    sessionStorage.setItem('characterEditorDismissed', 'true');
    setShowCharacterEditor(false);
  };

  if (!currentCharacter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Ładowanie...</div>
      </div>
    );
  }

  return (
    <AudioPermissionGate>
      <main className="relative w-screen h-screen overflow-hidden">
        {/* Background - Fullscreen Video */}
        <div className="absolute inset-0 z-0">
          <VideoPlayer
            waitingVideo={currentCharacter.videoSet.waiting}
            listeningVideo={currentCharacter.videoSet.listening}
            respondingVideo={currentCharacter.videoSet.responding}
            className="w-full h-full"
            onVideoChange={(state) => {
              console.log('Video changed to state:', state);
            }}
            enableCrossfade={true}
          />
        </div>

        {showCharacterEditor ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-6">
            <CharacterEditor
              character={currentCharacter}
              onSave={handleSaveCharacter}
              onContinue={handleContinue}
            />
          </div>
        ) : (
          <div className="fixed bottom-0 right-0 z-10 p-6">
            {/* Voice Controls - Realtime API only */}
            <VoiceControlsRealtime />
          </div>
        )}
      </main>
    </AudioPermissionGate>
  );
}
