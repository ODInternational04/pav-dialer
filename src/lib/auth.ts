import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { User } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
  iat?: number
  exp?: number
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

export const generateToken = (user: Omit<User, 'password'>): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
  })
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export const extractTokenFromHeader = (authHeader: string | null): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}