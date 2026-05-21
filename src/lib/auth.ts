import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-key';
const EXPIRES_IN = '7d'; // Token valid for 7 days

export interface JWTPayload {
  username: string;
}

/**
 * Signs a payload to generate a JWT token
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * Verifies a JWT token and returns the payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}
