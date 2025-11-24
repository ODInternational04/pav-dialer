'use client'
import { useState, useEffect } from 'react'
import { BellIcon, XMarkIcon, CheckIcon, PhoneIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import CallLogModal from '@/components/modals/CallLogModal'
import { CreateCallLogRequest } from '@/types'
import { throttledApiCall } from '@/lib/requestThrottle'

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

export default function NotificationCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [showCallModal, setShowCallModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)

  const fetchNotifications = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const data = await throttledApiCall(
        '/api/notifications?include_client=true',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        },
        'notifications-with-clients',
        30000 // Cache for 30 seconds
      )

      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
      
      // Check for callback notifications that are due soon or overdue
      const now = new Date()
      const oneMinuteFromNow = new Date(now.getTime() + 60000) // 1 minute from now
      
      // Find callbacks that are due within 1 minute or overdue
      const urgentCallbacks = (data.notifications || []).filter((notif: Notification) => 
        notif.type === 'callback' && 
        !notif.is_read &&
        notif.scheduled_for &&
        new Date(notif.scheduled_for) <= oneMinuteFromNow
      )

      // Show toast for callbacks that are due now (not just 1 minute warning)
      const newCallbacks = urgentCallbacks.filter((notif: Notification) => 
        !notif.is_sent &&
        new Date(notif.scheduled_for!) <= now
      )

      // Show toast notifications for due callbacks (only if not already sent)
      newCallbacks.forEach((notif: Notification) => {
        showToast({
          id: notif.id,
          type: 'callback',
          title: notif.title,
          message: notif.message,
          duration: 10000 // 10 seconds for callback notifications
        })
      })

      // Mark displayed callback notifications as sent to prevent duplicates
      if (newCallbacks.length > 0) {
        markNotificationsAsSent(newCallbacks.map((n: Notification) => n.id))
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markNotificationsAsSent = async (notificationIds: string[]) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'markAsSent',
          notificationIds
        })
      })
    } catch (error) {
      console.error('Error marking notifications as sent:', error)
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
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'markAllAsRead'
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    } finally {
      setLoading(false)
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

  const handleCallClient = async (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent marking as read
    
    if (notification.clients) {
      // Simple workflow: Always open call modal like clicking phone emoji
      // The modal will handle the 3CX call and callback context
      
      setSelectedClient(notification.clients)
      setShowCallModal(true)
      setIsOpen(false) // Close notification dropdown
      
      // Mark notification as read when user initiates call
      if (!notification.is_read) {
        markAsRead(notification.id)
      }
      
      // Store callback context for the modal
      if (notification.type === 'callback') {
        const isOverdue = isCallbackOverdue(notification)
        localStorage.setItem('current_callback_context', JSON.stringify({
          notificationId: notification.id,
          priority: isOverdue ? 'overdue' : 'urgent',
          clientId: notification.clients.id,
          clientName: notification.clients.principal_key_holder,
          phoneNumber: notification.clients.telephone_cell
        }))
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
        const callLog = await response.json()
        
        // Remove/delete the notification after successful callback call
        if (selectedClient) {
          await removeNotificationForClient(selectedClient.id)
        }
        
        // Close the modal
        setShowCallModal(false)
        setSelectedClient(null)
        
        // Refresh notifications to show updated list
        fetchNotifications()
        
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

  // Enhanced function to remove notification after callback call
  const removeNotificationForClient = async (clientId: string) => {
    try {
      const token = localStorage.getItem('token')
      
      // Find all callback notifications for this client (both read and unread)
      const clientNotifications = notifications.filter(n => 
        n.client_id === clientId && n.type === 'callback'
      )
      
      if (clientNotifications.length > 0) {
        const notificationIds = clientNotifications.map(n => n.id)
        
        console.log(`🗑️ Removing ${notificationIds.length} callback notifications for client ${clientId}:`, notificationIds)
        
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
          console.log('✅ Callback notifications removed successfully after call completion')
          
          // Update local state immediately
          setNotifications(prev => 
            prev.filter(n => !notificationIds.includes(n.id))
          )
          
          // Update unread count
          const removedUnreadCount = clientNotifications.filter(n => !n.is_read).length
          setUnreadCount(prev => Math.max(0, prev - removedUnreadCount))
        } else {
          console.error('❌ Failed to remove callback notifications:', await response.json())
        }
      } else {
        console.log('ℹ️ No callback notifications found for client', clientId)
      }
    } catch (error) {
      console.error('Error removing notifications:', error)
    }
  }

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'callback':
        return '📞'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  const getToastColor = (type: string) => {
    switch (type) {
      case 'callback':
        return 'bg-orange-500'
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'callback':
        return '📞'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return '🔔'
    }
  }

  const isCallbackUrgent = (notification: Notification) => {
    if (notification.type !== 'callback' || !notification.scheduled_for) return false
    
    const now = new Date()
    const scheduledTime = new Date(notification.scheduled_for)
    const oneMinuteFromNow = new Date(now.getTime() + 60000)
    
    // Return true if callback is due within 1 minute or overdue
    return scheduledTime <= oneMinuteFromNow
  }

  const isCallbackOverdue = (notification: Notification) => {
    if (notification.type !== 'callback' || !notification.scheduled_for) return false
    
    const now = new Date()
    const scheduledTime = new Date(notification.scheduled_for)
    
    // Return true if callback is overdue
    return scheduledTime <= now
  }

  // Check if there are any urgent notifications
  const hasUrgentNotifications = notifications.some(notification => 
    isCallbackUrgent(notification) && !notification.is_read
  )

  // Poll for notifications every 30 seconds
  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      
      // Listen for callback deletion events
      const handleCallbackDeletion = (event: CustomEvent) => {
        console.log('🔄 Callback notifications deleted, refreshing notification center:', event.detail)
        fetchNotifications() // Refresh notifications immediately
      }
      
      window.addEventListener('callbackNotificationsDeleted', handleCallbackDeletion as EventListener)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('callbackNotificationsDeleted', handleCallbackDeletion as EventListener)
      }
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <BellIcon className={`w-6 h-6 ${hasUrgentNotifications ? 'text-red-600' : ''}`} />
          {unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ${
              hasUrgentNotifications ? 'bg-red-600 animate-pulse' : 'bg-red-500'
            }`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BellIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    {loading ? 'Marking...' : 'Mark all read'}
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BellIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => {
                  const isUrgent = isCallbackUrgent(notification)
                  const isOverdue = isCallbackOverdue(notification)
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                        isOverdue ? 'bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100' :
                        isUrgent ? 'bg-orange-50 border-l-4 border-l-orange-500 hover:bg-orange-100' :
                        !notification.is_read ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                            {isOverdue && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                                OVERDUE
                              </span>
                            )}
                            {isUrgent && !isOverdue && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                DUE SOON
                              </span>
                            )}
                          </h4>
                          
                          {/* Call Button for Callback Notifications */}
                          {notification.type === 'callback' && notification.clients && (
                            <button
                              onClick={(e) => handleCallClient(notification, e)}
                              className={`ml-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                                isOverdue ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border-2 border-red-700 relative overflow-hidden' :
                                isUrgent ? 'bg-orange-600 hover:bg-orange-700 text-white border-2 border-orange-700' :
                                'bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700'
                              }`}
                              title={`Call ${notification.clients.principal_key_holder}`}
                            >
                              <PhoneIcon className="w-4 h-4 inline mr-2" />
                              {isOverdue ? (
                                <>
                                  CALL NOW
                                  <span className="absolute inset-0 bg-white opacity-20 animate-ping"></span>
                                </>
                              ) : isUrgent ? 'Call Soon' : 'Call'}
                            </button>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>

                        {/* Client Information for Callback Notifications */}
                        {notification.type === 'callback' && notification.clients && (
                          <div className="mt-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 text-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {notification.clients.principal_key_holder.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                  {notification.clients.principal_key_holder}
                                </div>
                                <div className="text-gray-600 text-xs">
                                  Box: {notification.clients.box_number}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2 text-gray-700">
                                <PhoneIcon className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{notification.clients.telephone_cell}</span>
                              </div>
                              {notification.clients.telephone_home && (
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <span className="w-4 h-4 flex items-center justify-center text-gray-400 text-xs">📞</span>
                                  <span>{notification.clients.telephone_home}</span>
                                </div>
                              )}
                              {notification.clients.email && (
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <span className="w-4 h-4 flex items-center justify-center text-gray-400 text-xs">📧</span>
                                  <span className="truncate">{notification.clients.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            Created: {new Date(notification.created_at).toLocaleString()}
                          </span>
                          {!notification.is_read && (
                            <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
                              New
                            </span>
                          )}
                        </div>
                        {notification.scheduled_for && (
                          <div className={`mt-2 flex items-center text-xs font-medium px-3 py-2 rounded-lg ${
                            isOverdue ? 'bg-red-100 text-red-800 border border-red-200' :
                            isUrgent ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            <span className="mr-2">
                              {isOverdue ? '🚨' : isUrgent ? '⏰' : '📅'}
                            </span>
                            <span>
                              Scheduled: {new Date(notification.scheduled_for).toLocaleString()}
                              {isOverdue && ' (OVERDUE!)'}
                              {isUrgent && !isOverdue && ' (Due Soon)'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  )
                })
              )}
            </div>

            {notifications.length > 10 && (
              <div className="p-4 border-t border-gray-200 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  View all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${getToastColor(toast.type)} text-white p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ease-in-out`}
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

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

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
    </>
  )
}