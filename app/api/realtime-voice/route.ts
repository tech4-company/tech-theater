// ============================================================================
// OPENAI REALTIME API TOKEN ENDPOINT
// ============================================================================
// Endpoint do generowania ephemeral token dla klienta
// Klient łączy się bezpośrednio do OpenAI Realtime API

import { NextRequest, NextResponse } from 'next/server';
import { getCharacterById } from '@/lib/characters';

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Parse request
    const body = await request.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      );
    }

    // Get character configuration
    const character = getCharacterById(characterId);
    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    const resolvedCharacter = character;

    console.log('Realtime API token request:', {
      characterId,
      characterName: resolvedCharacter.name,
    });

    // Create ephemeral token via OpenAI API
    // Note: This endpoint might not be available yet in all regions
    // For now, we'll return the session config and use API key directly
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse', // OpenAI voices: verse, alloy, echo, fable, onyx, nova, shimmer
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.warn('Failed to create ephemeral session:', response.status, details);

      // IMPORTANT: Never expose OPENAI_API_KEY to the browser in production.
      // If ephemeral sessions are unavailable, fail with a clear error.
      return NextResponse.json(
        {
          error: 'Failed to create Realtime API ephemeral session',
          details: details || response.statusText,
        },
        { status: 502 },
      );
    }

    const data = await response.json();

    const enableInputTranscription =
      process.env.REALTIME_ENABLE_TRANSCRIPTION === 'true';

    // Return ephemeral token and session config
    return NextResponse.json({
      mode: 'ephemeral',
      client_secret: data.client_secret.value,
      expires_at: data.client_secret.expires_at,
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'verse',
      sessionConfig: {
        modalities: ['text', 'audio'],
        instructions: resolvedCharacter.systemPrompt,
        voice: 'verse',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        ...(enableInputTranscription
          ? {
              input_audio_transcription: {
                model: 'whisper-1',
              },
            }
          : {}),
        // Server VAD for automatic silence detection
        // Echo is prevented client-side by blocking audio during model speech
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,           // Sensitivity (0.0-1.0)
          prefix_padding_ms: 300,   // Audio before speech
          silence_duration_ms: 1000, // 1s ciszy przed odpowiedzią
        },
        temperature: resolvedCharacter.llmConfig.temperature,
        max_response_output_tokens: resolvedCharacter.llmConfig.maxTokens,
      },
    });

  } catch (error: any) {
    console.error('Realtime API token error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create Realtime API session',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Configure route
export const runtime = 'nodejs';
export const maxDuration = 30;

