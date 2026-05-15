/**
 * ═══════════════════════════════════════════════════════════════
 *  AI Client — Google Gemini Integration
 * ═══════════════════════════════════════════════════════════════
 *
 *  Wraps the Google Generative AI SDK to provide LLM-powered
 *  conversational responses for the Virtual Employee.
 *
 *  Falls back gracefully to static responses if:
 *   - The API key is not configured
 *   - The Gemini API call fails (after retries)
 *   - The call exceeds the configured timeout
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { UserRole } from '@/lib/types';
import { getSystemInstruction, getConversationalFallback } from '@/lib/system-prompt';
import { getGeminiEnvKey } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('ai-client');

// ── Singleton client (env-key only) ─────────────────────────────
let envGenAI: GoogleGenerativeAI | null = null;

/**
 * Return a Gemini client. When `apiKeyOverride` is provided we always create
 * a fresh client (so per-request user keys never get cached on the server).
 * The env-key client is memoized.
 */
function getClient(apiKeyOverride?: string): GoogleGenerativeAI | null {
  if (apiKeyOverride && apiKeyOverride.trim()) {
    // Per-request override — do NOT cache.
    return new GoogleGenerativeAI(apiKeyOverride.trim());
  }

  if (envGenAI) return envGenAI;

  const apiKey = getGeminiEnvKey();
  log.debug('env key configured:', !!apiKey);
  if (!apiKey) return null;
  envGenAI = new GoogleGenerativeAI(apiKey);
  return envGenAI;
}

// ── Configuration ────────────────────────────────────────────
const MODEL_NAME = 'gemini-2.5-flash';

const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 512,
};

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

export interface GenerateOptions {
  /** Per-request Gemini key (won't be cached). */
  apiKeyOverride?: string;
  /** Hard timeout in milliseconds (default 15000). */
  timeoutMs?: number;
  /** Maximum retry attempts on transient failures (default 3, includes the initial try). */
  maxAttempts?: number;
}

/**
 * Check if an LLM is available (an env API key is configured).
 * Returns false even when a user-supplied key exists, because we don't have
 * the request scope here.
 */
export function isLLMAvailable(): boolean {
  return !!getGeminiEnvKey();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Inspect an error to decide whether it's worth retrying. Permanent
 * (4xx other than 429) failures are not retried.
 */
function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes('aborted') || msg.includes('timeout')) return true;
  if (msg.includes('rate limit') || msg.includes('429')) return true;
  if (msg.includes('5')) {
    // crude: messages with "500"/"502"/"503"/"504"
    if (/(\b5\d\d\b)/.test(msg)) return true;
  }
  if (msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('network')) return true;
  return false;
}

/**
 * Generate a conversational response using Google Gemini.
 *
 * Behavior:
 *   - If no API key is available anywhere, returns the static fallback.
 *   - Each attempt is bounded by `timeoutMs` via an AbortController.
 *   - Retries with jittered exponential backoff for transient errors only.
 *   - Always returns a string — never throws.
 */
export async function generateResponse(
  message: string,
  role: UserRole,
  context?: string,
  options: GenerateOptions = {},
): Promise<string> {
  const { apiKeyOverride, timeoutMs = 15_000, maxAttempts = 3 } = options;

  const client = getClient(apiKeyOverride);
  if (!client) {
    log.debug('no client configured — returning static fallback');
    return getConversationalFallback(message, role);
  }

  const systemInstruction = getSystemInstruction(role);
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: GENERATION_CONFIG,
    safetySettings: SAFETY_SETTINGS,
    systemInstruction,
  });

  const prompt = context
    ? `Context from our system:\n${context}\n\nUser message: ${message}`
    : message;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Race the SDK call against a hard timeout. The SDK doesn't reliably
      // honor AbortSignal across versions, so we use a Promise.race instead.
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Gemini call timed out after ${timeoutMs}ms`)),
            timeoutMs,
          ),
        ),
      ]);

      const text = result.response.text();
      if (!text || text.trim().length === 0) {
        log.debug('empty response — using static fallback');
        return getConversationalFallback(message, role);
      }
      log.debug(`gemini response (attempt ${attempt}): ${text.length} chars`);
      return text.trim();
    } catch (error) {
      lastErr = error;
      const msg = error instanceof Error ? error.message : String(error);
      log.warn(`gemini attempt ${attempt}/${maxAttempts} failed: ${msg}`);

      if (attempt >= maxAttempts || !isTransient(error)) break;

      // Jittered exponential backoff: 300ms, 700ms, 1500ms (with jitter)
      const base = 300 * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 200);
      await sleep(base + jitter);
    }
  }

  log.error('gemini call failed after retries — falling back', lastErr);
  return getConversationalFallback(message, role);
}
