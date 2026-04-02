'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserStatus } from '@/types'
import {
  CheckCircleIcon,
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
  AcademicCapIcon,
  XCircleIcon,
  CakeIcon
} from '@heroicons/react/24/outline'

interface StatusOption {
  value: UserStatus
  label: string
  description: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  requiresReason?: boolean
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'available',
    label: 'Available',
    description: 'Ready to take calls',
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100 hover:bg-green-200'
  },
  {
    value: 'lunch_break',
    label: 'Lunch Break',
    description: 'On lunch break',
    icon: CakeIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 hover:bg-orange-200'
  },
  {
    value: 'comfort_break',
    label: 'Comfort Break',
    description: 'Toilet/restroom break',
    icon: ClockIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 hover:bg-blue-200'
  },
  {
    value: 'meeting',
    label: 'In Meeting',
    description: 'Attending a meeting',
    icon: UserGroupIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 hover:bg-purple-200',
    requiresReason: true
  },
  {
    value: 'coaching',
    label: 'Coaching',
    description: 'In coaching session',
    icon: AcademicCapIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 hover:bg-indigo-200',
    requiresReason: true
  },
  {
    value: 'unavailable',
    label: 'Unavailable',
    description: 'Not available for calls',
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100 hover:bg-red-200',
    requiresReason: true
  }
]

export default function UserStatusSelector() {
  const { user } = useAuth()
  const [currentStatus, setCurrentStatus] = useState<UserStatus>('available')
  const [statusReason, setStatusReason] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showReasonInput, setShowReasonInput] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<StatusOption | null>(null)
  const [statusChangedAt, setStatusChangedAt] = useState<string | null>(null)
  const [isOnCall, setIsOnCall] = useState(false)

  useEffect(() => {
    fetchCurrentStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchCurrentStatus, 30000)
    return () => clearInterval(interval)
  }, [user])

  const fetchCurrentStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/user-status-update', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentStatus(data.user.user_status || 'available')
        setStatusReason(data.user.status_reason || '')
        setStatusChangedAt(data.user.status_changed_at || null)
        setIsOnCall(data.user.is_on_call || false)
      }
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }

  const handleStatusClick = (option: StatusOption) => {
    if (isOnCall && option.value !== 'on_call' && option.value !== 'available') {
      alert('Cannot change status while on a call. Please end your call first.')
      return
    }

    if (option.requiresReason) {
      setSelectedStatus(option)
      setShowReasonInput(true)
    } else {
      updateStatus(option.value, '')
    }
  }

  const updateStatus = async (status: UserStatus, reason: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please log in again')
        return
      }

      const response = await fetch('/api/user-status-update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason })
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentStatus(status)
        setStatusReason(reason)
        setStatusChangedAt(data.user.status_changed_at)
        setShowReasonInput(false)
        setSelectedStatus(null)
        setStatusReason('')
      } else {
        alert(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const handleReasonSubmit = () => {
    if (selectedStatus) {
      updateStatus(selectedStatus.value, statusReason)
    }
  }

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === currentStatus)
  const CurrentIcon = currentOption?.icon || CheckCircleIcon

  const getTimeSinceChange = () => {
    if (!statusChangedAt) return ''
    const date = new Date(statusChangedAt)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}h ${minutes}m ago`
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Current Status Display */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Your Current Status</h3>
        <div className={`flex items-center p-3 rounded-lg ${currentOption?.bgColor || 'bg-gray-100'}`}>
          <CurrentIcon className={`w-6 h-6 mr-3 ${currentOption?.color || 'text-gray-600'}`} />
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{currentOption?.label || 'Unknown'}</div>
            <div className="text-sm text-gray-600">
              {currentOption?.description}
              {statusChangedAt && ` • ${getTimeSinceChange()}`}
            </div>
            {statusReason && (
              <div className="text-xs text-gray-500 mt-1 italic">
                Note: {statusReason}
              </div>
            )}
          </div>
          {isOnCall && (
            <div className="flex items-center text-sm font-medium text-blue-600">
              <PhoneIcon className="w-4 h-4 mr-1" />
              On Call
            </div>
          )}
        </div>
      </div>

      {/* Status Options Grid */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Change Status</h3>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.filter(opt => opt.value !== 'on_call').map((option) => {
            const Icon = option.icon
            const isActive = currentStatus === option.value
            return (
              <button
                key={option.value}
                onClick={() => handleStatusClick(option)}
                disabled={loading || isActive}
                className={`
                  flex items-center p-3 rounded-lg border-2 transition-all
                  ${isActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${loading || isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${!isActive ? option.bgColor : ''}
                `}
              >
                <Icon className={`w-5 h-5 mr-2 ${option.color}`} />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reason Input Modal */}
      {showReasonInput && selectedStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {selectedStatus.label} - Add Note (Optional)
            </h3>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Enter a note or reason..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleReasonSubmit}
                disabled={loading}
                className="flex-1 btn btn-primary"
              >
                {loading ? 'Updating...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowReasonInput(false)
                  setSelectedStatus(null)
                  setStatusReason('')
                }}
                disabled={loading}
                className="flex-1 btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
