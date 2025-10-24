'use client'
import { useState, useEffect } from 'react'

interface Notification {
  id: string
  type: 'callback' | 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  created_at: string
  is_read: boolean
  scheduled_for?: string
}

export default function TestNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`)
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setSuccess(`Fetched ${data.notifications?.length || 0} notifications`)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const createTestNotification = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      // Create a callback notification for 1 minute from now
      const callbackTime = new Date(Date.now() + 60000).toISOString()

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'callback',
          title: 'Test Callback Reminder',
          message: 'This is a test callback notification scheduled for 1 minute from now',
          scheduled_for: callbackTime,
          client_id: 'test-client-id'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create notification: ${response.status}`)
      }

      const data = await response.json()
      setSuccess('Test notification created successfully!')
      fetchNotifications() // Refresh the list
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Notifications</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={fetchNotifications}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh Notifications
            </button>
            <button
              onClick={createTestNotification}
              disabled={loading}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Test Callback (1 min)'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Notifications ({notifications.length})
          </h2>
          
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications found</p>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 ${
                    notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 mt-1">{notification.message}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          notification.type === 'callback' ? 'bg-orange-100 text-orange-800' :
                          notification.type === 'success' ? 'bg-green-100 text-green-800' :
                          notification.type === 'error' ? 'bg-red-100 text-red-800' :
                          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {notification.type.toUpperCase()}
                        </span>
                        <span className="ml-2">
                          Created: {new Date(notification.created_at).toLocaleString()}
                        </span>
                        {notification.scheduled_for && (
                          <span className="ml-2">
                            Scheduled: {new Date(notification.scheduled_for).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm">
                      {notification.is_read ? (
                        <span className="text-gray-500">Read</span>
                      ) : (
                        <span className="text-blue-600 font-medium">Unread</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}