'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  PhoneIcon,
  ChatBubbleBottomCenterTextIcon,
  PresentationChartLineIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  LightBulbIcon,
  SparklesIcon,
  SignalIcon
} from '@heroicons/react/24/outline'

// Enhanced types for better data structure
interface ReportFilters {
  dateRange: {
    startDate: string
    endDate: string
  }
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom'
  selectedUsers: string[]
  callStatus: string[]
  feedbackTypes: string[]
  priorityLevels: string[]
  resolutionStatus: 'all' | 'pending' | 'resolved'
  performanceMetric: 'success_rate' | 'call_volume' | 'duration' | 'satisfaction'
  clientSegment: 'all' | 'high_value' | 'new' | 'active'
  showCallbacks: boolean
  showFeedback: boolean
  showTrends: boolean
  compareWithPrevious: boolean
  sortBy: 'date' | 'performance' | 'alphabetical'
  sortOrder: 'asc' | 'desc'
  searchTerm: string
}

interface SystemStats {
  total_calls: number
  completed_calls: number
  missed_calls?: number
  declined_calls?: number
  busy_calls?: number
  no_answer_calls?: number
  overall_success_rate: number
  average_call_duration: number
  total_users: number
  active_users: number
  total_clients?: number
  callbacks_pending: number
  callbacks_overdue: number
}

interface CustomerFeedbackStats {
  total_feedback: number
  happy_count: number
  complaints_count: number
  resolved_count: number
  pending_count: number
  satisfaction_score: number
  resolution_rate: number
  average_resolution_time: number
  urgent_priority_count: number
  high_priority_count: number
  medium_priority_count: number
  low_priority_count: number
}

interface UserStats {
  user_id: string
  user_name: string
  total_calls: number
  completed_calls: number
  missed_calls: number
  declined_calls: number
  success_rate: number
  average_duration: number
  first_name?: string
  last_name?: string
  email?: string
}

interface ReportData {
  systemStats: SystemStats
  userStats: UserStats[]
  detailedCallLogs: any[]
  feedbackStats?: CustomerFeedbackStats | null
}

export default function AdminReportsPage() {
  const { user, isAdmin } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExportingCSV, setIsExportingCSV] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allClients, setAllClients] = useState<any[]>([])
  const [activeView, setActiveView] = useState<'overview' | 'users' | 'clients' | 'feedback' | 'calls'>('overview')
  const [showFilters, setShowFilters] = useState(false)
  
  // Enhanced filtering state
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    reportType: 'weekly',
    selectedUsers: [],
    callStatus: [],
    feedbackTypes: [],
    priorityLevels: [],
    resolutionStatus: 'all',
    performanceMetric: 'success_rate',
    clientSegment: 'all',
    showCallbacks: false,
    showFeedback: true,
    showTrends: true,
    compareWithPrevious: false,
    sortBy: 'date',
    sortOrder: 'desc',
    searchTerm: ''
  })

  // Helper function to get user display name
  const getUserDisplayName = useCallback((user: any) => {
    if (!user) return 'Unknown User'
    
    // Function to clean and validate name
    const cleanName = (name: any) => {
      if (!name) return ''
      if (typeof name !== 'string') return ''
      const trimmed = name.trim()
      return trimmed && trimmed !== 'null' && trimmed !== 'undefined' ? trimmed : ''
    }
    
    // Try user_name field first (added by API enhancement)
    if (user.user_name && cleanName(user.user_name)) {
      return cleanName(user.user_name)
    }
    
    // Try to get name directly from user object (for userStats from DB function)
    const directFirstName = cleanName(user.first_name)
    const directLastName = cleanName(user.last_name)
    if (directFirstName || directLastName) {
      const fullName = `${directFirstName} ${directLastName}`.trim()
      if (fullName && fullName !== 'Unknown User') return fullName
    }
    
    // Try nested users object (for call logs with joined data)
    if (user.users) {
      const nestedFirstName = cleanName(user.users.first_name)
      const nestedLastName = cleanName(user.users.last_name)
      if (nestedFirstName || nestedLastName) {
        const fullName = `${nestedFirstName} ${nestedLastName}`.trim()
        if (fullName) return fullName
      }
    }
    
    // Try to find user in allUsers array using user_id
    const userId = user.user_id || user.id
    if (userId && allUsers.length > 0) {
      const foundUser = allUsers.find(u => u.id === userId)
      if (foundUser) {
        const foundFirstName = cleanName(foundUser.first_name)
        const foundLastName = cleanName(foundUser.last_name)
        if (foundFirstName || foundLastName) {
          const fullName = `${foundFirstName} ${foundLastName}`.trim()
          if (fullName && fullName !== 'Unknown User') return fullName
        }
        
        // Try email extraction from allUsers
        if (foundUser.email) {
          const emailUsername = foundUser.email.split('@')[0]
          if (emailUsername.includes('.')) {
            const parts = emailUsername.split('.')
            const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
            const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : ''
            return `${firstName} ${lastName}`.trim()
          }
        }
      }
    }
    
    // Try email as name from direct user object
    const email = user.email || user.users?.email
    if (email && email.trim()) {
      const emailUsername = email.split('@')[0]
      if (emailUsername.includes('.')) {
        const parts = emailUsername.split('.')
        const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
        const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : ''
        return `${firstName} ${lastName}`.trim()
      } else {
        // Single word email username
        return emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1)
      }
    }
    
    // Final fallback to user ID slice - but make it more readable
    const fallbackName = userId && typeof userId === 'string' ? `User ${userId.slice(0, 8)}` : 'Unknown User'
    return fallbackName
  }, [allUsers])

  const getUserEmail = useCallback((user: any) => {
    // Try direct email
    if (user.email && user.email.trim()) return user.email.trim()
    
    // Try nested users object
    if (user.users?.email && user.users.email.trim()) return user.users.email.trim()
    
    // Try to find user in allUsers array
    const userId = user.user_id || user.id
    if (userId && allUsers.length > 0) {
      const foundUser = allUsers.find(u => u.id === userId)
      if (foundUser?.email && foundUser.email.trim()) return foundUser.email.trim()
    }
    
    return 'No email'
  }, [allUsers])

  const updateFilter = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const updateDateRange = (startDate: string, endDate: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { startDate, endDate }
    }))
  }

  // Fetch reports function
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get token from localStorage or context
      let token = localStorage.getItem('token')
      
      if (!token && user) {
        // Try to get from context if available
        console.log('No token in localStorage, trying to refresh...')
        return
      }
      
      if (!token) {
        console.error('No authentication token found')
        setLoading(false)
        return
      }

      const queryParams = new URLSearchParams({
        reportType: filters.reportType,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
        showFeedback: 'true',
        ...(filters.selectedUsers.length > 0 && { users: filters.selectedUsers.join(',') }),
        ...(filters.callStatus.length > 0 && { status: filters.callStatus.join(',') }),
        ...(filters.searchTerm && { search: filters.searchTerm }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder })
      })
      
      // Try enhanced reports first, fallback to basic reports
      let response = await fetch(`/api/reports/enhanced?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok && response.status !== 404) {
        // Fallback to basic reports API
        response = await fetch(`/api/reports?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      }
      
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
        console.log('Reports data loaded:', data)
      } else {
        console.error('Failed to fetch reports:', response.status, response.statusText)
        // Set empty data to prevent infinite loading
        setReportData({
          userStats: [],
          systemStats: {
            total_calls: 0,
            completed_calls: 0,
            overall_success_rate: 0,
            average_call_duration: 0,
            total_users: 0,
            active_users: 0,
            callbacks_pending: 0,
            callbacks_overdue: 0
          },
          detailedCallLogs: [],
          feedbackStats: null
        })
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      // Set empty data on error
      setReportData({
        userStats: [],
        systemStats: {
          total_calls: 0,
          completed_calls: 0,
          overall_success_rate: 0,
          average_call_duration: 0,
          total_users: 0,
          active_users: 0,
          callbacks_pending: 0,
          callbacks_overdue: 0
        },
        detailedCallLogs: [],
        feedbackStats: null
      })
    } finally {
      setLoading(false)
    }
  }, [filters, user])

  // Fetch all users and clients for filtering
  useEffect(() => {
    const fetchUsersAndClients = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const [usersRes, clientsRes] = await Promise.all([
          fetch('/api/users?limit=100', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/clients?limit=1000', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ])
        
        if (usersRes.ok) {
          const users = await usersRes.json()
          setAllUsers(users)
        }
        
        if (clientsRes.ok) {
          const clients = await clientsRes.json()
          setAllClients(clients)
        }
      } catch (error) {
        console.error('Error fetching users/clients:', error)
      }
    }
    
    if (isAdmin) {
      fetchUsersAndClients()
    }
  }, [isAdmin])

  // Load initial report
  useEffect(() => {
    if (isAdmin) {
      fetchReports()
    } else {
      setLoading(false)
    }
  }, [isAdmin, fetchReports])

  // Enhanced CSV export with better formatting
  const exportToCSV = async () => {
    if (!reportData) return
    
    try {
      setIsExportingCSV(true)
      
      let csvContent = ''
      
      if (activeView === 'users' && reportData.userStats) {
        // User performance CSV
        csvContent = 'User Name,Email,Total Calls,Completed Calls,Success Rate,Average Duration,Missed Calls,Declined Calls\n'
        reportData.userStats.forEach(user => {
          csvContent += `"${getUserDisplayName(user)}","${getUserEmail(user)}",${user.total_calls || 0},${user.completed_calls || 0},${user.success_rate || 0}%,${Math.round(user.average_duration || 0)}s,${user.missed_calls || 0},${user.declined_calls || 0}\n`
        })
      } else if (activeView === 'calls' && reportData.detailedCallLogs) {
        // Call logs CSV
        csvContent = 'Date,User,Client,Phone Number,Call Status,Duration,Notes\n'
        reportData.detailedCallLogs.forEach((call: any) => {
          const duration = call.call_duration ? `${Math.floor(call.call_duration / 60)}:${(call.call_duration % 60).toString().padStart(2, '0')}` : 'N/A'
          csvContent += `"${new Date(call.created_at).toLocaleDateString()}","${getUserDisplayName(call)}","${call.client_name || 'Unknown'}","${call.phone_number || 'N/A'}","${call.call_status}","${duration}","${(call.notes || '').replace(/"/g, '""')}"\n`
        })
      } else {
        // System overview CSV
        csvContent = 'Metric,Value\n'
        csvContent += `Total Calls,${reportData.systemStats.total_calls}\n`
        csvContent += `Completed Calls,${reportData.systemStats.completed_calls}\n`
        csvContent += `Success Rate,${reportData.systemStats.overall_success_rate}%\n`
        csvContent += `Average Duration,${Math.round(reportData.systemStats.average_call_duration)}s\n`
        csvContent += `Active Users,${reportData.systemStats.active_users}\n`
        csvContent += `Pending Callbacks,${reportData.systemStats.callbacks_pending}\n`
      }
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `reports_${activeView}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV. Please try again.')
    } finally {
      setIsExportingCSV(false)
    }
  }

  // Enhanced filtering function with multiple criteria
  const getFilteredData = useCallback(() => {
    if (!reportData) return null

    let filteredData = { ...reportData }

    // Filter user stats
    if (filteredData.userStats && filters.selectedUsers.length > 0) {
      filteredData.userStats = filteredData.userStats.filter(user => 
        filters.selectedUsers.includes(user.user_id)
      )
    }

    // Filter call logs
    if (filteredData.detailedCallLogs) {
      let filteredCalls = [...filteredData.detailedCallLogs]

      // Filter by call status
      if (filters.callStatus.length > 0) {
        filteredCalls = filteredCalls.filter(call => 
          filters.callStatus.includes(call.call_status)
        )
      }

      // Filter by search term
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        filteredCalls = filteredCalls.filter(call => 
          (call.client_name && call.client_name.toLowerCase().includes(searchLower)) ||
          (call.phone_number && call.phone_number.includes(filters.searchTerm)) ||
          (call.notes && call.notes.toLowerCase().includes(searchLower))
        )
      }

      // Sort calls
      filteredCalls.sort((a, b) => {
        if (filters.sortBy === 'date') {
          const dateA = new Date(a.created_at || 0)
          const dateB = new Date(b.created_at || 0)
          return filters.sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
        }
        return 0
      })

      filteredData.detailedCallLogs = filteredCalls
    }

    return filteredData
  }, [reportData, filters])

  // Enhanced export function
  const exportFilteredData = useCallback(() => {
    const filtered = getFilteredData()
    if (!filtered) return

    if (activeView === 'overview') {
      // Export system stats
      const stats = [
        { metric: 'Total Calls', value: filtered.systemStats.total_calls },
        { metric: 'Completed Calls', value: filtered.systemStats.completed_calls },
        { metric: 'Success Rate', value: `${filtered.systemStats.overall_success_rate}%` },
        { metric: 'Average Duration', value: `${Math.round(filtered.systemStats.average_call_duration)} seconds` }
      ]
      
      return {
        data: stats,
        filename: `system_overview_${new Date().toISOString().split('T')[0]}.csv`,
        headers: ['Metric', 'Value']
      }
    } else if (activeView === 'users') {
      // Export user stats
      const userData = filtered.userStats.map(user => ({
        name: getUserDisplayName(user),
        email: getUserEmail(user),
        total_calls: user.total_calls || 0,
        success_rate: `${user.success_rate || 0}%`,
        avg_duration: `${Math.round(user.average_duration || 0)} seconds`
      }))
      
      return {
        data: userData,
        filename: `user_performance_${new Date().toISOString().split('T')[0]}.csv`,
        headers: ['Name', 'Email', 'Total Calls', 'Success Rate', 'Avg Duration']
      }
    } else if (activeView === 'calls') {
      // Export call logs with enhanced formatting
      const callData = filtered.detailedCallLogs.map((call: any) => ({
        date: new Date(call.created_at).toLocaleDateString(),
        user: getUserDisplayName(call),
        client: call.client_name || 'Unknown',
        phone: call.phone_number || 'N/A',
        status: call.call_status,
        duration: call.call_duration ? `${Math.floor(call.call_duration / 60)}:${(call.call_duration % 60).toString().padStart(2, '0')}` : 'N/A',
        call_duration_formatted: call.call_duration ? `${Math.floor(call.call_duration / 60)}:${(call.call_duration % 60).toString().padStart(2, '0')}` : 'N/A',
        notes: call.notes || ''
      }))
      
      return {
        data: callData,
        filename: `call_logs_${new Date().toISOString().split('T')[0]}.csv`,
        headers: ['Date', 'User', 'Client', 'Phone', 'Status', 'Duration', 'Notes']
      }
    }

    return null
  }, [getFilteredData, activeView, getUserDisplayName, getUserEmail])

  // Debug logging
  console.log('Reports component state:', {
    user: user ? { email: user.email, role: user.role } : null,
    isAdmin,
    loading,
    reportData: reportData ? 'loaded' : 'not loaded',
    filters
  })

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to view reports.</p>
          <div className="mt-4 text-sm text-gray-500">
            Current user: {user?.email || 'Not logged in'}<br />
            Role: {user?.role || 'Unknown'}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    )
  }

  const systemStats: SystemStats = reportData?.systemStats || {
    total_calls: 0,
    completed_calls: 0,
    overall_success_rate: 0,
    average_call_duration: 0,
    total_users: 0,
    active_users: 0,
    callbacks_pending: 0,
    callbacks_overdue: 0,
  }

  // Check if we have any meaningful data
  const hasData = reportData && (
    (reportData.userStats && reportData.userStats.length > 0) ||
    (reportData.detailedCallLogs && reportData.detailedCallLogs.length > 0) ||
    (reportData.systemStats && reportData.systemStats.total_calls > 0)
  )

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with Controls */}
        <div className="bg-white border-b border-gray-200 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CRM Reports Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Comprehensive reporting for user performance and client management
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-4">
              {/* Date Range Selector */}
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={filters.dateRange.startDate}
                  onChange={(e) => updateDateRange(e.target.value, filters.dateRange.endDate)}
                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={filters.dateRange.endDate}
                  onChange={(e) => updateDateRange(filters.dateRange.startDate, e.target.value)}
                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              {/* Report Type Selector */}
              <select
                value={filters.reportType}
                onChange={(e) => updateFilter('reportType', e.target.value)}
                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>

              {/* Refresh and Export */}
              <div className="flex space-x-2">
                <button
                  onClick={fetchReports}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
                  Refresh
                </button>
                
                <button
                  onClick={exportToCSV}
                  disabled={isExportingCSV || !hasData}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isExportingCSV ? (
                    <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  )}
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* User Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Users</label>
                  <select
                    multiple
                    value={filters.selectedUsers}
                    onChange={(e) => updateFilter('selectedUsers', Array.from(e.target.selectedOptions, option => option.value))}
                    className="block w-full h-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {allUsers && allUsers.length > 0 ? allUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name || 'Unknown'} {user.last_name || 'User'}
                      </option>
                    )) : (
                      <option disabled>Loading users...</option>
                    )}
                  </select>
                </div>

                {/* Call Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Call Status</label>
                  <select
                    multiple
                    value={filters.callStatus}
                    onChange={(e) => updateFilter('callStatus', Array.from(e.target.selectedOptions, option => option.value))}
                    className="block w-full h-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="declined">Declined</option>
                    <option value="busy">Busy</option>
                    <option value="no_answer">No Answer</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Client name, phone..."
                    value={filters.searchTerm}
                    onChange={(e) => updateFilter('searchTerm', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="date">Date</option>
                    <option value="performance">Performance</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={fetchReports}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: PresentationChartLineIcon },
              { id: 'users', name: 'User Performance', icon: UserGroupIcon },
              { id: 'clients', name: 'Client Reports', icon: ChatBubbleBottomCenterTextIcon },
              { id: 'calls', name: 'Call Details', icon: PhoneIcon },
              { id: 'feedback', name: 'Customer Feedback', icon: ExclamationTriangleIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`${
                  activeView === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Based on Active View */}
        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        ) : !hasData ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
            <p className="mt-1 text-sm text-gray-500">
              No data found for the selected date range and filters.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={fetchReports}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
                Refresh Data
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeView === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <PhoneIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Calls</dt>
                            <dd className="text-lg font-medium text-gray-900">{systemStats.total_calls?.toLocaleString()}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                            <dd className="text-lg font-medium text-gray-900">{systemStats.overall_success_rate}%</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserGroupIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                            <dd className="text-lg font-medium text-gray-900">{systemStats.active_users}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ClockIcon className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Pending Callbacks</dt>
                            <dd className="text-lg font-medium text-gray-900">{systemStats.callbacks_pending}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Overview Chart */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Call Status Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { status: 'Completed', count: systemStats.completed_calls, color: 'bg-green-500' },
                      { status: 'Missed', count: systemStats.missed_calls || 0, color: 'bg-red-500' },
                      { status: 'Declined', count: systemStats.declined_calls || 0, color: 'bg-orange-500' },
                      { status: 'Busy', count: systemStats.busy_calls || 0, color: 'bg-purple-500' },
                      { status: 'No Answer', count: systemStats.no_answer_calls || 0, color: 'bg-gray-500' }
                    ].map((item) => (
                      <div key={item.status} className="text-center">
                        <div className={`${item.color} h-20 rounded-lg flex items-center justify-center`}>
                          <span className="text-white font-bold text-lg">{item.count}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-700">{item.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* User Performance Tab */}
            {activeView === 'users' && (
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">User Performance Report</h3>
                    <p className="mt-1 text-sm text-gray-500">Individual performance metrics for all users</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Calls</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Declined</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missed</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData?.userStats?.map((user) => (
                          <tr key={user.user_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getUserDisplayName(user)}
                                </div>
                                <div className="text-sm text-gray-500">{getUserEmail(user)}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.total_calls || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.completed_calls || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                (user.success_rate || 0) >= 80 ? 'bg-green-100 text-green-800' :
                                (user.success_rate || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {user.success_rate || 0}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {Math.round(user.average_duration || 0)}s
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.declined_calls || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.missed_calls || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Call Details Tab */}
            {activeView === 'calls' && (
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Detailed Call Logs</h3>
                    <p className="mt-1 text-sm text-gray-500">Complete call history with client details</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Callback</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData?.detailedCallLogs?.slice(0, 50).map((call: any) => (
                          <tr key={call.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(call.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getUserDisplayName(call)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {call.clients?.name || 'Unknown Client'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {call.clients?.email || 'No email'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {call.clients?.phone || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                call.call_status === 'completed' ? 'bg-green-100 text-green-800' :
                                call.call_status === 'missed' ? 'bg-red-100 text-red-800' :
                                call.call_status === 'declined' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {call.call_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {call.call_duration ? `${Math.floor(call.call_duration / 60)}:${(call.call_duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {call.callback_requested ? (
                                <span className="text-yellow-600">Yes</span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Feedback Tab */}
            {activeView === 'feedback' && reportData?.feedbackStats && (
              <div className="space-y-6">
                {/* Feedback Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ChatBubbleBottomCenterTextIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Feedback</dt>
                            <dd className="text-lg font-medium text-gray-900">{reportData.feedbackStats.total_feedback}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <TrophyIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Happy Customers</dt>
                            <dd className="text-lg font-medium text-gray-900">{reportData.feedbackStats.happy_count}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Complaints</dt>
                            <dd className="text-lg font-medium text-gray-900">{reportData.feedbackStats.complaints_count}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                            <dd className="text-lg font-medium text-gray-900">{reportData.feedbackStats.resolved_count}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Resolution Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Resolution Rate</span>
                        <span className="text-sm font-medium">{reportData.feedbackStats.resolution_rate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${reportData.feedbackStats.resolution_rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Satisfaction Score</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer Satisfaction</span>
                        <span className="text-sm font-medium">{reportData.feedbackStats.satisfaction_score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${reportData.feedbackStats.satisfaction_score}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Clients Tab */}
            {activeView === 'clients' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Total Clients</h3>
                    <p className="text-3xl font-bold text-indigo-600">{systemStats.total_clients || 0}</p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Recently Called</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {reportData?.detailedCallLogs?.filter((call: any) => {
                        const callDate = new Date(call.created_at)
                        const today = new Date()
                        return callDate.toDateString() === today.toDateString()
                      }).length || 0}
                    </p>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Callbacks Pending</h3>
                    <p className="text-3xl font-bold text-yellow-600">{systemStats.callbacks_pending}</p>
                  </div>
                </div>

                {/* Recent Client Interactions */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Recent Client Interactions</h3>
                    <p className="mt-1 text-sm text-gray-500">Latest client call activities and outcomes</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Call</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Called By</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Calls</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData?.detailedCallLogs?.slice(0, 20).map((call: any) => (
                          <tr key={`${call.client_id}-${call.id}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {call.clients?.name || 'Unknown Client'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {call.clients?.email || 'No email'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {call.clients?.phone || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(call.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                call.call_status === 'completed' ? 'bg-green-100 text-green-800' :
                                call.call_status === 'declined' ? 'bg-red-100 text-red-800' :
                                call.call_status === 'missed' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {call.call_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getUserDisplayName(call)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reportData?.detailedCallLogs?.filter((c: any) => c.client_id === call.client_id).length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
