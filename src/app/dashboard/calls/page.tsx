'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { 
  PhoneIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  BuildingOfficeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface CallLog {
  id: string
  call_type: 'inbound' | 'outbound'
  call_status: 'completed' | 'missed' | 'declined' | 'busy' | 'no_answer'
  call_duration: number
  notes: string
  callback_requested: boolean
  callback_time?: string
  created_at: string
  call_started_at?: string
  call_ended_at?: string
  users: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  clients: {
    id: string
    name: string
    phone: string
    email?: string
  }
}

interface CallLogResponse {
  callLogs: CallLog[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

interface FilterState {
  search: string
  status: string
  user: string
  startDate: string
  endDate: string
  callType: string
}

export default function CallLogsPage() {
  const { user, isAdmin } = useAuth()
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [users, setUsers] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    user: '',
    startDate: '',
    endDate: '',
    callType: ''
  })

  const limit = 20

  const fetchCallLogs = async (page = 1) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.user && { userId: filters.user }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.callType && { callType: filters.callType }),
      })

      const response = await fetch(`/api/call-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data: CallLogResponse = await response.json()
        setCallLogs(data.callLogs || [])
        setTotalCount(data.totalCount || 0)
        setCurrentPage(data.page || 1)
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching call logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    if (!isAdmin) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setCurrentPage(1)
    fetchCallLogs(1)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      user: '',
      startDate: '',
      endDate: '',
      callType: ''
    })
    setCurrentPage(1)
    fetchCallLogs(1)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'missed':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />
      case 'declined':
        return <XCircleIcon className="w-5 h-5 text-red-600" />
      case 'busy':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
      case 'no_answer':
        return <XMarkIcon className="w-5 h-5 text-gray-600" />
      default:
        return <PhoneIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'missed':
        return 'bg-yellow-100 text-yellow-800'
      case 'declined':
        return 'bg-red-100 text-red-800'
      case 'busy':
        return 'bg-orange-100 text-orange-800'
      case 'no_answer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  useEffect(() => {
    fetchCallLogs()
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
            <p className="text-gray-600">
              {isAdmin 
                ? `View all call logs from your team (${totalCount} total)`
                : `View your call history (${totalCount} total)`
              }
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
            <button
              onClick={() => fetchCallLogs(currentPage)}
              className="btn btn-outline"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Call Logs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="label">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Client name, phone, notes..."
                    className="input pl-10"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>

              {/* Call Status */}
              <div>
                <label className="label">Call Status</label>
                <select
                  className="input"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="missed">Missed</option>
                  <option value="declined">Declined</option>
                  <option value="busy">Busy</option>
                  <option value="no_answer">No Answer</option>
                </select>
              </div>

              {/* Call Type */}
              <div>
                <label className="label">Call Type</label>
                <select
                  className="input"
                  value={filters.callType}
                  onChange={(e) => handleFilterChange('callType', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </div>

              {/* User (Admin only) */}
              {isAdmin && (
                <div>
                  <label className="label">User</label>
                  <select
                    className="input"
                    value={filters.user}
                    onChange={(e) => handleFilterChange('user', e.target.value)}
                  >
                    <option value="">All Users</option>
                    {users.map(userItem => (
                      <option key={userItem.id} value={userItem.id}>
                        {userItem.first_name} {userItem.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Start Date */}
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  className="input"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
              <button
                onClick={applyFilters}
                className="btn btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Call Logs List */}
        <div className="card">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading call logs...</p>
            </div>
          ) : callLogs.length === 0 ? (
            <div className="p-8 text-center">
              <PhoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No call logs found</h3>
              <p className="text-gray-600">
                {Object.values(filters).some(f => f) 
                  ? 'Try adjusting your filters to see more results.'
                  : 'No calls have been logged yet.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-hidden">
                <table className="table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Date & Time</th>
                      {isAdmin && <th className="table-header">User</th>}
                      <th className="table-header">Client</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Duration</th>
                      <th className="table-header">Notes</th>
                      <th className="table-header">Callback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {callLogs.map((log) => {
                      const { date, time } = formatDateTime(log.created_at)
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="table-cell">
                            <div>
                              <div className="font-medium text-gray-900">{date}</div>
                              <div className="text-sm text-gray-500">{time}</div>
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="table-cell">
                              <div className="flex items-center">
                                <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {log.users.first_name} {log.users.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{log.users.email}</div>
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="table-cell">
                            <div className="flex items-center">
                              <BuildingOfficeIcon className="w-4 h-4 text-gray-400 mr-2" />
                              <div>
                                <div className="font-medium text-gray-900">{log.clients.name}</div>
                                <div className="text-sm text-gray-500">
                                  {log.clients.phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className={`status-badge ${
                              log.call_type === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {log.call_type === 'inbound' ? 'Inbound' : 'Outbound'}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center">
                              {getStatusIcon(log.call_status)}
                              <span className={`ml-2 status-badge ${getStatusColor(log.call_status)}`}>
                                {log.call_status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="font-mono text-sm">
                              {formatDuration(log.call_duration)}
                            </span>
                          </td>
                          <td className="table-cell max-w-xs">
                            <div className="truncate" title={log.notes}>
                              {log.notes || 'No notes'}
                            </div>
                          </td>
                          <td className="table-cell">
                            {log.callback_requested ? (
                              <div className="text-sm">
                                <div className="text-orange-600 font-medium">Requested</div>
                                {log.callback_time && (
                                  <div className="text-gray-500">
                                    {formatDateTime(log.callback_time).date} {formatDateTime(log.callback_time).time}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {callLogs.map((log) => {
                  const { date, time } = formatDateTime(log.created_at)
                  return (
                    <div key={log.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{log.clients.name}</h3>
                          <p className="text-sm text-gray-500">{log.clients.phone}{log.clients.email ? ' • ' + log.clients.email : ''}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{date}</div>
                          <div className="text-sm text-gray-500">{time}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center">
                          {getStatusIcon(log.call_status)}
                          <span className={`ml-1 text-xs px-2 py-1 rounded-full ${getStatusColor(log.call_status)}`}>
                            {log.call_status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          log.call_type === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {log.call_type}
                        </span>
                        <span className="text-sm text-gray-600 font-mono">
                          {formatDuration(log.call_duration)}
                        </span>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center mb-2">
                          <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">
                            {log.users.first_name} {log.users.last_name}
                          </span>
                        </div>
                      )}

                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Notes:</strong> {log.notes || 'No notes'}
                      </div>

                      {log.callback_requested && (
                        <div className="text-sm">
                          <span className="text-orange-600 font-medium">Callback Requested</span>
                          {log.callback_time && (
                            <span className="text-gray-500 ml-2">
                              for {formatDateTime(log.callback_time).date} {formatDateTime(log.callback_time).time}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const newPage = currentPage - 1
                          setCurrentPage(newPage)
                          fetchCallLogs(newPage)
                        }}
                        disabled={currentPage === 1}
                        className="btn btn-outline btn-sm"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => {
                          const newPage = currentPage + 1
                          setCurrentPage(newPage)
                          fetchCallLogs(newPage)
                        }}
                        disabled={currentPage === totalPages}
                        className="btn btn-outline btn-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}