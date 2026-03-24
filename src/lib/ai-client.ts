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
 *   - The Gemini API call fails
 *   - Rate limits are exceeded
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { UserRole } from '@/lib/types';
import { getSystemInstruction } from '@/lib/system-prompt';
import { getConversationalFallback } from '@/lib/system-prompt';

// ── Singleton client ─────────────────────────────────────────
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (genAI) return genAI;

  // Check both common env var names
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';

  console.log(`[AI Client] API key check: ${apiKey ? `found (${apiKey.slice(0, 8)}...)` : 'NOT FOUND'}`);

  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    console.warn('[AI Client] No valid API key — LLM disabled.');
    return null;
  }

  genAI = new GoogleGenerativeAI(apiKey.trim());
  console.log('[AI Client] Gemini client initialized successfully.');
  return genAI;
}

// ── Configuration ────────────────────────────────────────────
const MODEL_NAME = 'gemini-2.5-flash';

const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 512,
};

// ── Safety settings ──────────────────────────────────────────
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

/**
 * Check if an LLM is available (API key is configured).
 */
export function isLLMAvailable(): boolean {
  return getClient() !== null;
}

/**
 * Generate a conversational response using Google Gemini.
 */
export async function generateResponse(
  message: string,
  role: UserRole,
  context?: string
): Promise<string> {
  const client = getClient();

  if (!client) {
    console.log('[AI Client] No client available — returning static fallback.');
    return getConversationalFallback(message, role);
  }

  console.log(`[AI Client] Generating response for: "${message.slice(0, 50)}..." (role: ${role}, hasContext: ${!!context})`);

  try {
    const systemInstruction = getSystemInstruction(role);

    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: GENERATION_CONFIG,
      safetySettings: SAFETY_SETTINGS,
      systemInstruction,
    });

    // Build the prompt with optional context
    let prompt = message;
    if (context) {
      prompt = `Context from our system:\n${context}\n\nUser message: ${message}`;
    }

    console.log(`[AI Client] Calling Gemini API (model: ${MODEL_NAME})...`);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log(`[AI Client] Gemini response: ${text ? text.slice(0, 100) + '...' : 'EMPTY'}`);

    if (!text || text.trim().length === 0) {
      console.warn('[AI Client] Empty response — using static fallback.');
      return getConversationalFallback(message, role);
    }

    return text.trim();
  } catch (error) {
    const err = error as Error;
    console.error(`[AI Client] Gemini API error: ${err.message}`);
    return getConversationalFallback(message, role);
  }
}
