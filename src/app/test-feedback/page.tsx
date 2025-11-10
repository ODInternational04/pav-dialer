'use client'

import { useState, useEffect } from 'react'

export default function FeedbackTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    // Get available clients for testing
    testTable()
  }, [])

  const testTable = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/customer-feedback')
      const data = await response.json()
      setResult(data)
      if (data.availableClients) {
        setClients(data.availableClients)
      }
    } catch (error) {
      setResult({ error: 'Failed to test', details: error })
    }
    setLoading(false)
  }

  const testInsert = async () => {
    if (clients.length === 0) {
      setResult({ error: 'No clients available for testing. Please add some clients first.' })
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setResult({ error: 'Please login first to test feedback insertion' })
        setLoading(false)
        return
      }

      const testClient = clients[0] // Use the first available client
      const response = await fetch('/api/debug/customer-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: testClient.id,
          feedback_type: 'general',
          subject: 'Test Feedback',
          notes: 'This is a test feedback for debugging purposes',
          priority: 'medium'
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to test insert', details: error })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Customer Feedback Debug</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="font-bold text-blue-900">Instructions:</h2>
        <ol className="list-decimal list-inside text-blue-800 mt-2">
          <li>First click "Test Table Setup" to check if the database is configured</li>
          <li>Make sure you're logged in to the app</li>
          <li>Then click "Test Feedback Insert" to test saving feedback</li>
        </ol>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={testTable}
          disabled={loading}
          className="btn btn-primary mr-4"
        >
          {loading ? 'Testing...' : 'Test Table Setup'}
        </button>

        <button
          onClick={testInsert}
          disabled={loading || clients.length === 0}
          className="btn btn-secondary"
        >
          {loading ? 'Testing...' : `Test Feedback Insert ${clients.length > 0 ? `(using ${clients[0]?.principal_key_holder})` : '(no clients available)'}`}
        </button>
      </div>

      {clients.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h3 className="font-bold text-green-900">Available Clients for Testing:</h3>
          <ul className="text-green-800 mt-2">
            {clients.slice(0, 3).map((client, index) => (
              <li key={client.id}>
                {index + 1}. {client.principal_key_holder} (Box: {client.box_number})
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2">Result:</h2>
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {result.success ? (
              <div className="text-green-800">
                ✅ <strong>Success!</strong> Customer feedback system is working properly.
              </div>
            ) : (
              <div className="text-red-800">
                ❌ <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm mt-4">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}