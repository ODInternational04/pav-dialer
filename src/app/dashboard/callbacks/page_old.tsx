'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import CallLogModal from '@/components/modals/CallLogModal'
import { CreateCallLogRequest } from '@/types'
import { 
  PhoneIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface Notification {
  id: string
  type: 'callback' | 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  created_at: string
  is_read: boolean
  is_sent: boolean
  scheduled_for?: string
  client_id?: string
  clients?: {
    id: string
    principal_key_holder: string
    telephone_cell: string
    telephone_home?: string
    email?: string
    box_number: string
  }
}

interface ToastNotification {
  id: string
  type: 'callback' | 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  duration?: number
}

export default function CallbacksPage() {
  const { user } = useAuth()
  const [callbacks, setCallbacks] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  const fetchCallbacks = async (showRefreshIndicator = false) => {
    if (!user) return
    
    try {
      if (showRefreshIndicator) setRefreshing(true)
      
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications?include_client=true&type=callback', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Filter only callback notifications
        const callbackNotifications = (data.notifications || []).filter(
          (notif: Notification) => notif.type === 'callback'
        )
        setCallbacks(callbackNotifications)
      }
    } catch (error) {
      console.error('Error fetching callbacks:', error)
    } finally {
      setLoading(false)
      if (showRefreshIndicator) setRefreshing(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setCallbacks(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleCallClient = (callback: Notification) => {
    if (callback.clients) {
      setSelectedClient(callback.clients)
      setShowCallModal(true)
      
      // Mark notification as read when user initiates call
      if (!callback.is_read) {
        markAsRead(callback.id)
      }
    }
  }

  const handleSaveCallLog = async (callLogData: CreateCallLogRequest) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/call-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(callLogData),
      })

      if (response.ok) {
        // Remove the notification after successful callback call
        if (selectedClient) {
          await removeNotificationForClient(selectedClient.id)
        }
        
        // Close the modal
        setShowCallModal(false)
        setSelectedClient(null)
        
        // Refresh callbacks to show updated list
        fetchCallbacks()
        
        // Show success message
        showToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Call Logged Successfully',
          message: 'The call has been logged and callback notification removed.',
          duration: 5000
        })
      } else {
        throw new Error('Failed to save call log')
      }
    } catch (error) {
      console.error('Error saving call log:', error)
      showToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: 'Failed to save call log. Please try again.',
        duration: 5000
      })
      throw error
    }
  }

  const removeNotificationForClient = async (clientId: string) => {
    try {
      const token = localStorage.getItem('token')
      
      // Find notifications for this client
      const clientNotifications = callbacks.filter(n => 
        n.client_id === clientId && n.type === 'callback'
      )
      
      if (clientNotifications.length > 0) {
        const notificationIds = clientNotifications.map(n => n.id)
        
        // Delete the notifications
        const response = await fetch('/api/notifications', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notificationIds }),
        })
        
        if (response.ok) {
          console.log('Callback notifications removed after successful call')
        }
      }
    } catch (error) {
      console.error('Error removing notifications:', error)
    }
  }

  const showToast = (toast: ToastNotification) => {
    setToasts(prev => [...prev, toast])
    
    // Auto-remove toast after duration
    const duration = toast.duration || 5000
    setTimeout(() => {
      removeToast(toast.id)
    }, duration)
  }

  const removeToast = (toastId: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId))
  }

  const isCallbackUrgent = (callback: Notification) => {
    if (!callback.scheduled_for) return false
    
    const now = new Date()
    const scheduledTime = new Date(callback.scheduled_for)
    const oneMinuteFromNow = new Date(now.getTime() + 60000)
    
    return scheduledTime <= oneMinuteFromNow
  }

  const isCallbackOverdue = (callback: Notification) => {
    if (!callback.scheduled_for) return false
    
    const now = new Date()
    const scheduledTime = new Date(callback.scheduled_for)
    
    return scheduledTime <= now
  }

  const getStatusBadge = (callback: Notification) => {
    const isOverdue = isCallbackOverdue(callback)
    const isUrgent = isCallbackUrgent(callback)
    
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
          🚨 OVERDUE
        </span>
      )
    }
    
    if (isUrgent) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          ⏰ DUE SOON
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        📅 SCHEDULED
      </span>
    )
  }

  // Poll for callbacks every 30 seconds
  useEffect(() => {
    if (user) {
      fetchCallbacks()
      const interval = setInterval(() => fetchCallbacks(), 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Callbacks</h1>
              <p className="text-gray-600">Manage your scheduled callback notifications</p>
            </div>
          </div>
          
          <button
            onClick={() => fetchCallbacks(true)}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Callbacks</p>
                <p className="text-2xl font-bold text-gray-900">{callbacks.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <PhoneIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {callbacks.filter(cb => isCallbackOverdue(cb)).length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-2xl font-bold text-orange-600">
                  {callbacks.filter(cb => isCallbackUrgent(cb) && !isCallbackOverdue(cb)).length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ClockIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-gray-900">
                  {callbacks.filter(cb => !cb.is_read).length}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <CheckIcon className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Callbacks List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Callbacks</h2>
            <p className="text-sm text-gray-600 mt-1">
              Click on any callback to view details or make the call
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading callbacks...</p>
              </div>
            ) : callbacks.length === 0 ? (
              <div className="p-8 text-center">
                <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No callbacks</h3>
                <p className="text-gray-600">You don't have any callback notifications at the moment.</p>
              </div>
            ) : (
              callbacks.map((callback) => {
                const isOverdue = isCallbackOverdue(callback)
                const isUrgent = isCallbackUrgent(callback)
                
                return (
                  <div
                    key={callback.id}
                    className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                      isOverdue ? 'bg-red-50 border-l-4 border-l-red-500' :
                      isUrgent ? 'bg-orange-50 border-l-4 border-l-orange-500' :
                      !callback.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleCallClient(callback)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {callback.title}
                            </h3>
                            {getStatusBadge(callback)}
                            {!callback.is_read && (
                              <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
                                New
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCallClient(callback)
                            }}
                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                              isOverdue ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' :
                              isUrgent ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                              'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <PhoneIcon className="w-5 h-5 inline mr-2" />
                            {isOverdue ? 'CALL NOW' : isUrgent ? 'Call Soon' : 'Call Client'}
                          </button>
                        </div>

                        {/* Message */}
                        <p className="text-gray-600">{callback.message}</p>

                        {/* Client Information */}
                        {callback.clients && (
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {callback.clients.principal_key_holder.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">
                                  {callback.clients.principal_key_holder}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Box: {callback.clients.box_number}
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center space-x-2 text-gray-700">
                                <PhoneIcon className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{callback.clients.telephone_cell}</span>
                              </div>
                              {callback.clients.telephone_home && (
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <span className="w-4 h-4 flex items-center justify-center text-gray-400">📞</span>
                                  <span>{callback.clients.telephone_home}</span>
                                </div>
                              )}
                              {callback.clients.email && (
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <span className="w-4 h-4 flex items-center justify-center text-gray-400">📧</span>
                                  <span className="truncate">{callback.clients.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Timing Information */}
                        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-200">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <ClockIcon className="w-4 h-4 mr-1" />
                              Created: {new Date(callback.created_at).toLocaleString()}
                            </span>
                            {callback.scheduled_for && (
                              <span className={`flex items-center font-medium ${
                                isOverdue ? 'text-red-600' :
                                isUrgent ? 'text-orange-600' :
                                'text-blue-600'
                              }`}>
                                📅 Scheduled: {new Date(callback.scheduled_for).toLocaleString()}
                                {isOverdue && ' (OVERDUE!)'}
                                {isUrgent && !isOverdue && ' (Due Soon)'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ease-in-out`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{toast.title}</h4>
                <p className="text-sm mt-1 opacity-90">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-white hover:text-gray-200"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Call Modal */}
      {showCallModal && selectedClient && (
        <CallLogModal
          isOpen={showCallModal}
          onClose={() => {
            setShowCallModal(false)
            setSelectedClient(null)
          }}
          client={selectedClient}
          onSave={handleSaveCallLog}
        />
      )}
    </DashboardLayout>
  )
}