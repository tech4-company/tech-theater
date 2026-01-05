'use client';

// ============================================================================
// MAIN PAGE - Tech Theater Application
// ============================================================================

import { useEffect, useState } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { VoiceControlsRealtime } from './components/VoiceControlsRealtime';
import { AudioPermissionGate } from './components/AudioPermissionGate';
import { useAppStore } from '@/lib/store';
import { getDefaultCharacter } from '@/lib/characters';

export default function Home() {
  const setCurrentCharacter = useAppStore((s) => s.setCurrentCharacter);
  const currentCharacter = useAppStore((s) => s.currentCharacter);

  // Ustaw domyślną postać przy starcie
  useEffect(() => {
    if (!currentCharacter) {
      setCurrentCharacter(getDefaultCharacter());
    }
  }, [currentCharacter, setCurrentCharacter]);

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

      {/* Controls - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
        {/* Voice Controls - Realtime API only */}
        <VoiceControlsRealtime />
      </div>
      </main>
    </AudioPermissionGate>
  );
}
