'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useRealTime } from '@/contexts/RealTimeContext'
import CallLogModal from '@/components/modals/CallLogModal'
import ClientCreateModal from '@/components/modals/ClientCreateModal'
import ThreeCXCallButton from '@/components/ThreeCXCallButton'
import { Client, CallLog, CreateCallLogRequest } from '@/types'
import { threeCXService, type CallSession } from '@/lib/3cx'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  PhoneArrowUpRightIcon,
  FunnelIcon,
  BarsArrowUpIcon,
  BarsArrowDownIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface ClientsResponse {
  clients: Client[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

type CallStatusFilter = 'all' | 'called' | 'not_called'
type SortField = 'created_at' | 'name' | 'phone' | 'contract' | 'box_number' | 'last_call'
type SortOrder = 'asc' | 'desc'

export default function ClientsPage() {
  const { isAdmin } = useAuth()
  const { refreshTrigger } = useRealTime()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [callStatusFilter, setCallStatusFilter] = useState<CallStatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [clientCallLogs, setClientCallLogs] = useState<CallLog[]>([])
  const [showCallHistory, setShowCallHistory] = useState<string | null>(null)
  const [autoStartTimer, setAutoStartTimer] = useState(false)
  const [callEndedManually, setCallEndedManually] = useState(false)
  const [forceEnd3CXCall, setForceEnd3CXCall] = useState<Record<string, boolean>>({})
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const limit = 10

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        callStatus: callStatusFilter,
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(search && { search }),
      })

      const response = await fetch(`/api/clients?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data: ClientsResponse = await response.json()
        setClients(data.clients)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, callStatusFilter, sortField, sortOrder])

  const fetchClientCallLogs = async (clientId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/call-logs?clientId=${clientId}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setClientCallLogs(data.callLogs || [])
      }
    } catch (error) {
      console.error('Error fetching call logs:', error)
    }
  }

  // 3CX Integration Handlers
  const handle3CXCallStart = useCallback(async (callSession: CallSession) => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await fetch('/api/user-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'start_call',
            client_id: callSession.clientId
          })
        })
      }

      const client = clients.find(c => c.id === callSession.clientId)
      if (client) {
        setSelectedClient(client)
        setAutoStartTimer(true)
        setShowCallModal(true)
        console.log('Call log modal opened for active call to:', client.principal_key_holder)
      }
    } catch (error) {
      console.error('Error updating call status:', error)
    }
  }, [clients])

  const handle3CXCallEnd = useCallback(async (callSession: CallSession) => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await fetch('/api/user-status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'end_call'
          })
        })
      }

      const client = clients.find(c => c.id === callSession.clientId)
      if (client && !showCallModal && !callEndedManually) {
        setSelectedClient(client)
        setAutoStartTimer(false)
        setShowCallModal(true)
        console.log('Call log modal opened after call ended for:', client.principal_key_holder)
      } else if (callEndedManually) {
        console.log('Call was ended manually - not auto-opening modal again')
        setTimeout(() => {
          setCallEndedManually(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Error updating call status:', error)
    }
  }, [clients, showCallModal, callEndedManually])

  const highlightCallbackClient = useCallback((clientId: string) => {
    const clientRow = document.querySelector(`[data-client-id="${clientId}"]`)
    if (clientRow) {
      clientRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clientRow.classList.add('bg-yellow-100', 'border-yellow-500', 'border-2')
      
      setTimeout(() => {
        clientRow.classList.remove('bg-yellow-100', 'border-yellow-500', 'border-2')
      }, 5000)
    }
  }, [])

  const handleCallbackWorkflow = useCallback(async (client: Client, notificationId: string) => {
    try {
      console.log('🚨 Starting callback workflow for:', client.principal_key_holder)
      
      alert(`🚨 CALLBACK DUE NOW!\n\nProcessing callback for:\n${client.principal_key_holder}\n${client.telephone_cell}\n\n3CX will open automatically.`)
      
      const token = localStorage.getItem('token')
      const callbackResponse = await fetch('/api/notifications/callback-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notification_id: notificationId,
          action: 'initiate_call'
        })
      })

      if (!callbackResponse.ok) {
        const error = await callbackResponse.json()
        console.error('Failed to initiate callback action:', error)
      }

      const { threeCXService } = await import('@/lib/3cx')
      
      const callSession = threeCXService.initiateCall(
        client.id, 
        client.telephone_cell, 
        {
          isCallback: true,
          notificationId: notificationId,
          priority: 'overdue'
        }
      )

      await handle3CXCallStart(callSession)
      highlightCallbackClient(client.id)
      
      console.log('✅ Callback workflow initiated successfully')
      
    } catch (error) {
      console.error('Error in callback workflow:', error)
      alert('Failed to process callback. Please try the manual call process.')
      
      setSelectedClient(client)
      setAutoStartTimer(true)
      setShowCallModal(true)
    }
  }, [handle3CXCallStart, highlightCallbackClient])

  const loadClientForCallback = useCallback(async (clientId: string, notificationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/clients/${clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const client = await response.json()
        await handleCallbackWorkflow(client, notificationId)
      } else {
        console.error('Failed to load client for callback workflow')
        alert('Unable to find the client for this callback. Please check the notifications page.')
      }
    } catch (error) {
      console.error('Error loading client for callback:', error)
      alert('Error processing callback workflow. Please try again.')
    }
  }, [handleCallbackWorkflow])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Callback workflow effect
  useEffect(() => {
    if (clients.length > 0) {
      const urlParams = new URLSearchParams(window.location.search)
      const callClientId = urlParams.get('callClient')
      const callbackNotificationId = urlParams.get('callbackNotification')
      
      if (callClientId && callbackNotificationId) {
        console.log('🔄 Processing callback workflow for client:', callClientId)
        
        const targetClient = clients.find(c => c.id === callClientId)
        
        if (targetClient) {
          handleCallbackWorkflow(targetClient, callbackNotificationId)
        } else {
          console.log('⚠️ Target client not found in current page, attempting to load...')
          loadClientForCallback(callClientId, callbackNotificationId)
        }
        
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [clients, handleCallbackWorkflow, loadClientForCallback])

  // Auto-refresh when real-time trigger fires
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchClients()
    }
  }, [refreshTrigger, fetchClients])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const handleCall = (client: Client) => {
    setSelectedClient(client)
    setAutoStartTimer(false)
    setShowCallModal(true)
  }

  // Sorting handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 font-medium"
    >
      <span>{children}</span>
      {sortField === field && (
        sortOrder === 'asc' ? 
          <BarsArrowUpIcon className="w-4 h-4" /> : 
          <BarsArrowDownIcon className="w-4 h-4" />
      )}
    </button>
  )

  // Filter statistics
  const getFilterStats = () => {
    const calledCount = clients.filter(c => c.has_been_called).length
    const notCalledCount = clients.filter(c => !c.has_been_called).length
    return { calledCount, notCalledCount }
  }

  const { calledCount, notCalledCount } = getFilterStats()

  const handleSaveCallLog = async (callLogData: CreateCallLogRequest) => {
    try {
      setCallEndedManually(true)
      console.log('Call log saved - manual end flag set to prevent auto-reopening')
      
      setForceEnd3CXCall(prev => ({
        ...prev,
        [callLogData.client_id]: true
      }))
      
      setTimeout(() => {
        setForceEnd3CXCall(prev => ({
          ...prev,
          [callLogData.client_id]: false
        }))
        console.log('Reset force end flag for client:', callLogData.client_id)
      }, 500)
      
      const token = localStorage.getItem('token')
      const response = await fetch('/api/call-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(callLogData),
      })

      if (response.ok) {
        const callbackContext = localStorage.getItem('threecx_callback_context')
        if (callbackContext) {
          console.log('🗑️ Callback call completed, triggering notification cleanup')
          
          window.dispatchEvent(new CustomEvent('callbackNotificationsDeleted', {
            detail: { 
              clientId: callLogData.client_id,
              reason: 'callback_completed'
            }
          }))
        }
        
        fetchClients()
        
        if (showCallHistory === callLogData.client_id) {
          fetchClientCallLogs(callLogData.client_id)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save call log')
        throw new Error('Failed to save call log')
      }
    } catch (error) {
      console.error('Error saving call log:', error)
      throw error
    }
  }

  const handleSaveClient = async () => {
    try {
      setShowCreateModal(false)
      setSelectedClient(null)
      await fetchClients()
    } catch (error) {
      console.error('Error handling client save:', error)
    }
  }

  const handleViewCallHistory = (client: Client) => {
    setSelectedClient(client)
    setShowCallHistory(client.id)
    fetchClientCallLogs(client.id)
  }

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setShowCreateModal(true)
  }

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete ${client.principal_key_holder}?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchClients()
      } else {
        alert('Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error deleting client')
    }
  }

  // Reset filters
  const handleResetFilters = () => {
    setSearch('')
    setCallStatusFilter('all')
    setSortField('created_at')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Clients Management</h1>
            <p className="text-gray-600">
              Manage client information and track call progress ({totalCount} total)
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="btn btn-secondary"
            >
              <FunnelIcon className="w-5 h-5 mr-2" />
              Filters
            </button>
            <button
              onClick={() => {
                setSelectedClient(null)
                setShowCreateModal(true)
              }}
              className="btn btn-primary"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Client
            </button>
          </div>
        </div>

        {/* Filter Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`card p-4 cursor-pointer border-2 transition-all ${
            callStatusFilter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`} onClick={() => { setCallStatusFilter('all'); setCurrentPage(1) }}>
            <div className="flex items-center">
              <UserGroupIcon className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">All Clients</p>
                <p className="text-2xl font-bold text-blue-600">{totalCount}</p>
              </div>
            </div>
          </div>
          
          <div className={`card p-4 cursor-pointer border-2 transition-all ${
            callStatusFilter === 'called' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
          }`} onClick={() => { setCallStatusFilter('called'); setCurrentPage(1) }}>
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Called</p>
                <p className="text-2xl font-bold text-green-600">{calledCount}</p>
              </div>
            </div>
          </div>
          
          <div className={`card p-4 cursor-pointer border-2 transition-all ${
            callStatusFilter === 'not_called' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
          }`} onClick={() => { setCallStatusFilter('not_called'); setCurrentPage(1) }}>
            <div className="flex items-center">
              <PhoneArrowUpRightIcon className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Not Called</p>
                <p className="text-2xl font-bold text-orange-600">{notCalledCount}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 border-2 border-gray-200">
            <div className="flex items-center">
              <CalendarIcon className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalCount > 0 ? Math.round((calledCount / totalCount) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        {showFilterPanel && (
          <div className="card p-4 bg-gray-50 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Advanced Filters & Sorting</h3>
              <button
                onClick={handleResetFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Call Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Status
                </label>
                <select
                  value={callStatusFilter}
                  onChange={(e) => {
                    setCallStatusFilter(e.target.value as CallStatusFilter)
                    setCurrentPage(1)
                  }}
                  className="input"
                >
                  <option value="all">All Clients</option>
                  <option value="called">Already Called</option>
                  <option value="not_called">Not Called Yet</option>
                </select>
              </div>

              {/* Sort Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortField}
                  onChange={(e) => {
                    setSortField(e.target.value as SortField)
                    setCurrentPage(1)
                  }}
                  className="input"
                >
                  <option value="created_at">Date Added</option>
                  <option value="name">Client Name</option>
                  <option value="phone">Phone Number</option>
                  <option value="contract">Contract Number</option>
                  <option value="box_number">Box Number</option>
                  <option value="last_call">Last Call Date</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as SortOrder)
                    setCurrentPage(1)
                  }}
                  className="input"
                >
                  <option value="desc">Descending (Z-A, Newest First)</option>
                  <option value="asc">Ascending (A-Z, Oldest First)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="card p-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by box number, contract, name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setCurrentPage(1)
                }}
                className="btn btn-secondary"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Active Filter Indicator */}
        {(callStatusFilter !== 'all' || search || sortField !== 'created_at' || sortOrder !== 'desc') && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-800">
                Active filters: 
                {callStatusFilter !== 'all' && ` Status: ${callStatusFilter.replace('_', ' ')}`}
                {search && ` | Search: "${search}"`}
                {sortField !== 'created_at' && ` | Sort: ${sortField.replace('_', ' ')}`}
                {sortOrder !== 'desc' && ` | Order: ${sortOrder}`}
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Clients Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">
                    <SortButton field="box_number">Box Number</SortButton>
                  </th>
                  <th className="table-header">
                    <SortButton field="name">Name</SortButton>
                  </th>
                  <th className="table-header">
                    <SortButton field="phone">Phone</SortButton>
                  </th>
                  <th className="table-header">
                    <SortButton field="contract">Contract</SortButton>
                  </th>
                  <th className="table-header">Call Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr 
                    key={client.id} 
                    data-client-id={client.id}
                    className="hover:bg-gray-50 transition-all duration-300"
                  >
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {client.box_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            Size: {client.size}
                          </div>
                        </div>
                        {!client.has_been_called && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">
                        {client.principal_key_holder}
                      </div>
                      <div className="text-sm text-gray-500">
                        {client.occupation}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">
                        {client.telephone_cell}
                      </div>
                      {client.telephone_home && (
                        <div className="text-sm text-gray-500">
                          Home: {client.telephone_home}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">
                        {client.contract_no}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(client.contract_start_date).toLocaleDateString()} - 
                        {new Date(client.contract_end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col space-y-1">
                        {client.has_been_called ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">
                              Called ({client.total_calls || 0} times)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <PhoneArrowUpRightIcon className="w-4 h-4 text-orange-600" />
                            <span className="text-sm text-orange-600 font-medium">
                              Not called yet
                            </span>
                          </div>
                        )}
                        {client.last_call_date && (
                          <div className="text-xs text-gray-500">
                            Last: {new Date(client.last_call_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-2">
                        <div className="flex space-x-1">
                          <ThreeCXCallButton
                            client={client}
                            onCallStart={handle3CXCallStart}
                            onCallEnd={handle3CXCallEnd}
                            size="sm"
                            showInstructionsProp={true}
                            forceEndCall={forceEnd3CXCall[client.id] || false}
                          />
                        </div>
                        <button
                          onClick={() => handleViewCallHistory(client)}
                          className="p-2 text-info-600 hover:bg-info-50 rounded-lg"
                          title="Call History"
                        >
                          <ClockIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 text-warning-600 hover:bg-warning-50 rounded-lg"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(client)}
                            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {clients.length === 0 && !loading && (
            <div className="text-center py-12">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500 mb-4">
                {search || callStatusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first client.'
                }
              </p>
              {(!search && callStatusFilter === 'all') && (
                <button
                  onClick={() => {
                    setSelectedClient(null)
                    setShowCreateModal(true)
                  }}
                  className="btn btn-primary"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add First Client
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} results
              </div>
              <div className="flex space-x-2">
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
        </div>
      </div>

      {/* Client Create/Edit Modal */}
      {showCreateModal && (
        <ClientCreateModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setSelectedClient(null)
          }}
          onSave={handleSaveClient}
          client={selectedClient}
        />
      )}
      
      {/* Call Log Modal */}
      {showCallModal && selectedClient && (
        <CallLogModal
          isOpen={showCallModal}
          onClose={() => {
            setShowCallModal(false)
            setSelectedClient(null)
            setAutoStartTimer(false)
          }}
          client={selectedClient}
          onSave={handleSaveCallLog}
          autoStartTimer={autoStartTimer}
          onCallEndedManually={() => setCallEndedManually(true)}
        />
      )}

      {/* Call History Modal */}
      {showCallHistory && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Call History</h2>
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium">{selectedClient.principal_key_holder}</p>
                    <p>{selectedClient.telephone_cell}</p>
                    <p>Box: {selectedClient.box_number} | Contract: {selectedClient.contract_no}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCallHistory(null)
                    setSelectedClient(null)
                    setClientCallLogs([])
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {clientCallLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PhoneIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No call history found for this client</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientCallLogs.map((callLog) => (
                    <div key={callLog.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            callLog.call_status === 'completed' ? 'bg-success-100' :
                            callLog.call_status === 'missed' ? 'bg-warning-100' :
                            'bg-danger-100'
                          }`}>
                            {callLog.call_status === 'completed' ? (
                              <CheckCircleIcon className="w-5 h-5 text-success-600" />
                            ) : callLog.call_status === 'missed' ? (
                              <ClockIcon className="w-5 h-5 text-warning-600" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-danger-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium capitalize ${
                                callLog.call_status === 'completed' ? 'text-success-700' :
                                callLog.call_status === 'missed' ? 'text-warning-700' :
                                'text-danger-700'
                              }`}>
                                {callLog.call_status.replace('_', ' ')}
                              </span>
                              <span className="text-sm text-gray-500">
                                {callLog.call_type} call
                              </span>
                              {callLog.call_duration && (
                                <span className="text-sm text-gray-500">
                                  • {Math.floor(callLog.call_duration / 60)}:{(callLog.call_duration % 60).toString().padStart(2, '0')}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {new Date(callLog.created_at).toLocaleDateString()} at{' '}
                              {new Date(callLog.created_at).toLocaleTimeString()}
                            </div>
                            {callLog.users && (
                              <div className="text-sm text-gray-500">
                                by {callLog.users.first_name} {callLog.users.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {callLog.callback_requested && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Callback Requested
                            </span>
                          )}
                        </div>
                      </div>
                      {callLog.notes && (
                        <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded p-3">
                          <strong>Notes:</strong> {callLog.notes}
                        </div>
                      )}
                      {callLog.callback_time && (
                        <div className="mt-2 text-sm text-blue-600">
                          <strong>Callback scheduled for:</strong>{' '}
                          {new Date(callLog.callback_time).toLocaleDateString()} at{' '}
                          {new Date(callLog.callback_time).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}