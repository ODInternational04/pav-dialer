'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import UserStatusDisplay from '@/components/UserStatusDisplay'
import { 
  UsersIcon,
  PhoneIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function UserStatusPage() {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const cleanupStaleStatus = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setLastUpdated(new Date())
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error cleaning up stale status:', error)
      alert('Failed to cleanup stale call statuses')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setLastUpdated(new Date())
  }

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      window.location.href = '/dashboard'
    }
  }, [user, isAdmin])

  if (!user || !isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to view this page.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">User Call Status</h1>
            <p className="text-gray-600">
              Monitor which users are currently on calls and manage call statuses
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="btn btn-outline"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={cleanupStaleStatus}
              disabled={loading}
              className="btn btn-warning"
            >
              <ClockIcon className="w-4 h-4 mr-2" />
              {loading ? 'Cleaning...' : 'Cleanup Stale Calls'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
                <p className="text-sm text-gray-600">System users</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <PhoneIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">On Calls</h3>
                <p className="text-sm text-gray-600">Currently calling</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Last Updated</h3>
                <p className="text-sm text-gray-600">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="card p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Call Status Management</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Users are automatically marked as "on call" when they start a call</li>
                <li>• Status is cleared when they end or save the call</li>
                <li>• Red indicators show users currently on calls with client details</li>
                <li>• Use "Cleanup Stale Calls" to clear calls that have been active for over 2 hours</li>
                <li>• Other users cannot call the same client if someone is already calling them</li>
              </ul>
            </div>
          </div>
        </div>

        {/* User Status Display */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">User Status Overview</h2>
          <UserStatusDisplay key={lastUpdated.getTime()} />
        </div>
      </div>
    </DashboardLayout>
  )
}