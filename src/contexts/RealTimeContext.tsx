'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { Notification } from '@/types'
import { ToastNotification } from '@/components/notifications/NotificationCenter'
import { throttledApiCall, debounce } from '@/lib/requestThrottle'

interface RealTimeContextType {
  pendingNotifications: Notification[]
  refreshTrigger: number
  triggerRefresh: () => void
  isConnected: boolean
  lastUpdate: Date | null
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined)

export const useRealTime = () => {
  const context = useContext(RealTimeContext)
  if (context === undefined) {
    throw new Error('useRealTime must be used within a RealTimeProvider')
  }
  return context
}

interface RealTimeProviderProps {
  children: React.ReactNode
}

export const RealTimeProvider: React.FC<RealTimeProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [pendingNotifications, setPendingNotifications] = useState<Notification[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [activeToasts, setActiveToasts] = useState<Notification[]>([])

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const checkForUpdates = useCallback(async () => {
    if (!user) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Use throttled API call for notifications
      const notificationsData = await throttledApiCall(
        '/api/notifications?showPending=true&limit=10',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        'realtime-notifications',
        60000 // Cache for 1 minute
      )

      const newNotifications = notificationsData.notifications || []
      
      // Find new notifications that haven't been shown as toast
      const existingIds = pendingNotifications.map(n => n.id)
      const reallyNewNotifications = newNotifications.filter(
        (n: Notification) => !existingIds.includes(n.id) && !n.is_sent
      )

      if (reallyNewNotifications.length > 0) {
        // Show toast notifications for new notifications
        reallyNewNotifications.forEach((notification: Notification) => {
          if (notification.type === 'callback' && new Date(notification.scheduled_for) <= new Date()) {
            setActiveToasts(prev => [...prev, notification])
          }
        })

        // Mark notifications as sent (non-blocking)
        if (reallyNewNotifications.length > 0) {
          throttledApiCall('/api/notifications', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'markAsSent',
              notificationIds: reallyNewNotifications.map((n: Notification) => n.id),
            }),
          }, 'mark-notifications-sent').catch(console.error)
        }
      }

      setPendingNotifications(newNotifications)
      setIsConnected(true)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error checking for updates:', error)
      setIsConnected(false)
    }
  }, [user, pendingNotifications])

  const dismissToast = (notificationId: string) => {
    setActiveToasts(prev => prev.filter(n => n.id !== notificationId))
  }

  const handleCallbackAction = async (notification: Notification) => {
    // This could trigger opening the call modal or navigating to the client
    dismissToast(notification.id)
    // Trigger a refresh to update any call-related data
    triggerRefresh()
  }

  // Set up polling interval with debouncing
  useEffect(() => {
    if (!user) return

    // Create debounced function
    const debouncedCheck = debounce(checkForUpdates, 2000)

    // Initial check (immediate)
    checkForUpdates()

    // Set up polling every 60 seconds (reduced from 30)
    const interval = setInterval(debouncedCheck, 60000)

    // Check for updates when the page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        debouncedCheck()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, checkForUpdates])

  // Auto-refresh data every 5 minutes (increased from 2 minutes)
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(() => {
      triggerRefresh()
    }, 300000) // 5 minutes

    return () => clearInterval(refreshInterval)
  }, [user, triggerRefresh])

  const value: RealTimeContextType = {
    pendingNotifications,
    refreshTrigger,
    triggerRefresh,
    isConnected,
    lastUpdate,
  }

  return (
    <RealTimeContext.Provider value={value}>
      {children}
      
      {/* Render active toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {activeToasts.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onDismiss={() => dismissToast(notification.id)}
            onAction={() => handleCallbackAction(notification)}
          />
        ))}
      </div>
      
      {/* Connection Status Indicator */}
      {user && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className={`flex items-center px-3 py-2 rounded-full text-sm ${
            isConnected 
              ? 'bg-success-100 text-success-800' 
              : 'bg-danger-100 text-danger-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-success-500' : 'bg-danger-500'
            } ${isConnected ? 'animate-pulse' : ''}`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
            {lastUpdate && (
              <span className="ml-2 text-xs opacity-75">
                Last: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </RealTimeContext.Provider>
  )
}