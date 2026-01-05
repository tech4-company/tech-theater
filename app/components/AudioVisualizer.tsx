'use client';

// ============================================================================
// AUDIO VISUALIZER COMPONENT (OPCJONALNY)
// ============================================================================
// Wizualizacja fal dźwiękowych podczas nagrywania i odtwarzania

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

interface AudioVisualizerProps {
  audioStream?: MediaStream | null;
  className?: string;
}

export function AudioVisualizer({ audioStream, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const state = useAppStore((s) => s.state);

  useEffect(() => {
    if (!audioStream || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup Audio Context
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Draw visualization
    const draw = () => {
      if (!analyserRef.current) return;

      animationRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient color based on frequency
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [audioStream]);

  // Nie pokazuj podczas waiting lub responding
  if (state === 'waiting' || state === 'responding') {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="w-full h-32 rounded-lg bg-black"
      />
    </div>
  );
}

