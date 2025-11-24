'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { threeCXService, type ThreeCXConfig } from '@/lib/3cx'
import {
  CogIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function ThreeCXSettingsPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [config, setConfig] = useState<ThreeCXConfig>(threeCXService.getConfig())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [activeCalls, setActiveCalls] = useState(threeCXService.getActiveCalls())

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard')
      return
    }
  }, [isAdmin, router])

  // Refresh active calls every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCalls(threeCXService.getActiveCalls())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleConfigChange = (field: keyof ThreeCXConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
    setIsSaved(false)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Update the service configuration
      threeCXService.updateConfig(config)
      
      // Store in localStorage for persistence
      localStorage.setItem('threecx_config', JSON.stringify(config))
      
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save 3CX configuration:', error)
      alert('Failed to save configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = () => {
    try {
      setTestResult('Testing 3CX web client connection...')
      
      // Try different URL combinations
      const testUrls = [
        config.webClientUrl,
        `${config.serverUrl}/webclient/`,
        `${config.serverUrl}/webclient`,
        config.serverUrl
      ]
      
      let testWindow: Window | null = null
      
      for (const url of testUrls) {
        try {
          console.log('Trying URL:', url)
          testWindow = window.open(url, 'threecx_test', 'width=900,height=700')
          if (testWindow && !testWindow.closed) {
            setTestResult(`✅ 3CX accessible at: ${url}`)
            setTimeout(() => {
              testWindow?.close()
            }, 5000)
            break
          }
        } catch (error) {
          console.warn(`Failed to open ${url}:`, error)
        }
      }
      
      if (!testWindow || testWindow.closed) {
        setTestResult(`❌ Unable to access 3CX web client. Try these URLs manually:
        • ${config.webClientUrl}
        • ${config.serverUrl}/webclient/
        • ${config.serverUrl}
        
        Check if popups are blocked or if the URLs are correct.`)
      }
      
      setTimeout(() => setTestResult(null), 15000)
    } catch (error) {
      setTestResult('❌ Error testing 3CX connection')
      console.error('Test error:', error)
    }
  }

  const handleAutoDialTest = () => {
    const testNumber = '+27123456789' // Test number
    try {
      setTestResult('Testing automatic dialing functionality...')
      
      // Update config first
      threeCXService.updateConfig(config)
      
      // Test auto-dial with test number
      const callSession = threeCXService.initiateCall('test-client', testNumber)
      
      setTestResult(`🚀 Auto-dial test initiated for ${testNumber}. Check your 3CX client for the call attempt. Multiple methods are being tried automatically.`)
      
      // End the test call session after a moment
      setTimeout(() => {
        threeCXService.endCall(callSession.id)
        setTestResult(prev => prev + '\n\n✅ Test call session ended. Check if any automatic dialing method worked in your 3CX client.')
      }, 8000)
      
    } catch (error) {
      console.error('Auto-dial test failed:', error)
      setTestResult('❌ Auto-dial test failed: ' + (error as Error).message)
    }
  }

  const handleResetToDefaults = () => {
    const defaultConfig: ThreeCXConfig = {
      serverUrl: 'https://ibvglobal.3cx.co.za:6001',
      webClientUrl: 'https://ibvglobal.3cx.co.za:6001/webclient/',
      extension: '302',
      countryCode: '+27',
      defaultExtension: '302'
    }
    setConfig(defaultConfig)
    setIsSaved(false)
  }

  const formatPhoneExample = (phoneNumber: string) => {
    return threeCXService.formatPhoneNumber(phoneNumber)
  }

  // If not admin, show loading or redirect
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-500">Redirecting...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CogIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">3CX Integration Settings</h1>
              <p className="text-gray-600">Configure 3CX web client integration for click-to-call functionality</p>
            </div>
          </div>
          
          {isSaved && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Settings saved!</span>
            </div>
          )}
        </div>

        {/* Auto-Dial Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <PhoneIcon className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">🚀 Automatic Dialing Features</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>The dialer system now attempts automatic call initiation using multiple methods:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>API Calls:</strong> Attempts to use 3CX API endpoints for direct dialing</li>
                  <li><strong>URL Injection:</strong> Tries various 3CX web client URL formats</li>
                  <li><strong>Protocol Handlers:</strong> Uses system protocols (3cx://, tel://, sip://)</li>
                  <li><strong>Client Injection:</strong> Attempts to inject dial commands into 3CX web client</li>
                  <li><strong>Manual Fallback:</strong> Opens web client with clear manual instructions</li>
                </ul>
                <p className="mt-2 font-medium">Use the "Test Auto-Dial" button to test these methods with your configuration.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Calls Status */}
        {activeCalls.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <PhoneIcon className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-red-900">Active 3CX Calls</h3>
            </div>
            <div className="space-y-2">
              {activeCalls.map(call => (
                <div key={call.id} className="flex items-center justify-between bg-white rounded p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">{call.phoneNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4" />
                    <span>{threeCXService.formatDuration(call.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server Configuration */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Server Configuration</h2>
              <p className="text-sm text-gray-600">3CX server connection settings</p>
            </div>
            <div className="card-content space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  3CX Server URL
                </label>
                <input
                  type="url"
                  value={config.serverUrl}
                  onChange={(e) => handleConfigChange('serverUrl', e.target.value)}
                  className="input"
                  placeholder="https://your-3cx-server:6001"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your 3CX server URL with port (usually 6001 for HTTPS)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Web Client URL
                </label>
                <input
                  type="url"
                  value={config.webClientUrl}
                  onChange={(e) => handleConfigChange('webClientUrl', e.target.value)}
                  className="input"
                  placeholder="https://your-3cx-server:6001/webclient"
                />
                <div className="text-xs text-gray-500 mt-1">
                  <p className="mb-1">URL to the 3CX web client interface. Try these common paths:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code>https://ibvglobal.3cx.co.za:6001/webclient</code></li>
                    <li><code>https://ibvglobal.3cx.co.za:6001/webclient/</code></li>
                    <li><code>https://ibvglobal.3cx.co.za/webclient</code> (if no port needed)</li>
                    <li><code>https://ibvglobal.3cx.co.za:5001/webclient</code> (alternative port)</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Extension
                </label>
                <input
                  type="text"
                  value={config.defaultExtension}
                  onChange={(e) => handleConfigChange('defaultExtension', e.target.value)}
                  className="input"
                  placeholder="302"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your extension number for outbound calls
                </p>
              </div>
            </div>
          </div>

          {/* Phone Number Formatting */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Phone Number Formatting</h2>
              <p className="text-sm text-gray-600">Configure how numbers are formatted for dialing</p>
            </div>
            <div className="card-content space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country Code
                </label>
                <input
                  type="text"
                  value={config.countryCode}
                  onChange={(e) => handleConfigChange('countryCode', e.target.value)}
                  className="input"
                  placeholder="+27"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default country code (e.g., +27 for South Africa)
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Formatting Examples</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">0123456789 →</span>
                    <span className="font-mono">{formatPhoneExample('0123456789')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">123456789 →</span>
                    <span className="font-mono">{formatPhoneExample('123456789')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">27123456789 →</span>
                    <span className="font-mono">{formatPhoneExample('27123456789')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* URL Testing Helper */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Find Your 3CX Web Client URL</h2>
            <p className="text-sm text-gray-600">Test different URLs to find the correct 3CX web client path</p>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              <p className="text-sm text-gray-700 mb-3">
                Click these links to test which URL works for your 3CX web client:
              </p>
              
              {[
                'https://ibvglobal.3cx.co.za:6001/webclient/',
                'https://ibvglobal.3cx.co.za:6001/webclient',
                'https://ibvglobal.3cx.co.za/webclient/',
                'https://ibvglobal.3cx.co.za/webclient',
                'https://ibvglobal.3cx.co.za:5001/webclient/',
                'https://ibvglobal.3cx.co.za:6001/',
                'https://ibvglobal.3cx.co.za/'
              ].map((url, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm text-gray-800">{url}</code>
                  <div className="flex space-x-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Test Link
                    </a>
                    <button
                      onClick={() => handleConfigChange('webClientUrl', url)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Use This
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>How to test:</strong> Click "Test Link" for each URL. The working URL should show the 3CX login page or dashboard.
                  Once you find the working URL, click "Use This" to set it as your web client URL.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Test Configuration</h3>
                <p className="text-sm text-gray-600">Test the 3CX web client connection</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleTest}
                  className="btn btn-secondary"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                  Test Connection
                </button>
                <button
                  onClick={handleAutoDialTest}
                  className="btn btn-secondary"
                >
                  <PhoneIcon className="w-4 h-4 mr-2" />
                  Test Auto-Dial
                </button>
                <button
                  onClick={handleResetToDefaults}
                  className="btn btn-secondary"
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`mt-4 p-3 rounded-lg ${
                testResult.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Usage Instructions</h2>
          </div>
          <div className="card-content">
            <div className="prose prose-sm max-w-none">
              <h4>How to use 3CX Integration:</h4>
              <ol>
                <li>Click the green phone button next to any client to initiate a call</li>
                <li>The 3CX web client will open in a new window with the phone number pre-filled</li>
                <li>Click "Dial" in the 3CX client to start the actual call</li>
                <li>The system will track call duration automatically</li>
                <li>When finished, hang up in 3CX and click "End Call" in the system</li>
                <li>A call log form will open for you to add notes and details</li>
              </ol>

              <h4 className="mt-4">Features:</h4>
              <ul>
                <li>Automatic phone number formatting for South African numbers</li>
                <li>Real-time call duration tracking</li>
                <li>Integration with existing call logging system</li>
                <li>Visual indicators for active calls</li>
                <li>Quick access to 3CX web client</li>
              </ul>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                <div className="flex items-start space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <strong className="text-yellow-800">Note:</strong>
                    <p className="text-yellow-700 text-sm mt-1">
                      This integration works with 3CX Standard edition. You must manually manage calls in both 
                      the 3CX client and this system. Enterprise features like automatic call control are not 
                      available with the Standard edition.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}