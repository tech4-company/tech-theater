'use client';

// ============================================================================
// VOICE MODE SWITCH COMPONENT
// ============================================================================
// Komponent do przełączania między ElevenLabs a OpenAI Realtime API

import { useAppStore } from '@/lib/store';

export function VoiceModeSwitch() {
  const voiceMode = useAppStore((s) => s.voiceMode);
  const setVoiceMode = useAppStore((s) => s.setVoiceMode);
  const state = useAppStore((s) => s.state);

  // Disable switching while active
  const isActive = state !== 'waiting';

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <label className="text-sm text-gray-600 dark:text-gray-400">
        Tryb głosowy
      </label>
      
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setVoiceMode('elevenlabs')}
          disabled={isActive}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${voiceMode === 'elevenlabs' 
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }
            ${isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          ElevenLabs
          <span className="ml-1 text-xs">🎵</span>
        </button>

        <button
          onClick={() => setVoiceMode('realtime')}
          disabled={isActive}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${voiceMode === 'realtime' 
              ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }
            ${isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          Realtime API
          <span className="ml-1 text-xs">⚡</span>
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-500 text-center max-w-xs mt-1">
        {voiceMode === 'elevenlabs' 
          ? 'Wysoka jakość głosu (wolniejsze)' 
          : 'Szybkie odpowiedzi w czasie rzeczywistym (szybsze)'
        }
      </p>
    </div>
  );
}


