'use client'

import React, { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { User } from '@/types'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  ShieldCheckIcon,
  XCircleIcon,
  CheckCircleIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'

interface UserWithStats extends User {
  stats: {
    totalCalls: number
    completedCalls: number
    successRate: number
  }
}

interface UsersResponse {
  users: UserWithStats[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

export default function UserManagementPage() {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'user' as 'admin' | 'user',
  })

  const limit = 10

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { isActive: statusFilter }),
      })

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data: UsersResponse = await response.json()
        setUsers(data.users)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, roleFilter, statusFilter])

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers()
    }
  }, [user, isAdmin, fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchUsers()
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowCreateModal(false)
        setFormData({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          role: 'user',
        })
        fetchUsers()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Error creating user')
    }
  }

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        fetchUsers()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user')
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchUsers()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to deactivate user')
      }
    } catch (error) {
      console.error('Error deactivating user:', error)
      alert('Error deactivating user')
    }
  }

  const toggleUserStatus = (userId: string, currentStatus: boolean) => {
    handleUpdateUser(userId, { is_active: !currentStatus })
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to manage users.</p>
        </div>
      </DashboardLayout>
    )
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
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">
              Manage user accounts and monitor performance ({totalCount} total users)
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">User</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Performance (30d)</th>
                  <th className="table-header">Last Login</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-gray-100 mr-3">
                          <UserIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {userItem.first_name} {userItem.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        {userItem.role === 'admin' ? (
                          <ShieldCheckIcon className="w-4 h-4 text-red-600 mr-1" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-blue-600 mr-1" />
                        )}
                        <span className={`capitalize ${
                          userItem.role === 'admin' ? 'text-red-600 font-medium' : 'text-blue-600'
                        }`}>
                          {userItem.role}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => toggleUserStatus(userItem.id, userItem.is_active)}
                        className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          userItem.is_active
                            ? 'bg-success-100 text-success-800 hover:bg-success-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {userItem.is_active ? (
                          <>
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <div className="text-sm">
                          <div className="font-medium">
                            {userItem.stats.totalCalls} calls
                          </div>
                          <div className={`text-xs ${
                            userItem.stats.successRate >= 80 ? 'text-success-600' :
                            userItem.stats.successRate >= 60 ? 'text-warning-600' :
                            'text-danger-600'
                          }`}>
                            {userItem.stats.successRate}% success
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-600">
                        {userItem.last_login 
                          ? new Date(userItem.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingUser(userItem)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {userItem.id !== user?.id && (
                          <button
                            onClick={() => handleDeactivateUser(userItem.id)}
                            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg"
                            title="Deactivate"
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

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="input"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                    className="input"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}