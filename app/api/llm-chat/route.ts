// ============================================================================
// LLM CHAT API ENDPOINT
// ============================================================================
// Endpoint do generowania odpowiedzi przy użyciu GPT-5.2

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCharacterById } from '@/lib/characters';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  characterId: string;
};

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
    const body: ChatRequest = await request.json();
    const { messages, characterId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

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

    console.log('LLM Chat request:', {
      characterId,
      characterName: resolvedCharacter.name,
      model: resolvedCharacter.llmConfig.model,
      messagesCount: messages.length,
    });

    // Build messages array with system prompt
    const apiMessages: Message[] = [
      {
        role: 'system',
        content: resolvedCharacter.systemPrompt,
      },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Call OpenAI GPT-5.2 (uses new parameter names)
    const completion = await openai.chat.completions.create({
      model: resolvedCharacter.llmConfig.model, // 'gpt-5.2'
      messages: apiMessages,
      temperature: resolvedCharacter.llmConfig.temperature,
      max_completion_tokens: resolvedCharacter.llmConfig.maxTokens, // GPT-5.2 uses this instead of max_tokens
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response from LLM');
    }

    console.log('LLM response:', {
      text: responseText,
      tokensUsed: completion.usage?.total_tokens,
    });

    // Return response
    return NextResponse.json({
      text: responseText,
      characterId,
      tokensUsed: completion.usage?.total_tokens,
      model: resolvedCharacter.llmConfig.model,
    });

  } catch (error: any) {
    console.error('LLM API error:', error);

    // Handle specific errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 401 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error?.status === 400 && error?.message?.includes('model')) {
      return NextResponse.json(
        { 
          error: 'Model not available',
          details: 'GPT-5.2 may not be available yet. Try gpt-4o or gpt-4-turbo.',
        },
        { status: 400 }
      );
    }

    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timeout. Please try again.' },
        { status: 504 }
      );
    }

    // Generic error
    return NextResponse.json(
      { 
        error: 'LLM request failed',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Configure route
export const runtime = 'nodejs';
export const maxDuration = 30; // Max 30 seconds for LLM processing

