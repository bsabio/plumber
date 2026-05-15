import { describe, it, expect, beforeAll } from 'vitest';

// Set a real AUTH_SECRET BEFORE importing the module (env validation runs at
// module-load time).
beforeAll(() => {
  process.env.AUTH_SECRET = 'unit-test-secret-32-chars-min-please-okay';
});

const SECRET = 'unit-test-secret-32-chars-min-please-okay';

describe('signed tokens', () => {
  it('sign/verify happy path', async () => {
    const { createSignedToken, verifySignedToken } = await import('@/lib/auth-session');
    const token = createSignedToken({ sub: 'u1', role: 'authenticated' }, SECRET);
    const payload = verifySignedToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('u1');
  });

  it('detects tampering with the body', async () => {
    const { createSignedToken, verifySignedToken } = await import('@/lib/auth-session');
    const token = createSignedToken({ sub: 'u1' }, SECRET);
    const [body, sig] = token.split('.');
    // Mutate the body but keep the original signature
    const tampered = `${body}AAAA.${sig}`;
    expect(verifySignedToken(tampered, SECRET)).toBeNull();
  });

  it('returns null for bad signatures', async () => {
    const { verifySignedToken } = await import('@/lib/auth-session');
    expect(verifySignedToken('aaaa.bbbb', SECRET)).toBeNull();
    expect(verifySignedToken('', SECRET)).toBeNull();
  });
});

describe('session tokens', () => {
  it('session token includes iat/exp and verifies', async () => {
    const { createSessionToken, verifySessionToken } = await import('@/lib/auth-session');
    const token = createSessionToken({ sub: 'u1' }, SECRET, 60);
    const payload = verifySessionToken(token, SECRET);
    expect(payload?.sub).toBe('u1');
    expect(typeof payload?.iat).toBe('number');
    expect(typeof payload?.exp).toBe('number');
  });

  it('rejects an expired session token', async () => {
    const { createSessionToken, verifySessionToken } = await import('@/lib/auth-session');
    const token = createSessionToken({ sub: 'u1' }, SECRET, -10);
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it('rejects a signed token with no exp claim', async () => {
    const { createSignedToken, verifySessionToken } = await import('@/lib/auth-session');
    const token = createSignedToken({ sub: 'u1' }, SECRET); // no exp/iat
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });
});

describe('secret encryption', () => {
  it('round-trips through encrypt/decrypt', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/auth-session');
    const cipher = encryptSecret('AIza-test-key-123', SECRET);
    expect(cipher).not.toContain('AIza-test-key-123');
    expect(decryptSecret(cipher, SECRET)).toBe('AIza-test-key-123');
  });

  it('returns null for tampered ciphertext', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/auth-session');
    const cipher = encryptSecret('secret', SECRET);
    const [iv, data, tag] = cipher.split('.');
    expect(decryptSecret(`${iv}.${data}AAAA.${tag}`, SECRET)).toBeNull();
  });

  it('returns null for wrong secret', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/auth-session');
    const cipher = encryptSecret('secret', SECRET);
    expect(decryptSecret(cipher, 'a-different-but-also-long-enough-secret!')).toBeNull();
  });
});
