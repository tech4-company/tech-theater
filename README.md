# Tech Theater - Interaktywna Aplikacja Głosowa z LLM

Aplikacja webowa w Next.js z głosową interakcją LLM i animowaną postacią.

## 🚀 Quick Start

### 1. Wymagania
- Node.js 18+ 
- npm lub pnpm
- Klucze API:
  - OpenAI API Key (dla Whisper STT + opcjonalnie GPT)
  - ElevenLabs API Key (dla TTS)

### 2. Instalacja

Projekt jest już skonfigurowany! Dependencje zainstalowane:
- ✅ Next.js 14+ z App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ OpenAI SDK
- ✅ ElevenLabs SDK
- ✅ Zustand (state management)
- ✅ Radix UI Icons

### 3. Konfiguracja Environment Variables

Edytuj plik `.env.local` i dodaj swoje klucze API:

```bash
# OpenAI (dla Whisper STT + GPT-5.2 LLM)
OPENAI_API_KEY=sk-...

# ElevenLabs (dla TTS - OBOWIĄZKOWE!)
ELEVENLABS_API_KEY=...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Jak zdobyć klucze API:**

1. **OpenAI API Key:**
   - Zarejestruj się na https://platform.openai.com
   - Idź do Settings → API keys
   - Create new secret key
   - Skopiuj klucz (zaczyna się od `sk-`)

2. **ElevenLabs API Key:**
   - Zarejestruj się na https://elevenlabs.io
   - Idź do Profile → API Key
   - Skopiuj klucz
   - **Free tier:** 10,000 znaków/miesiąc (~10-15 min mowy)

### 4. Dodaj Filmy Animacji

Umieść 3 filmy w folderze `public/videos/`:
- `waiting.mp4` - postać czeka na interakcję (loop)
- `listening.mp4` - postać słucha użytkownika (loop)
- `responding.mp4` - postać mówi/odpowiada (loop)

**Zalecane:** 
- Format: MP4, H.264
- Rozmiar: <10MB każdy
- Długość: 3-10 sekund (będą loopowane)

### 5. Konfiguracja Postaci i Głosu

#### A. Wybierz głos w ElevenLabs:

1. Zaloguj się na https://elevenlabs.io
2. Idź do **Voice Library** lub **My Voices**
3. Wybierz głos (możesz posłuchać samples)
4. Kliknij na głos i skopiuj **Voice ID** (długi ciąg znaków)

**Opcja: Voice Cloning (jeśli masz nagrania aktora):**
- Potrzebujesz 3-5 minut czystego audio aktora
- Upload do ElevenLabs → Professional Voice Cloning
- Otrzymasz unique Voice ID
- Wymaga planu Professional+ ($99/mo)

#### B. Edytuj `lib/characters.ts`:

1. Zamień `PLACEHOLDER_VOICE_ID` na swój Voice ID z ElevenLabs
2. Dodaj **system prompt** postaci (instrukcje jak ma rozmawiać)
3. Dostosuj `temperature` (0.7-1.0) i `maxTokens` (150-300) dla LLM
4. Zapisz i zrestartuj dev server

```typescript
voiceId: 'your_voice_id_here', // ← Tutaj wklej Voice ID
```

### 6. Uruchomienie

```bash
npm run dev
```

Aplikacja będzie dostępna na: http://localhost:3000

## 📁 Struktura Projektu

```
tech-theater/
├── app/
│   ├── api/
│   │   ├── speech-to-text/    # Whisper STT endpoint
│   │   ├── llm-chat/           # LLM chat endpoint
│   │   └── text-to-speech/     # ElevenLabs TTS endpoint
│   ├── components/             # React komponenty
│   ├── page.tsx                # Strona główna
│   └── layout.tsx
├── lib/
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   ├── characters.ts           # Konfiguracja postaci
│   ├── elevenlabs/             # ElevenLabs helpers
│   ├── llm/                    # LLM helpers
│   └── audio/                  # Audio helpers
├── public/
│   └── videos/                 # Filmy animacji
│       ├── waiting.mp4
│       ├── listening.mp4
│       └── responding.mp4
├── .env.local                  # Environment variables (nie commituj!)
├── .env.example                # Przykład env variables
└── PROJECT_PLAN.md             # Szczegółowy plan projektu
```

## 🎭 Flow Aplikacji

```
WAITING → (user clicks "Speak") 
       → LISTENING (nagrywanie) 
       → PROCESSING (STT → LLM → TTS) 
       → RESPONDING (odtwarzanie audio)
       → WAITING
```

## 🔧 Status Implementacji

### ✅ MVP COMPLETE!

- [X] **Faza 1**: Setup projektu ✅
- [X] **Faza 2**: UI i komponenty (VideoPlayer, VoiceControls) ✅
- [X] **Faza 3**: Speech-to-Text (Whisper) ✅
- [X] **Faza 4**: Integracja LLM (GPT-5.2) ✅
- [X] **Faza 5**: State Management (Zustand) ✅
- [X] **Faza 6**: Synchronizacja wideo + audio ✅
- [X] **Faza 7**: Text-to-Speech (ElevenLabs) ✅

### 🎉 Pełny workflow działa!
User mówi → Whisper STT → GPT-5.2 → ElevenLabs TTS → Audio + Video

### 🚀 Opcjonalne (Fazy 8-14):
- [ ] **Faza 8**: Bezpieczeństwo (rate limiting, validation)
- [ ] **Faza 9**: Multi-character support
- [ ] **Faza 10**: Testowanie
- [ ] **Faza 11**: Deployment
- [ ] ... (patrz PROJECT_PLAN.md)

## 📊 Stack Technologiczny

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)

**APIs:**
- OpenAI Whisper (Speech-to-Text)
- OpenAI GPT-4o / GPT-4-turbo (LLM)
- ElevenLabs (Text-to-Speech)

**Audio/Video:**
- MediaRecorder API (nagrywanie)
- HTML5 Video & Audio

## 📝 Konfiguracja ElevenLabs

1. Zarejestruj się na https://elevenlabs.io
2. Wybierz głos z Voice Library lub sklonuj głos aktora
3. Skopiuj Voice ID
4. Dodaj do `lib/characters.ts`

## 💰 Koszty (szacowane)

- **ElevenLabs Free**: 10,000 znaków/miesiąc (~15 min mowy) - **DARMOWE**
- **OpenAI Whisper**: ~$0.006/minuta (~$1-2/miesiąc)
- **OpenAI GPT-4o**: ~$0.005-0.015/1k tokens (~$5-10/miesiąc)
- **Total**: ~$15-30/miesiąc z umiarkowanym użyciem

## 🧪 Testowanie Aplikacji

### Test End-to-End:

1. **Uruchom aplikację** (`npm run dev`)
2. **Otwórz** http://localhost:3000
3. **Pozwól** na dostęp do mikrofonu
4. **Kliknij** niebieski przycisk mikrofonu
5. **Powiedz** coś po polsku (np. "Cześć, jak się masz?")
6. **Poczekaj** 2 sekundy ciszy (auto-stop)
7. **Obserwuj** statusy:
   - "Rozpoznaję mowę..." (Whisper)
   - "Myślę..." (GPT-5.2)
   - "Przygotowuję odpowiedź..." (ElevenLabs)
   - "Odpowiadam..." (Audio playback)
8. **Słuchaj** odpowiedzi głosowej postaci
9. **Obserwuj** animację zmieniającą się z stanem

### Sprawdź Console Logs:

Otwórz DevTools Console (F12) i sprawdź:
- `Video loaded: ...` (3 filmy)
- `Transcription: ...` (Twoja transkrypcja)
- `LLM response: ...` (Odpowiedź GPT-5.2)
- `TTS audio received: ... bytes`
- `Audio playback started/ended`

---

## 🐛 Troubleshooting

### Mikrofon nie działa
- Sprawdź permisje do mikrofonu w przeglądarce
- HTTPS wymagane dla produkcji (localhost działa bez HTTPS)
- Odśwież stronę i spróbuj ponownie

### Whisper timeout/error
- Sprawdź czy `OPENAI_API_KEY` jest prawidłowy
- Zredukuj długość nagrania (<60s)
- Sprawdź format audio (webm/opus recommended)
- Sprawdź saldo konta OpenAI

### ElevenLabs nie gra audio
- Sprawdź czy `ELEVENLABS_API_KEY` jest prawidłowy
- **WAŻNE:** Zamień `PLACEHOLDER_VOICE_ID` na prawdziwy Voice ID w `lib/characters.ts`
- Sprawdź limity API (Free tier: 10k znaków/miesiąc)
- Sprawdź saldo konta ElevenLabs

### GPT-5.2 model not found
- Jeśli GPT-5.2 nie jest jeszcze dostępny w API:
- Zmień model w `lib/characters.ts` na `gpt-4o` lub `gpt-4-turbo`
- Restart dev server

### Filmy nie ładują się
- Sprawdź czy wszystkie 3 filmy są w `/public/videos/`
- Filmy muszą być nazwane: `waiting.mp4`, `listening.mp4`, `responding.mp4`
- Sprawdź format (MP4, H.264)

## 📚 Dokumentacja

- [Next.js Docs](https://nextjs.org/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [Whisper API](https://platform.openai.com/docs/guides/speech-to-text)

## 📄 Licencja

Projekt prywatny.

---

**Status**: 🚧 W budowie - Faza 1 ukończona
**Wersja**: 1.0.0
**Data**: 12.12.2025
# tech-theater
