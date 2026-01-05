'use client';

// ============================================================================
// REALTIME VOICE HOOK (OpenAI Realtime API) - WebRTC (Netlify-friendly)
// ============================================================================
// - Mic jest WYŁĄCZONY gdy model mówi (nigdy nie przerywa)
// - Persistent connection z keepalive + auto-reconnect
// - Prosty flow: start → mic ON/OFF toggle
// - Speaking state śledzi RZECZYWISTE odtwarzanie audio (nie tylko eventy)

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character } from '../types';

type RealtimeState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

interface UseRealtimeVoiceOptions {
  character: Character;
  onStateChange?: (state: RealtimeState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseRealtimeVoiceReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  startSession: () => Promise<void>;
  endSession: () => void;
  setMicrophoneEnabled: (enabled: boolean) => void;
  isConnected: boolean;
  isSessionActive: boolean;
  isMicrophoneOn: boolean;
  isSpeaking: boolean;
  state: RealtimeState;
  error: Error | null;
}

type RealtimeTokenResponse =
  | {
      mode: 'ephemeral';
      client_secret: string;
      expires_at?: number;
      model: string;
      voice: string;
      sessionConfig: Record<string, unknown>;
    }
  | {
      mode: 'api_key';
      apiKey: string;
      model: string;
      voice: string;
      sessionConfig: Record<string, unknown>;
    };

// Keepalive interval (30s) - prevents server-side timeout
const KEEPALIVE_INTERVAL = 30_000;
// Reconnect delay
const RECONNECT_DELAY = 2_000;
// Silence detection settings
const SILENCE_THRESHOLD = 0.01; // Volume level considered "silence"
const SILENCE_DURATION_MS = 400; // How long silence must last to end speaking
const AUDIO_CHECK_INTERVAL_MS = 50; // How often to check audio level

export function useRealtimeVoice({
  character,
  onStateChange,
  onTranscript,
  onResponse,
  onError,
}: UseRealtimeVoiceOptions): UseRealtimeVoiceReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [state, setState] = useState<RealtimeState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionConfigRef = useRef<Record<string, unknown> | null>(null);

  // Audio analysis for detecting when model stops speaking
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const responseAudioDoneRef = useRef(false); // True when OpenAI finished sending audio

  // Refs for state that callbacks need without re-renders
  const isSessionActiveRef = useRef(false);
  const userWantsMicOnRef = useRef(false); // User intent: mic ON after model stops
  const isSpeakingRef = useRef(false);
  const keepaliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const characterRef = useRef(character);
  characterRef.current = character;

  const updateState = useCallback(
    (newState: RealtimeState) => {
      setState(newState);
      onStateChange?.(newState);
    },
    [onStateChange],
  );

  const sendEvent = useCallback((event: Record<string, unknown>) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') return;
    dc.send(JSON.stringify(event));
  }, []);

  // Raw mic enable/disable (hardware level)
  const setMicHardware = useCallback((enabled: boolean) => {
    const stream = micStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  // Stop silence detection
  const stopSilenceDetection = useCallback(() => {
    if (silenceCheckIntervalRef.current) {
      clearInterval(silenceCheckIntervalRef.current);
      silenceCheckIntervalRef.current = null;
    }
    silenceStartRef.current = null;
    responseAudioDoneRef.current = false;
  }, []);

  // Called when we're sure the model has finished speaking
  const finishSpeaking = useCallback(() => {
    stopSilenceDetection();
    isSpeakingRef.current = false;
    setIsSpeaking(false);

    // Restore mic if user wants it
    if (isSessionActiveRef.current && userWantsMicOnRef.current) {
      setMicHardware(true);
      setIsMicrophoneOn(true);
      updateState('listening');
    } else {
      updateState('idle');
    }
  }, [setMicHardware, stopSilenceDetection, updateState]);

  // Start silence detection (called when response.audio.done arrives)
  const startSilenceDetection = useCallback(() => {
    responseAudioDoneRef.current = true;

    // If we don't have analyser set up, fall back to timeout
    if (!analyserRef.current) {
      console.log('No analyser, using fallback timeout');
      setTimeout(() => {
        if (isSpeakingRef.current && responseAudioDoneRef.current) {
          finishSpeaking();
        }
      }, 800);
      return;
    }

    // Already running?
    if (silenceCheckIntervalRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    silenceCheckIntervalRef.current = setInterval(() => {
      if (!isSpeakingRef.current || !responseAudioDoneRef.current) {
        stopSilenceDetection();
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume (0-255 scale)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avgVolume = sum / dataArray.length / 255; // Normalize to 0-1

      if (avgVolume < SILENCE_THRESHOLD) {
        // Silence detected
        if (silenceStartRef.current === null) {
          silenceStartRef.current = Date.now();
        } else if (Date.now() - silenceStartRef.current >= SILENCE_DURATION_MS) {
          // Silence lasted long enough - model finished speaking
          console.log('Silence detected, finishing speaking');
          finishSpeaking();
        }
      } else {
        // Audio playing - reset silence timer
        silenceStartRef.current = null;
      }
    }, AUDIO_CHECK_INTERVAL_MS);
  }, [finishSpeaking, stopSilenceDetection]);

  // Clear keepalive
  const clearKeepalive = useCallback(() => {
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }
  }, []);

  // Start keepalive pings
  const startKeepalive = useCallback(() => {
    clearKeepalive();
    keepaliveIntervalRef.current = setInterval(() => {
      sendEvent({ type: 'input_audio_buffer.clear' });
    }, KEEPALIVE_INTERVAL);
  }, [clearKeepalive, sendEvent]);

  // Disconnect (cleanup)
  const disconnect = useCallback(() => {
    try {
      clearKeepalive();
      stopSilenceDetection();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      setMicHardware(false);

      if (dcRef.current) {
        try {
          dcRef.current.close();
        } catch {}
        dcRef.current = null;
      }

      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {}
        pcRef.current = null;
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
        analyserRef.current = null;
      }

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current = null;
      }

      sessionConfigRef.current = null;
      isSessionActiveRef.current = false;
      userWantsMicOnRef.current = false;
      isSpeakingRef.current = false;
    } finally {
      setIsConnected(false);
      setIsSessionActive(false);
      setIsMicrophoneOn(false);
      setIsSpeaking(false);
      updateState('idle');
    }
  }, [clearKeepalive, setMicHardware, stopSilenceDetection, updateState]);

  // Handle Realtime events from data channel
  const handleRealtimeEvent = useCallback(
    (message: any) => {
      const type = message?.type as string | undefined;
      if (!type) return;

      switch (type) {
        case 'session.created':
        case 'session.updated':
          setIsConnected(true);
          if (!isSessionActiveRef.current) {
            updateState('idle');
          }
          break;

        case 'input_audio_buffer.speech_started':
          // User started speaking
          updateState('listening');
          break;

        case 'input_audio_buffer.speech_stopped':
          // User stopped speaking → model will think
          updateState('thinking');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          if (message.transcript) {
            onTranscript?.(message.transcript, true);
          }
          break;

        case 'response.text.delta':
          if (message.delta) {
            onTranscript?.(message.delta, false);
          }
          break;

        case 'response.text.done':
          if (message.text) {
            onResponse?.(message.text);
          }
          break;

        case 'response.created':
          // Model starts speaking → MIC OFF (never interrupt!)
          isSpeakingRef.current = true;
          responseAudioDoneRef.current = false;
          setIsSpeaking(true);
          setMicHardware(false);
          setIsMicrophoneOn(false);
          updateState('speaking');
          break;

        case 'response.audio.done':
          // OpenAI finished SENDING audio - but playback continues
          // Start silence detection to know when playback actually ends
          console.log('response.audio.done - starting silence detection');
          startSilenceDetection();
          break;

        case 'response.done':
          // Response complete (including text) - ensure silence detection is running
          if (isSpeakingRef.current && !responseAudioDoneRef.current) {
            // In case response.audio.done didn't fire
            console.log('response.done - starting silence detection (fallback)');
            startSilenceDetection();
          }
          break;

        case 'error': {
          const msg = message?.error?.message || 'Realtime API error';
          console.error('Realtime error:', msg);
          break;
        }

        default:
          break;
      }
    },
    [onResponse, onTranscript, setMicHardware, startSilenceDetection, updateState],
  );

  // Connect to Realtime API via WebRTC
  const connect = useCallback(async () => {
    try {
      updateState('connecting');
      setError(null);

      // 1) Get ephemeral token + sessionConfig from backend
      const tokenRes = await fetch('/api/realtime-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: characterRef.current.id }),
      });

      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to get Realtime token');
      }

      const tokenData = (await tokenRes.json()) as RealtimeTokenResponse;
      const bearer =
        tokenData.mode === 'ephemeral' ? tokenData.client_secret : tokenData.apiKey;

      sessionConfigRef.current = tokenData.sessionConfig ?? null;

      // 2) WebRTC: peer connection + data channel + audio track
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Handle ICE connection state changes (for auto-reconnect)
      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        console.log('ICE connection state:', iceState);

        if (iceState === 'disconnected' || iceState === 'failed') {
          console.warn('WebRTC disconnected, will reconnect...');
          setIsConnected(false);

          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(async () => {
              reconnectTimeoutRef.current = null;
              if (isSessionActiveRef.current) {
                console.log('Attempting reconnect...');
                disconnect();
                try {
                  await connect();
                  if (isSessionActiveRef.current) {
                    setIsSessionActive(true);
                    if (userWantsMicOnRef.current) {
                      setMicHardware(true);
                      setIsMicrophoneOn(true);
                      updateState('listening');
                    }
                  }
                } catch (e) {
                  console.error('Reconnect failed:', e);
                }
              }
            }, RECONNECT_DELAY);
          }
        }
      };

      // Remote audio → <audio> element + AudioContext for analysis
      const audioEl = new Audio();
      audioEl.autoplay = true;
      remoteAudioRef.current = audioEl;

      pc.ontrack = (e) => {
        const [stream] = e.streams;
        if (stream && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          void remoteAudioRef.current.play().catch(() => {});

          // Set up AudioContext for silence detection
          try {
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            // Don't connect to destination - we already have <audio> element playing
            analyserRef.current = analyser;

            console.log('Audio analyser set up for silence detection');
          } catch (err) {
            console.warn('Failed to set up audio analyser:', err);
          }
        }
      };

      // Data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleRealtimeEvent(msg);
        } catch {}
      };

      dc.onopen = () => {
        if (sessionConfigRef.current) {
          sendEvent({
            type: 'session.update',
            session: sessionConfigRef.current,
          });
        }
        startKeepalive();
      };

      dc.onclose = () => {
        clearKeepalive();
      };

      // Mic: add track but keep disabled until user explicitly enables
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      mic.getAudioTracks().forEach((t) => {
        t.enabled = false;
        pc.addTrack(t, mic);
      });

      // 3) SDP offer/answer with OpenAI Realtime (WebRTC)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const answerRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(tokenData.model)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${bearer}`,
            'Content-Type': 'application/sdp',
            'OpenAI-Beta': 'realtime=v1',
          },
          body: offer.sdp!,
        },
      );

      if (!answerRes.ok) {
        const text = await answerRes.text().catch(() => '');
        throw new Error(
          `Realtime SDP exchange failed (${answerRes.status}): ${text || answerRes.statusText}`,
        );
      }

      const answerSdp = await answerRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setIsConnected(true);
      updateState('idle');
    } catch (err) {
      const e = err as Error;
      setError(e);
      onError?.(e);
      updateState('idle');
      disconnect();
    }
  }, [
    clearKeepalive,
    disconnect,
    handleRealtimeEvent,
    onError,
    sendEvent,
    setMicHardware,
    startKeepalive,
    updateState,
  ]);

  // Start session (user clicked "Start") - connection stays open indefinitely
  const startSession = useCallback(async () => {
    if (!isConnected) throw new Error('Not connected to Realtime API');
    isSessionActiveRef.current = true;
    setIsSessionActive(true);
    updateState('idle');
  }, [isConnected, updateState]);

  // End session (user wants to stop) - but keep connection alive
  const endSession = useCallback(() => {
    isSessionActiveRef.current = false;
    userWantsMicOnRef.current = false;
    setIsSessionActive(false);
    setMicHardware(false);
    setIsMicrophoneOn(false);
    stopSilenceDetection();
    updateState('idle');
  }, [setMicHardware, stopSilenceDetection, updateState]);

  // Toggle microphone (user controls this)
  const setMicrophoneEnabled = useCallback(
    (enabled: boolean) => {
      userWantsMicOnRef.current = enabled;

      // Only actually enable mic if model is NOT speaking
      if (enabled && !isSpeakingRef.current) {
        setMicHardware(true);
        setIsMicrophoneOn(true);
        updateState('listening');
      } else if (!enabled) {
        setMicHardware(false);
        setIsMicrophoneOn(false);
        if (!isSpeakingRef.current) {
          updateState('idle');
        }
      }
    },
    [setMicHardware, updateState],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connect,
    disconnect,
    startSession,
    endSession,
    setMicrophoneEnabled,
    isConnected,
    isSessionActive,
    isMicrophoneOn,
    isSpeaking,
    state,
    error,
  };
}
