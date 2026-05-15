/**
 * Centralized, Zod-validated access to environment variables.
 *
 * In production, missing or invalid required vars throw at module load.
 * In development, we log a warning but still allow the app to boot so
 * `next dev` works with a partially-configured `.env`.
 *
 * Always import `env` from this module rather than reading `process.env`
 * directly; that keeps secrets discoverable and validated in one place.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Required in production. Min length 32 chars to discourage trivial secrets.
  AUTH_SECRET: z.string().min(32).optional(),
  // Neon Postgres connection string. Required in production; optional in
  // dev so `next dev` can still boot for frontend work. See README.md.
  DATABASE_URL: z.string().url().optional(),
  // Optional providers/integrations
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  VERCEL: z.string().optional(),
  DEBUG: z.string().optional(),
});

type Env = z.infer<typeof envSchema> & { isProduction: boolean; isDevelopment: boolean };

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as 'development' | 'test' | 'production';
  const isProduction = nodeEnv === 'production';

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    const msg = `[env] Invalid environment variables: ${errors}`;
    if (isProduction) {
      throw new Error(msg);
    }
    console.warn(`${msg} (continuing in development mode)`);
  }

  const data = parsed.success ? parsed.data : (process.env as unknown as z.infer<typeof envSchema>);

  // In production, AUTH_SECRET must be present.
  if (isProduction && !data.AUTH_SECRET) {
    throw new Error('[env] AUTH_SECRET is required in production (min length 32).');
  }
  // In production, DATABASE_URL must be present so the Neon driver can connect.
  if (isProduction && !data.DATABASE_URL) {
    throw new Error(
      '[env] DATABASE_URL is required in production. Set it to your Neon ' +
        'Postgres connection string.',
    );
  }

  return {
    ...data,
    NODE_ENV: nodeEnv,
    isProduction,
    isDevelopment: nodeEnv === 'development',
  };
}

export const env: Env = parseEnv();

/**
 * Returns the active auth secret. In production this is `env.AUTH_SECRET`.
 * In development we fall back to a fixed dev string so local boot works
 * without an `.env`. Never use the fallback in production.
 */
export function getAuthSecret(): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (env.isProduction) {
    throw new Error('[env] AUTH_SECRET is required to issue/verify sessions in production.');
  }
  return 'dev-secret-do-not-use-in-production-please-set-AUTH_SECRET';
}

/**
 * Returns the Gemini API key from the env (preferring the SDK-native name).
 * Returns `undefined` when no key is configured.
 */
export function getGeminiEnvKey(): string | undefined {
  const k = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY;
  if (!k || k.trim() === '' || k === 'your_gemini_api_key_here') return undefined;
  return k.trim();
}
