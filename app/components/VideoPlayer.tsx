'use client';

// ============================================================================
// VIDEO PLAYER COMPONENT - SEAMLESS DOUBLE-BUFFERED
// ============================================================================
// Dwa elementy <video> nałożone na siebie (A i B).
// Nowe wideo ładuje się i startuje w niewidocznej warstwie.
// Dopiero gdy jest gotowe do odtwarzania, warstwy się zamieniają.
// Dzięki temu NIE MA czarnego ekranu między przejściami.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { AppState, IntroStatus, OutroStatus } from '@/lib/types';

interface VideoPlayerProps {
  waitingVideo: string;
  listeningVideo: string;
  respondingVideo: string;
  introVideo?: string;
  outroVideo?: string;
  className?: string;
  onVideoChange?: (state: AppState) => void;
  enableCrossfade?: boolean;
}

export function VideoPlayer({
  waitingVideo,
  listeningVideo,
  respondingVideo,
  introVideo,
  outroVideo,
  className = '',
  onVideoChange,
}: VideoPlayerProps) {
  // ---------------------------------------------------------------------------
  // Store state
  // ---------------------------------------------------------------------------
  const state = useAppStore((s) => s.state);
  const introStatus = useAppStore((s) => s.introStatus ?? 'idle');
  const setIntroStatus = useAppStore((s) => s.setIntroStatus);
  const outroStatus = useAppStore((s) => s.outroStatus ?? 'idle');
  const setOutroStatus = useAppStore((s) => s.setOutroStatus);

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

  // ---------------------------------------------------------------------------
  // Double-buffer video refs
  // ---------------------------------------------------------------------------
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  /** Which layer is currently on top: 0 = A, 1 = B */
  const activeSlotRef = useRef<0 | 1>(0);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);

  /** The src currently showing */
  const activeSrcRef = useRef(listeningVideo);
  const [currentVideo, setCurrentVideo] = useState(listeningVideo);

  const transitioningRef = useRef(false);
  const pendingTransitionRef = useRef<{ src: string; shouldPlay: boolean } | null>(null);
  const cleanupRafRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived flags
  // ---------------------------------------------------------------------------
  const isIntroActive =
    Boolean(introVideo) && (introStatus === 'armed' || introStatus === 'playing');
  const isIntroPlaying = introStatus === 'playing';
  const isIntroVideo = Boolean(introVideo) && currentVideo === introVideo;
  const isOutroActive =
    Boolean(outroVideo) && (outroStatus === 'playing' || outroStatus === 'ended');
  const isOutroPlaying = outroStatus === 'playing';
  const isOutroVideo = Boolean(outroVideo) && currentVideo === outroVideo;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const getVideo = useCallback(
    (slot: 0 | 1) => (slot === 0 ? videoARef.current : videoBRef.current),
    [],
  );

  const getActiveVideo = useCallback(
    () => getVideo(activeSlotRef.current),
    [getVideo],
  );

  // ---------------------------------------------------------------------------
  // Preload all videos into browser cache (off-screen elements)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const srcs = [
      waitingVideo,
      listeningVideo,
      respondingVideo,
      ...(introVideo ? [introVideo] : []),
      ...(outroVideo ? [outroVideo] : []),
    ];

    let loaded = 0;
    const total = srcs.length;

    srcs.forEach((src) => {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.playsInline = true;
      v.src = src;

      const done = () => {
        loaded++;
        if (loaded >= total) {
          setIsLoading(false);
          console.log('All videos preloaded successfully');
        }
      };

      v.oncanplaythrough = done;
      v.onerror = () => {
        console.error(`Failed to preload video: ${src}`);
        setLoadError('Failed to load video');
        done();
      };
    });
  }, [waitingVideo, listeningVideo, respondingVideo, introVideo, outroVideo]);

  // ---------------------------------------------------------------------------
  // Initialize first video (layer A) after preloading
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isLoading || initializedRef.current) return;
    const video = videoARef.current;
    if (!video) return;

    initializedRef.current = true;
    video.src = listeningVideo;
    video.loop = true;
    video.muted = true;
    activeSrcRef.current = listeningVideo;

    video.play().catch(console.warn);
    console.log(`Initial video: ${listeningVideo}`);
  }, [isLoading, listeningVideo]);

  // ---------------------------------------------------------------------------
  // Seamless video transition (double-buffer swap)
  // ---------------------------------------------------------------------------
  const transitionToVideo = useCallback(
    async (newSrc: string, shouldPlay = true) => {
      // Already showing this video
      if (newSrc === activeSrcRef.current) return;

      // Another transition in progress — queue this one
      if (transitioningRef.current) {
        pendingTransitionRef.current = { src: newSrc, shouldPlay };
        return;
      }

      transitioningRef.current = true;
      pendingTransitionRef.current = null;

      // Cancel any pending cleanup rAF from previous transition
      if (cleanupRafRef.current !== null) {
        cancelAnimationFrame(cleanupRafRef.current);
        cleanupRafRef.current = null;
      }

      const currentSlot = activeSlotRef.current;
      const nextSlot: 0 | 1 = currentSlot === 0 ? 1 : 0;
      const nextVideo = nextSlot === 0 ? videoARef.current : videoBRef.current;
      const oldVideo = currentSlot === 0 ? videoARef.current : videoBRef.current;

      if (!nextVideo) {
        // Fallback: just update state
        activeSrcRef.current = newSrc;
        setCurrentVideo(newSrc);
        transitioningRef.current = false;
        return;
      }

      try {
        // Determine loop behaviour
        const isIntro = Boolean(introVideo) && newSrc === introVideo;
        const isOutro = Boolean(outroVideo) && newSrc === outroVideo;

        // Prepare next video in background layer
        nextVideo.src = newSrc;
        nextVideo.loop = !isIntro && !isOutro;
        nextVideo.muted = true;
        nextVideo.currentTime = 0;

        // Wait until the browser can play without stalling
        await new Promise<void>((resolve) => {
          if (nextVideo.readyState >= 3) {
            resolve();
            return;
          }
          const timeout = setTimeout(resolve, 3000); // safety fallback
          const onReady = () => {
            clearTimeout(timeout);
            nextVideo.removeEventListener('canplay', onReady);
            resolve();
          };
          nextVideo.addEventListener('canplay', onReady);
        });

        // Start playback BEFORE swapping layers (renders the first frame)
        if (shouldPlay) {
          try {
            await nextVideo.play();
          } catch (err) {
            console.warn('Next video play() failed:', err);
          }
        }

        // Swap layers — the new video is now visible
        activeSlotRef.current = nextSlot;
        activeSrcRef.current = newSrc;
        setActiveSlot(nextSlot);
        setCurrentVideo(newSrc);

        console.log(`Video swap: slot ${currentSlot} → ${nextSlot} (${newSrc})`);

        // Pause the old layer. Do NOT change its src — a pending
        // transition may already be loading into it.
        cleanupRafRef.current = requestAnimationFrame(() => {
          cleanupRafRef.current = null;
          if (oldVideo && !transitioningRef.current) {
            oldVideo.pause();
          }
        });
      } catch (err) {
        console.warn('Video transition error:', err);
        // Fallback: swap anyway to avoid getting stuck
        activeSrcRef.current = newSrc;
        setCurrentVideo(newSrc);
        activeSlotRef.current = nextSlot;
        setActiveSlot(nextSlot);
      } finally {
        transitioningRef.current = false;
      }

      // Process queued transition (if state changed during our transition)
      const pending = pendingTransitionRef.current as {
        src: string;
        shouldPlay: boolean;
      } | null;
      if (pending && pending.src !== activeSrcRef.current) {
        pendingTransitionRef.current = null;
        void transitionToVideo(pending.src, pending.shouldPlay);
      }
    },
    [introVideo, outroVideo, listeningVideo],
  );

  // ---------------------------------------------------------------------------
  // Map app state → desired video src, trigger transition
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const videoMap: Record<AppState, string> = {
      waiting: waitingVideo,
      listening: listeningVideo,
      processing: listeningVideo,
      responding: respondingVideo,
    };

    const newVideo =
      isOutroActive && outroVideo
        ? outroVideo
        : isIntroActive && introVideo
          ? introVideo
          : videoMap[state];
    if (!newVideo) return;

    console.log(`[VideoPlayer] state mapping: state=${state}, isOutroActive=${isOutroActive}, isIntroActive=${isIntroActive}, newVideo=${newVideo}, activeSrc=${activeSrcRef.current}`);

    if (newVideo !== activeSrcRef.current) {
      console.log(`[VideoPlayer] transition requested: ${activeSrcRef.current} → ${newVideo}`);
      const shouldPlay = isOutroActive
        ? isOutroPlaying
        : !isIntroActive || isIntroPlaying;
      transitionToVideo(newVideo, shouldPlay);
      onVideoChange?.(state);
    }
  }, [
    state,
    waitingVideo,
    listeningVideo,
    respondingVideo,
    introVideo,
    outroVideo,
    transitionToVideo,
    onVideoChange,
    isIntroActive,
    isIntroPlaying,
    isOutroActive,
    isOutroPlaying,
  ]);

  // ---------------------------------------------------------------------------
  // Manage muted + play/pause on active video (intro/outro state changes)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const video = getActiveVideo();
    if (!video || isLoading) return;

    // Muted control
    if (isIntroVideo) {
      video.muted = introStatus !== 'playing';
    } else if (isOutroVideo) {
      video.muted = outroStatus !== 'playing';
    } else {
      video.muted = true;
    }

    // Play / pause control
    const shouldAutoplay = isOutroVideo
      ? isOutroPlaying
      : !isIntroVideo || isIntroPlaying;
    const shouldFreezeOutro = isOutroVideo && !isOutroPlaying;

    if (shouldFreezeOutro) {
      video.pause();
      try {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.max(0, video.duration - 0.05);
        }
      } catch {}
      return;
    }

    if (shouldAutoplay && video.paused) {
      video.play().catch(console.warn);
    } else if (!shouldAutoplay && !video.paused) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {}
    }
  }, [
    activeSlot,
    currentVideo,
    isLoading,
    isIntroVideo,
    isIntroPlaying,
    isOutroVideo,
    isOutroPlaying,
    introStatus,
    outroStatus,
    getActiveVideo,
  ]);

  // ---------------------------------------------------------------------------
  // Handle 'ended' event on active video (intro/outro completion, loop safety)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const video = getActiveVideo();
    if (!video || isLoading) return;

    const handleEnded = () => {
      // Intro finished playing
      if (isIntroVideo && isIntroPlaying) {
        applyIntroStatus('idle');
        return;
      }
      // Outro finished playing — freeze on last frame
      if (isOutroVideo && isOutroPlaying) {
        try {
          video.pause();
          if (Number.isFinite(video.duration) && video.duration > 0) {
            video.currentTime = Math.max(0, video.duration - 0.05);
          }
        } catch {}
        applyOutroStatus('ended');
        return;
      }
      // Loop videos: safety net (loop=true should handle this, but just in case)
      video.play().catch(console.warn);
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [
    activeSlot,
    currentVideo,
    isLoading,
    isIntroVideo,
    isIntroPlaying,
    isOutroVideo,
    isOutroPlaying,
    applyIntroStatus,
    applyOutroStatus,
    getActiveVideo,
  ]);

  // ---------------------------------------------------------------------------
  // Handle user tap to unblock autoplay
  // ---------------------------------------------------------------------------
  const handleUserInteraction = useCallback(() => {
    if (introStatus === 'armed' || outroStatus === 'ended') return;
    const video = getActiveVideo();
    if (video && video.paused) {
      video.play().catch(console.warn);
    }
  }, [introStatus, outroStatus, getActiveVideo]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center bg-black ${className}`}
      onClick={handleUserInteraction}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          </div>
        </div>
      )}

      {/* Error overlay */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 z-20">
          <div className="text-center p-6 bg-gray-900 rounded-lg text-3xl text-red-500">
            ⚠️
          </div>
        </div>
      )}

      {/* Video Layer A */}
      <video
        ref={videoARef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: activeSlot === 0 ? 2 : 1 }}
        muted
        playsInline
      />

      {/* Video Layer B */}
      <video
        ref={videoBRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: activeSlot === 1 ? 2 : 1 }}
        muted
        playsInline
      />
    </div>
  );
}
