'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CallLogModal from '@/components/modals/CallLogModal'
import { CreateCallLogRequest } from '@/types'
import { 
  BellIcon, 
  PhoneIcon, 
  CheckIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
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
  call_log_id?: string
  client?: {
    id: string
    name: string
    phone: string
    email?: string
    notes?: string
  }
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'callback' | 'read'>('all')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications?include_client=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    setActionLoading(notificationId)
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
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const markAllAsRead = async () => {
    setActionLoading('markAll')
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
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCallClient = (notification: Notification) => {
    if (notification.client) {
      setSelectedClient(notification.client)
      setShowCallModal(true)
      // Mark notification as read when user initiates call
      if (!notification.is_read) {
        markAsRead(notification.id)
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
        // Refresh notifications to show any new ones created
        fetchNotifications()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save call log')
        throw new Error('Failed to save call log')
      }
    } catch (error) {
      console.error('Error saving call log:', error)
      throw error
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'callback':
        return PhoneIcon
      case 'success':
        return CheckIcon
      case 'error':
        return ExclamationTriangleIcon
      case 'warning':
        return ExclamationTriangleIcon
      default:
        return InformationCircleIcon
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'callback':
        return 'text-orange-600 bg-orange-100'
      case 'success':
        return 'text-green-600 bg-green-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-blue-600 bg-blue-100'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read
      case 'callback':
        return notification.type === 'callback'
      case 'read':
        return notification.is_read
      default:
        return true
    }
  })

  const isCallbackDue = (notification: Notification) => {
    if (!notification.scheduled_for) return false
    return new Date(notification.scheduled_for) <= new Date()
  }

  const isCallbackSoon = (notification: Notification) => {
    if (!notification.scheduled_for) return false
    const scheduledTime = new Date(notification.scheduled_for)
    const now = new Date()
    const oneMinuteFromNow = new Date(now.getTime() + 60000) // 1 minute from now
    return scheduledTime <= oneMinuteFromNow && scheduledTime > now
  }

  useEffect(() => {
    fetchNotifications()
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              View and manage your notifications ({notifications.length} total)
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchNotifications}
              className="btn btn-outline"
            >
              Refresh
            </button>
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={markAllAsRead}
                disabled={actionLoading === 'markAll'}
                className="btn btn-primary"
              >
                {actionLoading === 'markAll' ? 'Marking...' : 'Mark All Read'}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex space-x-4">
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.is_read).length },
              { key: 'callback', label: 'Callbacks', count: notifications.filter(n => n.type === 'callback').length },
              { key: 'read', label: 'Read', count: notifications.filter(n => n.is_read).length }
            ].map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === filterOption.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="card p-8 text-center">
              <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications found
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'You have no notifications at this time.'
                  : `No ${filter} notifications found.`
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type)
              const isDue = isCallbackDue(notification)
              const isSoon = isCallbackSoon(notification)
              
              return (
                <div
                  key={notification.id}
                  className={`card p-6 transition-all ${
                    !notification.is_read ? 'ring-2 ring-blue-200 bg-blue-50' : ''
                  } ${isDue && notification.type === 'callback' ? 'ring-2 ring-red-300 bg-red-50 border-red-200' : ''} ${
                    isSoon && notification.type === 'callback' ? 'ring-2 ring-orange-300 bg-orange-50 border-orange-200' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-lg font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                            {isDue && notification.type === 'callback' && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                                OVERDUE - Call Now!
                              </span>
                            )}
                            {isSoon && notification.type === 'callback' && !isDue && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Due in 1 minute
                              </span>
                            )}
                          </h3>
                          <p className="text-gray-600 mt-1">
                            {notification.message}
                          </p>

                          {/* Client Information */}
                          {notification.client && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <h4 className="font-medium text-gray-900">Client Details:</h4>
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Name:</span> {notification.client.name}
                                </div>
                                <div>
                                  <span className="text-gray-500">Phone:</span> {notification.client.phone}
                                </div>
                                <div>
                                  <span className="text-gray-500">Email:</span> {notification.client.email || 'N/A'}
                                </div>
                                {notification.client.notes && (
                                  <div>
                                    <span className="text-gray-500">Notes:</span> {notification.client.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <ClockIcon className="w-4 h-4 mr-1" />
                              Created: {new Date(notification.created_at).toLocaleString()}
                            </div>
                            {notification.scheduled_for && (
                              <div className="flex items-center">
                                <ClockIcon className="w-4 h-4 mr-1" />
                                Scheduled: {new Date(notification.scheduled_for).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {/* Call Button for Callback Notifications */}
                          {notification.type === 'callback' && notification.client && (
                            <button
                              onClick={() => handleCallClient(notification)}
                              className={`btn ${
                                isDue ? 'btn-danger animate-pulse' : 
                                isSoon ? 'btn-warning' : 
                                'btn-primary'
                              }`}
                            >
                              <PhoneIcon className="w-4 h-4 mr-2" />
                              {isDue ? 'CALL NOW!' : isSoon ? 'Call Soon' : 'Call Client'}
                            </button>
                          )}

                          {/* Mark as Read Button */}
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              disabled={actionLoading === notification.id}
                              className="btn btn-outline btn-sm"
                            >
                              {actionLoading === notification.id ? (
                                'Marking...'
                              ) : (
                                <>
                                  <CheckIcon className="w-4 h-4 mr-1" />
                                  Mark Read
                                </>
                              )}
                            </button>
                          )}

                          {/* Read Status Indicator */}
                          <div className="text-xs">
                            {notification.is_read ? (
                              <span className="text-green-600 font-medium">Read</span>
                            ) : (
                              <span className="text-blue-600 font-medium">Unread</span>
                            )}
                          </div>
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

      {/* Call Log Modal */}
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