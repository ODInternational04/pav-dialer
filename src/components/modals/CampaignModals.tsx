'use client'

import { useState, useEffect } from 'react'
import { Campaign, User } from '@/types'
import { XMarkIcon } from '@heroicons/react/24/outline'

export function CreateCampaignModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: '',
    status: 'active',
    start_date: '',
    end_date: '',
    client_fields_json: ''
  })
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setJsonError(null)

    let client_fields
    if (formData.client_fields_json.trim()) {
      try {
        client_fields = JSON.parse(formData.client_fields_json)
      } catch {
        setJsonError('Invalid JSON format for custom fields schema')
        return
      }
    }

    const { client_fields_json, ...payload } = formData
    onCreate({ ...payload, client_fields })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Gold Members Q1 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Campaign objectives and details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Department</option>
              <option value="gold">Gold</option>
              <option value="vaults">Vaults</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Client Fields (JSON, optional)
            </label>
            <textarea
              value={formData.client_fields_json}
              onChange={(e) => setFormData({ ...formData, client_fields_json: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
              rows={4}
              placeholder='[{"key":"policy_number","label":"Policy Number","type":"text","required":true}]'
            />
            {jsonError && (
              <p className="text-sm text-red-600 mt-1">{jsonError}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EditCampaignModal({
  campaign,
  onClose,
  onUpdate,
}: {
  campaign: Campaign
  onClose: () => void
  onUpdate: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description || '',
    department: campaign.department || '',
    status: campaign.status,
    start_date: campaign.start_date || '',
    end_date: campaign.end_date || '',
    client_fields_json: campaign.client_fields ? JSON.stringify(campaign.client_fields, null, 2) : ''
  })
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setJsonError(null)

    let client_fields
    if (formData.client_fields_json.trim()) {
      try {
        client_fields = JSON.parse(formData.client_fields_json)
      } catch {
        setJsonError('Invalid JSON format for custom fields schema')
        return
      }
    }

    const { client_fields_json, ...payload } = formData
    onUpdate({ ...payload, client_fields })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Department</option>
              <option value="gold">Gold</option>
              <option value="vaults">Vaults</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Client Fields (JSON, optional)
            </label>
            <textarea
              value={formData.client_fields_json}
              onChange={(e) => setFormData({ ...formData, client_fields_json: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
              rows={4}
              placeholder='[{"key":"policy_number","label":"Policy Number","type":"text","required":true}]'
            />
            {jsonError && (
              <p className="text-sm text-red-600 mt-1">{jsonError}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Update Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AssignUsersModal({
  campaign,
  onClose,
  onAssigned,
}: {
  campaign: Campaign
  onClose: () => void
  onAssigned: () => void
}) {
  const [users, setUsers] = useState<User[]>([])
  const [assignedUsers, setAssignedUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchAssignedUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users?role=user&limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const normalizedUsers = Array.isArray(data) ? data : data?.users || []
        setUsers(normalizedUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignedUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/campaigns/assign?campaign_id=${campaign.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setAssignedUsers(data)
      }
    } catch (error) {
      console.error('Error fetching assigned users:', error)
    }
  }

  const handleAssignUser = async () => {
    if (!selectedUserId) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/campaigns/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          campaign_id: campaign.id,
        }),
      })

      if (response.ok) {
        await fetchAssignedUsers()
        setSelectedUserId('')
        onAssigned()
      }
    } catch (error) {
      console.error('Error assigning user:', error)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/campaigns/assign?user_id=${userId}&campaign_id=${campaign.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.ok) {
        await fetchAssignedUsers()
        onAssigned()
      }
    } catch (error) {
      console.error('Error removing user:', error)
    }
  }

  const availableUsers = users.filter(
    (user) => !assignedUsers.some((au) => au.user_id === user.id)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assign Users to Campaign</h2>
            <p className="text-gray-600 text-sm mt-1">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Assign New User */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign New User
            </label>
            <div className="flex space-x-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignUser}
                disabled={!selectedUserId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </div>

          {/* Assigned Users List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Assigned Users ({assignedUsers.length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : assignedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users assigned yet. Assign users to give them access to this campaign.
              </div>
            ) : (
              <div className="space-y-2">
                {assignedUsers.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {assignment.users?.first_name} {assignment.users?.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{assignment.users?.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(assignment.user_id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export function ImportClientsModal({
  campaign,
  onClose,
  onImported,
}: {
  campaign: Campaign
  onClose: () => void
  onImported: () => void
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [assignToUser, setAssignToUser] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    // Fetch users for assignment option
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/users?role=user&limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          const normalizedUsers = Array.isArray(data) ? data : data?.users || []
          setUsers(normalizedUsers)
        } else {
          setUsers([])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
        setUsers([])
      }
    }
    fetchUsers()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('campaign_id', campaign.id)
      if (assignToUser) {
        formData.append('assign_to_user', assignToUser)
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/campaigns/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()
      setResult(data)

      if (response.ok && data.success) {
        onImported()
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      setResult({ success: false, error: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Clients from CSV</h2>
            <p className="text-gray-600 text-sm mt-1">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Optional: Assign to specific user */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign all imported clients to user (optional)
            </label>
            <select
              value={assignToUser}
              onChange={(e) => setAssignToUser(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No specific assignment</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Import Result */}
          {result && (
            <div
              className={`p-4 rounded-lg ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <div>
                  <p className="font-semibold text-green-800 mb-2">
                    ✓ Import Successful!
                  </p>
                  <p className="text-sm text-green-700">
                    Processed: {result.imported_count} clients
                    {typeof result.created_count === 'number' && (
                      <span> | New: {result.created_count}</span>
                    )}
                    {typeof result.updated_count === 'number' && (
                      <span> | Existing: {result.updated_count}</span>
                    )}
                    {result.failed_count > 0 && (
                      <span> | Failed: {result.failed_count}</span>
                    )}
                  </p>
                  {result.failed_rows && result.failed_rows.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-700">Failed rows:</p>
                      <ul className="text-xs text-red-600 mt-1 max-h-40 overflow-y-auto">
                        {result.failed_rows.slice(0, 10).map((fail: any, idx: number) => (
                          <li key={idx}>
                            Row {fail.row}: {fail.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-red-800 mb-2">✗ Import Failed</p>
                  <p className="text-sm text-red-700">{result.error || result.details}</p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">📋 CSV Format Requirements:</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>First row must contain column headers</li>
              <li>Required fields: box_number, size, contract_no, principal_key_holder, id_number, email, cell, start_date, end_date, occupation</li>
              <li>Optional fields: telephone_home, gender, notes</li>
              <li>Dates must be in YYYY-MM-DD format</li>
              <li>Download the template for correct formatting</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || uploading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {uploading ? 'Importing...' : 'Import Clients'}
          </button>
        </div>
      </div>
    </div>
  )
}
