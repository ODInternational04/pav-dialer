'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import UserStatusDisplay from '@/components/UserStatusDisplay'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  UsersIcon, 
  PhoneIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowRightIcon,
  BellIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalClients: number
  totalCallsToday: number
  totalCallsThisWeek: number
  totalCallsThisMonth: number
  successRate: number
  pendingCallbacks: number
  activeUsers: number
}

interface PerformanceData {
  daily: { date: string; calls: number; success: number }[]
  weekly: { week: string; calls: number; success: number }[]
  monthly: { month: string; calls: number; success: number }[]
  callTypeBreakdown: { type: string; count: number; percentage: number }[]
  userPerformance: { name: string; calls: number; successRate: number }[]
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)

  useEffect(() => {
    fetchDashboardStats()
    fetchPerformanceData()
  }, [])

  const handleStartCalling = () => {
    router.push('/dashboard/clients')
  }

  const handleViewClients = () => {
    router.push('/dashboard/clients')
  }

  const handleManageUsers = () => {
    router.push('/dashboard/users')
  }

  const handleViewReports = () => {
    router.push('/dashboard/reports')
  }

  const handleViewCalls = () => {
    router.push('/dashboard/calls')
  }

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPerformanceData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch real performance data from API
      const [dailyRes, weeklyRes, monthlyRes, breakdownRes, userPerfRes] = await Promise.all([
        fetch('/api/dashboard/daily-performance', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/dashboard/weekly-performance', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/dashboard/monthly-performance', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/dashboard/call-breakdown', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/dashboard/user-performance', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const [daily, weekly, monthly, breakdown, userPerf] = await Promise.all([
        dailyRes.ok ? dailyRes.json() : { data: [] },
        weeklyRes.ok ? weeklyRes.json() : { data: [] },
        monthlyRes.ok ? monthlyRes.json() : { data: [] },
        breakdownRes.ok ? breakdownRes.json() : { data: [] },
        userPerfRes.ok ? userPerfRes.json() : { data: [] }
      ])

      setPerformanceData({
        daily: daily.data || [],
        weekly: weekly.data || [],
        monthly: monthly.data || [],
        callTypeBreakdown: breakdown.data || [],
        userPerformance: userPerf.data || []
      })
    } catch (error) {
      console.error('Error fetching performance data:', error)
      // Set empty data on error
      setPerformanceData({
        daily: [],
        weekly: [],
        monthly: [],
        callTypeBreakdown: [],
        userPerformance: []
      })
    }
  }

  const adminCards = [
    {
      title: 'Total Clients',
      value: stats?.totalClients || 0,
      icon: ClipboardDocumentListIcon,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      description: 'Active client accounts',
      action: handleViewClients,
    },
    {
      title: 'Calls Today',
      value: stats?.totalCallsToday || 0,
      icon: PhoneIcon,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      description: 'Calls made today',
      action: handleViewCalls,
    },
    {
      title: 'Success Rate',
      value: `${stats?.successRate || 0}%`,
      icon: ChartBarIcon,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      description: 'This month',
      action: handleViewReports,
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: UsersIcon,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      description: 'Currently active',
      action: handleManageUsers,
    },
  ]

  const userCards = [
    {
      title: 'My Calls Today',
      value: stats?.totalCallsToday || 0,
      icon: PhoneIcon,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      description: 'Calls made today',
      action: handleViewCalls,
    },
    {
      title: 'Pending Callbacks',
      value: stats?.pendingCallbacks || 0,
      icon: BellIcon,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      description: 'Requires follow-up',
      action: handleViewCalls,
    },
    {
      title: 'This Week',
      value: stats?.totalCallsThisWeek || 0,
      icon: ChartBarIcon,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      description: 'Calls this week',
      action: handleViewCalls,
    },
    {
      title: 'This Month',
      value: stats?.totalCallsThisMonth || 0,
      icon: ChartBarIcon,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      description: 'Calls this month',
      action: handleViewReports,
    },
  ]

  const cards = isAdmin ? adminCards : userCards

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Loading Welcome Section */}
          <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl p-8 animate-pulse">
            <div className="h-8 bg-gray-400 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-400 rounded w-3/4 mb-6"></div>
            <div className="flex space-x-4">
              <div className="h-12 bg-gray-400 rounded-lg w-32"></div>
              <div className="h-12 bg-gray-400 rounded-lg w-32"></div>
            </div>
          </div>

          {/* Loading Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>

          {/* Loading Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl text-white p-8 shadow-lg">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-3">
              Welcome back, {user?.first_name}! 👋
            </h1>
            <p className="text-blue-100 text-lg mb-6">
              {isAdmin 
                ? 'Monitor your team\'s performance and manage the system.' 
                : 'Keep track of your calls and client interactions.'
              }
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={handleStartCalling}
                className="bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center"
              >
                <PhoneIcon className="w-5 h-5 mr-2" />
                Start Calling
              </button>
              {isAdmin && (
                <button 
                  onClick={handleViewReports}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition-colors flex items-center"
                >
                  <ChartBarIcon className="w-5 h-5 mr-2" />
                  View Reports
                </button>
              )}
            </div>
          </div>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white opacity-5 rounded-full"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white opacity-5 rounded-full"></div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => (
            <div 
              key={index} 
              onClick={card.action}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {card.title}
              </h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {card.value}
              </div>
              <p className="text-sm text-gray-600">
                {card.description}
              </p>
            </div>
          ))}
        </div>

        {/* Performance Analytics */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Daily Performance Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Daily Performance</h3>
                </div>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
                  Last 7 Days
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="h-64 flex flex-col justify-center">
                {performanceData?.daily && performanceData.daily.length > 0 ? (
                  <div className="space-y-4">
                    {performanceData.daily.map((day, index) => {
                      const successRate = day.calls > 0 ? (day.success / day.calls) * 100 : 0
                      const maxCalls = Math.max(...performanceData.daily.map(d => d.calls)) || 1
                      const callsWidth = Math.max((day.calls / maxCalls) * 100, 2) // Minimum 2% for visibility
                      const successWidth = Math.max((day.success / maxCalls) * 100, day.success > 0 ? 2 : 0)
                      
                      return (
                        <div key={index} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                              <div className="w-12 text-xs font-semibold text-gray-700">
                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 flex-shrink-0">
                              <span className="text-sm font-medium text-gray-700 w-16 text-right">
                                {day.calls} calls
                              </span>
                              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium w-12 text-center">
                                {successRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="relative h-5 bg-gray-100 rounded-lg overflow-hidden">
                            {/* Total calls bar */}
                            <div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 ease-out"
                              style={{ width: `${callsWidth}%` }}
                            ></div>
                            {/* Successful calls bar */}
                            <div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700 ease-out"
                              style={{ width: `${successWidth}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <ChartBarIcon className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm font-medium text-gray-500">No daily data available</p>
                    <p className="text-xs text-gray-400">Start making calls to see performance</p>
                  </div>
                )}
              </div>
              
              {performanceData?.daily && performanceData.daily.length > 0 && (
                <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    <span className="text-xs font-medium text-gray-600">Total Calls</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                    <span className="text-xs font-medium text-gray-600">Successful</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Call Outcomes</h3>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full font-medium">
                  This Month
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="h-64 flex flex-col justify-center">
                {performanceData?.callTypeBreakdown && performanceData.callTypeBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {performanceData.callTypeBreakdown.map((item, index) => {
                      const colors = [
                        { bg: 'from-emerald-500 to-emerald-600', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                        { bg: 'from-amber-500 to-amber-600', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
                        { bg: 'from-orange-500 to-orange-600', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
                        { bg: 'from-red-500 to-red-600', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 border-red-200' }
                      ]
                      const color = colors[index % colors.length]
                      
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className={`w-3 h-3 rounded-full ${color.dot} flex-shrink-0`}></div>
                              <span className="text-sm font-medium text-gray-800 truncate">{item.type}</span>
                            </div>
                            <div className="flex items-center space-x-3 flex-shrink-0">
                              <span className="text-sm font-bold text-gray-900 min-w-[40px] text-right">
                                {item.count.toLocaleString()}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium border min-w-[45px] text-center ${color.badge}`}>
                                {item.percentage}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${color.bg} transition-all duration-1000 ease-out`}
                              style={{ width: `${Math.max(item.percentage, 2)}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="w-12 h-12 mb-3 opacity-50 flex items-center justify-center text-2xl">
                      📊
                    </div>
                    <p className="text-sm font-medium text-gray-500">No call data available</p>
                    <p className="text-xs text-gray-400">Call breakdown will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Weekly Performance Trends */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Weekly Trends</h3>
                </div>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
                  Last 4 Weeks
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="h-64 flex flex-col justify-center">
                {performanceData?.weekly && performanceData.weekly.length > 0 ? (
                  <div className="space-y-4">
                    {performanceData.weekly.map((week, index) => {
                      const successRate = week.calls > 0 ? (week.success / week.calls) * 100 : 0
                      const maxCalls = Math.max(...performanceData.weekly.map(w => w.calls)) || 1
                      const barWidth = Math.max((week.calls / maxCalls) * 100, 2)
                      
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center flex-shrink-0">
                                <span className="text-purple-600 font-bold text-xs">{index + 1}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-800">{week.week}</span>
                            </div>
                            <div className="flex items-center space-x-3 flex-shrink-0">
                              <span className="text-sm font-bold text-gray-900 min-w-[50px] text-right">
                                {week.calls} calls
                              </span>
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium border border-purple-200 min-w-[45px] text-center">
                                {successRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="relative h-4 bg-gray-100 rounded-md overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-1000 ease-out"
                              style={{ width: `${barWidth}%` }}
                            ></div>
                            {week.calls > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                  {week.success} successful
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="w-12 h-12 mb-3 opacity-50 flex items-center justify-center text-2xl">
                      📈
                    </div>
                    <p className="text-sm font-medium text-gray-500">No weekly data available</p>
                    <p className="text-xs text-gray-400">Weekly trends will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Performance Leaderboard */}
          {isAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                  </div>
                  <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full font-medium">
                    This Month
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {performanceData?.userPerformance && performanceData.userPerformance.length > 0 ? (
                    performanceData.userPerformance.slice(0, 5).map((user, index) => {
                      const rankIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
                      const rankColors = [
                        'from-yellow-400 to-yellow-500',
                        'from-gray-300 to-gray-400', 
                        'from-orange-400 to-orange-500',
                        'from-indigo-400 to-indigo-500',
                        'from-indigo-400 to-indigo-500'
                      ]
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className={`w-8 h-8 bg-gradient-to-r ${rankColors[index]} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <span className="text-sm">
                                {rankIcons[index] || (index + 1).toString()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.calls} calls made</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {user.successRate}%
                              </div>
                              <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000"
                                  style={{ width: `${user.successRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                      <div className="w-12 h-12 mb-3 opacity-50 flex items-center justify-center text-2xl">
                        🏆
                      </div>
                      <p className="text-sm font-medium text-gray-500">No performance data available</p>
                      <p className="text-xs text-gray-400">User rankings will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}