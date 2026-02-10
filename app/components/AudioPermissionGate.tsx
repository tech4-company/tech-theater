'use client';

// ============================================================================
// AUDIO PERMISSION GATE
// ============================================================================
// Komponent wymuszający user interaction dla odblokowania autoplay

import { useEffect, useRef, useState } from 'react';

interface AudioPermissionGateProps {
  children: React.ReactNode;
}

export function AudioPermissionGate({ children }: AudioPermissionGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if already unlocked in session
    const unlocked = sessionStorage.getItem('audioUnlocked');
    const authed = sessionStorage.getItem('pageAuthed');
    if (unlocked === 'true' && authed === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  const handleUnlock = async () => {
    try {
      if (!showPasswordPrompt) {
        setShowPasswordPrompt(true);
        setPasswordError(null);
        requestAnimationFrame(() => passwordInputRef.current?.focus());
        return;
      }

      const requiredPassword = process.env.NEXT_PUBLIC_SITE_PASSWORD ?? 'teatr123';
      if (password.trim() !== requiredPassword) {
        setPasswordError('Błędne hasło.');
        return;
      }

      // Unlock autoplay via silent AudioContext (more reliable than MP3 data URL)
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextCtor) {
        const audioContext = new AudioContextCtor();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        gain.gain.value = 0;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.01);
        await audioContext.resume();
        await audioContext.close();
      }
      
      // Mark as unlocked
      sessionStorage.setItem('audioUnlocked', 'true');
      sessionStorage.setItem('pageAuthed', 'true');
      setIsUnlocked(true);
      setHasInteracted(true);
      setPasswordError(null);
      
      console.log('Audio unlocked successfully');
    } catch (error) {
      console.error('Failed to unlock audio:', error);
      setIsUnlocked(true); // Continue anyway
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 backdrop-blur-sm">
      <div className="max-w-md p-8 bg-gray-900 rounded-xl shadow-2xl text-center">
        <div className="text-6xl mb-8">🎭</div>
        <ol className="text-left text-gray-300 text-sm space-y-3 mb-8 list-decimal list-inside">
          <li>Naciśnij na zielony przycisk, kiedy chcesz wejść w interakcję z modelem.</li>
          <li>Kiedy jesteś w konwersacji, nie naciskaj wyłączenia mikrofonu.</li>
          <li>
            Kiedy kończysz konwersację i już nie będziesz rozmawiać z modelem, naciśnij z powrotem przycisk
            mikrofonu.
          </li>
        </ol>
        {showPasswordPrompt && (
          <div className="text-left mb-4">
            <label className="block text-sm font-medium text-gray-200 mb-2" htmlFor="site-password">
              Hasło dostępu
            </label>
            <input
              ref={passwordInputRef}
              id="site-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlock();
              }}
              className="
                w-full px-4 py-3
                bg-gray-950/60 text-white
                rounded-lg border border-gray-700
                focus:outline-none focus:ring-4 focus:ring-blue-300/30 focus:border-blue-500
              "
              placeholder="Wpisz hasło…"
              autoComplete="current-password"
            />
            {passwordError && <div className="mt-2 text-sm text-red-300">{passwordError}</div>}
          </div>
        )}
        <button
          onClick={handleUnlock}
          disabled={showPasswordPrompt && !password.trim()}
          className="
            px-8 py-4 
            bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:hover:bg-blue-600/40
            text-white text-lg font-semibold 
            rounded-lg 
            transition-all duration-200
            shadow-lg hover:shadow-xl
            focus:outline-none focus:ring-4 focus:ring-blue-300
            disabled:cursor-not-allowed disabled:shadow-none
          "
        >
          Naciśnij żeby rozpocząć
        </button>
      </div>
    </div>
  );
}

