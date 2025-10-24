'use client'

import { useState } from 'react'

export default function LoginTestPage() {
  const [email, setEmail] = useState('admin@dialersystem.com')
  const [password, setPassword] = useState('admin123')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testDirectLogin = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('🔄 Testing direct login API call...')
      console.log('Email:', email)
      console.log('Password:', password)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log('📦 Response data:', data)

      setResult({
        status: response.status,
        ok: response.ok,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      })

    } catch (error) {
      console.error('❌ Login test error:', error)
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'Network Error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testAuthContext = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('🔄 Testing AuthContext login...')
      
      // Simulate what AuthContext does
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ AuthContext simulation successful:', data)
        
        // Test storing in localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        setResult({
          success: true,
          message: 'AuthContext simulation successful',
          data: data,
          storedToken: localStorage.getItem('token'),
          storedUser: localStorage.getItem('user')
        })
      } else {
        const errorData = await response.json()
        console.log('❌ AuthContext simulation failed:', errorData)
        setResult({
          success: false,
          status: response.status,
          error: errorData
        })
      }

    } catch (error) {
      console.error('❌ AuthContext test error:', error)
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'AuthContext Error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Login Debug Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Login</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="admin@dialersystem.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="admin123"
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={testDirectLogin}
                disabled={loading}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Direct API Call'}
              </button>
              
              <button
                onClick={testAuthContext}
                disabled={loading}
                className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test AuthContext Simulation'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            {result ? (
              <div className="space-y-2">
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
                
                {result.success && (
                  <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
                    <p className="text-green-800 font-medium">✅ Login Successful!</p>
                    <p className="text-sm text-green-600">Token and user data saved to localStorage</p>
                  </div>
                )}
                
                {result.error && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                    <p className="text-red-800 font-medium">❌ Login Failed</p>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Click a test button to see results...</p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Database Test:</strong> <a href="/api/test/db" target="_blank" className="text-blue-600 hover:underline">/api/test/db</a></p>
            <p><strong>Hash Test:</strong> <a href="/api/test/hash" target="_blank" className="text-blue-600 hover:underline">/api/test/hash</a></p>
            <p><strong>Login Test:</strong> <span className="text-gray-600">Use the POST test above</span></p>
            <p><strong>Main App:</strong> <a href="/" className="text-blue-600 hover:underline">Back to Login Page</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}