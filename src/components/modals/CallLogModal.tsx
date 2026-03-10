'use client'

import React, { useState, useEffect } from 'react'
import { Client, CallLog, CreateCallLogRequest } from '@/types'
import { threeCXService } from '@/lib/3cx'
import { 
  XMarkIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  StopIcon,
  FaceSmileIcon,
  LightBulbIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

interface CallLogModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  existingCallLog?: CallLog
  onSave: (callLog: CreateCallLogRequest) => Promise<void>
  threeCXCallDuration?: number // Duration from 3CX session if available
  autoStartTimer?: boolean // Whether to automatically start the timer when modal opens
  onCallEndedManually?: () => void // Callback when user manually ends a call
}

export default function CallLogModal({ 
  isOpen, 
  onClose, 
  client, 
  existingCallLog, 
  onSave,
  threeCXCallDuration,
  autoStartTimer = false,
  onCallEndedManually
}: CallLogModalProps) {
  const [formData, setFormData] = useState<CreateCallLogRequest>({
    client_id: client.id,
    call_type: 'outbound',
    call_status: 'completed',
    call_duration: 0,
    notes: '',
    callback_requested: false,
    callback_time: '',
  })

  const [feedbackData, setFeedbackData] = useState({
    has_feedback: false,
    feedback_type: 'general' as 'complaint' | 'happy' | 'suggestion' | 'general',
    feedback_subject: '',
    feedback_notes: '',
    feedback_priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  })

  const [isCallActive, setIsCallActive] = useState(false)
  const [callStartTime, setCallStartTime] = useState<Date | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isCallbackCall, setIsCallbackCall] = useState(false)
  const [callbackPriority, setCallbackPriority] = useState<string | null>(null)

  // Timer for active call
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isCallActive && callStartTime) {
      interval = setInterval(() => {
        const now = new Date()
        const duration = Math.floor((now.getTime() - callStartTime.getTime()) / 1000)
        setCallDuration(duration)
        setFormData(prev => ({ ...prev, call_duration: duration }))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isCallActive, callStartTime])

  // Initialize form with existing data
  useEffect(() => {
    if (existingCallLog) {
      setFormData({
        client_id: existingCallLog.client_id,
        call_type: existingCallLog.call_type,
        call_status: existingCallLog.call_status,
        call_duration: existingCallLog.call_duration || 0,
        notes: existingCallLog.notes,
        callback_requested: existingCallLog.callback_requested,
        callback_time: existingCallLog.callback_time || '',
      })
      setCallDuration(existingCallLog.call_duration || 0)
    } else {
      // Check for active 3CX call session
      const activeCall = threeCXService.getActiveCallByClient(client.id)
      const duration = threeCXCallDuration || activeCall?.duration || 0
      
      // Reset form for new call log, with potential 3CX data
      setFormData({
        client_id: client.id,
        call_type: 'outbound',
        call_status: 'completed', // Default to completed
        call_duration: duration,
        notes: '', // No pre-fill notes
        callback_requested: false,
        callback_time: '',
      })
      setCallDuration(duration)
    }
    setIsCallActive(false)
    setCallStartTime(null)
    setErrors({})
    // Reset feedback data
    setFeedbackData({
      has_feedback: false,
      feedback_type: 'general',
      feedback_subject: '',
      feedback_notes: '',
      feedback_priority: 'medium'
    })
  }, [existingCallLog, client.id, isOpen, threeCXCallDuration])

  // Auto-start timer for 3CX calls - only trigger on modal open, not on timer state changes
  useEffect(() => {
    if (isOpen && !existingCallLog) {
      // Check for callback context when modal opens
      const checkCallbackContext = async () => {
        try {
          const callbackContext = localStorage.getItem('current_callback_context')
          
          if (callbackContext) {
            const context = JSON.parse(callbackContext)
            console.log('📞 Callback context detected:', context)
            
            // Set callback state
            setIsCallbackCall(true)
            setCallbackPriority(context.priority || null)
            
            // Pre-fill form with callback context (no pre-filled notes)
            setFormData(prev => ({
              ...prev,
              notes: prev.notes || '', // Keep existing notes, don't pre-fill
              call_status: 'completed' // Assume it will be completed
            }))
            
            // Automatically start the call timer for ALL callbacks
            console.log('🚨 Starting automatic callback call timer')
            
            // Start the call timer
            setIsCallActive(true)
            setCallStartTime(new Date())
            console.log('✅ Call timer started for callback')
            
            // Don't clear context here - let it be cleared on save or close
          } else if (autoStartTimer) {
            // Automatically start the call timer for active 3CX calls (non-callback)
            setIsCallActive(true)
            setCallStartTime(new Date())
            console.log('Auto-started call timer for 3CX call')
          }
        } catch (error) {
          console.error('Error checking callback context:', error)
        }
      }
      
      checkCallbackContext()
    }
  }, [isOpen, autoStartTimer, existingCallLog, client.id])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startCall = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Authentication required. Please log in again.')
        return
      }

      // Check for conflicts and start call status
      const response = await fetch('/api/user-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'start_call',
          client_id: client.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409) {
          // Conflict - show user-friendly error
          alert(errorData.error)
          return
        } else {
          throw new Error(errorData.error || 'Failed to start call')
        }
      }

      // Call started successfully
      setIsCallActive(true)
      setCallStartTime(new Date())
      setCallDuration(0)
      setFormData(prev => ({ 
        ...prev, 
        call_status: 'completed',
        call_duration: 0 
      }))
    } catch (error) {
      console.error('Error starting call:', error)
      alert('Failed to start call. Please try again.')
    }
  }

  const endCall = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        // End call status
        await fetch('/api/user-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'end_call'
          })
        })
      }
    } catch (error) {
      console.error('Error ending call status:', error)
    }

    // Update form data with final call duration before stopping timer
    setFormData(prev => ({
      ...prev,
      call_duration: callDuration
    }))
    
    setIsCallActive(false)
    setCallStartTime(null)
    
    // Notify parent that call was ended manually to prevent auto-reopening
    if (onCallEndedManually) {
      onCallEndedManually()
    }
  }

  const handleQuickCallback = (hours: number) => {
    const now = new Date()
    const callbackTime = new Date(now.getTime() + (hours * 60 * 60 * 1000))
    
    setFormData(prev => ({
      ...prev,
      callback_requested: true,
      callback_time: callbackTime.toISOString() // Store as UTC ISO string
    }))
  }

  // Handle modal close - end call status if call was started
  const handleClose = async () => {
    if (isCallActive) {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          await fetch('/api/user-status', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'end_call'
            })
          })
        }
      } catch (error) {
        console.error('Error ending call status on close:', error)
      }
    }
    onClose()
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.callback_requested && !formData.callback_time) {
      newErrors.callback_time = 'Callback time must be specified when callback is requested'
    }

    // Validate feedback if enabled
    if (feedbackData.has_feedback) {
      if (!feedbackData.feedback_subject.trim()) {
        newErrors.feedback_subject = 'Feedback subject is required'
      }
      if (!feedbackData.feedback_notes.trim()) {
        newErrors.feedback_notes = 'Feedback notes are required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    try {
      // End any active 3CX call session before saving
      const activeCall = threeCXService.getActiveCallByClient(client.id)
      if (activeCall) {
        console.log('Ending active 3CX call for client:', client.id)
        threeCXService.endCall(activeCall.id)
      }
      
      // Save call log first
      await onSave(formData)
      
      // Clear callback context if this was a callback call
      if (isCallbackCall) {
        const { threeCXService } = await import('@/lib/3cx')
        threeCXService.clearCallbackContext()
        console.log('✅ Callback context cleared after successful call log save')
        
        // Delete related callback notifications
        await deleteCallbackNotifications()
      }
      
      // Create customer feedback if enabled
      if (feedbackData.has_feedback) {
        console.log('🎯 Saving customer feedback...', feedbackData)
        const token = localStorage.getItem('token')
        const feedbackResponse = await fetch('/api/debug/customer-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            client_id: client.id,
            feedback_type: feedbackData.feedback_type,
            subject: feedbackData.feedback_subject,
            notes: feedbackData.feedback_notes,
            priority: feedbackData.feedback_priority
          })
        })

        if (!feedbackResponse.ok) {
          const errorData = await feedbackResponse.json()
          console.error('❌ Feedback save failed:', errorData)
          alert(`Failed to save feedback: ${errorData.error || 'Unknown error'}\n\nCheck console for details.`)
        } else {
          const feedbackResult = await feedbackResponse.json()
          console.log('✅ Feedback saved successfully:', feedbackResult)
          alert('✅ Feedback saved successfully!')
        }
      }
      
      // End call status when call is saved and stop any active timer
      if (isCallActive) {
        // Update form data with final call duration before ending
        setFormData(prev => ({
          ...prev,
          call_duration: callDuration
        }))
        
        setIsCallActive(false)
        setCallStartTime(null)
        
        // Notify parent that call was ended manually to prevent auto-reopening
        if (onCallEndedManually) {
          onCallEndedManually()
        }
      }
      
      const token = localStorage.getItem('token')
      await fetch('/api/user-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'end_call'
        })
      })
      
      handleClose()
    } catch (error) {
      console.error('Error saving call log:', error)
      alert('Failed to save call log. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCallbackNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      console.log('🗑️ Deleting callback notifications for client:', client.id)

      // Get all callback notifications for this client
      const response = await fetch(`/api/notifications?type=callback&client_id=${client.id}&include_client=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const callbackNotifications = data.notifications || []
        
        // Filter for unread/active notifications for this client
        const notificationsToDelete = callbackNotifications
          .filter((notif: any) => 
            notif.client_id === client.id && 
            notif.type === 'callback' && 
            !notif.is_read
          )
          .map((notif: any) => notif.id)

        if (notificationsToDelete.length > 0) {
          console.log(`🗑️ Deleting ${notificationsToDelete.length} callback notifications:`, notificationsToDelete)
          
          // Delete the notifications
          const deleteResponse = await fetch('/api/notifications', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              notificationIds: notificationsToDelete 
            })
          })

          if (deleteResponse.ok) {
            const deleteResult = await deleteResponse.json()
            console.log('✅ Callback notifications deleted successfully:', deleteResult)
            
            // Trigger a custom event to notify other components
            window.dispatchEvent(new CustomEvent('callbackNotificationsDeleted', {
              detail: { 
                clientId: client.id,
                deletedCount: notificationsToDelete.length,
                deletedIds: notificationsToDelete
              }
            }))
          } else {
            console.error('❌ Failed to delete callback notifications:', await deleteResponse.json())
          }
        } else {
          console.log('ℹ️ No callback notifications found to delete for this client')
        }
      }
    } catch (error) {
      console.error('Error deleting callback notifications:', error)
    }
  }

  const callStatusOptions = [
    { value: 'completed', label: 'Completed', icon: CheckCircleIcon, color: 'text-success-600' },
    { value: 'missed', label: 'Missed', icon: XCircleIcon, color: 'text-warning-600' },
    { value: 'declined', label: 'Declined', icon: XMarkIcon, color: 'text-danger-600' },
    { value: 'busy', label: 'Busy', icon: ExclamationTriangleIcon, color: 'text-warning-600' },
    { value: 'no_answer', label: 'No Answer', icon: ClockIcon, color: 'text-gray-600' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b border-gray-200 ${
          isCallbackCall ? (
            callbackPriority === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
          ) : 'bg-white'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {existingCallLog ? 'Edit Call Log' : 'Log Call'}
                </h2>
                {isCallbackCall && (
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    callbackPriority === 'overdue' 
                      ? 'bg-red-100 text-red-800 animate-pulse' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {callbackPriority === 'overdue' ? '🚨 OVERDUE CALLBACK' : '⚠️ CALLBACK DUE'}
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-medium">{client.name}</p>
                <p>{client.phone}</p>
                {client.email && <p className="text-gray-500">{client.email}</p>}
                {isCallbackCall && (
                  <p className={`mt-1 font-medium ${
                    callbackPriority === 'overdue' ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    📞 This call was initiated from a scheduled callback notification
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Call Timer and Controls */}
          {!existingCallLog && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl font-mono font-bold text-gray-900">
                    {formatDuration(callDuration)}
                  </div>
                  {isCallActive && (
                    <div className="flex items-center text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                      Call in progress
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {!isCallActive ? (
                    <button
                      type="button"
                      onClick={startCall}
                      className="btn btn-success flex items-center"
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Start Call
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={endCall}
                      className="btn btn-danger flex items-center"
                    >
                      <StopIcon className="w-4 h-4 mr-2" />
                      End Call
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Call Type */}
          <div>
            <label className="label">Call Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="call_type"
                  value="outbound"
                  checked={formData.call_type === 'outbound'}
                  onChange={(e) => setFormData(prev => ({ ...prev, call_type: e.target.value as any }))}
                  className="mr-2"
                />
                Outbound
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="call_type"
                  value="inbound"
                  checked={formData.call_type === 'inbound'}
                  onChange={(e) => setFormData(prev => ({ ...prev, call_type: e.target.value as any }))}
                  className="mr-2"
                />
                Inbound
              </label>
            </div>
          </div>

          {/* Call Status */}
          <div>
            <label className="label">Call Status</label>
            <div className="grid grid-cols-2 gap-3">
              {callStatusOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.call_status === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="call_status"
                    value={option.value}
                    checked={formData.call_status === option.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, call_status: e.target.value as any }))}
                    className="sr-only"
                  />
                  <option.icon className={`w-5 h-5 mr-3 ${option.color}`} />
                  <span className="font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Call Duration (if not using timer) */}
          {existingCallLog && (
            <div>
              <label className="label">Call Duration (seconds)</label>
              <input
                type="number"
                min="0"
                value={formData.call_duration || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  call_duration: parseInt(e.target.value) || 0 
                }))}
                className="input"
                placeholder="Enter call duration in seconds"
              />
            </div>
          )}

          {/* Notes (Optional) */}
          <div>
            <label className="label">
              Call Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className={`input h-24 resize-none ${errors.notes ? 'border-danger-500' : ''}`}
              placeholder="Enter notes about this call (optional)..."
            />
            {errors.notes && (
              <p className="text-sm text-danger-600 mt-1">{errors.notes}</p>
            )}
          </div>

          {/* Callback Section */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="callback_requested"
                checked={formData.callback_requested}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  callback_requested: e.target.checked,
                  callback_time: e.target.checked ? prev.callback_time : ''
                }))}
                className="mr-3"
              />
              <label htmlFor="callback_requested" className="font-medium text-gray-900">
                Schedule Callback
              </label>
            </div>

            {formData.callback_requested && (
              <div className="space-y-3">
                {/* Quick Callback Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickCallback(1)}
                    className="btn btn-secondary btn-sm"
                  >
                    In 1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCallback(2)}
                    className="btn btn-secondary btn-sm"
                  >
                    In 2 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCallback(24)}
                    className="btn btn-secondary btn-sm"
                  >
                    Tomorrow
                  </button>
                </div>

                {/* Custom Callback Time */}
                <div>
                  <label className="label">Custom Callback Time</label>
                  <input
                    type="datetime-local"
                    value={formData.callback_time ? (() => {
                      // Convert UTC time to local datetime-local format
                      const date = new Date(formData.callback_time)
                      const offset = date.getTimezoneOffset()
                      const localDate = new Date(date.getTime() - offset * 60000)
                      return localDate.toISOString().slice(0, 16)
                    })() : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        // Convert local datetime-local to UTC
                        const localDate = new Date(e.target.value)
                        const offset = localDate.getTimezoneOffset()
                        const utcDate = new Date(localDate.getTime() + offset * 60000)
                        setFormData(prev => ({ 
                          ...prev, 
                          callback_time: utcDate.toISOString()
                        }))
                      } else {
                        setFormData(prev => ({ ...prev, callback_time: '' }))
                      }
                    }}
                    className={`input ${errors.callback_time ? 'border-danger-500' : ''}`}
                    min={(() => {
                      const now = new Date()
                      const offset = now.getTimezoneOffset()
                      const localNow = new Date(now.getTime() - offset * 60000)
                      return localNow.toISOString().slice(0, 16)
                    })()}
                  />
                  {errors.callback_time && (
                    <p className="text-sm text-danger-600 mt-1">{errors.callback_time}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Customer Feedback Section */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="has_feedback"
                checked={feedbackData.has_feedback}
                onChange={(e) => setFeedbackData(prev => ({ 
                  ...prev, 
                  has_feedback: e.target.checked
                }))}
                className="mr-3"
              />
              <label htmlFor="has_feedback" className="font-medium text-gray-900">
                Add Customer Feedback
              </label>
            </div>

            {feedbackData.has_feedback && (
              <div className="space-y-4">
                {/* Feedback Type */}
                <div>
                  <label className="label">Feedback Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'complaint', label: 'Complaint', icon: ExclamationTriangleIcon, color: 'red' },
                      { value: 'happy', label: 'Happy', icon: FaceSmileIcon, color: 'green' },
                      { value: 'suggestion', label: 'Suggestion', icon: LightBulbIcon, color: 'blue' },
                      { value: 'general', label: 'General', icon: ChatBubbleLeftIcon, color: 'gray' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          feedbackData.feedback_type === option.value
                            ? 'border-purple-500 bg-purple-100'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="feedback_type"
                          value={option.value}
                          checked={feedbackData.feedback_type === option.value}
                          onChange={(e) => setFeedbackData(prev => ({ 
                            ...prev, 
                            feedback_type: e.target.value as any,
                            feedback_subject: ''
                          }))}
                          className="sr-only"
                        />
                        <option.icon className={`w-5 h-5 mr-3 text-${option.color}-600`} />
                        <span className="font-medium">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Feedback Priority */}
                <div>
                  <label className="label">Priority</label>
                  <select
                    value={feedbackData.feedback_priority}
                    onChange={(e) => setFeedbackData(prev => ({ 
                      ...prev, 
                      feedback_priority: e.target.value as any 
                    }))}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Feedback Subject */}
                <div>
                  <label className="label">
                    Subject <span className="text-danger-500">*</span>
                  </label>
                  {feedbackData.feedback_type === 'general' ? (
                    <select
                      value={feedbackData.feedback_subject}
                      onChange={(e) => setFeedbackData(prev => ({ 
                        ...prev, 
                        feedback_subject: e.target.value 
                      }))}
                      className={`input ${errors.feedback_subject ? 'border-danger-500' : ''}`}
                    >
                      <option value="">Select a subject...</option>
                      <option value="Not interested">Not interested</option>
                      <option value="Possible Sale">Possible Sale</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={feedbackData.feedback_subject}
                      onChange={(e) => setFeedbackData(prev => ({ 
                        ...prev, 
                        feedback_subject: e.target.value 
                      }))}
                      className={`input ${errors.feedback_subject ? 'border-danger-500' : ''}`}
                      placeholder="Brief description of the feedback..."
                    />
                  )}
                  {errors.feedback_subject && (
                    <p className="text-sm text-danger-600 mt-1">{errors.feedback_subject}</p>
                  )}
                </div>

                {/* Feedback Notes */}
                <div>
                  <label className="label">
                    Feedback Notes <span className="text-danger-500">*</span>
                  </label>
                  <textarea
                    value={feedbackData.feedback_notes}
                    onChange={(e) => setFeedbackData(prev => ({ 
                      ...prev, 
                      feedback_notes: e.target.value 
                    }))}
                    className={`input h-20 resize-none ${errors.feedback_notes ? 'border-danger-500' : ''}`}
                    placeholder="Detailed feedback information..."
                  />
                  {errors.feedback_notes && (
                    <p className="text-sm text-danger-600 mt-1">{errors.feedback_notes}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : existingCallLog ? 'Update Call Log' : 'Save Call Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}