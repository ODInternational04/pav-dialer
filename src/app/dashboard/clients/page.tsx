'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useRealTime } from '@/contexts/RealTimeContext'
import CallLogModal from '@/components/modals/CallLogModal'
import ClientCreateModal from '@/components/modals/ClientCreateModal'
import { Client, CallLog, CreateCallLogRequest } from '@/types'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface ClientsResponse {
  clients: Client[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

export default function ClientsPage() {
  const { isAdmin } = useAuth()
  const { refreshTrigger } = useRealTime()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [clientCallLogs, setClientCallLogs] = useState<CallLog[]>([])
  const [showCallHistory, setShowCallHistory] = useState<string | null>(null)
  const [clientsBeingCalled, setClientsBeingCalled] = useState<Record<string, { userName: string, startTime: string }>>({})

  const limit = 10

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
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
  }, [currentPage, search])

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

  // Fetch current call status for all clients
  const fetchCallStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/user-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const callStatusMap: Record<string, { userName: string, startTime: string }> = {}
        
        data.users?.forEach((user: any) => {
          if (user.is_on_call && user.current_call_client_id) {
            callStatusMap[user.current_call_client_id] = {
              userName: `${user.first_name} ${user.last_name}`,
              startTime: user.call_started_at
            }
          }
        })
        
        setClientsBeingCalled(callStatusMap)
      }
    } catch (error) {
      console.error('Error fetching call status:', error)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchCallStatus()
    
    // Poll call status every 30 seconds
    const interval = setInterval(fetchCallStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchClients])

  // Auto-refresh when real-time trigger fires
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchClients()
      fetchCallStatus()
    }
  }, [refreshTrigger, fetchClients])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchClients()
  }

  const handleCall = (client: Client) => {
    setSelectedClient(client)
    setShowCallModal(true)
  }

  const handleSaveCallLog = async (callLogData: CreateCallLogRequest) => {
    try {
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
        // Refresh the client list to show updated data
        fetchClients()
        // Refresh call status after call is completed
        fetchCallStatus()
        // If viewing call history for this client, refresh that too
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
      // Refresh the client list
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
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600">
              Manage client information and contact details ({totalCount} total)
            </p>
          </div>
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
                  fetchClients()
                }}
                className="btn btn-secondary"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Clients Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Box Number</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">Contract</th>
                  <th className="table-header">Contract Period</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className={`hover:bg-gray-50 ${
                    clientsBeingCalled[client.id] ? 'bg-red-50 border-l-4 border-red-500' : ''
                  }`}>
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
                        {clientsBeingCalled[client.id] && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-red-600 font-medium">
                              Being called
                            </span>
                          </div>
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
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">
                        {new Date(client.contract_start_date).toLocaleDateString()} - 
                        {new Date(client.contract_end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-2">
                        {clientsBeingCalled[client.id] ? (
                          <button
                            disabled
                            className="p-2 text-danger-400 bg-danger-50 rounded-lg cursor-not-allowed"
                            title={`Being called by ${clientsBeingCalled[client.id].userName}`}
                          >
                            <PhoneIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCall(client)}
                            className="p-2 text-success-600 hover:bg-success-50 rounded-lg"
                            title="Log Call"
                          >
                            <PhoneIcon className="w-4 h-4" />
                          </button>
                        )}
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
          }}
          client={selectedClient}
          onSave={handleSaveCallLog}
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