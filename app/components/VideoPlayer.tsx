'use client';

// ============================================================================
// VIDEO PLAYER COMPONENT - ENHANCED
// ============================================================================
// Komponent odtwarzający filmy animacji postaci z automatyczną synchronizacją
// z stanem aplikacji (waiting/listening/responding)
// FAZA 6: Dodano płynne przejścia, optymalizację i event handlers

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
  enableCrossfade = true,
}: VideoPlayerProps) {
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
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const [currentVideo, setCurrentVideo] = useState<string>(waitingVideo);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoCache = useRef<Map<string, HTMLVideoElement>>(new Map());

  const isIntroActive = Boolean(introVideo) && (introStatus === 'armed' || introStatus === 'playing');
  const isIntroPlaying = introStatus === 'playing';
  const isIntroVideo = Boolean(introVideo) && currentVideo === introVideo;
  const isOutroActive = Boolean(outroVideo) && (outroStatus === 'playing' || outroStatus === 'ended');
  const isOutroPlaying = outroStatus === 'playing';
  const isOutroVideo = Boolean(outroVideo) && currentVideo === outroVideo;

  const getVideoType = useCallback((src: string) => {
    const lower = src.toLowerCase();
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.webm')) return 'video/webm';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    return undefined;
  }, []);

  // Enhanced preload wszystkich filmów z cache
  useEffect(() => {
    const videos = [
      { src: waitingVideo, state: 'waiting' },
      { src: listeningVideo, state: 'listening' },
      { src: respondingVideo, state: 'responding' },
      ...(introVideo ? [{ src: introVideo, state: 'intro' }] : []),
      ...(outroVideo ? [{ src: outroVideo, state: 'outro' }] : []),
    ];
    
    let loadedCount = 0;
    const totalVideos = videos.length;

    videos.forEach(({ src, state }) => {
      // Check if already cached
      if (videoCache.current.has(src)) {
        loadedCount++;
        if (loadedCount === totalVideos) {
          setIsLoading(false);
        }
        return;
      }

      const video = document.createElement('video');
      video.src = src;
      video.preload = 'auto';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        videoCache.current.set(src, video);
        loadedCount++;
        console.log(`Video loaded: ${state} (${loadedCount}/${totalVideos})`);
        
        if (loadedCount === totalVideos) {
          setIsLoading(false);
          console.log('All videos preloaded successfully');
        }
      };

      video.onerror = (e) => {
        // Avoid logging the entire Event object (very noisy); surface actionable info instead.
        const mediaError = video.error;
        console.error(`Error loading video: ${state}`, {
          src,
          currentSrc: video.currentSrc,
          mediaErrorCode: mediaError?.code ?? null,
          mediaErrorMessage: (mediaError as any)?.message ?? null,
          networkState: video.networkState,
          readyState: video.readyState,
          eventType: (e as Event)?.type,
        });
        setLoadError(`Failed to load ${state} video`);
        loadedCount++;
        
        if (loadedCount === totalVideos) {
          setIsLoading(false);
        }
      };
    });

    // Cleanup
    return () => {
      videoCache.current.clear();
    };
  }, [waitingVideo, listeningVideo, respondingVideo, introVideo, outroVideo]);

  // Smooth video transition with crossfade
  const transitionToVideo = useCallback(async (newVideoSrc: string, shouldPlay = true) => {
    if (newVideoSrc === currentVideo || isTransitioning) return;

    setIsTransitioning(true);
    
    const primaryVideo = primaryVideoRef.current;
    const secondaryVideo = secondaryVideoRef.current;

    if (!primaryVideo) {
      setCurrentVideo(newVideoSrc);
      setIsTransitioning(false);
      return;
    }

    try {
      // Simple transition: just switch
      if (!enableCrossfade || !secondaryVideo) {
        setCurrentVideo(newVideoSrc);
        if (shouldPlay) {
          await primaryVideo.play();
        }
      } else {
        // Crossfade transition (optional, can be complex)
        setCurrentVideo(newVideoSrc);
        if (shouldPlay) {
          await primaryVideo.play();
        }
      }
    } catch (err) {
      console.warn('Video play error:', err);
    } finally {
      setIsTransitioning(false);
    }
  }, [currentVideo, isTransitioning, enableCrossfade]);

  // Zmiana filmu na podstawie stanu
  useEffect(() => {
    const videoMap: Record<AppState, string> = {
      waiting: waitingVideo,
      listening: listeningVideo,
      processing: listeningVideo, // Kontynuacja listening podczas przetwarzania
      responding: respondingVideo,
    };

    const newVideo = isOutroActive && outroVideo
      ? outroVideo
      : isIntroActive && introVideo
        ? introVideo
        : videoMap[state];
    if (!newVideo) return;

    if (newVideo !== currentVideo) {
      console.log(`Video transition: ${state} -> ${newVideo}`);
      const shouldPlay = isOutroActive ? isOutroPlaying : !isIntroActive || isIntroPlaying;
      transitionToVideo(newVideo, shouldPlay);

      // Callback for parent
      if (onVideoChange) {
        onVideoChange(state);
      }
    }
  }, [
    state,
    waitingVideo,
    listeningVideo,
    respondingVideo,
    introVideo,
    outroVideo,
    currentVideo,
    transitionToVideo,
    onVideoChange,
    isIntroActive,
    isIntroPlaying,
    isOutroActive,
    isOutroPlaying,
  ]);

  // Autoplay and maintain loop
  useEffect(() => {
    const video = primaryVideoRef.current;
    if (!video || isLoading) return;

    const shouldAutoplay = isOutroVideo ? isOutroPlaying : !isIntroVideo || isIntroPlaying;
    const shouldFreezeOutro = isOutroVideo && !isOutroPlaying;

    const playVideo = async () => {
      try {
        if (shouldFreezeOutro) {
          video.pause();
          try {
            if (Number.isFinite(video.duration) && video.duration > 0) {
              video.currentTime = Math.max(0, video.duration - 0.05);
            }
          } catch {}
          return;
        }
        video.load();
        if (shouldAutoplay) {
          await video.play();
          console.log(`Playing video: ${currentVideo}`);
        } else {
          video.pause();
          try {
            video.currentTime = 0;
          } catch {}
        }
      } catch (err) {
        console.warn('Autoplay blocked or error:', err);
        // User needs to interact with page first
      }
    };

    playVideo();

    const handleEnded = () => {
      if (isIntroVideo && isIntroPlaying) {
        applyIntroStatus('idle');
        return;
      }
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
      video.play().catch(console.warn);
    };

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [
    currentVideo,
    isLoading,
    isIntroVideo,
    isIntroPlaying,
    isOutroVideo,
    isOutroPlaying,
    applyIntroStatus,
    applyOutroStatus,
  ]);

  // Handle user interaction for autoplay
  const handleUserInteraction = useCallback(() => {
    if (introStatus === 'armed' || outroStatus === 'ended') return;
    const video = primaryVideoRef.current;
    if (video && video.paused) {
      video.play().catch(console.warn);
    }
  }, [introStatus, outroStatus]);

  const currentVideoType = getVideoType(currentVideo);

  return (
    <div 
      className={`relative w-full h-full flex items-center justify-center bg-black ${className}`}
      onClick={handleUserInteraction}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          </div>
        </div>
      )}

      {/* Error State */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 z-20">
          <div className="text-center p-6 bg-gray-900 rounded-lg text-3xl text-red-500">⚠️</div>
        </div>
      )}
      
      {/* Primary Video */}
      <video
        ref={primaryVideoRef}
        className="w-full h-full object-cover"
        loop={!isIntroVideo && !isOutroVideo}
        muted={isIntroVideo ? introStatus !== 'playing' : isOutroVideo ? outroStatus !== 'playing' : true}
        playsInline
        key={currentVideo}
      >
        <source src={currentVideo} type={currentVideoType} />
        Twoja przeglądarka nie obsługuje elementu video.
      </video>

      {/* Secondary Video (for crossfade - hidden for now) */}
      <video
        ref={secondaryVideoRef}
        className="hidden"
        loop
        muted
        playsInline
      />
    </div>
  );
}

