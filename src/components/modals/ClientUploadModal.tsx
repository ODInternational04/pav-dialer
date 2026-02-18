'use client'

import { useEffect, useMemo, useState } from 'react'
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'

interface UploadPreview {
  headers: string[]
  rows: string[][]
  fileName: string
}

interface ClientUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onParsed: (preview: UploadPreview) => void
}

const SUPPORTED_EXTENSIONS = ['csv', 'tsv', 'txt', 'json', 'xlsx', 'xls']

export default function ClientUploadModal({ isOpen, onClose, onParsed }: ClientUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [headerConfirmed, setHeaderConfirmed] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<UploadPreview | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null)
      setHeaderConfirmed(false)
      setIsParsing(false)
      setError(null)
      setPreview(null)
    }
  }, [isOpen])

  const fileExtension = useMemo(() => {
    if (!selectedFile?.name) return ''
    const parts = selectedFile.name.split('.')
    return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
  }, [selectedFile])

  const canProcess = Boolean(selectedFile && headerConfirmed && !isParsing)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setError(null)
    setPreview(null)
  }

  const handleProcessFile = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.')
      return
    }
    if (!headerConfirmed) {
      setError('Please confirm that the first row contains headers.')
      return
    }

    setIsParsing(true)
    setError(null)

    try {
      let parsed: { headers: string[]; rows: string[][] } | null = null

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parsed = await parseSpreadsheet(selectedFile)
      } else if (fileExtension === 'json') {
        parsed = await parseJsonFile(selectedFile)
      } else {
        parsed = await parseDelimitedFile(selectedFile)
      }

      if (!parsed || parsed.headers.length === 0) {
        throw new Error('No headers found. Please ensure the first row is the header row.')
      }

      const normalizedHeaders = normalizeHeaders(parsed.headers)
      const normalizedRows = parsed.rows.map(row => normalizeRow(row, normalizedHeaders.length))

      const previewData: UploadPreview = {
        headers: normalizedHeaders,
        rows: normalizedRows,
        fileName: selectedFile.name
      }

      setPreview(previewData)
      onParsed(previewData)
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Failed to parse file.'
      setError(message)
    } finally {
      setIsParsing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Clients File</h2>
            <p className="text-sm text-gray-600">
              Upload any file format and confirm the first row contains headers.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Select a file</p>
                <p className="text-xs text-gray-600">
                  Supported: {SUPPORTED_EXTENSIONS.join(', ')}
                </p>
              </div>
              <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50">
                <ArrowUpTrayIcon className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-sm text-gray-700">Choose File</span>
                <input
                  type="file"
                  className="hidden"
                  accept={SUPPORTED_EXTENSIONS.map(ext => `.${ext}`).join(',')}
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {selectedFile && (
              <div className="mt-4 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Selected:</span> {selectedFile.name}
                </p>
                {fileExtension && !SUPPORTED_EXTENSIONS.includes(fileExtension) && (
                  <p className="text-red-600 text-xs mt-1">
                    This file type is not officially supported. Parsing will attempt a best-effort read.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="header-confirmation"
              type="checkbox"
              checked={headerConfirmed}
              onChange={(event) => setHeaderConfirmed(event.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="header-confirmation" className="text-sm text-gray-700">
              I confirm the first row contains headers.
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleProcessFile}
              className="btn btn-primary"
              disabled={!canProcess}
            >
              {isParsing ? 'Processing...' : 'Upload & Preview'}
            </button>
          </div>

          {preview && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-100 border-b">
                <p className="text-sm font-medium text-gray-900">Preview: {preview.fileName}</p>
                <p className="text-xs text-gray-600">
                  {preview.rows.length} rows • {preview.headers.length} columns
                </p>
              </div>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {preview.headers.map((header, index) => (
                        <th
                          key={`${header}-${index}`}
                          className="px-3 py-2 text-left font-semibold text-gray-700 border-b"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {preview.headers.map((_, cellIndex) => (
                          <td key={`cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-gray-700 border-b">
                            {row[cellIndex] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

async function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet) {
    return { headers: [], rows: [] }
  }

  const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false })
  const [headers = [], ...dataRows] = rows

  return {
    headers: (headers || []).map(header => String(header ?? '').trim()),
    rows: dataRows.map(row => row.map(cell => String(cell ?? '').trim()))
  }
}

async function parseJsonFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const text = await file.text()
  const data = JSON.parse(text)

  if (Array.isArray(data)) {
    if (data.length === 0) return { headers: [], rows: [] }

    if (Array.isArray(data[0])) {
      const [headers = [], ...rows] = data
      return {
        headers: headers.map((value: unknown) => String(value ?? '').trim()),
        rows: rows.map((row: unknown[]) => row.map(cell => String(cell ?? '').trim()))
      }
    }

    if (typeof data[0] === 'object' && data[0] !== null) {
      const headers = Array.from(
        new Set(data.flatMap(item => Object.keys(item as Record<string, unknown>)))
      )
      const rows = data.map(item => headers.map(header => String((item as Record<string, unknown>)[header] ?? '').trim()))
      return { headers, rows }
    }
  }

  if (typeof data === 'object' && data !== null) {
    const headers = Object.keys(data as Record<string, unknown>)
    const rows = [headers.map(header => String((data as Record<string, unknown>)[header] ?? '').trim())]
    return { headers, rows }
  }

  return { headers: [], rows: [] }
}

async function parseDelimitedFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const text = await file.text()
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter(line => line.trim().length > 0)

  if (lines.length === 0) return { headers: [], rows: [] }

  const delimiter = detectDelimiter(lines[0])
  const rows = lines.map(line => parseDelimitedLine(line, delimiter))
  const [headers = [], ...dataRows] = rows

  return {
    headers: headers.map(value => String(value ?? '').trim()),
    rows: dataRows.map(row => row.map(cell => String(cell ?? '').trim()))
  }
}

function detectDelimiter(line: string): string {
  const delimiters = [',', '\t', ';', '|']
  let bestDelimiter = ','
  let maxMatches = 0

  delimiters.forEach(delimiter => {
    const matches = line.split(delimiter).length - 1
    if (matches > maxMatches) {
      maxMatches = matches
      bestDelimiter = delimiter
    }
  })

  return bestDelimiter
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

function normalizeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>()

  return headers.map(header => {
    const base = header.trim() || 'Column'
    const count = seen.get(base) || 0
    const nextCount = count + 1
    seen.set(base, nextCount)
    return count === 0 ? base : `${base} (${nextCount})`
  })
}

function normalizeRow(row: string[], targetLength: number): string[] {
  const normalized = [...row]
  while (normalized.length < targetLength) {
    normalized.push('')
  }
  return normalized.slice(0, targetLength)
}
