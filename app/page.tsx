'use client';

// ============================================================================
// MAIN PAGE - Tech Theater Application
// ============================================================================

import { useEffect } from 'react';
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
      const baseCharacter = getDefaultCharacter();
      setCurrentCharacter(baseCharacter);
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
            introVideo="/videos-in-out/ffb7d996-221c-482f-b1ba-f8cf6f83b336.mp4"
            outroVideo="/videos-in-out/69410a3f-c422-4ac1-a1ac-5fb735ccded7.mp4"
            className="w-full h-full"
            onVideoChange={(state) => {
              console.log('Video changed to state:', state);
            }}
            enableCrossfade={true}
          />
        </div>

        <div className="fixed bottom-0 right-0 z-10 p-6">
          {/* Voice Controls - Realtime API only */}
          <VoiceControlsRealtime />
        </div>
      </main>
    </AudioPermissionGate>
  );
}
