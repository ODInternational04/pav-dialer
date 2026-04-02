'use client'

import { useState, useEffect } from 'react'
import { ChartBarIcon, UserGroupIcon, PhoneIcon, UserPlusIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

interface UserStats {
  id: string
  name: string
  email: string
  callCount: number
}

interface Statistics {
  totalCalls: number
  newClients: number
  userStats: UserStats[]
  date: string
}

export default function StatisticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Attempting login with:', { username, password })
      const response = await fetch('/api/statistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, date: selectedDate })
      })

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Login failed:', errorData)
        throw new Error('Invalid credentials')
      }

      const data = await response.json()
      console.log('Login successful, data:', data)
      setStatistics(data)
      setIsAuthenticated(true)
      setPassword('')
    } catch (err) {
      console.error('Login error:', err)
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUsername('')
    setPassword('')
    setStatistics(null)
  }

  const refreshData = async () => {
    if (!isAuthenticated) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/statistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password: 'stats123', date: selectedDate })
      })

      if (response.ok) {
        const data = await response.json()
        setStatistics(data)
      }
    } catch (err) {
      console.error('Error refreshing data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(refreshData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      refreshData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Statistics Portal</h1>
            <p className="text-gray-600">Pavilion Hotel Daily Call Statistics</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Pavilion Hotel Statistics</h1>
              <p className="text-gray-600">
                Daily Overview - {statistics?.date ? new Date(statistics.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <label className="text-xs font-semibold text-gray-600 mb-1">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                />
              </div>
              <button
                onClick={refreshData}
                disabled={loading}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-all duration-200"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Total Calls Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-semibold mb-1">Total Calls Today</p>
                <p className="text-5xl font-bold">{statistics?.totalCalls || 0}</p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <PhoneIcon className="w-10 h-10" />
              </div>
            </div>
          </div>

          {/* New Clients Card */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-semibold mb-1">New Clients Today</p>
                <p className="text-5xl font-bold">{statistics?.newClients || 0}</p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <UserPlusIcon className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>

        {/* User Statistics Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-3">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">User Call Statistics</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">User Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Calls Made</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Performance</th>
                </tr>
              </thead>
              <tbody>
                {statistics?.userStats && statistics.userStats.length > 0 ? (
                  statistics.userStats.map((user, index) => (
                    <tr 
                      key={user.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        index === 0 && user.callCount > 0 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {index === 0 && user.callCount > 0 ? (
                            <span className="text-2xl">🥇</span>
                          ) : index === 1 && user.callCount > 0 ? (
                            <span className="text-2xl">🥈</span>
                          ) : index === 2 && user.callCount > 0 ? (
                            <span className="text-2xl">🥉</span>
                          ) : (
                            <span className="text-gray-500 font-semibold">#{index + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-800">{user.name}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">
                          {user.callCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${statistics.totalCalls > 0 ? (user.callCount / statistics.totalCalls) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-600 w-12 text-right">
                            {statistics.totalCalls > 0 ? Math.round((user.callCount / statistics.totalCalls) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No user data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          <p>Statistics are updated in real-time and auto-refresh every 30 seconds</p>
        </div>
      </div>
    </div>
  )
}
