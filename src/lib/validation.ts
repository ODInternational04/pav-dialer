/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation for all user inputs
 */

import { z } from 'zod'

/**
 * Sanitizes string input to prevent XSS attacks
 * Uses a simple approach that works in all environments (Node.js and browser)
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Basic HTML entity encoding to prevent XSS
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validates email format and length
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

/**
 * Validates phone number format
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s+/g, ''))
}

/**
 * Client validation schema - simplified to 4 essential fields
 */
export const clientValidationSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .regex(/^[A-Za-z0-9\s\-'\.]+$/, 'Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods'),
  
  phone: z.string()
    .min(1, 'Phone is required')
    .regex(/^[\+]?[\d\s\-\(\)]{7,20}$/, 'Invalid phone number format'),
  
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
})

/**
 * User validation schema with strong password requirements
 */
export const userValidationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  
  password: z.string()
    .min(12, 'Password must be at least 12 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  
  first_name: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[A-Za-z\s\-'\.]+$/, 'First name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[A-Za-z\s\-'\.]+$/, 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  role: z.enum(['admin', 'user'], {
    message: 'Role must be either admin or user'
  })
})

/**
 * Login validation schema
 */
export const loginValidationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters')
})

/**
 * Call log validation schema
 */
export const callLogValidationSchema = z.object({
  client_id: z.string()
    .uuid('Invalid client ID format'),
  
  call_type: z.enum(['inbound', 'outbound'], {
    message: 'Call type must be either inbound or outbound'
  }),
  
  call_status: z.enum(['answered', 'no_answer', 'busy', 'failed'], {
    message: 'Invalid call status'
  }),
  
  duration_seconds: z.number()
    .min(0, 'Duration cannot be negative')
    .max(86400, 'Duration cannot exceed 24 hours'),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .or(z.literal(''))
})

/**
 * Notification validation schema
 */
export const notificationValidationSchema = z.object({
  type: z.enum(['callback', 'reminder', 'alert', 'info'], {
    message: 'Invalid notification type'
  }),
  
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  message: z.string()
    .min(1, 'Message is required')
    .max(1000, 'Message must be less than 1000 characters'),
  
  client_id: z.string()
    .uuid('Invalid client ID format')
    .optional(),
  
  scheduled_for: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Invalid datetime format')
    .optional()
})

/**
 * Generic validation function
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err: any) => 
        `${err.path.join('.')}: ${err.message}`
      )
      return { success: false, errors }
    }
    return { success: false, errors: ['Validation failed'] }
  }
}

/**
 * Sanitize object properties
 * IMPORTANT: Passwords should NEVER be sanitized as they will be hashed
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, excludeKeys: string[] = []): T {
  const sanitized = {} as T
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip sanitization for excluded keys (like passwords)
    if (excludeKeys.includes(key)) {
      sanitized[key as keyof T] = value
    } else if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T]
    } else {
      sanitized[key as keyof T] = value
    }
  }
  
  return sanitized
}