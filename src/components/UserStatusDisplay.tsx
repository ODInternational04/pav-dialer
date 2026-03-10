'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  PhoneIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface UserCallStatus {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_on_call: boolean
  call_started_at?: string
  current_call_client_id?: string
  clients?: {
    id: string
    name: string
    phone: string
    email: string
    notes: string
  }
}

interface UserStatusDisplayProps {
  showOnlyOnCall?: boolean
  compact?: boolean
}

export default function UserStatusDisplay({ showOnlyOnCall = false, compact = false }: UserStatusDisplayProps) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserCallStatus[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUserStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/user-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching user status:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCallDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just started'
    if (diffMinutes < 60) return `${diffMinutes} min`
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}h ${minutes}m`
  }

  useEffect(() => {
    if (user) {
      fetchUserStatus()
      // Refresh every 30 seconds
      const interval = setInterval(fetchUserStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const usersToShow = showOnlyOnCall 
    ? users.filter(u => u.is_on_call)
    : users

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (usersToShow.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        {showOnlyOnCall ? 'No users currently on calls' : 'No users found'}
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {usersToShow.map((userItem) => (
          <div
            key={userItem.id}
            className={`flex items-center space-x-2 p-2 rounded-lg ${
              userItem.is_on_call ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              userItem.is_on_call ? 'bg-red-500 animate-pulse' : 'bg-green-500'
            }`}></div>
            <span className="text-sm font-medium">
              {userItem.first_name} {userItem.last_name}
            </span>
            {userItem.is_on_call && (
              <span className="text-xs text-red-600">
                On call
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {usersToShow.map((userItem) => (
        <div
          key={userItem.id}
          className={`border rounded-lg p-4 transition-all ${
            userItem.is_on_call 
              ? 'border-red-200 bg-red-50' 
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  userItem.is_on_call ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                }`}></div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">
                  {userItem.first_name} {userItem.last_name}
                </h3>
                <p className="text-sm text-gray-500 capitalize">{userItem.role}</p>
                <p className="text-xs text-gray-400">{userItem.email}</p>
              </div>
            </div>

            <div className="text-right">
              {userItem.is_on_call ? (
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">On Call</span>
                </div>
              ) : (
                <span className="text-sm text-green-600 font-medium">Available</span>
              )}
            </div>
          </div>

          {userItem.is_on_call && userItem.clients && (
            <div className="mt-3 p-3 bg-white rounded border border-red-100">
              <div className="flex items-center space-x-2 mb-2">
                <PhoneIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-900">
                  Currently calling:
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Client:</span> {userItem.clients.name}
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span> {userItem.clients.phone}
                </div>
                {userItem.clients.email && (
                  <div>
                    <span className="text-gray-500">Email:</span> {userItem.clients.email}
                  </div>
                )}
                {userItem.call_started_at && (
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-gray-700 font-medium">
                      {getCallDuration(userItem.call_started_at)}
                    </span>
                  </div>
                )}
              </div>

              {userItem.call_started_at && 
               new Date().getTime() - new Date(userItem.call_started_at).getTime() > 60 * 60 * 1000 && (
                <div className="mt-2 flex items-center space-x-1 text-orange-600">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="text-xs">Long call duration - may need attention</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}