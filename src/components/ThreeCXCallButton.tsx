'use client'

import React, { useState, useEffect } from 'react'
import { 
  PhoneIcon, 
  StopIcon, 
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { threeCXService, type CallSession } from '@/lib/3cx'
import { Client } from '@/types'

interface ThreeCXCallButtonProps {
  client: Client
  onCallStart?: (callSession: CallSession) => void
  onCallEnd?: (callSession: CallSession) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'success' | 'danger'
  forceEndCall?: boolean // New prop to force end the call
}

export default function ThreeCXCallButton({
  client,
  onCallStart,
  onCallEnd,
  disabled = false,
  size = 'md',
  variant = 'success',
  forceEndCall = false
}: ThreeCXCallButtonProps) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationType, setNotificationType] = useState<'desktop_app' | 'error' | 'manual_dial'>('manual_dial')

  // Check for existing active call on mount
  useEffect(() => {
    const existingCall = threeCXService.getActiveCallByClient(client.id)
    if (existingCall) {
      setActiveCall(existingCall)
      // Timer display removed - no duration tracking
    }
  }, [client.id])

  // Handle force end call from parent
  useEffect(() => {
    if (forceEndCall) {
      console.log('Force ending 3CX call due to call log save')
      
      // End any active call in the service
      if (activeCall) {
        threeCXService.endCall(activeCall.id)
      }
      
      // Clear local state
      setActiveCall(null)
      setShowNotification(false)
      
      // Also check and clear any calls for this client in the service
      const existingCall = threeCXService.getActiveCallByClient(client.id)
      if (existingCall) {
        threeCXService.endCall(existingCall.id)
        console.log('Cleared existing call from service for client:', client.id)
      }
    }
  }, [forceEndCall, activeCall, client.id])

  const handleStartCall = () => {
    if (disabled) return

    try {
      const callSession = threeCXService.initiateCall(client.id, client.telephone_cell)
      setActiveCall(callSession)
      // Don't show notification by default - only on error
      
      // Clear any stored notification type - no notifications needed
      setTimeout(() => {
        localStorage.removeItem('threecx_notification_type')
      }, 500)
      
      onCallStart?.(callSession)
    } catch (error) {
      console.error('Failed to initiate call:', error)
      // Only show error if there's actually a problem - tel: protocol should work silently
      console.log('tel: protocol attempted - Windows should handle default app selection')
    }
  }

  const handleEndCall = () => {
    if (!activeCall) return

    const endedCall = threeCXService.endCall(activeCall.id)
    if (endedCall) {
      setActiveCall(null)
      setShowNotification(false)
      onCallEnd?.(endedCall)
    }
  }

  const handleFocus3CX = () => {
    threeCXService.focus3CXClient()
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-1.5'
      case 'lg':
        return 'p-3'
      default:
        return 'p-2'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3'
      case 'lg':
        return 'w-6 h-6'
      default:
        return 'w-4 h-4'
    }
  }

  const getVariantClasses = () => {
    if (activeCall?.isActive) {
      return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
    }
    
    switch (variant) {
      case 'primary':
        return 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
      case 'danger':
        return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
      default:
        return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
    }
  }

  if (activeCall?.isActive) {
    return (
      <div className="space-y-2">
        {/* Active Call Controls - Timer Display Removed */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleEndCall}
            className="p-2 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 rounded-lg transition-colors"
            title="End Call"
          >
            <StopIcon className={getIconSize()} />
          </button>

          <button
            onClick={handleFocus3CX}
            className="p-2 bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 rounded-lg transition-colors"
            title="Focus 3CX Client"
          >
            <ArrowTopRightOnSquareIcon className={getIconSize()} />
          </button>
        </div>

        {/* Call Instructions */}
        {showNotification && (
          <div className={`p-3 border rounded-lg ${
            notificationType === 'desktop_app' ? 'bg-green-50 border-green-200' :
            notificationType === 'manual_dial' ? 'bg-blue-50 border-blue-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-2">
              <PhoneIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                notificationType === 'desktop_app' ? 'text-green-600' : 
                notificationType === 'manual_dial' ? 'text-blue-600' : 'text-red-600'
              }`} />
              <div className={`text-sm ${
                notificationType === 'desktop_app' ? 'text-green-800' : 
                notificationType === 'manual_dial' ? 'text-blue-800' : 'text-red-800'
              }`}>
                {notificationType === 'desktop_app' && (
                  <>
                    <p className="font-medium mb-1">📱 3CX Desktop App Launched</p>
                    <p className="text-sm">
                      The 3CX desktop application is launching to call <strong>{threeCXService.formatPhoneNumber(client.telephone_cell)}</strong>. 
                      The call should start automatically in your desktop app.
                    </p>
                  </>
                )}

                {notificationType === 'manual_dial' && (
                  <>
                    <p className="font-medium mb-1">📞 Manual Dialing Required (Teams Conflict Avoided)</p>
                    <div className="text-sm space-y-2">
                      <p>To avoid Microsoft Teams opening instead of 3CX, please dial manually:</p>
                      <div className="bg-blue-100 p-3 rounded border">
                        <p className="font-medium text-blue-800 mb-1">Steps to call:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-700">
                          <li>Open your <strong>3CX Desktop Application</strong></li>
                          <li>Use the dialer to call: <code className="bg-white px-2 py-1 rounded font-mono text-lg">{threeCXService.formatPhoneNumber(client.telephone_cell)}</code></li>
                          <li>Click "End Call" below when finished</li>
                        </ol>
                      </div>
                      <p className="text-xs text-blue-600">
                        💡 Tip: Set 3CX as your default phone app in Windows Settings to enable automatic dialing
                      </p>
                    </div>
                  </>
                )}
                
                {notificationType === 'error' && (
                  <>
                    <p className="font-medium mb-1">📱 Set 3CX as Default Phone App</p>
                    <div className="text-sm">
                      <p>Windows should have asked which app to use for phone calls. To set 3CX as default:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li><strong>If dialog appeared:</strong> Select "3CX Desktop App" and check "Always use this app"</li>
                        <li><strong>If no dialog:</strong> Go to Windows Settings → Apps → Default Apps → Phone</li>
                        <li><strong>Select 3CX Desktop App</strong> as your default phone handler</li>
                        <li>Then try calling again: <code className="bg-red-100 px-1 rounded">{threeCXService.formatPhoneNumber(client.telephone_cell)}</code></li>
                      </ul>
                      <p className="mt-2 text-xs text-gray-600">
                        💡 Once set, future calls will open directly in 3CX Desktop App
                      </p>
                    </div>
                  </>
                )}
                
                <button
                  onClick={() => setShowNotification(false)}
                  className={`mt-2 text-xs underline ${
                    notificationType === 'desktop_app' ? 'text-green-600 hover:text-green-800' : 
                    notificationType === 'manual_dial' ? 'text-blue-600 hover:text-blue-800' :
                    'text-red-600 hover:text-red-800'
                  }`}
                >
                  Hide Notification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={handleStartCall}
      disabled={disabled}
      className={`${getSizeClasses()} ${getVariantClasses()} border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      title={`Call ${client.telephone_cell} via 3CX`}
    >
      <PhoneIcon className={getIconSize()} />
    </button>
  )
}