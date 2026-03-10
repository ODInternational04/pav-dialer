/**
 * CSV Import Utility for Client Data
 * Handles parsing, validation, and bulk import of client data
 */

import { CreateClientRequest } from '@/types'

export interface CSVRow {
  [key: string]: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
  value?: string
}

export interface CSVImportResult {
  success: boolean
  validRows: Partial<CreateClientRequest>[]
  errors: ValidationError[]
  totalRows: number
  validCount: number
  errorCount: number
}

/**
 * Parse CSV text content into rows
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: CSVRow = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    rows.push(row)
  }

  return rows
}

/**
 * Field mapping from CSV headers to client fields
 * Supports multiple header variations for simplified 4-field schema
 */
const FIELD_MAPPINGS: Record<string, string[]> = {
  name: ['name', 'client name', 'full name', 'principal_key_holder', 'key holder', 'principal'],
  phone: ['phone', 'telephone', 'telephone_cell', 'cell', 'mobile', 'phone number', 'cell number', 'mobile number'],
  email: ['email', 'email address', 'email_address', 'principal_key_holder_email_address'],
  notes: ['notes', 'comments', 'remarks', 'note'],
}

/**
 * Map CSV row to client fields
 */
function mapCSVRowToClient(row: CSVRow): Partial<CreateClientRequest> {
  const client: Partial<CreateClientRequest> = {}
  const mappedHeaders = new Set<string>()

  for (const [clientField, possibleHeaders] of Object.entries(FIELD_MAPPINGS)) {
    for (const header of possibleHeaders) {
      const headerLower = header.toLowerCase()
      const matchingKey = Object.keys(row).find(key => key.toLowerCase() === headerLower)
      
      if (matchingKey && row[matchingKey]) {
        client[clientField as keyof CreateClientRequest] = row[matchingKey] as any
        mappedHeaders.add(matchingKey)
        break
      }
    }
  }

  // Capture any extra columns as custom fields
  const customFields: Record<string, any> = {}
  Object.entries(row).forEach(([key, value]) => {
    if (!mappedHeaders.has(key) && value !== undefined && value !== '') {
      customFields[key] = value
    }
  })

  if (Object.keys(customFields).length > 0) {
    client.custom_fields = customFields
  }

  return client
}

/**
 * Validate a single client record
 */
function validateClient(client: Partial<CreateClientRequest>, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Required fields for simplified schema: name and phone
  const requiredFields: Array<keyof CreateClientRequest> = [
    'name',
    'phone',
  ]

  for (const field of requiredFields) {
    if (!client[field] || String(client[field]).trim() === '') {
      errors.push({
        row: rowNumber,
        field,
        message: `${field} is required`,
        value: client[field] as string,
      })
    }
  }

  // Email validation (optional field)
  if (client.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(client.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format',
        value: client.email,
      })
    }
  }

  // Phone validation (basic - should have at least 9 digits)
  if (client.phone) {
    const digitsOnly = client.phone.replace(/\D/g, '')
    if (digitsOnly.length < 9) {
      errors.push({
        row: rowNumber,
        field: 'phone',
        message: 'Phone number must have at least 9 digits',
        value: client.phone,
      })
    }
  }

  return errors
}

/**
 * Process CSV text and validate all rows
 */
export function processCSVImport(csvText: string): CSVImportResult {
  const rows = parseCSV(csvText)
  const validRows: Partial<CreateClientRequest>[] = []
  const allErrors: ValidationError[] = []

  if (rows.length === 0) {
    return {
      success: false,
      validRows: [],
      errors: [{ row: 0, field: 'file', message: 'CSV file is empty or invalid' }],
      totalRows: 0,
      validCount: 0,
      errorCount: 1,
    }
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2 // +2 because index starts at 0 and we have header row
    const client = mapCSVRowToClient(row)
    const errors = validateClient(client, rowNumber)

    if (errors.length === 0) {
      // Set default values for optional fields
      if (!client.notes) client.notes = ''
      validRows.push(client)
    } else {
      allErrors.push(...errors)
    }
  })

  return {
    success: allErrors.length === 0,
    validRows,
    errors: allErrors,
    totalRows: rows.length,
    validCount: validRows.length,
    errorCount: rows.length - validRows.length,
  }
}

/**
 * Generate CSV template with headers for simplified schema
 */
export function generateCSVTemplate(): string {
  const headers = [
    'name',
    'phone',
    'email',
    'notes',
  ]

  const sampleData = [
    'BOX123',
    'Large',
    'CON12345',
    'John Doe',
    '8001015009080',
    'john.doe@example.com',
    '+27123456789',
    '+27987654321',
    '2024-01-01',
    '2024-12-31',
    'Engineer',
    'male',
    'Sample client data',
  ]

  return `${headers.join(',')}\n${sampleData.join(',')}`
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''

  const errorsByRow = errors.reduce((acc, error) => {
    if (!acc[error.row]) {
      acc[error.row] = []
    }
    acc[error.row].push(error)
    return acc
  }, {} as Record<number, ValidationError[]>)

  let output = `Found ${errors.length} validation error(s):\n\n`

  for (const [row, rowErrors] of Object.entries(errorsByRow)) {
    output += `Row ${row}:\n`
    rowErrors.forEach(error => {
      output += `  - ${error.field}: ${error.message}`
      if (error.value) output += ` (value: "${error.value}")`
      output += '\n'
    })
    output += '\n'
  }

  return output
}
