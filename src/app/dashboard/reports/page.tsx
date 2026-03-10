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
  ClockIcon,
  ShieldCheckIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

// Types
interface Filters {
  dateRange: {
    startDate: string
    endDate: string
  }
  selectedUsers: string[]
  callStatuses: string[]
  callTypes: string[]
  feedbackTypes: string[]
  operations: string[]
  tableName: string
  searchTerm: string
}

interface AuditLog {
  id: string
  table_name: string
  operation: string
  user_id: string
  user_email: string
  user_role: string
  record_id: string
  old_data: any
  new_data: any
  ip_address: string
  user_agent: string
  created_at: string
}

interface CallLog {
  id: string
  client_id: string
  user_id: string
  call_type: string
  call_status: string
  call_duration: number
  notes: string
  feedback: string
  callback_requested: boolean
  callback_time: string
  created_at: string
  clients: {
    id: string
    name: string
    phone: string
    email: string
  }
  users: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export default function ComprehensiveReportsPage() {
  const { user, isAdmin } = useAuth()
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'users' | 'feedback' | 'audit'>('overview')
  
  // Data state
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [feedbackLogs, setFeedbackLogs] = useState<any[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<any>(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    dateRange: {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    selectedUsers: [],
    callStatuses: [],
    callTypes: [],
    feedbackTypes: [],
    operations: [],
    tableName: '',
    searchTerm: ''
  })

  // Fetch users for filter dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchUsers()
  }, [])

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      if (activeTab === 'calls') {
        await fetchCallLogs(token)
      } else if (activeTab === 'audit') {
        await fetchAuditLogs(token)
      } else if (activeTab === 'overview' || activeTab === 'users') {
        await fetchOverviewStats(token)
      } else if (activeTab === 'feedback') {
        await fetchFeedbackLogs(token)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, filters, page])

  // Fetch call logs with filters
  const fetchCallLogs = async (token: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.dateRange.startDate && { startDate: filters.dateRange.startDate }),
        ...(filters.dateRange.endDate && { endDate: filters.dateRange.endDate }),
        ...(filters.selectedUsers.length > 0 && { userId: filters.selectedUsers.join(',') }),
        ...(filters.callStatuses.length > 0 && { status: filters.callStatuses.join(',') }),
        ...(filters.callTypes.length > 0 && { callType: filters.callTypes.join(',') }),
        ...(filters.searchTerm && { search: filters.searchTerm })
      })

      const response = await fetch(`/api/call-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setCallLogs(data.callLogs || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Error fetching call logs:', error)
    }
  }

  // Fetch audit logs with filters
  const fetchAuditLogs = async (token: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.dateRange.startDate && { startDate: filters.dateRange.startDate }),
        ...(filters.dateRange.endDate && { endDate: filters.dateRange.endDate }),
        ...(filters.selectedUsers.length > 0 && { userId: filters.selectedUsers[0] }),
        ...(filters.operations.length > 0 && { operation: filters.operations[0] }),
        ...(filters.tableName && { table: filters.tableName }),
        ...(filters.searchTerm && { search: filters.searchTerm })
      })

      const response = await fetch(`/api/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.auditLogs || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    }
  }

  // Fetch feedback logs with filters
  const fetchFeedbackLogs = async (token: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.dateRange.startDate && { start_date: filters.dateRange.startDate }),
        ...(filters.dateRange.endDate && { end_date: filters.dateRange.endDate }),
        ...(filters.feedbackTypes.length > 0 && { feedback_type: filters.feedbackTypes[0] }),
        ...(filters.searchTerm && { search: filters.searchTerm })
      })

      const response = await fetch(`/api/customer-feedback?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setFeedbackLogs(data.feedback || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalCount(data.pagination?.totalCount || 0)
      } else {
        const err = await response.json()
        console.error('❌ Feedback logs error:', err)
      }
    } catch (error) {
      console.error('💥 Error fetching feedback logs:', error)
    }
  }

  // Export feedback as CSV with current filters
  const exportFeedbackCSV = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    const params = new URLSearchParams({
      ...(filters.dateRange.startDate && { start_date: filters.dateRange.startDate }),
      ...(filters.dateRange.endDate && { end_date: filters.dateRange.endDate }),
      ...(filters.feedbackTypes.length > 0 && { feedback_type: filters.feedbackTypes[0] }),
      ...(filters.searchTerm && { search: filters.searchTerm })
    })

    try {
      const response = await fetch(`/api/customer-feedback/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const dateStr = new Date().toISOString().split('T')[0]
        a.download = `feedback-export-${dateStr}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        console.error('Export failed:', await response.json())
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Fetch overview stats
  const fetchOverviewStats = async (token: string) => {
    try {
      const params = new URLSearchParams({
        reportType: 'custom',
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
        ...(filters.selectedUsers.length > 0 && { users: filters.selectedUsers.join(',') })
      })

      console.log('📊 Fetching overview stats with params:', {
        reportType: 'custom',
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
        users: filters.selectedUsers.join(',') || 'all'
      })

      const response = await fetch(`/api/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Overview stats received:', {
          totalCalls: data.systemStats?.total_calls,
          successRate: data.systemStats?.success_rate,
          activeUsers: data.systemStats?.active_users,
          userStatsCount: data.userStats?.length || 0
        })
        setStats(data)
      } else {
        const error = await response.json()
        console.error('❌ Overview stats error:', error)
      }
    } catch (error) {
      console.error('💥 Error fetching overview stats:', error)
    }
  }

  // Reload data when filters or tab change
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filters])

  // Filter panel
  const FilterPanel = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <button
          onClick={() => setFilters({
            dateRange: {
              startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0]
            },
            selectedUsers: [],
            callStatuses: [],
            callTypes: [],
            feedbackTypes: [],
            operations: [],
            tableName: '',
            searchTerm: ''
          })}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
        >
          <XMarkIcon className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CalendarIcon className="w-4 h-4 inline mr-1" />
            Start Date
          </label>
          <input
            type="date"
            value={filters.dateRange.startDate}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              dateRange: { ...prev.dateRange, startDate: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CalendarIcon className="w-4 h-4 inline mr-1" />
            End Date
          </label>
          <input
            type="date"
            value={filters.dateRange.endDate}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              dateRange: { ...prev.dateRange, endDate: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* User Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <UserGroupIcon className="w-4 h-4 inline mr-1" />
            User
          </label>
          <select
            multiple
            value={filters.selectedUsers}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value)
              setFilters(prev => ({ ...prev, selectedUsers: selected }))
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MagnifyingGlassIcon className="w-4 h-4 inline mr-1" />
            Search
          </label>
          <input
            type="text"
            placeholder="Search..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Call Status Filter (for calls tab) */}
        {activeTab === 'calls' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Call Status</label>
              <select
                multiple
                value={filters.callStatuses}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFilters(prev => ({ ...prev, callStatuses: selected }))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
                <option value="declined">Declined</option>
                <option value="busy">Busy</option>
                <option value="no_answer">No Answer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Call Type</label>
              <select
                multiple
                value={filters.callTypes}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFilters(prev => ({ ...prev, callTypes: selected }))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
          </>
        )}

        {/* Feedback Filters */}
        {activeTab === 'feedback' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Type</label>
            <select
              value={filters.feedbackTypes[0] || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                feedbackTypes: e.target.value ? [e.target.value] : []
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="complaint">Complaint</option>
              <option value="happy">Happy</option>
              <option value="suggestion">Suggestion</option>
              <option value="general">General</option>
            </select>
          </div>
        )}

        {/* Audit Log Filters */}
        {activeTab === 'audit' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operation</label>
              <select
                value={filters.operations[0] || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  operations: e.target.value ? [e.target.value] : []
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Operations</option>
                <option value="INSERT">Insert</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="EXPORT">Export</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Table</label>
              <select
                value={filters.tableName}
                onChange={(e) => setFilters(prev => ({ ...prev, tableName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Tables</option>
                <option value="clients">Clients</option>
                <option value="call_logs">Call Logs</option>
                <option value="users">Users</option>
                <option value="notifications">Notifications</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end space-x-3">
        <span className="text-sm text-gray-600">
          {totalCount} {totalCount === 1 ? 'record' : 'records'} found
        </span>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  )

  // Overview Tab
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.systemStats?.total_calls || 0}
              </p>
            </div>
            <PhoneIcon className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats?.systemStats?.success_rate?.toFixed(1) || 0}%
              </p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.systemStats?.active_users || 0}
              </p>
            </div>
            <UserGroupIcon className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.systemStats?.average_call_duration?.toFixed(0) || 0}s
              </p>
            </div>
            <ClockIcon className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* User Performance Table */}
      {stats?.userStats && stats.userStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">User Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.userStats.map((user: any) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.user_name || `${user.first_name} ${user.last_name}`}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.total_calls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.completed_calls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.success_rate >= 70 ? 'bg-green-100 text-green-800' :
                        user.success_rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.success_rate?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.average_duration?.toFixed(0)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  // Call Logs Tab
  const CallLogsTab = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Detailed Call Logs</h3>
        <button
          onClick={() => {
            // Export functionality
            const token = localStorage.getItem('token')
            window.open(`/api/reports/export?token=${token}&startDate=${filters.dateRange.startDate}&endDate=${filters.dateRange.endDate}`, '_blank')
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <DocumentArrowDownIcon className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feedback
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {callLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{log.clients?.name || 'Unknown Client'}</div>
                  <div className="text-sm text-gray-500">{log.clients?.phone || ''}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.users?.first_name} {log.users?.last_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    log.call_type === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {log.call_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    log.call_status === 'completed' ? 'bg-green-100 text-green-800' :
                    log.call_status === 'missed' ? 'bg-red-100 text-red-800' :
                    log.call_status === 'declined' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.call_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.call_duration}s
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {log.feedback || log.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {page} of {totalPages}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )

  // Audit Log Tab
  const AuditLogTab = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
        </div>
        <div className="text-sm text-gray-600">
          <InformationCircleIcon className="w-5 h-5 inline mr-1" />
          All system activities are logged for security and compliance
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Operation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Table
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{log.user_email || 'System'}</div>
                  <div className="text-sm text-gray-500">{log.user_role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    log.operation === 'INSERT' ? 'bg-green-100 text-green-800' :
                    log.operation === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                    log.operation === 'DELETE' ? 'bg-red-100 text-red-800' :
                    log.operation === 'LOGIN' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.operation}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.table_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.ip_address}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {log.record_id && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      ID: {log.record_id.substring(0, 8)}...
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {page} of {totalPages}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access reports.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <ChartBarIcon className="w-8 h-8 text-green-600" />
            <span>Comprehensive Reports</span>
          </h1>
          <p className="text-gray-600 mt-2">Advanced reporting with filtering and audit logging</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: ChartBarIcon },
              { key: 'calls', label: 'Call Logs', icon: PhoneIcon },
              { key: 'users', label: 'User Performance', icon: UserGroupIcon },
              { key: 'feedback', label: 'Feedback Analysis', icon: ChatBubbleBottomCenterTextIcon },
              { key: 'audit', label: 'Audit Log', icon: ShieldCheckIcon }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as any)
                    setPage(1)
                  }}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.key
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Filters */}
        {showFilters && <FilterPanel />}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <ArrowPathIcon className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'calls' && <CallLogsTab />}
            {activeTab === 'audit' && <AuditLogTab />}
            {activeTab === 'users' && <OverviewTab />}
            {activeTab === 'feedback' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Feedback Analysis</h3>
                  <button
                    onClick={exportFeedbackCSV}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 text-sm"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
                {feedbackLogs.length === 0 ? (
                  <div className="p-12 text-center">
                    <ChatBubbleBottomCenterTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No feedback records found for the selected period.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {feedbackLogs.map((fb: any) => {
                          const client = Array.isArray(fb.clients) ? fb.clients[0] : fb.clients
                          const submittedBy = Array.isArray(fb.users) ? fb.users[0] : fb.users
                          return (
                            <tr key={fb.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(fb.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {client?.principal_key_holder || client?.name || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-500">{client?.telephone_cell || client?.phone || ''}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  fb.feedback_type === 'complaint' ? 'bg-red-100 text-red-800' :
                                  fb.feedback_type === 'happy' ? 'bg-green-100 text-green-800' :
                                  fb.feedback_type === 'suggestion' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {fb.feedback_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                {fb.subject}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  fb.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  fb.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  fb.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {fb.priority}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  fb.is_resolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {fb.is_resolved ? 'Resolved' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {submittedBy ? `${submittedBy.first_name} ${submittedBy.last_name}` : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={fb.notes}>
                                {fb.notes}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">Page {page} of {totalPages} ({totalCount} records)</div>
                    <div className="flex space-x-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        Previous
                      </button>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
