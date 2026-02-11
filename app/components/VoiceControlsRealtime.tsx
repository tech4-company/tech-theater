'use client';

// ============================================================================
// VOICE CONTROLS COMPONENT (Realtime API)
// ============================================================================
// Prosty flow: Start → Toggle mikrofon ON/OFF
// Mikrofon jest ZAWSZE wyłączony gdy model mówi (nigdy nie przerywa)

import { useAppStore } from '@/lib/store';
import { useRealtimeVoice } from '@/lib/audio/useRealtimeVoice';
import { useEffect, useCallback, useRef, useState, type CSSProperties } from 'react';
import type { IntroStatus, OutroStatus } from '@/lib/types';

// Ikony SVG (neutralne, bez skojarzeń z mikrofonem)
const grassShapeStyle: CSSProperties = {
  // Liść / źdźbło trawy: nieregularny kształt zamiast koła
  clipPath: 'polygon(50% 0%, 70% 6%, 86% 20%, 94% 40%, 90% 62%, 76% 80%, 50% 100%, 24% 80%, 10% 62%, 6% 40%, 14% 20%, 30% 6%)',
};
const MicrophoneIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Drzewo / las */}
    <circle cx="8" cy="8" r="4" fill="currentColor" />
    <circle cx="14" cy="7" r="4" fill="currentColor" opacity="0.9" />
    <circle cx="16.5" cy="11" r="3.5" fill="currentColor" opacity="0.85" />
    <rect x="11" y="12" width="2.5" height="7" rx="1" fill="currentColor" />
    <rect x="6.5" y="12.5" width="2.2" height="6.5" rx="1" fill="currentColor" opacity="0.9" />
  </svg>
);

const MicrophoneOffIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Drzewo z przekreśleniem */}
    <circle cx="8" cy="8" r="4" fill="currentColor" opacity="0.45" />
    <circle cx="14" cy="7" r="4" fill="currentColor" opacity="0.45" />
    <circle cx="16.5" cy="11" r="3.5" fill="currentColor" opacity="0.45" />
    <rect x="11" y="12" width="2.5" height="7" rx="1" fill="currentColor" opacity="0.45" />
    <rect x="6.5" y="12.5" width="2.2" height="6.5" rx="1" fill="currentColor" opacity="0.45" />
    <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Górski start */}
    <circle cx="17" cy="7" r="2.5" fill="currentColor" />
    <path d="M3 19L9.5 10.5L13.5 15.5L18 9.5L21 19H3Z" fill="currentColor" />
  </svg>
);

const SpeakingIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ognisko / płomień */}
    <path d="M12 4C10.5 6 11.5 7.5 10 9C8.5 10.5 8.5 13.5 12 15C15.5 13.5 15.5 10.5 14 9C12.5 7.5 13.5 6 12 4Z" fill="currentColor"/>
    <path d="M6 18L10 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 18L14 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export function VoiceControlsRealtime() {
  const setState = useAppStore((s) => s.setState);
  const addMessage = useAppStore((s) => s.addMessage);
  const currentCharacter = useAppStore((s) => s.currentCharacter);
  const introStatus = useAppStore((s) => s.introStatus ?? 'idle');
  const setIntroStatus = useAppStore((s) => s.setIntroStatus);
  const outroStatus = useAppStore((s) => s.outroStatus ?? 'idle');
  const setOutroStatus = useAppStore((s) => s.setOutroStatus);
  const [assistantResponseCount, setAssistantResponseCount] = useState(0);
  const assistantResponseCountRef = useRef(0);
  const [lastResponseDoneAt, setLastResponseDoneAt] = useState<number | null>(null);
  const [lastAudioStoppedAt, setLastAudioStoppedAt] = useState<number | null>(null);
  const lastResponseDoneAtRef = useRef<number | null>(null);
  const lastAudioStoppedAtRef = useRef<number | null>(null);
  const OUTRO_AUDIO_STOP_FALLBACK_MS = 1500;
  const applyIntroStatus = useCallback(
    (status: IntroStatus) => {
      if (setIntroStatus) {
        setIntroStatus(status);
      } else {
        useAppStore.setState({ introStatus: status });
      }
    },
    [setIntroStatus],
  );
  const applyOutroStatus = useCallback(
    (status: OutroStatus) => {
      if (setOutroStatus) {
        setOutroStatus(status);
      } else {
        useAppStore.setState({ outroStatus: status });
      }
    },
    [setOutroStatus],
  );

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
    onResponseDone: (response) => {
      const status = response?.status;
      if (status === 'failed') return;
      const now = Date.now();
      lastResponseDoneAtRef.current = now;
      setLastResponseDoneAt(now);
      assistantResponseCountRef.current += 1;
      setAssistantResponseCount(assistantResponseCountRef.current);
    },
    onOutputAudioStopped: () => {
      const now = Date.now();
      lastAudioStoppedAtRef.current = now;
      setLastAudioStoppedAt(now);
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
  const pendingIntroStart = useRef(false);
  const pendingOutroTrigger = useRef(false);
  const wasSessionActiveRef = useRef(false);

  useEffect(() => {
    if (isSessionActive && !wasSessionActiveRef.current) {
      assistantResponseCountRef.current = 0;
      setAssistantResponseCount(0);
      lastResponseDoneAtRef.current = null;
      lastAudioStoppedAtRef.current = null;
      setLastResponseDoneAt(null);
      setLastAudioStoppedAt(null);
    }
    if (!isSessionActive && wasSessionActiveRef.current) {
      assistantResponseCountRef.current = 0;
      setAssistantResponseCount(0);
      lastResponseDoneAtRef.current = null;
      lastAudioStoppedAtRef.current = null;
      setLastResponseDoneAt(null);
      setLastAudioStoppedAt(null);
    }
    wasSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    if (realtimeState !== 'idle') return;
    // Don't override app state while outro is active
    if (outroStatus !== 'idle') return;
    if (!isSessionActive) {
      // Keep visual fallback on listening video to avoid flashes to waiting.mp4.
      setState('listening');
      return;
    }
    if (!isSpeaking) {
      setState('listening');
    }
  }, [isSessionActive, isSpeaking, outroStatus, realtimeState, setState]);

  const triggerOutro = useCallback(() => {
    if (outroStatus !== 'idle') return;
    console.log('[Outro] triggerOutro fired! Setting outroStatus=playing');
    pendingOutroTrigger.current = true;
    applyIntroStatus('idle');
    applyOutroStatus('playing');
    try {
      setMicrophoneEnabled(false);
      endSession();
    } catch {}
  }, [applyIntroStatus, applyOutroStatus, endSession, outroStatus, setMicrophoneEnabled]);

  useEffect(() => {
    console.log(`[Outro] check: count=${assistantResponseCount}, speaking=${isSpeaking}, session=${isSessionActive}, outroStatus=${outroStatus}, pending=${pendingOutroTrigger.current}`);
    if (outroStatus !== 'idle') return;
    if (assistantResponseCount < 4) return;
    if (isSpeaking) return;
    if (!isSessionActive) return;
    if (pendingOutroTrigger.current) return;
    const audioStoppedAfterResponse =
      lastAudioStoppedAt !== null &&
      lastResponseDoneAt !== null &&
      lastAudioStoppedAt >= lastResponseDoneAt;
    const fallbackReady =
      lastResponseDoneAt !== null &&
      Date.now() - lastResponseDoneAt >= OUTRO_AUDIO_STOP_FALLBACK_MS;

    console.log(`[Outro] timing: audioStopped=${audioStoppedAfterResponse}, fallback=${fallbackReady}`);
    if (!audioStoppedAfterResponse && !fallbackReady) return;
    triggerOutro();
  }, [
    assistantResponseCount,
    isSpeaking,
    isSessionActive,
    lastAudioStoppedAt,
    lastResponseDoneAt,
    outroStatus,
    triggerOutro,
  ]);

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

    pendingIntroStart.current = true;
    applyIntroStatus('playing');
  }, [applyIntroStatus, isConnected]);

  useEffect(() => {
    if (!pendingIntroStart.current) return;
    if (introStatus !== 'idle') return;

    const startAfterIntro = async () => {
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
    };

    pendingIntroStart.current = false;
    void startAfterIntro();
  }, [introStatus, isConnected, setMicrophoneEnabled, startSession]);

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

  const isIntroActive = introStatus === 'playing';
  const isOutroActive = outroStatus === 'playing' || outroStatus === 'ended';

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
          <div
            className="w-16 h-16 bg-gray-600 flex items-center justify-center overflow-hidden"
            style={grassShapeStyle}
          >
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
          </div>
        )}

        {/* Start button (connected but not started) */}
        {displayState === 'ready' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleStart}
              disabled={isIntroActive || isOutroActive}
              className={`
                w-16 h-16 
                bg-green-500 hover:bg-green-600 
                text-white
                flex items-center justify-center
                transition-all duration-200
                shadow-lg hover:shadow-xl
                focus:outline-none focus:ring-4 focus:ring-green-300
                overflow-hidden
                ${isIntroActive || isOutroActive ? 'opacity-50 cursor-not-allowed hover:bg-green-500' : ''}
              `}
              aria-label="Rozpocznij"
              style={grassShapeStyle}
            >
              <PlayIcon />
            </button>
            {outroStatus === 'ended' && (
              <button
                onClick={() => {
                  pendingOutroTrigger.current = false;
                  applyOutroStatus('idle');
                  applyIntroStatus('armed');
                  setState('waiting');
                }}
                className="
                  w-14 h-14 
                  bg-orange-500 hover:bg-orange-600 
                  text-white
                  flex items-center justify-center
                  transition-all duration-200
                  shadow-lg hover:shadow-xl
                  focus:outline-none focus:ring-4 focus:ring-orange-300
                  rounded-full
                "
                aria-label="Odśwież"
                title="Odśwież"
              >
                ↻
              </button>
            )}
          </div>
        )}

        {/* Mic OFF - click to enable */}
        {displayState === 'mic-off' && (
          <button
            onClick={handleToggleMic}
            className="
              w-16 h-16 
              bg-gray-500 hover:bg-gray-600 
              text-white
              flex items-center justify-center
              transition-all duration-200
              shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-gray-300
              overflow-hidden
            "
            aria-label="Aktywuj"
            style={grassShapeStyle}
          >
            <MicrophoneOffIcon />
          </button>
        )}

        {/* Mic ON - listening (click to disable) */}
        {displayState === 'mic-on' && (
          <button
            onClick={handleToggleMic}
            className="
              w-16 h-16 
              bg-blue-500 hover:bg-blue-600 
              text-white
              flex items-center justify-center
              transition-all duration-200
              shadow-lg hover:shadow-xl
              animate-pulse
              focus:outline-none focus:ring-4 focus:ring-blue-300
              overflow-hidden
            "
            aria-label="Dezaktywuj"
            style={grassShapeStyle}
          >
            <MicrophoneIcon />
          </button>
        )}

        {/* Model speaking (mic auto-disabled) */}
        {displayState === 'speaking' && (
          <div
            className="
              w-16 h-16 
              bg-slate-600
              text-white
              flex items-center justify-center
              shadow-lg
              animate-pulse
              overflow-hidden
            "
            aria-label="Trwa odpowiedź"
            style={grassShapeStyle}
          >
            <SpeakingIcon />
          </div>
        )}
      </div>

      {/* Status text removed on request */}
    </div>
  );
}
