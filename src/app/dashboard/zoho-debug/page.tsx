'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function ZohoDebugPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [error, setError] = useState('')

  const fetchDebugInfo = async () => {
    setLoading(true)
    setError('')
    setDebugData(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/zoho/debug-fields', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setDebugData(data)
      } else {
        setError(data.error || 'Failed to fetch debug info')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Admin access required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🔍 Zoho Fields Debug</h1>
        <p className="text-gray-600 mt-2">
          This page shows you the exact field names that Zoho Bigin is using for your contacts.
        </p>
      </div>

      <button
        onClick={fetchDebugInfo}
        disabled={loading}
        className="btn btn-primary mb-6"
      >
        {loading ? '⏳ Loading...' : '🔍 Inspect Zoho Fields'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {debugData && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Total Fields</p>
                <p className="text-2xl font-bold text-gray-900">{debugData.summary.total_fields}</p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Booking Fields</p>
                <p className="text-2xl font-bold text-blue-600">
                  {debugData.summary.booking_related_fields.length}
                </p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="text-sm text-gray-600">Quotation Fields</p>
                <p className="text-2xl font-bold text-green-600">
                  {debugData.summary.quotation_related_fields.length}
                </p>
              </div>
            </div>
          </div>

          {/* Booking Fields */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Booking Status Fields</h2>
            {debugData.summary.booking_related_fields.length > 0 ? (
              <div className="space-y-2">
                {debugData.summary.booking_related_fields.map((field: string) => (
                  <div key={field} className="bg-blue-50 px-4 py-2 rounded border border-blue-200">
                    <code className="text-blue-800 font-mono font-semibold">{field}</code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                ⚠️ No booking-related fields found. Make sure you have a field with "booking" in its name in Zoho Bigin.
              </p>
            )}
          </div>

          {/* Quotation Fields */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">✅ Quotation Fields</h2>
            {debugData.summary.quotation_related_fields.length > 0 ? (
              <div className="space-y-2">
                {debugData.summary.quotation_related_fields.map((field: string) => (
                  <div key={field} className="bg-green-50 px-4 py-2 rounded border border-green-200">
                    <code className="text-green-800 font-mono font-semibold">{field}</code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                ⚠️ No quotation-related fields found.
              </p>
            )}
          </div>

          {/* Sample Data */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 Sample Contact Data</h2>
            <div className="space-y-4">
              {debugData.sample_contacts.map((contact: any, index: number) => (
                <div key={contact.id} className="border border-gray-200 rounded p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Contact {index + 1}: {contact.name}
                  </h3>
                  
                  {Object.keys(contact.booking_related).length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">Booking Fields:</p>
                      <div className="bg-blue-50 rounded p-3 space-y-1">
                        {Object.entries(contact.booking_related).map(([key, value]: [string, any]) => (
                          <div key={key} className="text-sm">
                            <code className="text-blue-700 font-mono">{key}</code>
                            {' = '}
                            <span className="font-semibold text-blue-900">
                              {value !== null && value !== undefined ? String(value) : '(empty)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(contact.quotation_related).length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">Quotation Fields:</p>
                      <div className="bg-green-50 rounded p-3 space-y-1">
                        {Object.entries(contact.quotation_related).map(([key, value]: [string, any]) => (
                          <div key={key} className="text-sm">
                            <code className="text-green-700 font-mono">{key}</code>
                            {' = '}
                            <span className="font-semibold text-green-900">
                              {value !== null && value !== undefined ? String(value) : '(empty)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* All Fields List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📑 All Available Fields ({debugData.all_fields.length})</h2>
            <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {debugData.all_fields.map((field: string) => (
                  <code key={field} className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200">
                    {field}
                  </code>
                ))}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💡 What to do next</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              {debugData.instructions.map((instruction: string, index: number) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
            <div className="mt-4 p-4 bg-white rounded border border-green-300">
              <p className="font-semibold text-gray-900 mb-2">✅ Expected Field Names:</p>
              <p className="text-sm text-gray-700">
                The system currently looks for: <code className="bg-gray-100 px-2 py-1 rounded">Booking_status</code>, 
                <code className="bg-gray-100 px-2 py-1 rounded mx-1">Booking_Status</code>, 
                <code className="bg-gray-100 px-2 py-1 rounded">Booking status</code>, or 
                <code className="bg-gray-100 px-2 py-1 rounded ml-1">BookingStatus</code>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                For quotations: <code className="bg-gray-100 px-2 py-1 rounded">Quotation_done</code> or 
                <code className="bg-gray-100 px-2 py-1 rounded ml-1">Quotation_Done</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
