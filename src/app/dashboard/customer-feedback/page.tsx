'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useRealTime } from '@/contexts/RealTimeContext'
import { throttledApiCall, debounce } from '@/lib/requestThrottle'
import { CustomerFeedback, FeedbackStatistics, CustomerFeedbackFilters } from '@/types'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  LightBulbIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  PencilIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface FeedbackResponse {
  feedback: CustomerFeedback[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const FEEDBACK_TYPES = [
  { value: 'all', label: 'All Types', icon: ChatBubbleLeftIcon, color: 'gray' },
  { value: 'complaint', label: 'Complaints', icon: ExclamationTriangleIcon, color: 'red' },
  { value: 'happy', label: 'Happy', icon: FaceSmileIcon, color: 'green' },
  { value: 'suggestion', label: 'Suggestions', icon: LightBulbIcon, color: 'blue' },
  { value: 'general', label: 'General', icon: ChatBubbleLeftIcon, color: 'gray' }
]

const PRIORITIES = [
  { value: 'all', label: 'All Priorities', color: 'gray' },
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' }
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: true, label: 'Resolved' },
  { value: false, label: 'Pending' }
]

export default function CustomerFeedbackPage() {
  const { isAdmin } = useAuth()
  const { refreshTrigger } = useRealTime()
  const router = useRouter()
  const [feedback, setFeedback] = useState<CustomerFeedback[]>([])
  const [stats, setStats] = useState<FeedbackStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<CustomerFeedback | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [exportLoading, setExportLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'latest' | 'all'>('latest')
  const [clientHistoryModal, setClientHistoryModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [clientFeedbackHistory, setClientFeedbackHistory] = useState<CustomerFeedback[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)

  const [filters, setFilters] = useState<CustomerFeedbackFilters>({
    feedback_type: 'all',
    priority: 'all',
    is_resolved: 'all',
    search: '',
    start_date: '',
    end_date: ''
  })

  const limit = 10

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard')
      return
    }
  }, [isAdmin, router])

  const fetchFeedback = useCallback(async () => {
    if (!isAdmin) return
    
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString()
      })

      // Add filters to params
      if (filters.feedback_type && filters.feedback_type !== 'all') {
        params.append('feedback_type', filters.feedback_type)
      }
      if (filters.priority && filters.priority !== 'all') {
        params.append('priority', filters.priority)
      }
      if (filters.is_resolved !== 'all' && filters.is_resolved !== undefined) {
        params.append('is_resolved', filters.is_resolved.toString())
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.start_date) {
        params.append('start_date', filters.start_date)
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date)
      }

      // Choose endpoint based on view mode
      const endpoint = viewMode === 'latest' 
        ? `/api/customer-feedback/latest-per-client?${params}`
        : `/api/customer-feedback?${params}`

      const cacheKey = `feedback-${viewMode}-${currentPage}-${params.toString()}`
      
      const data: FeedbackResponse = await throttledApiCall(
        endpoint,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        },
        cacheKey,
        30000 // Cache for 30 seconds
      )

      setFeedback(data.feedback)
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.totalCount)
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters, isAdmin, viewMode])

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const data = await throttledApiCall(
        '/api/customer-feedback/stats',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        },
        'feedback-stats',
        120000 // Cache for 2 minutes
      )

      setStats(data.statistics)
    } catch (error) {
      console.error('Error fetching feedback stats:', error)
    }
  }, [isAdmin])

  useEffect(() => {
    fetchFeedback()
    fetchStats()
  }, [fetchFeedback, fetchStats])

  // Reset page when view mode changes
  useEffect(() => {
    setCurrentPage(1)
  }, [viewMode])

  const handleFilterChange = (key: keyof CustomerFeedbackFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({
      feedback_type: 'all',
      priority: 'all',
      is_resolved: 'all',
      search: '',
      start_date: '',
      end_date: ''
    })
    setCurrentPage(1)
  }

  const getFeedbackTypeIcon = (type: string) => {
    const typeConfig = FEEDBACK_TYPES.find(t => t.value === type)
    return typeConfig?.icon || ChatBubbleLeftIcon
  }

  const getFeedbackTypeColor = (type: string) => {
    const typeConfig = FEEDBACK_TYPES.find(t => t.value === type)
    return typeConfig?.color || 'gray'
  }

  const getPriorityColor = (priority: string) => {
    const priorityConfig = PRIORITIES.find(p => p.value === priority)
    return priorityConfig?.color || 'gray'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const resolveFeedback = async (id: string, isResolved: boolean, resolutionNotes?: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/customer-feedback/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_resolved: isResolved,
          resolution_notes: resolutionNotes
        })
      })

      if (response.ok) {
        fetchFeedback()
        fetchStats()
      } else {
        console.error('Failed to update feedback')
      }
    } catch (error) {
      console.error('Error updating feedback:', error)
    }
  }

  const fetchClientHistory = async (clientId: string, page = 1) => {
    try {
      setHistoryLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      const data = await throttledApiCall(
        `/api/customer-feedback/client/${clientId}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        },
        `client-history-${clientId}-${page}`,
        60000 // Cache for 1 minute
      )

      setSelectedClient(data.client)
      setClientFeedbackHistory(data.feedback)
      setHistoryTotalPages(data.pagination.totalPages)
      setHistoryPage(page)
    } catch (error) {
      console.error('Error fetching client history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const showClientHistory = (clientId: string) => {
    setClientHistoryModal(true)
    fetchClientHistory(clientId)
  }

  const exportToCSV = async () => {
    try {
      setExportLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const params = new URLSearchParams()

      // Add current filters to export
      if (filters.feedback_type && filters.feedback_type !== 'all') {
        params.append('feedback_type', filters.feedback_type)
      }
      if (filters.priority && filters.priority !== 'all') {
        params.append('priority', filters.priority)
      }
      if (filters.is_resolved !== 'all' && filters.is_resolved !== undefined) {
        params.append('is_resolved', filters.is_resolved.toString())
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.start_date) {
        params.append('start_date', filters.start_date)
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date)
      }

      const response = await fetch(`/api/customer-feedback/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Get the filename from the response headers or create a default one
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename="')[1]?.replace('"', '') 
          : `customer-feedback-export-${new Date().toISOString().split('T')[0]}.csv`

        // Create blob and download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        console.error('Failed to export feedback')
        alert('Failed to export feedback. Please try again.')
      }
    } catch (error) {
      console.error('Error exporting feedback:', error)
      alert('Error exporting feedback. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  // If not admin, show loading or redirect
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-500">Redirecting...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Feedback</h1>
            <p className="text-gray-600 mt-1">Manage customer feedback, complaints, and suggestions</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToCSV}
              disabled={exportLoading}
              className="btn btn-secondary flex items-center"
              title="Export filtered results to CSV"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center`}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">View Mode</h3>
              <p className="text-sm text-gray-600 mt-1">
                {viewMode === 'latest' 
                  ? 'Showing latest feedback per client (click client name to see history)'
                  : 'Showing all feedback records'}
              </p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('latest')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'latest'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Latest per Client
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                All Feedback
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ChatBubbleLeftIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Feedback</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_feedback}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Complaints</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.complaints_count}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.resolved_count}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_count}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search subject or notes..."
                    className="input pl-10"
                  />
                </div>
              </div>

              {/* Feedback Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.feedback_type}
                  onChange={(e) => handleFilterChange('feedback_type', e.target.value)}
                  className="input"
                >
                  {FEEDBACK_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="input"
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.is_resolved?.toString() || 'all'}
                  onChange={(e) => handleFilterChange('is_resolved', e.target.value === 'all' ? 'all' : e.target.value === 'true')}
                  className="input"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value.toString()} value={status.value.toString()}>{status.label}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="input"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="input"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end xl:col-span-6">
                <button
                  onClick={clearFilters}
                  className="btn btn-secondary w-full xl:w-auto"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading feedback...</p>
            </div>
          ) : feedback.length === 0 ? (
            <div className="p-8 text-center">
              <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No feedback found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {feedback.map((item) => {
                      const TypeIcon = getFeedbackTypeIcon(item.feedback_type)
                      const typeColor = getFeedbackTypeColor(item.feedback_type)
                      const priorityColor = getPriorityColor(item.priority)

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`p-2 bg-${typeColor}-100 rounded-lg`}>
                                <TypeIcon className={`w-4 h-4 text-${typeColor}-600`} />
                              </div>
                              <span className="ml-3 text-sm font-medium text-gray-900 capitalize">
                                {item.feedback_type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {viewMode === 'latest' ? (
                                  <button
                                    onClick={() => showClientHistory(item.client_id)}
                                    className="text-blue-600 hover:text-blue-900 hover:underline"
                                    title="View feedback history for this client"
                                  >
                                    {item.clients?.name}
                                  </button>
                                ) : (
                                  item.clients?.name
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.clients?.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {item.subject}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${priorityColor}-100 text-${priorityColor}-800 capitalize`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.is_resolved ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                Resolved
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                <ClockIcon className="w-4 h-4 mr-1" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedFeedback(item)
                                  setShowFeedbackModal(true)
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              {!item.is_resolved && (isAdmin || item.user_id === item.users?.id) && (
                                <button
                                  onClick={() => resolveFeedback(item.id, true, 'Resolved from feedback list')}
                                  className="text-green-600 hover:text-green-900"
                                  title="Mark as Resolved"
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {feedback.length} of {totalCount} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Feedback Detail Modal */}
        {showFeedbackModal && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Feedback Details</h2>
                    <div className="flex items-center mt-2 space-x-4">
                      {(() => {
                        const TypeIcon = getFeedbackTypeIcon(selectedFeedback.feedback_type)
                        const typeColor = getFeedbackTypeColor(selectedFeedback.feedback_type)
                        return (
                          <div className="flex items-center">
                            <div className={`p-1 bg-${typeColor}-100 rounded`}>
                              <TypeIcon className={`w-4 h-4 text-${typeColor}-600`} />
                            </div>
                            <span className="ml-2 text-sm font-medium capitalize">{selectedFeedback.feedback_type}</span>
                          </div>
                        )
                      })()}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${getPriorityColor(selectedFeedback.priority)}-100 text-${getPriorityColor(selectedFeedback.priority)}-800 capitalize`}>
                        {selectedFeedback.priority}
                      </span>
                      {selectedFeedback.is_resolved ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Client Information */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Client Information</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm"><strong>Name:</strong> {selectedFeedback.clients?.name}</p>
                    <p className="text-sm"><strong>Email:</strong> {selectedFeedback.clients?.email || 'No email'}</p>
                    <p className="text-sm"><strong>Phone:</strong> {selectedFeedback.clients?.phone}</p>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Subject</h3>
                  <p className="text-sm text-gray-700">{selectedFeedback.subject}</p>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedFeedback.notes}</p>
                  </div>
                </div>

                {/* Resolution */}
                {selectedFeedback.is_resolved && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Resolution</h3>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Resolved by:</strong> {selectedFeedback.resolved_by_user?.first_name} {selectedFeedback.resolved_by_user?.last_name}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Resolved on:</strong> {selectedFeedback.resolved_at ? formatDate(selectedFeedback.resolved_at) : 'N/A'}
                      </p>
                      {selectedFeedback.resolution_notes && (
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>Notes:</strong> {selectedFeedback.resolution_notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Created:</strong> {formatDate(selectedFeedback.created_at)}
                    </div>
                    <div>
                      <strong>By:</strong> {selectedFeedback.users?.first_name} {selectedFeedback.users?.last_name}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!selectedFeedback.is_resolved && (isAdmin || selectedFeedback.user_id === selectedFeedback.users?.id) && (
                  <div className="border-t pt-4">
                    <button
                      onClick={() => {
                        const notes = prompt('Resolution notes (optional):')
                        if (notes !== null) {
                          resolveFeedback(selectedFeedback.id, true, notes)
                          setShowFeedbackModal(false)
                        }
                      }}
                      className="btn btn-success w-full"
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Client History Modal */}
        {clientHistoryModal && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-5xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Feedback History</h2>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        <strong>Client:</strong> {selectedClient.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Email:</strong> {selectedClient.email || 'No email'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Phone:</strong> {selectedClient.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setClientHistoryModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading feedback history...</p>
                  </div>
                ) : clientFeedbackHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No feedback history found for this client</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {clientFeedbackHistory.map((item, index) => {
                        const TypeIcon = getFeedbackTypeIcon(item.feedback_type)
                        const typeColor = getFeedbackTypeColor(item.feedback_type)
                        const priorityColor = getPriorityColor(item.priority)

                        return (
                          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 bg-${typeColor}-100 rounded-lg`}>
                                  <TypeIcon className={`w-4 h-4 text-${typeColor}-600`} />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium capitalize">{item.feedback_type}</span>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${priorityColor}-100 text-${priorityColor}-800 capitalize`}>
                                      {item.priority}
                                    </span>
                                    {item.is_resolved ? (
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                                        Resolved
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                        <ClockIcon className="w-3 h-3 mr-1" />
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatDate(item.created_at)} by {item.users?.first_name} {item.users?.last_name}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedFeedback(item)
                                  setShowFeedbackModal(true)
                                }}
                                className="text-blue-600 hover:text-blue-900 text-sm"
                              >
                                View Details
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{item.subject}</h4>
                              </div>
                              <div>
                                <p className="text-sm text-gray-700" style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {item.notes}
                                </p>
                              </div>
                              {item.is_resolved && item.resolution_notes && (
                                <div className="bg-green-50 p-2 rounded">
                                  <p className="text-xs text-green-800">
                                    <strong>Resolution:</strong> {item.resolution_notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* History Pagination */}
                    {historyTotalPages > 1 && (
                      <div className="mt-6 flex items-center justify-center space-x-2">
                        <button
                          onClick={() => fetchClientHistory(selectedClient.id, Math.max(1, historyPage - 1))}
                          disabled={historyPage === 1}
                          className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-2 text-sm text-gray-700">
                          Page {historyPage} of {historyTotalPages}
                        </span>
                        <button
                          onClick={() => fetchClientHistory(selectedClient.id, Math.min(historyTotalPages, historyPage + 1))}
                          disabled={historyPage === historyTotalPages}
                          className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}