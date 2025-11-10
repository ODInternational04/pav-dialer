'use client'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { UserIcon, CalendarIcon, ClockIcon, PhoneIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Client {
  id: string
  box_number: string
  principal_key_holder: string
  telephone_cell?: string
  telephone_home?: string
  principal_key_holder_email_address?: string
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
                              <span className="ml-2 text-gray-900">{client.principal_key_holder}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Box Number:</span>
                              <span className="ml-2 text-gray-900">{client.box_number}</span>
                            </div>
                            {client.telephone_cell && (
                              <div className="flex items-center gap-2">
                                <PhoneIcon className="h-4 w-4 text-gray-600" />
                                <span className="font-medium text-gray-700">Cell:</span>
                                <span className="text-gray-900">{client.telephone_cell}</span>
                              </div>
                            )}
                            {client.telephone_home && (
                              <div className="flex items-center gap-2">
                                <PhoneIcon className="h-4 w-4 text-gray-600" />
                                <span className="font-medium text-gray-700">Home:</span>
                                <span className="text-gray-900">{client.telephone_home}</span>
                              </div>
                            )}
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
    </DashboardLayout>
  )
}