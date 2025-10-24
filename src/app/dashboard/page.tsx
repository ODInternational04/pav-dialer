'use client'

import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  PhoneIcon, 
  UserGroupIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalCallsToday: number
  totalCallsThisWeek: number
  totalCallsThisMonth: number
  pendingCallbacks: number
  totalClients: number
  successRate: number
}

interface WeeklyData {
  date: string
  calls: number
  success: number
}

interface RecentActivity {
  id: string
  type: 'call' | 'callback' | 'client'
  description: string
  time: string
  status: 'success' | 'pending' | 'failed'
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch weekly data from daily performance API
      const weeklyResponse = await fetch('/api/dashboard/daily-performance', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (weeklyResponse.ok) {
        const weeklyResult = await weeklyResponse.json()
        setWeeklyData(weeklyResult.data || [])
      }
      
      // Fetch recent activity (using call logs for now)
      const activityResponse = await fetch('/api/calls?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (activityResponse.ok) {
        const callsData = await activityResponse.json()
        const activities = callsData.calls?.slice(0, 3).map((call: any, index: number) => ({
          id: call.id || index.toString(),
          type: call.outcome === 'completed' ? 'call' : 'callback',
          description: `${call.outcome === 'completed' ? 'Successful call' : 'Call attempt'} with ${call.client_name || 'client'}`,
          time: call.created_at ? new Date(call.created_at).toLocaleString() : 'Recently',
          status: call.outcome === 'completed' ? 'success' : call.outcome === 'busy' ? 'pending' : 'failed'
        })) || []
        
        setRecentActivity(activities)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const welcomeMessage = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {welcomeMessage()}, {user?.first_name}!
              </h1>
              <p className="text-blue-100 text-lg">
                Ready to make some calls today?
              </p>
            </div>
            <div className="hidden md:block">
              <PhoneIcon className="w-20 h-20 text-blue-200 opacity-50" />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Today's Calls */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Today's Calls</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats?.totalCallsToday || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <PhoneIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Success Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {stats?.successRate || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Pending Callbacks */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Callbacks</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {stats?.pendingCallbacks || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Total Clients */}
          {isAdmin && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Clients</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">
                    {stats?.totalClients || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Stats Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Overview</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <CalendarDaysIcon className="w-4 h-4" />
                <span>Last 7 days</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Real data bar chart representation */}
              <div className="space-y-3">
                {weeklyData && weeklyData.length > 0 ? (
                  weeklyData.map((day, index) => {
                    const maxCalls = Math.max(...weeklyData.map(d => d.calls)) || 1
                    const width = Math.max((day.calls / maxCalls) * 100, 2)
                    const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })
                    
                    return (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-20 text-sm text-gray-600 font-medium">{dayName}</div>
                        <div className="flex-1">
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                              style={{ width: `${width}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-12 text-sm text-gray-700 font-medium text-right">{day.calls}</div>
                      </div>
                    )
                  })
                ) : (
                  // Fallback when no data is available
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <CalendarDaysIcon className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm font-medium text-gray-500">No weekly data available</p>
                    <p className="text-xs text-gray-400">Start making calls to see activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <ArrowTrendingUpIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Link 
                href="/dashboard/calls"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-block"
              >
                View all activity →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              href="/dashboard/calls"
              className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
            >
              <PhoneIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-900">Start Calling</span>
            </Link>
            
            <Link 
              href="/dashboard/clients"
              className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
            >
              <UserGroupIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium text-green-900">Add Client</span>
            </Link>
            
            <Link 
              href="/dashboard/callbacks"
              className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-left"
            >
              <ClockIcon className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <span className="text-sm font-medium text-orange-900">View Callbacks</span>
            </Link>
            
            {isAdmin && (
              <Link 
                href="/dashboard/reports"
                className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
              >
                <ChartBarIcon className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <span className="text-sm font-medium text-purple-900">View Reports</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}