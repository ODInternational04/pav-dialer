import { useEffect, useState } from 'react'
import { 
  Phone, 
  Users, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react'

interface DashboardStats {
  totalCallsToday: number
  totalCallsThisWeek: number
  totalCallsThisMonth: number
  pendingCallbacks: number
  totalClients: number
  successRate: number
  activeUsers?: number
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
  details?: string
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Use your API methods
      const [statsData, weeklyCallsData, activityData] = await Promise.all([
        window.api.getDashboardStats(),
        window.api.getWeeklyCallsData(),
        window.api.getRecentActivity(10)
      ])

      setStats(statsData)
      setWeeklyData(weeklyCallsData)
      setRecentActivity(activityData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const welcomeMessage = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {welcomeMessage()}, {user?.first_name}!
            </h1>
            <p className="text-primary-100 text-lg">
              Ready to make some calls today?
            </p>
          </div>
          <div className="hidden md:block">
            <Phone className="w-20 h-20 text-primary-200 opacity-50" />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Calls */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Today's Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.totalCallsToday || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Success Rate</p>
              <p className="text-3xl font-bold text-success-600 mt-1">
                {stats?.successRate || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        {/* Pending Callbacks */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending Callbacks</p>
              <p className="text-3xl font-bold text-warning-600 mt-1">
                {stats?.pendingCallbacks || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        {/* Total Clients */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.totalClients || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Week Stats and This Week/Month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* This Week */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">This Week</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Calls</span>
              <span className="text-2xl font-bold text-gray-900">
                {stats?.totalCallsThisWeek || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((stats?.totalCallsThisWeek || 0) / 50 * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">This Month</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Calls</span>
              <span className="text-2xl font-bold text-gray-900">
                {stats?.totalCallsThisMonth || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-success-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((stats?.totalCallsThisMonth || 0) / 200 * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Performance Chart */}
      {weeklyData.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Weekly Performance</h2>
          <div className="flex items-end justify-between h-64 gap-2">
            {weeklyData.map((day, index) => {
              const maxCalls = Math.max(...weeklyData.map(d => d.calls), 1)
              const height = (day.calls / maxCalls) * 100
              const successHeight = day.calls > 0 ? (day.success / day.calls) * height : 0
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full h-full relative flex items-end">
                    <div className="w-full relative">
                      <div 
                        className="w-full bg-gray-200 rounded-t-lg transition-all hover:bg-gray-300"
                        style={{ height: `${height}%` }}
                      >
                        <div 
                          className="w-full bg-success-500 rounded-t-lg"
                          style={{ height: `${successHeight}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-xs font-medium text-gray-900">{day.calls}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span className="text-gray-600">Total Calls</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success-500 rounded"></div>
              <span className="text-gray-600">Successful</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No recent activity to display
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.status === 'success' ? 'bg-success-100' :
                    activity.status === 'pending' ? 'bg-warning-100' :
                    'bg-danger-100'
                  }`}>
                    {activity.type === 'call' && (
                      <Phone className={`w-5 h-5 ${
                        activity.status === 'success' ? 'text-success-600' :
                        activity.status === 'pending' ? 'text-warning-600' :
                        'text-danger-600'
                      }`} />
                    )}
                    {activity.type === 'callback' && (
                      <Clock className={`w-5 h-5 ${
                        activity.status === 'success' ? 'text-success-600' :
                        activity.status === 'pending' ? 'text-warning-600' :
                        'text-danger-600'
                      }`} />
                    )}
                    {activity.type === 'client' && (
                      <Users className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    {activity.details && (
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.details}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.time).toLocaleString()}
                    </p>
                  </div>
                  <span className={`status-badge ${
                    activity.status === 'success' ? 'status-success' :
                    activity.status === 'pending' ? 'status-warning' :
                    'status-danger'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Admin Stats */}
      {isAdmin && stats?.activeUsers && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {stats.activeUsers}
              </p>
            </div>
            <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
