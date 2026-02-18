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
 * Supports multiple header variations
 */
const FIELD_MAPPINGS: Record<string, string[]> = {
  box_number: ['box_number', 'box number', 'box', 'box_no', 'box no'],
  size: ['size', 'box_size', 'box size'],
  contract_no: ['contract_no', 'contract number', 'contract', 'contract_number'],
  principal_key_holder: ['principal_key_holder', 'key holder', 'name', 'client name', 'principal'],
  principal_key_holder_id_number: ['principal_key_holder_id_number', 'id number', 'id_number', 'id no', 'id'],
  principal_key_holder_email_address: ['principal_key_holder_email_address', 'email', 'email address', 'email_address'],
  telephone_cell: ['telephone_cell', 'cell', 'mobile', 'phone', 'cell number', 'mobile number'],
  telephone_home: ['telephone_home', 'home', 'home phone', 'landline'],
  contract_start_date: ['contract_start_date', 'start date', 'start_date', 'contract start'],
  contract_end_date: ['contract_end_date', 'end date', 'end_date', 'contract end'],
  occupation: ['occupation', 'job', 'profession', 'work'],
  notes: ['notes', 'comments', 'remarks', 'note'],
  gender: ['gender', 'sex'],
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
        // Special handling for gender field
        if (clientField === 'gender') {
          const genderValue = row[matchingKey].toLowerCase()
          if (['male', 'female', 'other', 'unknown'].includes(genderValue)) {
            client.gender = genderValue as 'male' | 'female' | 'other' | 'unknown'
          }
        } else {
          client[clientField as keyof CreateClientRequest] = row[matchingKey] as any
        }
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
  const identifierPresent = !!client.box_number || !!client.contract_no

  // Required fields
  const requiredFields: Array<keyof CreateClientRequest> = [
    'box_number',
    'size',
    'contract_no',
    'principal_key_holder',
    'principal_key_holder_id_number',
    'principal_key_holder_email_address',
    'telephone_cell',
    'contract_start_date',
    'contract_end_date',
    'occupation',
  ]

  for (const field of requiredFields) {
    if (!client[field] || String(client[field]).trim() === '') {
      // Allow partial rows if identifying an existing client
      if (identifierPresent) {
        continue
      }
      errors.push({
        row: rowNumber,
        field,
        message: `${field} is required`,
        value: client[field] as string,
      })
    }
  }

  // Email validation
  if (client.principal_key_holder_email_address) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(client.principal_key_holder_email_address)) {
      errors.push({
        row: rowNumber,
        field: 'principal_key_holder_email_address',
        message: 'Invalid email format',
        value: client.principal_key_holder_email_address,
      })
    }
  }

  // Phone validation (basic - should have at least 9 digits)
  if (client.telephone_cell) {
    const digitsOnly = client.telephone_cell.replace(/\D/g, '')
    if (digitsOnly.length < 9) {
      errors.push({
        row: rowNumber,
        field: 'telephone_cell',
        message: 'Phone number must have at least 9 digits',
        value: client.telephone_cell,
      })
    }
  }

  // Date validation
  if (client.contract_start_date) {
    const date = new Date(client.contract_start_date)
    if (isNaN(date.getTime())) {
      errors.push({
        row: rowNumber,
        field: 'contract_start_date',
        message: 'Invalid date format (use YYYY-MM-DD)',
        value: client.contract_start_date,
      })
    }
  }

  if (client.contract_end_date) {
    const date = new Date(client.contract_end_date)
    if (isNaN(date.getTime())) {
      errors.push({
        row: rowNumber,
        field: 'contract_end_date',
        message: 'Invalid date format (use YYYY-MM-DD)',
        value: client.contract_end_date,
      })
    }
  }

  // ID number validation (basic - should be alphanumeric)
  if (client.principal_key_holder_id_number) {
    if (client.principal_key_holder_id_number.length < 5) {
      errors.push({
        row: rowNumber,
        field: 'principal_key_holder_id_number',
        message: 'ID number must be at least 5 characters',
        value: client.principal_key_holder_id_number,
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
 * Generate CSV template with headers
 */
export function generateCSVTemplate(): string {
  const headers = [
    'box_number',
    'size',
    'contract_no',
    'principal_key_holder',
    'principal_key_holder_id_number',
    'principal_key_holder_email_address',
    'telephone_cell',
    'telephone_home',
    'contract_start_date',
    'contract_end_date',
    'occupation',
    'gender',
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
