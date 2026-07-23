import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'koutu-dev-secret-change-in-production'
const JWT_EXPIRES_IN = '7d'

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

export function generateUserId() {
  return 'u_' + crypto.randomBytes(8).toString('hex')
}

export function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function generateSessionId() {
  return crypto.randomBytes(32).toString('hex')
}
