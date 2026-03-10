'use client'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import CallLogModal from '@/components/modals/CallLogModal'
import ThreeCXCallButton from '@/components/ThreeCXCallButton'
import { Client as ClientType, CreateCallLogRequest } from '@/types'
import { threeCXService } from '@/lib/3cx'
import { UserIcon, CalendarIcon, ClockIcon, PhoneIcon, CheckCircleIcon, ExclamationTriangleIcon, PhoneArrowUpRightIcon } from '@heroicons/react/24/outline'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  notes?: string
}

interface CallLog {
  id: string
  call_status: string
  notes?: string
  user_id: string
  users?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

interface CallbackUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  scheduled_for: string
  is_sent: boolean
  is_read: boolean
  created_at: string
  client_id?: string
  call_log_id?: string
  clients?: Client
  call_logs?: CallLog
  users?: CallbackUser
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

export default function CallbacksPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [showCallModal, setShowCallModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null)
  const [callbackContext, setCallbackContext] = useState<{ priority: string, notificationId: string } | null>(null)
  const [showReschedulePrompt, setShowReschedulePrompt] = useState(false)
  const [failedCallData, setFailedCallData] = useState<{ status: string; notificationId: string; clientData?: ClientType } | null>(null)

  // Debug state changes
  useEffect(() => {
    console.log('🎭 State update - showReschedulePrompt:', showReschedulePrompt, 'failedCallData:', failedCallData)
  }, [showReschedulePrompt, failedCallData])

  const fetchCallbacks = React.useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      setLoading(true)
      setError('')

      // Use admin_view=true for admin users to see all callbacks
      const adminView = user?.role === 'admin'
      const url = `/api/notifications?page=${currentPage}&limit=10&type=callback&include_client=true${adminView ? '&admin_view=true' : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch callbacks')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setPagination({
        page: data.page,
        limit: data.limit,
        totalCount: data.totalCount,
        totalPages: data.totalPages
      })
    } catch (err) {
      console.error('Error fetching callbacks:', err)
      setError('Failed to load callbacks')
    } finally {
      setLoading(false)
    }
  }, [currentPage, user?.role])

  useEffect(() => {
    fetchCallbacks()
    
    // Listen for callback deletion events
    const handleCallbackDeletion = (event: CustomEvent) => {
      console.log('🔄 Callback notifications deleted, refreshing callbacks page:', event.detail)
      fetchCallbacks() // Refresh callbacks immediately
    }
    
    window.addEventListener('callbackNotificationsDeleted', handleCallbackDeletion as EventListener)
    
    return () => {
      window.removeEventListener('callbackNotificationsDeleted', handleCallbackDeletion as EventListener)
    }
  }, [fetchCallbacks])

  const markAsRead = async (notificationId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_read: true })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        )
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const handleCallCallback = (notification: Notification) => {
    if (!notification.clients) return

    // Determine callback priority based on scheduled time
    const now = new Date()
    const scheduled = new Date(notification.scheduled_for)
    const isPastDue = scheduled < now
    const priority = isPastDue ? 'overdue' : 'pending'

    // Store callback context for CallLogModal
    const context = {
      priority,
      notificationId: notification.id,
      callbackTime: notification.scheduled_for
    }
    localStorage.setItem('current_callback_context', JSON.stringify(context))
    setCallbackContext({ priority, notificationId: notification.id })

    // Convert to ClientType format for modal
    const clientData: ClientType = {
      id: notification.clients.id,
      name: notification.clients.name,
      phone: notification.clients.phone,
      email: notification.clients.email || null,
      notes: notification.clients.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user?.id || '',
      last_updated_by: user?.id || '',
    }

    // Automatically initiate the call
    try {
      threeCXService.initiateCall(clientData.id, clientData.phone)
      console.log('Call initiated for callback:', clientData.phone)
    } catch (error) {
      console.error('Failed to initiate call:', error)
    }

    setSelectedClient(clientData)
    setShowCallModal(true)
  }

  const handleSaveCallLog = async (callLog: CreateCallLogRequest) => {
    console.log('💾 Saving call log from callback:', callLog)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/call-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(callLog),
      })

      if (response.ok) {
        const callStatus = callLog.call_status?.toLowerCase()
        console.log('📊 Call status received:', callStatus)
        console.log('🔔 Callback context:', callbackContext)
        
        // Clear callback context
        localStorage.removeItem('current_callback_context')
        
        // Only mark as complete if call was successful
        if (callStatus === 'completed') {
          console.log('✅ Call completed - marking callback as done')
          // Mark notification as read - callback completed successfully
          if (callbackContext) {
            await markAsRead(callbackContext.notificationId)
          }
          setCallbackContext(null)
          setShowCallModal(false)
          setSelectedClient(null)
        } else if (callStatus === 'busy' || callStatus === 'missed' || callStatus === 'declined') {
          console.log('⚠️ Call unsuccessful - showing reschedule prompt')
          // Call unsuccessful - prompt for rescheduling
          setFailedCallData({
            status: callStatus,
            notificationId: callbackContext?.notificationId || '',
            clientData: selectedClient || undefined
          })
          setShowCallModal(false)
          setShowReschedulePrompt(true)
          console.log('📋 Failed call data set:', {
            status: callStatus,
            notificationId: callbackContext?.notificationId,
            hasClientData: !!selectedClient
          })
        } else {
          console.log('❓ Unknown status - completing normally:', callStatus)
          // Unknown status - complete normally
          if (callbackContext) {
            await markAsRead(callbackContext.notificationId)
          }
          setCallbackContext(null)
          setShowCallModal(false)
          setSelectedClient(null)
        }
        
        // Refresh callbacks list
        await fetchCallbacks()
      } else {
        const error = await response.json()
        alert(error.details || error.error || 'Failed to save call log')
      }
    } catch (error) {
      console.error('Error saving call log:', error)
      alert('Error saving call log')
    }
  }

  const handleCloseCallModal = () => {
    // Clear callback context
    localStorage.removeItem('current_callback_context')
    setCallbackContext(null)
    setShowCallModal(false)
    setSelectedClient(null)
  }

  const handleRescheduleCallback = () => {
    console.log('Reschedule clicked, failedCallData:', failedCallData)
    console.log('Available notifications:', notifications.length)
    
    // Close reschedule prompt
    setShowReschedulePrompt(false)
    
    // Try to get client data from failedCallData first (more reliable)
    let clientData = failedCallData?.clientData
    
    // If not available, try to find from notifications (fallback)
    if (!clientData) {
      const notification = notifications.find(n => n.id === failedCallData?.notificationId)
      console.log('Found notification:', notification)
      
      if (notification && notification.clients) {
        clientData = {
          id: notification.clients.id,
          name: notification.clients.name,
          phone: notification.clients.phone,
          email: notification.clients.email || null,
          notes: notification.clients.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id || '',
          last_updated_by: user?.id || '',
        }
      }
    }
    
    console.log('Client data for reschedule:', clientData)
    
    if (clientData && failedCallData?.notificationId) {
      // Set context without initiating call
      const context = {
        priority: 'normal',
        notificationId: failedCallData.notificationId,
        callbackTime: new Date().toISOString()
      }
      
      localStorage.setItem('current_callback_context', JSON.stringify(context))
      setCallbackContext({ priority: 'normal', notificationId: failedCallData.notificationId })
      setSelectedClient(clientData)
      setShowCallModal(true)
      console.log('Modal state set - should open now')
    } else {
      console.error('Unable to find client data for rescheduling')
      alert('Unable to reschedule: callback data not found. Please refresh the page and try again.')
    }
    
    setFailedCallData(null)
  }

  const handleDismissCallback = async () => {
    // Mark the callback as read (dismissed)
    if (failedCallData?.notificationId) {
      await markAsRead(failedCallData.notificationId)
      await fetchCallbacks()
    }
    
    setShowReschedulePrompt(false)
    setFailedCallData(null)
    setCallbackContext(null)
    setSelectedClient(null)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusIcon = (notification: Notification) => {
    if (notification.is_sent) {
      return <CheckCircleIcon className="h-5 w-5 text-success-500" />
    } else if (new Date(notification.scheduled_for) < new Date()) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />
    } else {
      return <ClockIcon className="h-5 w-5 text-primary-500" />
    }
  }

  const getStatusText = (notification: Notification) => {
    if (notification.is_sent) {
      return 'Sent'
    } else if (new Date(notification.scheduled_for) < new Date()) {
      return 'Pending'
    } else {
      return 'Scheduled'
    }
  }

  const isAdmin = user?.role === 'admin'

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'All Scheduled Callbacks' : 'My Scheduled Callbacks'}
          </h1>
          <p className="text-gray-600">
            {isAdmin 
              ? 'Monitor and manage all callback schedules across the system' 
              : 'Manage your scheduled client callbacks'
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="card p-8 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No callbacks scheduled</h3>
            <p className="text-gray-500">
              {isAdmin 
                ? 'No callbacks have been scheduled by any users yet.' 
                : 'You haven\'t scheduled any callbacks yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const scheduledDateTime = formatDateTime(notification.scheduled_for)
              const client = notification.clients
              
              return (
                <div
                  key={notification.id}
                  className={`card border-l-4 p-6 ${
                    notification.is_read ? 'border-l-gray-300' : 'border-l-primary-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusIcon(notification)}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          notification.is_sent 
                            ? 'bg-success-100 text-success-800'
                            : new Date(notification.scheduled_for) < new Date()
                            ? 'bg-warning-100 text-warning-800'
                            : 'bg-primary-100 text-primary-800'
                        }`}>
                          {getStatusText(notification)}
                        </span>
                      </div>

                      {/* User Attribution for Admin */}
                      {isAdmin && notification.users && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-primary-50 rounded-md">
                          <UserIcon className="h-4 w-4 text-primary-600" />
                          <span className="text-sm font-medium text-primary-800">
                            Scheduled by: {notification.users.first_name} {notification.users.last_name}
                          </span>
                          <span className="text-xs text-primary-600">
                            ({notification.users.email})
                          </span>
                        </div>
                      )}

                      <p className="text-gray-700 mb-4">{notification.message}</p>

                      {client && (
                        <div className="bg-gray-50 rounded-md p-4 mb-4">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <UserIcon className="h-4 w-4" />
                            Client Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Name:</span>
                              <span className="ml-2 text-gray-900">{client.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <PhoneIcon className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-700">Phone:</span>
                              <span className="text-gray-900">{client.phone}</span>
                            </div>
                            {client.email && (
                              <div className="md:col-span-2">
                                <span className="font-medium text-gray-700">Email:</span>
                                <span className="ml-2 text-gray-900">{client.email}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Call Action Button */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleCallCallback(notification)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                            >
                              <PhoneArrowUpRightIcon className="h-5 w-5" />
                              <span>Call Client (Callback)</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{scheduledDateTime.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{scheduledDateTime.time}</span>
                        </div>
                      </div>
                    </div>

                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="ml-4 text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="card">
                <div className="flex items-center justify-between px-6 py-3">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                    {pagination.totalCount} callbacks
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                      disabled={currentPage === pagination.totalPages}
                      className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call Log Modal for Callback Calls */}
      {showCallModal && selectedClient && (
        <CallLogModal
          isOpen={showCallModal}
          onClose={handleCloseCallModal}
          client={selectedClient}
          onSave={handleSaveCallLog}
        />
      )}

      {/* Reschedule Prompt Modal */}
      {showReschedulePrompt && failedCallData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-warning-100 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-warning-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Call Unsuccessful</h3>
                <p className="text-sm text-gray-600">
                  Call status: <span className="font-medium capitalize">{failedCallData.status}</span>
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 leading-relaxed">
                The callback attempt was logged as <strong>{failedCallData.status}</strong>. 
                Would you like to reschedule this callback for another time, or mark it as complete?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRescheduleCallback}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <CalendarIcon className="h-5 w-5" />
                Reschedule Callback
              </button>
              <button
                onClick={handleDismissCallback}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Mark Complete
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              The call log has been saved with the call status
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}