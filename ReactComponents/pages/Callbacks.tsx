import { useState, useEffect, useCallback } from 'react'
import { 
  User, 
  Calendar, 
  Clock, 
  Phone, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react'

interface Client {
  id: string
  box_number: string
  principal_key_holder: string
  telephone_cell?: string
  telephone_home?: string
  principal_key_holder_email_address?: string
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
  clients?: Client
  users?: CallbackUser
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

export default function Callbacks() {
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

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user?.role === 'admin'

  const fetchCallbacks = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // Call your API method - adjust based on your api.ts implementation
      const data = await window.api.getNotifications(currentPage, { type: 'callback' })
      
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
  }, [currentPage])

  useEffect(() => {
    fetchCallbacks()
  }, [fetchCallbacks])

  const markAsRead = async (notificationId: string) => {
    try {
      await window.api.markNotificationAsRead(notificationId)
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
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
      return <CheckCircle className="h-5 w-5 text-success-500" />
    } else if (new Date(notification.scheduled_for) < new Date()) {
      return <AlertTriangle className="h-5 w-5 text-warning-500" />
    } else {
      return <Clock className="h-5 w-5 text-primary-500" />
    }
  }

  const getStatusText = (notification: Notification) => {
    if (notification.is_sent) {
      return 'Completed'
    } else if (new Date(notification.scheduled_for) < new Date()) {
      return 'Overdue'
    } else {
      return 'Scheduled'
    }
  }

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isAdmin ? 'All Scheduled Callbacks' : 'My Scheduled Callbacks'}
        </h1>
        <p className="text-gray-600 mt-2">
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
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
            const isOverdue = !notification.is_sent && new Date(notification.scheduled_for) < new Date()
            
            return (
              <div
                key={notification.id}
                className={`card border-l-4 p-6 ${
                  isOverdue 
                    ? 'border-l-danger-500 bg-danger-50' 
                    : notification.is_read 
                    ? 'border-l-gray-300' 
                    : 'border-l-primary-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(notification)}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        notification.is_sent 
                          ? 'bg-success-100 text-success-800'
                          : isOverdue
                          ? 'bg-danger-100 text-danger-800'
                          : 'bg-primary-100 text-primary-800'
                      }`}>
                        {getStatusText(notification)}
                      </span>
                    </div>

                    {/* User Attribution for Admin */}
                    {isAdmin && notification.users && (
                      <div className="flex items-center gap-2 mb-3 p-3 bg-primary-50 rounded-md">
                        <User className="h-4 w-4 text-primary-600" />
                        <span className="text-sm font-medium text-primary-900">
                          Scheduled by: {notification.users.first_name} {notification.users.last_name}
                        </span>
                        <span className="text-xs text-primary-600">
                          ({notification.users.email})
                        </span>
                      </div>
                    )}

                    <p className="text-gray-700 mb-4">{notification.message}</p>

                    {client && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Client Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Name:</span>
                            <span className="ml-2 text-gray-900">{client.principal_key_holder}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Box Number:</span>
                            <span className="ml-2 text-gray-900">{client.box_number}</span>
                          </div>
                          {client.telephone_cell && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-700">Cell:</span>
                              <a 
                                href={`tel:${client.telephone_cell}`}
                                className="text-primary-600 hover:text-primary-800 font-medium"
                              >
                                {client.telephone_cell}
                              </a>
                            </div>
                          )}
                          {client.telephone_home && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-700">Home:</span>
                              <a 
                                href={`tel:${client.telephone_home}`}
                                className="text-primary-600 hover:text-primary-800 font-medium"
                              >
                                {client.telephone_home}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{scheduledDateTime.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{scheduledDateTime.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="btn btn-sm btn-outline"
                      >
                        Mark as Read
                      </button>
                    )}
                    {client?.telephone_cell && !notification.is_sent && (
                      <a
                        href={`tel:${client.telephone_cell}`}
                        className="btn btn-sm btn-primary"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call Now
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="card">
              <div className="flex items-center justify-between px-6 py-4">
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
                  <span className="px-4 py-2 text-sm font-medium">
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
  )
}
