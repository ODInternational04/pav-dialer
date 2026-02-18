import { useState, useEffect } from 'react'
import { 
  Bell, 
  Phone, 
  Check, 
  Clock,
  AlertTriangle,
  Info,
  Trash2
} from 'lucide-react'

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
  client?: {
    id: string
    principal_key_holder: string
    telephone_cell: string
    telephone_home?: string
    email?: string
    box_number: string
  }
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'callback' | 'read'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      // Use your API method with client info included
      const data = await window.api.getNotifications(1, { include_client: true })
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    setActionLoading(notificationId)
    try {
      await window.api.markNotificationAsRead(notificationId)
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const markAllAsRead = async () => {
    setActionLoading('markAll')
    try {
      await window.api.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return
    
    setActionLoading(notificationId)
    try {
      await window.api.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'callback':
        return <Phone className="w-5 h-5" />
      case 'success':
        return <Check className="w-5 h-5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />
      case 'error':
        return <AlertTriangle className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'callback':
        return 'bg-primary-100 text-primary-600'
      case 'success':
        return 'bg-success-100 text-success-600'
      case 'warning':
        return 'bg-warning-100 text-warning-600'
      case 'error':
        return 'bg-danger-100 text-danger-600'
      default:
        return 'bg-secondary-100 text-secondary-600'
    }
  }

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notif.is_read
    if (filter === 'read') return notif.is_read
    if (filter === 'callback') return notif.type === 'callback'
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || actionLoading === 'markAll'}
          className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === 'markAll' ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              Marking...
            </span>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Mark All as Read
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'unread' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button
          onClick={() => setFilter('callback')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'callback' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Callbacks
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'read' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Read
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No notifications
          </h3>
          <p className="text-gray-600">
            {filter === 'unread' && 'You have no unread notifications'}
            {filter === 'callback' && 'No callback notifications found'}
            {filter === 'read' && 'No read notifications found'}
            {filter === 'all' && 'You have no notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`card p-5 ${
                !notification.is_read ? 'border-l-4 border-l-primary-500 bg-primary-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-2"></span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-3">{notification.message}</p>

                  {notification.client && (
                    <div className="bg-gray-100 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Client:</span>
                          <span className="ml-2 text-gray-900">{notification.client.principal_key_holder}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Box:</span>
                          <span className="ml-2 text-gray-900">{notification.client.box_number}</span>
                        </div>
                        {notification.client.telephone_cell && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-600" />
                            <a 
                              href={`tel:${notification.client.telephone_cell}`}
                              className="text-primary-600 hover:text-primary-800 font-medium"
                            >
                              {notification.client.telephone_cell}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(notification.created_at).toLocaleString()}</span>
                      </div>
                      {notification.scheduled_for && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Scheduled:</span>
                          <span>{new Date(notification.scheduled_for).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          disabled={actionLoading === notification.id}
                          className="btn btn-sm btn-outline"
                        >
                          {actionLoading === notification.id ? 'Marking...' : 'Mark Read'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        disabled={actionLoading === notification.id}
                        className="btn btn-sm btn-outline text-danger-600 border-danger-300 hover:bg-danger-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
