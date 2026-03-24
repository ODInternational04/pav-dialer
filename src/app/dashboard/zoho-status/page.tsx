'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function ZohoStatusPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // Wait for user to load
    if (user !== undefined) {
      setAuthLoading(false)
      if (user?.role === 'admin') {
        fetchStatus()
      }
    }
  }, [user])

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/zoho/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error fetching Zoho status:', error)
      setStatus({ error: 'Failed to fetch status' })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Admin access required. Current user: {user?.email || 'Not logged in'} (Role: {user?.role || 'none'})</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">🔌 Zoho Bigin Integration Status</h1>

      {status.error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">❌ Error</h2>
          <p className="text-red-700">{status.error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className={`border rounded-lg p-6 ${
            status.status === 'configured' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`text-4xl ${
                status.status === 'configured' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {status.status === 'configured' ? '✅' : '⚠️'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {status.status === 'configured' ? 'Configured' : 'Not Configured'}
                </h2>
                <p className="text-gray-600">{status.message}</p>
              </div>
            </div>
          </div>

          {/* Configuration Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Details</h3>
            <div className="space-y-3">
              <ConfigItem 
                label="Refresh Token" 
                value={status.details?.configured} 
                extra={status.details?.refresh_token_length ? `(${status.details.refresh_token_length} characters)` : ''}
              />
              <ConfigItem label="Client ID" value={status.details?.has_client_id} />
              <ConfigItem label="Client Secret" value={status.details?.has_client_secret} />
              <ConfigItem label="API Domain" value={status.details?.has_api_domain} />
              <ConfigItem label="Accounts URL" value={status.details?.has_accounts_url} />
            </div>
          </div>

          {/* Instructions */}
          {status.status !== 'configured' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Setup Instructions</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Create a <code className="bg-blue-100 px-2 py-1 rounded">.env.local</code> file in the project root</li>
                <li>Add your Zoho credentials:
                  <pre className="bg-gray-800 text-white p-4 rounded mt-2 text-sm overflow-x-auto">
{`ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REFRESH_TOKEN=your_refresh_token_here
ZOHO_API_DOMAIN=https://www.zohoapis.com
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com`}
                  </pre>
                </li>
                <li>Restart the development server</li>
                <li>Refresh this page to check status</li>
              </ol>
            </div>
          )}

          {/* Test Sync Button */}
          {status.status === 'configured' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🧪 Test Sync</h3>
              <p className="text-gray-600 mb-4">
                Go to the Clients page and try:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li>Click "Sync Zoho Bigin" to import contacts</li>
                <li>Edit a client to push updates to Zoho</li>
                <li>Create a new client to sync to Zoho</li>
              </ul>
              <p className="text-sm text-gray-500">
                💡 Watch the terminal/console where <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code> is running to see sync logs.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConfigItem({ label, value, extra }: { label: string, value: boolean, extra?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100">
      <span className="text-gray-700 font-medium">{label}</span>
      <div className="flex items-center space-x-2">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? '✓ Set' : '✗ Missing'}
        </span>
        {extra && <span className="text-gray-500 text-sm">{extra}</span>}
      </div>
    </div>
  )
}
