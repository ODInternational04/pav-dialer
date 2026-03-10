'use client'

import { useState } from 'react'

export default function LoginDiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [testResult, setTestResult] = useState<string>('')

  const runDiagnostics = () => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    const diag = {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 50) + '...' : 'None',
      hasUser: !!user,
      userPreview: user || 'None',
      localStorage: Object.keys(localStorage),
      cookies: document.cookie || 'None',
      timestamp: new Date().toISOString()
    }
    
    setDiagnostics(diag)
  }

  const clearAllAuth = () => {
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    
    setTestResult('✅ All authentication data cleared! Please refresh the page and try logging in again.')
    setTimeout(() => window.location.href = '/login', 2000)
  }

  const testLoginAPI = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@pavilionhotel.com',
          password: 'admin123'
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setTestResult(`✅ API Test SUCCESS! User: ${data.user.email}`)
      } else {
        setTestResult(`❌ API Test FAILED: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      setTestResult(`💥 API Test ERROR: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">
            🔧 Login Diagnostic Tool
          </h1>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-900">Quick Fixes</h2>
              
              <div className="space-y-4">
                <button
                  onClick={clearAllAuth}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  🗑️ Clear All Authentication Data
                </button>

                <button
                  onClick={testLoginAPI}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  🧪 Test Login API Directly
                </button>

                <button
                  onClick={runDiagnostics}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  🔍 Run Diagnostics
                </button>
              </div>

              {testResult && (
                <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
                </div>
              )}
            </div>

            {diagnostics && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Diagnostic Results</h2>
                <pre className="bg-white p-4 rounded border border-gray-300 overflow-auto text-sm">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-yellow-900">Manual Steps</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Open Browser DevTools (F12)</li>
                <li>Go to Console tab - check for error messages</li>
                <li>Go to Network tab - try logging in and see the request</li>
                <li>Go to Application tab → Local Storage → Clear all</li>
                <li>Try in Incognito/Private window</li>
                <li>Try a different browser</li>
                <li>Check if Caps Lock is ON</li>
                <li>Disable browser extensions temporarily</li>
              </ol>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-green-900">Admin Credentials</h2>
              <div className="space-y-2 font-mono text-sm">
                <div>
                  <span className="font-semibold">Email:</span> admin@pavilionhotel.com
                </div>
                <div>
                  <span className="font-semibold">Password:</span> admin123
                </div>
              </div>
            </div>

            <div className="text-center">
              <a
                href="/login"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                ← Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
