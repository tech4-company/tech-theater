'use client';

// ============================================================================
// VOICE CONTROLS COMPONENT (Realtime API)
// ============================================================================
// Prosty flow: Start → Toggle mikrofon ON/OFF
// Mikrofon jest ZAWSZE wyłączony gdy model mówi (nigdy nie przerywa)

import { useAppStore } from '@/lib/store';
import { useRealtimeVoice } from '@/lib/audio/useRealtimeVoice';
import { useEffect, useCallback, useRef } from 'react';

// Ikony SVG
const MicrophoneIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
    <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H3V12C3 16.42 6.28 20.11 10.5 20.86V24H13.5V20.86C17.72 20.11 21 16.42 21 12V10H19Z" fill="currentColor"/>
  </svg>
);

const MicrophoneOffIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor" opacity="0.4"/>
    <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H3V12C3 16.42 6.28 20.11 10.5 20.86V24H13.5V20.86C17.72 20.11 21 16.42 21 12V10H19Z" fill="currentColor" opacity="0.4"/>
    <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
  </svg>
);

const SpeakingIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor"/>
    <path d="M16 9C16 9 18 10.5 18 12C18 13.5 16 15 16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19 6C19 6 22 9 22 12C22 15 19 18 19 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export function VoiceControlsRealtime() {
  const setState = useAppStore((s) => s.setState);
  const addMessage = useAppStore((s) => s.addMessage);
  const currentCharacter = useAppStore((s) => s.currentCharacter);

  // Realtime voice hook
  const {
    connect,
    startSession,
    endSession,
    setMicrophoneEnabled,
    isConnected,
    isSessionActive,
    isMicrophoneOn,
    isSpeaking,
    state: realtimeState,
    error: realtimeError,
  } = useRealtimeVoice({
    character: currentCharacter!,
    onStateChange: (newState) => {
      // Map Realtime states to app states (for video sync)
      if (newState === 'listening') {
        setState('listening');
      } else if (newState === 'thinking') {
        setState('processing');
      } else if (newState === 'speaking') {
        setState('responding');
      } else if (newState === 'idle') {
        setState('waiting');
      }
    },
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        const userMessage = {
          id: Date.now().toString(),
          role: 'user' as const,
          content: text,
          timestamp: Date.now(),
        };
        addMessage(userMessage);
      }
    },
    onResponse: (text) => {
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: text,
        timestamp: Date.now(),
      };
      addMessage(assistantMessage);
    },
    onError: (error) => {
      console.error('Realtime API error:', error);
      // Don't show alert for minor errors, just log
    },
  });

  // Store connect function in ref to avoid dependency issues
  const connectRef = useRef(connect);
  connectRef.current = connect;

  // Track if we've already initiated connection
  const hasInitiatedConnection = useRef(false);
  const isMounted = useRef(true);

  // Auto-connect on mount if character is available
  useEffect(() => {
    isMounted.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (currentCharacter) {
      timeoutId = setTimeout(() => {
        if (isMounted.current && !hasInitiatedConnection.current) {
          hasInitiatedConnection.current = true;
          connectRef.current().catch((err) => {
            console.error('Failed to auto-connect:', err);
            hasInitiatedConnection.current = false;
          });
        }
      }, 300);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      isMounted.current = false;
    };
  }, [currentCharacter]);

  // Start session handler
  const handleStart = useCallback(async () => {
    if (!isConnected) {
      alert('Nie połączono z Realtime API. Spróbuj odświeżyć stronę.');
      return;
    }

    try {
      await startSession();
      // Auto-enable mic when starting
      setMicrophoneEnabled(true);
    } catch (err) {
      console.error('Failed to start session:', err);
      alert(`Błąd: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [isConnected, startSession, setMicrophoneEnabled]);

  // Toggle mic handler
  const handleToggleMic = useCallback(() => {
    setMicrophoneEnabled(!isMicrophoneOn);
  }, [isMicrophoneOn, setMicrophoneEnabled]);

  // Determine display state
  type DisplayState = 'connecting' | 'ready' | 'mic-off' | 'mic-on' | 'speaking';
  
  const displayState: DisplayState = (() => {
    if (!isConnected) return 'connecting';
    if (!isSessionActive) return 'ready';
    if (isSpeaking) return 'speaking';
    if (isMicrophoneOn) return 'mic-on';
    return 'mic-off';
  })();

  // Show error if critical
  if (realtimeError && !isConnected) {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold">Błąd połączenia</p>
          <p className="text-sm mt-2">{realtimeError.message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Odśwież stronę
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Main Button */}
      <div className="relative">
        {/* Connecting spinner */}
        {displayState === 'connecting' && (
          <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
          </div>
        )}

        {/* Start button (connected but not started) */}
        {displayState === 'ready' && (
          <button
            onClick={handleStart}
            className="
              w-16 h-16 rounded-full 
              bg-green-500 hover:bg-green-600 
              text-white
              flex items-center justify-center
              transition-all duration-200
              shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-green-300
            "
            aria-label="Rozpocznij"
          >
            <PlayIcon />
          </button>
        )}

        {/* Mic OFF - click to enable */}
        {displayState === 'mic-off' && (
          <button
            onClick={handleToggleMic}
            className="
              w-16 h-16 rounded-full 
              bg-gray-500 hover:bg-gray-600 
              text-white
              flex items-center justify-center
              transition-all duration-200
              shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-gray-300
            "
            aria-label="Włącz mikrofon"
          >
            <MicrophoneOffIcon />
          </button>
        )}

        {/* Mic ON - listening (click to disable) */}
        {displayState === 'mic-on' && (
          <button
            onClick={handleToggleMic}
            className="
              w-16 h-16 rounded-full 
              bg-blue-500 hover:bg-blue-600 
              text-white
              flex items-center justify-center
              transition-all duration-200
              shadow-lg hover:shadow-xl
              animate-pulse
              focus:outline-none focus:ring-4 focus:ring-blue-300
            "
            aria-label="Wyłącz mikrofon"
          >
            <MicrophoneIcon />
          </button>
        )}

        {/* Model speaking (mic auto-disabled) */}
        {displayState === 'speaking' && (
          <div
            className="
              w-16 h-16 rounded-full 
              bg-slate-600
              text-white
              flex items-center justify-center
              shadow-lg
              animate-pulse
            "
            aria-label="Model odpowiada"
          >
            <SpeakingIcon />
          </div>
        )}
      </div>

      {/* Status text removed on request */}
    </div>
  );
}
