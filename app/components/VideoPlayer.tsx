'use client';

// ============================================================================
// VIDEO PLAYER COMPONENT - ENHANCED
// ============================================================================
// Komponent odtwarzający filmy animacji postaci z automatyczną synchronizacją
// z stanem aplikacji (waiting/listening/responding)
// FAZA 6: Dodano płynne przejścia, optymalizację i event handlers

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { AppState } from '@/lib/types';

interface VideoPlayerProps {
  waitingVideo: string;
  listeningVideo: string;
  respondingVideo: string;
  className?: string;
  onVideoChange?: (state: AppState) => void;
  enableCrossfade?: boolean;
}

export function VideoPlayer({
  waitingVideo,
  listeningVideo,
  respondingVideo,
  className = '',
  onVideoChange,
  enableCrossfade = true,
}: VideoPlayerProps) {
  const state = useAppStore((s) => s.state);
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const [currentVideo, setCurrentVideo] = useState<string>(waitingVideo);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoCache = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Enhanced preload wszystkich filmów z cache
  useEffect(() => {
    const videos = [
      { src: waitingVideo, state: 'waiting' },
      { src: listeningVideo, state: 'listening' },
      { src: respondingVideo, state: 'responding' },
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
        console.error(`Error loading video: ${state}`, e);
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
  }, [waitingVideo, listeningVideo, respondingVideo]);

  // Smooth video transition with crossfade
  const transitionToVideo = useCallback(async (newVideoSrc: string) => {
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
        await primaryVideo.play();
      } else {
        // Crossfade transition (optional, can be complex)
        setCurrentVideo(newVideoSrc);
        await primaryVideo.play();
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

    const newVideo = videoMap[state];
    if (newVideo !== currentVideo) {
      console.log(`Video transition: ${state} -> ${newVideo}`);
      transitionToVideo(newVideo);
      
      // Callback for parent
      if (onVideoChange) {
        onVideoChange(state);
      }
    }
  }, [state, waitingVideo, listeningVideo, respondingVideo, currentVideo, transitionToVideo, onVideoChange]);

  // Autoplay and maintain loop
  useEffect(() => {
    const video = primaryVideoRef.current;
    if (!video || isLoading) return;

    const playVideo = async () => {
      try {
        video.load();
        await video.play();
        console.log(`Playing video: ${currentVideo}`);
      } catch (err) {
        console.warn('Autoplay blocked or error:', err);
        // User needs to interact with page first
      }
    };

    playVideo();

    // Ensure loop continues
    const handleEnded = () => {
      video.play().catch(console.warn);
    };

    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentVideo, isLoading]);

  // Handle user interaction for autoplay
  const handleUserInteraction = useCallback(() => {
    const video = primaryVideoRef.current;
    if (video && video.paused) {
      video.play().catch(console.warn);
    }
  }, []);

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
        loop
        muted
        playsInline
        key={currentVideo}
      >
        <source src={currentVideo} type="video/mp4" />
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

