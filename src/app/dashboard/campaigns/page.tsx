'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { 
  CreateCampaignModal,
  EditCampaignModal,
  AssignUsersModal,
  ImportClientsModal
} from '@/components/modals/CampaignModals'
import { 
  Campaign
} from '@/types'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function CampaignsPage() {
  const { user, isAdmin } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')

  useEffect(() => {
    fetchCampaigns()
  }, [filterStatus, filterDepartment])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        status: filterStatus,
        department: filterDepartment,
      })

      const response = await fetch(`/api/campaigns?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async (campaignData: any) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      })

      if (response.ok) {
        await fetchCampaigns()
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
    }
  }

  const handleUpdateCampaign = async (campaignData: any) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      })

      if (response.ok) {
        await fetchCampaigns()
        setSelectedCampaign(null)
      }
    } catch (error) {
      console.error('Error updating campaign:', error)
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This will also remove all user assignments.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/campaigns?id=${campaignId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchCampaigns()
      }
    } catch (error) {
      console.error('Error deleting campaign:', error)
    }
  }

  const downloadCSVTemplate = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/campaigns/import', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'client_import_template.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading template:', error)
    }
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to manage campaigns.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Campaign Management</h1>
            <p className="text-indigo-100">
              Create campaigns, assign users, and import clients in bulk
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={downloadCSVTemplate}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>Download Template</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Campaign</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Departments</option>
              <option value="gold">Gold</option>
              <option value="vaults">Vaults</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Campaigns Found</h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first campaign
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onEdit={setSelectedCampaign}
                onDelete={handleDeleteCampaign}
                onAssignUsers={() => {
                  setSelectedCampaign(campaign)
                  setShowAssignModal(true)
                }}
                onImportClients={() => {
                  setSelectedCampaign(campaign)
                  setShowImportModal(true)
                }}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateCampaignModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateCampaign}
          />
        )}

        {selectedCampaign && !showAssignModal && !showImportModal && (
          <EditCampaignModal
            campaign={selectedCampaign}
            onClose={() => setSelectedCampaign(null)}
            onUpdate={handleUpdateCampaign}
          />
        )}

        {showAssignModal && selectedCampaign && (
          <AssignUsersModal
            campaign={selectedCampaign}
            onClose={() => {
              setShowAssignModal(false)
              setSelectedCampaign(null)
            }}
            onAssigned={fetchCampaigns}
          />
        )}

        {showImportModal && selectedCampaign && (
          <ImportClientsModal
            campaign={selectedCampaign}
            onClose={() => {
              setShowImportModal(false)
              setSelectedCampaign(null)
            }}
            onImported={fetchCampaigns}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

// Campaign Card Component
function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onAssignUsers,
  onImportClients,
}: {
  campaign: Campaign
  onEdit: (campaign: Campaign) => void
  onDelete: (id: string) => void
  onAssignUsers: () => void
  onImportClients: () => void
}) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-red-100 text-red-800',
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {campaign.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                {campaign.status}
              </span>
              {campaign.department && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {campaign.department}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => onEdit(campaign)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Edit"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(campaign.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Target</p>
            <p className="text-lg font-semibold text-gray-900">{campaign.target_count}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-lg font-semibold text-gray-900">{campaign.completed_count}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onAssignUsers}
            className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center space-x-1 text-sm"
          >
            <UserGroupIcon className="w-4 h-4" />
            <span>Assign Users</span>
          </button>
          <button
            onClick={onImportClients}
            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center space-x-1 text-sm"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Modals would be separate components - continuing in next message due to size
