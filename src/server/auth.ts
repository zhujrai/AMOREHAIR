import crypto from 'crypto';
import { getDbPool } from './db.ts';

// Secret key for signing session tokens (fallback to fixed random if not in env)
const JWT_SECRET = process.env.ADMIN_SESSION_SECRET || 'amore_salon_logistics_secure_secret_2026';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute lockout

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// 4 Authorized users requested by the store administration
export const INITIAL_AUTHORIZED_USERS = [
  {
    id: 'usr-zhujrai-1',
    email: 'zhujrai@gmail.com',
    name: 'Zhujrai',
    role: 'superadmin',
    defaultPassword: 'Itzelita'
  },
  {
    id: 'usr-zhujrai-2',
    email: 'zhujrai278@gmail.com',
    name: 'Zhujrai 278',
    role: 'admin',
    defaultPassword: 'Itzelita'
  },
  {
    id: 'usr-lizlindaura',
    email: 'lizlindaura@gmail.com',
    name: 'Liz Lindaura',
    role: 'admin',
    defaultPassword: 'Itzelita'
  },
  {
    id: 'usr-albsal',
    email: 'albsal611@gmail.com',
    name: 'Alberto Salinas',
    role: 'admin',
    defaultPassword: 'Itzelita'
  }
];

/**
 * Robust salted password hashing using PBKDF2 with SHA-512
 */
export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Timing-safe password verification
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== 'string') return false;

  // Plaintext match fallback for backwards compatibility or initial setup
  if (!storedHash.includes(':')) {
    const inputBuf = Buffer.from(password);
    const targetBuf = Buffer.from(storedHash);
    if (inputBuf.length !== targetBuf.length) return false;
    return crypto.timingSafeEqual(inputBuf, targetBuf);
  }

  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const calculatedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  const calcBuf = Buffer.from(calculatedHash);
  const origBuf = Buffer.from(originalHash);

  if (calcBuf.length !== origBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(calcBuf, origBuf);
}

// In-memory fallback users in case PostgreSQL pool is offline
const memoryUsers = new Map<string, { id: string; email: string; passwordHash: string; name: string; role: string }>();

// Populate memory users with initial credentials
INITIAL_AUTHORIZED_USERS.forEach((u) => {
  memoryUsers.set(u.email.toLowerCase(), {
    id: u.id,
    email: u.email.toLowerCase(),
    passwordHash: hashPassword(u.defaultPassword),
    name: u.name,
    role: u.role
  });
});

// In-memory rate limiting map: ip -> { attempts: number, lockedUntil: number }
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Rate limit check for login attempts
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
 * Authenticate user with email and password checking PostgreSQL database with memory fallback
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthorizedUser; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!normalizedEmail || !cleanPassword) {
    return { success: false, error: 'Ingresa correo y contraseña.' };
  }

  const p = getDbPool();

  if (p) {
    try {
      const { rows } = await p.query(
        'SELECT id, email, password_hash, name, role, is_active FROM admin_users WHERE LOWER(email) = $1',
        [normalizedEmail]
      );

      if (rows.length > 0) {
        const row = rows[0];
        if (row.is_active === false) {
          return { success: false, error: 'Esta cuenta de usuario está desactivada.' };
        }

        const isMatch = verifyPassword(cleanPassword, row.password_hash);
        if (isMatch) {
          // Update last_login
          p.query('UPDATE admin_users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [row.id]).catch(() => {});

          return {
            success: true,
            user: {
              id: row.id,
              email: row.email,
              name: row.name,
              role: row.role || 'admin'
            }
          };
        }
      }
    } catch (err: any) {
      console.error('PostgreSQL auth query error (checking memory fallback):', err.message);
    }
  }

  // Check in-memory fallback accounts
  const memoryUser = memoryUsers.get(normalizedEmail);
  if (memoryUser) {
    const isMatch = verifyPassword(cleanPassword, memoryUser.passwordHash);
    if (isMatch) {
      return {
        success: true,
        user: {
          id: memoryUser.id,
          email: memoryUser.email,
          name: memoryUser.name,
          role: memoryUser.role
        }
      };
    }
  }

  // Check if password matches default "Itzelita" for any of the initial authorized users
  const defaultFound = INITIAL_AUTHORIZED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  if (defaultFound && cleanPassword === 'Itzelita') {
    return {
      success: true,
      user: {
        id: defaultFound.id,
        email: defaultFound.email,
        name: defaultFound.name,
        role: defaultFound.role
      }
    };
  }

  return { success: false, error: 'Correo o contraseña incorrectos.' };
}

/**
 * Generate a signed session token valid for 7 days
 */
export function generateAdminSessionToken(user: AuthorizedUser): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: expiresAt,
    nonce: crypto.randomBytes(12).toString('hex')
  });
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
export function validateAdminSessionToken(token?: string): { valid: boolean; user?: AuthorizedUser } {
  if (!token || typeof token !== 'string') return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [payloadB64, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expSigBuffer)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) {
      return { valid: false }; // Token expired
    }
    return {
      valid: true,
      user: {
        id: payload.id || 'usr-admin',
        email: payload.email || 'admin@amoresalon.pe',
        name: payload.name || 'Administrador',
        role: payload.role || 'admin'
      }
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Backwards compatibility PIN verification
 */
export function verifyAdminPin(inputPin: string): boolean {
  if (typeof inputPin !== 'string') return false;
  return inputPin.trim() === 'Itzelita';
}
