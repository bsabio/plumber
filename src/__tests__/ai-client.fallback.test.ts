import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the SDK so we never make real network calls.
const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  class FakeGoogleGenerativeAI {
    constructor(public readonly key: string) {}
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  }
  return {
    GoogleGenerativeAI: FakeGoogleGenerativeAI,
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'harassment',
      HARM_CATEGORY_HATE_SPEECH: 'hate',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'sex',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'danger',
    },
    HarmBlockThreshold: { BLOCK_ONLY_HIGH: 'high' },
  };
});

vi.mock('@/lib/system-prompt', () => ({
  getSystemInstruction: () => 'system',
  getConversationalFallback: () => 'STATIC_FALLBACK',
}));

describe('generateResponse', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGenerateContent.mockReset();
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  it('returns static fallback when no API key is configured', async () => {
    const { generateResponse } = await import('@/lib/ai-client');
    const out = await generateResponse('hi', 'anon');
    expect(out).toBe('STATIC_FALLBACK');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('uses the API when an override key is supplied', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Hi from gemini' },
    });
    const { generateResponse } = await import('@/lib/ai-client');
    const out = await generateResponse('hi', 'anon', undefined, {
      apiKeyOverride: 'AIzaTEST',
    });
    expect(out).toBe('Hi from gemini');
    expect(mockGenerateContent).toHaveBeenCalledOnce();
  });

  it('retries on a transient failure and eventually returns fallback', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('500 server error'))
      .mockRejectedValueOnce(new Error('rate limit exceeded'))
      .mockRejectedValueOnce(new Error('rate limit exceeded'));
    const { generateResponse } = await import('@/lib/ai-client');
    const out = await generateResponse('hi', 'anon', undefined, {
      apiKeyOverride: 'AIzaTEST',
      maxAttempts: 3,
      timeoutMs: 5_000,
    });
    expect(out).toBe('STATIC_FALLBACK');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('does not retry on a permanent error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('400 bad request'));
    const { generateResponse } = await import('@/lib/ai-client');
    const out = await generateResponse('hi', 'anon', undefined, {
      apiKeyOverride: 'AIzaTEST',
      maxAttempts: 3,
    });
    expect(out).toBe('STATIC_FALLBACK');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
