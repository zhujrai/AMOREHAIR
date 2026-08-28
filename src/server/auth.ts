import crypto from 'crypto';

// Secret key for signing session tokens (fallback to fixed random if not in env)
const JWT_SECRET = process.env.ADMIN_SESSION_SECRET || 'amore_salon_logistics_secure_secret_2026';
const CORRECT_PIN = 'Itzelita';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute lockout

// In-memory rate limiting map: ip -> { attempts: number, lockedUntil: number }
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Constant-time PIN verification to prevent timing side-channel attacks
 */
export function verifyAdminPin(inputPin: string): boolean {
  if (typeof inputPin !== 'string') return false;
  
  const inputBuffer = Buffer.from(inputPin.trim());
  const targetBuffer = Buffer.from(CORRECT_PIN);

  if (inputBuffer.length !== targetBuffer.length) {
    // Perform dummy timing-safe comparison to keep constant time execution
    crypto.timingSafeEqual(inputBuffer, inputBuffer);
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, targetBuffer);
}

/**
 * Rate limit check for PIN attempts
 */
export function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; lockoutSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockoutSeconds: 0 };
  }

  if (record.lockedUntil > now) {
    const lockoutSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, lockoutSeconds };
  }

  // If lockout expired, reset
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    rateLimitMap.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockoutSeconds: 0 };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  return { allowed: remaining > 0, remainingAttempts: remaining, lockoutSeconds: 0 };
}

/**
 * Record a failed attempt for an IP
 */
export function recordFailedAttempt(ip: string): { remainingAttempts: number; lockoutSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { attempts: 0, lockedUntil: 0 };

  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    rateLimitMap.set(ip, record);
    return { remainingAttempts: 0, lockoutSeconds: 60 };
  }

  rateLimitMap.set(ip, record);
  return { remainingAttempts: MAX_ATTEMPTS - record.attempts, lockoutSeconds: 0 };
}

/**
 * Reset failed attempts upon successful login
 */
export function resetRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

/**
 * Generate a signed session token valid for 24 hours
 */
export function generateAdminSessionToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = JSON.stringify({ role: 'admin', exp: expiresAt, nonce: crypto.randomBytes(12).toString('hex') });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return {
    token: `${payloadB64}.${signature}`,
    expiresAt
  };
}

/**
 * Validate a session token
 */
export function validateAdminSessionToken(token?: string): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expSigBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) {
      return false; // Token expired
    }
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
