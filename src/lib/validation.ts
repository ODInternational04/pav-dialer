/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation for all user inputs
 */

import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizes string input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim())
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
 * Client validation schema
 */
export const clientValidationSchema = z.object({
  box_number: z.string()
    .min(1, 'Box number is required')
    .max(50, 'Box number must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-_]+$/, 'Box number can only contain letters, numbers, hyphens, and underscores'),
  
  size: z.string()
    .min(1, 'Size is required')
    .max(50, 'Size must be less than 50 characters'),
  
  contract_no: z.string()
    .min(1, 'Contract number is required')
    .max(100, 'Contract number must be less than 100 characters')
    .regex(/^[A-Za-z0-9\-_]+$/, 'Contract number can only contain letters, numbers, hyphens, and underscores'),
  
  principal_key_holder: z.string()
    .min(1, 'Principal key holder name is required')
    .max(255, 'Name must be less than 255 characters')
    .regex(/^[A-Za-z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  principal_key_holder_id_number: z.string()
    .min(5, 'ID number must be at least 5 characters')
    .max(50, 'ID number must be less than 50 characters')
    .regex(/^[A-Za-z0-9]+$/, 'ID number can only contain letters and numbers'),
  
  principal_key_holder_email_address: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  
  telephone_cell: z.string()
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{7,20}$/, 'Invalid phone number format'),
  
  telephone_home: z.string()
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{7,20}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  contract_start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  contract_end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  occupation: z.string()
    .min(1, 'Occupation is required')
    .max(200, 'Occupation must be less than 200 characters')
    .regex(/^[A-Za-z\s\-'\.\/]+$/, 'Occupation contains invalid characters'),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .or(z.literal(''))
}).refine(
  (data) => new Date(data.contract_start_date) < new Date(data.contract_end_date),
  {
    message: "Contract end date must be after start date",
    path: ["contract_end_date"]
  }
)

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
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T]
    } else {
      sanitized[key as keyof T] = value
    }
  }
  
  return sanitized
}