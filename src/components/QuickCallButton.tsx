'use client'

import React, { useState } from 'react'
import InboundCallWizard from '@/components/modals/InboundCallWizard'
import { Client, CreateCallLogRequest } from '@/types'
import { PhoneArrowDownLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'

interface QuickCallButtonProps {
  variant?: 'primary' | 'floating'
  onCallComplete?: () => void
}

export default function QuickCallButton({ 
  variant = 'primary',
  onCallComplete
}: QuickCallButtonProps) {
  const { user } = useAuth()
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  const handleCallComplete = async (callLog: CreateCallLogRequest, client: Client) => {
    try {
      const token = localStorage.getItem('token')
      
      // Save the call log
      const response = await fetch('/api/call-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(callLog)
      })

      if (!response.ok) {
        throw new Error('Failed to save call log')
      }

      // Refresh data if callback provided
      if (onCallComplete) {
        onCallComplete()
      }

      // Show success
      alert(`Call logged successfully for ${client.name}`)
    } catch (error) {
      console.error('Error saving call log:', error)
      alert('Failed to save call log. Please try again.')
    }
  }

  if (variant === 'floating') {
    return (
      <>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="fixed bottom-8 right-8 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 text-white rounded-full shadow-2xl hover:shadow-green-500/50 p-5 flex items-center space-x-3 transition-all duration-300 hover:scale-110 active:scale-95 z-40 group border-2 border-white/20"
          title="Take Incoming Call"
        >
          <div className="relative">
            <PhoneArrowDownLeftIcon className="w-7 h-7 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </div>
          <span className="font-bold text-lg pr-1">Take Call</span>
        </button>

        <InboundCallWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onComplete={handleCallComplete}
        />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsWizardOpen(true)}
        className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <PhoneArrowDownLeftIcon className="w-5 h-5 mr-2" />
        New Call
      </button>

      <InboundCallWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleCallComplete}
      />
    </>
  )
}
