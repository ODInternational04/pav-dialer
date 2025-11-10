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
  showInstructionsProp?: boolean
  forceEndCall?: boolean // New prop to force end the call
}

export default function ThreeCXCallButton({
  client,
  onCallStart,
  onCallEnd,
  disabled = false,
  size = 'md',
  variant = 'success',
  showInstructionsProp = true,
  forceEndCall = false
}: ThreeCXCallButtonProps) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [instructionType, setInstructionType] = useState<'direct' | 'protocol' | 'manual' | 'error'>('manual')

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
      setShowInstructions(false)
      
      // Also check and clear any calls for this client in the service
      const existingCall = threeCXService.getActiveCallByClient(client.id)
      if (existingCall) {
        threeCXService.endCall(existingCall.id)
        console.log('Cleared existing call from service for client:', client.id)
      }
    }
  }, [forceEndCall, activeCall, client.id])

  // Timer functionality completely removed
  // No more duration tracking needed

  const handleStartCall = () => {
    if (disabled) return

    try {
      const callSession = threeCXService.initiateCall(client.id, client.telephone_cell)
      setActiveCall(callSession)
      // Timer display removed - no duration tracking
      setShowInstructions(true)
      
      // Check what type of instruction to show
      setTimeout(() => {
        const instructionType = localStorage.getItem('threecx_instruction_type') as 'direct' | 'protocol' | 'manual' | 'error' || 'manual'
        setInstructionType(instructionType)
      }, 500)
      
      onCallStart?.(callSession)

      // Auto-hide instructions after 15 seconds for direct calls, 30 seconds for manual
      const hideDelay = instructionType === 'direct' ? 15000 : 30000
      setTimeout(() => setShowInstructions(false), hideDelay)
    } catch (error) {
      console.error('Failed to initiate call:', error)
      alert('Failed to open 3CX client. Please check your configuration.')
    }
  }

  const handleEndCall = () => {
    if (!activeCall) return

    const endedCall = threeCXService.endCall(activeCall.id)
    if (endedCall) {
      setActiveCall(null)
      // Timer display removed - no duration reset needed
      setShowInstructions(false)
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
        {showInstructions && (
          <div className={`p-3 border rounded-lg ${
            instructionType === 'direct' ? 'bg-green-50 border-green-200' :
            instructionType === 'protocol' ? 'bg-blue-50 border-blue-200' :
            instructionType === 'error' ? 'bg-red-50 border-red-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                instructionType === 'direct' ? 'text-green-600' :
                instructionType === 'protocol' ? 'text-blue-600' :
                instructionType === 'error' ? 'text-red-600' :
                'text-yellow-600'
              }`} />
              <div className={`text-sm ${
                instructionType === 'direct' ? 'text-green-800' :
                instructionType === 'protocol' ? 'text-blue-800' :
                instructionType === 'error' ? 'text-red-800' :
                'text-yellow-800'
              }`}>
                {instructionType === 'direct' && (
                  <>
                    <p className="font-medium mb-1">� Call Initiated</p>
                    <p className="text-sm">
                      Call attempt made to <strong>{threeCXService.formatPhoneNumber(client.telephone_cell)}</strong>. 
                      Check your 3CX client - if a call started automatically, great! 
                      If not, manually dial the number in the 3CX web client that opened.
                    </p>
                  </>
                )}
                
                {instructionType === 'protocol' && (
                  <>
                    <p className="font-medium mb-1">� System Protocols Triggered</p>
                    <p className="text-sm">
                      System dialing protocols activated for <strong>{threeCXService.formatPhoneNumber(client.telephone_cell)}</strong>.
                      Check your 3CX desktop app, phone client, or the web client that opened.
                      If no automatic call started, manually dial the number in 3CX.
                    </p>
                  </>
                )}
                
                {instructionType === 'manual' && (
                  <>
                    <p className="font-medium mb-1">� 3CX Client Ready</p>
                    <div className="text-sm space-y-1">
                      <p>3CX web client opened for <strong>{threeCXService.formatPhoneNumber(client.telephone_cell)}</strong>. Auto-dial attempted in background.</p>
                      <p className="font-medium text-green-700">📝 Call log modal opened for note-taking during the call.</p>
                      <p><strong>If no call started automatically:</strong></p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Look for the dial pad in your 3CX web client</li>
                        <li>Enter: <code className="bg-yellow-100 px-1 rounded">{threeCXService.formatPhoneNumber(client.telephone_cell)}</code></li>
                        <li>Click "Call" or "Dial" button</li>
                        <li>When finished, hang up in 3CX and click "End Call" below</li>
                      </ol>
                    </div>
                  </>
                )}
                
                {instructionType === 'error' && (
                  <>
                    <p className="font-medium mb-1">❌ Connection Issue</p>
                    <div className="text-sm">
                      <p>Unable to connect to 3CX. Try:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Check your 3CX settings in the dashboard</li>
                        <li>Verify 3CX server is accessible</li>
                        <li>Contact your IT administrator</li>
                      </ul>
                      <p className="mt-2"><strong>Number to dial manually:</strong> <code className="bg-red-100 px-1 rounded">{threeCXService.formatPhoneNumber(client.telephone_cell)}</code></p>
                    </div>
                  </>
                )}
                
                <button
                  onClick={() => setShowInstructions(false)}
                  className={`mt-2 text-xs underline ${
                    instructionType === 'direct' ? 'text-green-600 hover:text-green-800' :
                    instructionType === 'protocol' ? 'text-blue-600 hover:text-blue-800' :
                    instructionType === 'error' ? 'text-red-600 hover:text-red-800' :
                    'text-yellow-600 hover:text-yellow-800'
                  }`}
                >
                  Hide Instructions
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