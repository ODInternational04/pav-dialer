'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Notification } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { throttledApiCall } from '@/lib/requestThrottle'
import { 
  BellIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  PhoneIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'callback'>('unread')

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        limit: '50',
        ...(filter === 'unread' && { isRead: 'false' }),
        ...(filter === 'callback' && { type: 'callback' }),
      })

      const data = await throttledApiCall(
        `/api/notifications?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        `notification-center-${filter}`,
        30000 // Cache for 30 seconds
      )

      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user, filter])

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications()
    }
  }, [isOpen, user, fetchNotifications])

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const token = localStorage.getItem('token')
      await throttledApiCall('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationIds,
        }),
      }, `mark-read-${notificationIds.join(',')}`);

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token')
      await throttledApiCall('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'markAllAsRead',
        }),
      }, 'mark-all-read');

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'callback':
        return PhoneIcon
      case 'reminder':
        return ClockIcon
      case 'system':
        return ExclamationTriangleIcon
      default:
        return BellIcon
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'callback':
        return 'text-blue-600'
      case 'reminder':
        return 'text-yellow-600'
      case 'system':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <BellIcon className="w-6 h-6 text-gray-700 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 mt-4">
            {[
              { key: 'unread', label: 'Unread' },
              { key: 'callback', label: 'Callbacks' },
              { key: 'all', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <div className="mt-4">
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications found'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)
                const iconColor = getNotificationColor(notification.type)
                const isOverdue = new Date(notification.scheduled_for) < new Date()

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${!notification.is_read ? 'bg-white' : 'bg-gray-100'}`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.scheduled_for)}
                            </span>
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead([notification.id])}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Mark as read"
                              >
                                <CheckIcon className="w-3 h-3 text-gray-600" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center mt-2 space-x-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            notification.type === 'callback' ? 'bg-blue-100 text-blue-800' :
                            notification.type === 'reminder' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.type}
                          </span>
                          
                          {notification.type === 'callback' && isOverdue && (
                            <span className="text-xs text-red-600 font-medium">
                              Overdue
                            </span>
                          )}
                          
                          {notification.clients && (
                            <span className="text-xs text-gray-500">
                              {notification.clients.name} - {notification.clients.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Toast Notification Component
interface ToastNotificationProps {
  notification: Notification
  onDismiss: () => void
  onAction?: () => void
}

export function ToastNotification({ notification, onDismiss, onAction }: ToastNotificationProps) {
  const Icon = getNotificationIcon(notification.type)
  const iconColor = getNotificationColor(notification.type)

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, 5000) // Auto dismiss after 5 seconds

    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start space-x-3">
          <div className="p-1 rounded-lg bg-gray-100">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {notification.message}
            </p>
            
            {onAction && notification.type === 'callback' && (
              <button
                onClick={onAction}
                className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Call Now
              </button>
            )}
          </div>
          
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <XMarkIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'callback':
      return PhoneIcon
    case 'reminder':
      return ClockIcon
    case 'system':
      return ExclamationTriangleIcon
    default:
      return BellIcon
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case 'callback':
      return 'text-blue-600'
    case 'reminder':
      return 'text-yellow-600'
    case 'system':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}