'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Client, CreateClientRequest } from '@/types'

interface ClientCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  client?: Client | null
}

export default function ClientCreateModal({ 
  isOpen, 
  onClose, 
  onSave, 
  client 
}: ClientCreateModalProps) {
  const [formData, setFormData] = useState<CreateClientRequest>({
    box_number: '',
    size: '',
    contract_no: '',
    principal_key_holder: '',
    principal_key_holder_id_number: '',
    principal_key_holder_email_address: '',
    telephone_cell: '',
    telephone_home: '',
    contract_start_date: '',
    contract_end_date: '',
    occupation: '',
    notes: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!client

  useEffect(() => {
    if (client) {
      setFormData({
        box_number: client.box_number,
        size: client.size,
        contract_no: client.contract_no,
        principal_key_holder: client.principal_key_holder,
        principal_key_holder_id_number: client.principal_key_holder_id_number,
        principal_key_holder_email_address: client.principal_key_holder_email_address,
        telephone_cell: client.telephone_cell,
        telephone_home: client.telephone_home || '',
        contract_start_date: client.contract_start_date,
        contract_end_date: client.contract_end_date,
        occupation: client.occupation,
        notes: client.notes || ''
      })
    } else {
      setFormData({
        box_number: '',
        size: '',
        contract_no: '',
        principal_key_holder: '',
        principal_key_holder_id_number: '',
        principal_key_holder_email_address: '',
        telephone_cell: '',
        telephone_home: '',
        contract_start_date: '',
        contract_end_date: '',
        occupation: '',
        notes: ''
      })
    }
    setErrors({})
  }, [client, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.box_number.trim()) newErrors.box_number = 'Box number is required'
    if (!formData.size.trim()) newErrors.size = 'Size is required'
    if (!formData.contract_no.trim()) newErrors.contract_no = 'Contract number is required'
    if (!formData.principal_key_holder.trim()) newErrors.principal_key_holder = 'Principal key holder name is required'
    if (!formData.principal_key_holder_id_number.trim()) newErrors.principal_key_holder_id_number = 'ID number is required'
    if (!formData.principal_key_holder_email_address.trim()) newErrors.principal_key_holder_email_address = 'Email is required'
    if (!formData.telephone_cell.trim()) newErrors.telephone_cell = 'Cell phone is required'
    if (!formData.contract_start_date) newErrors.contract_start_date = 'Contract start date is required'
    if (!formData.contract_end_date) newErrors.contract_end_date = 'Contract end date is required'
    if (!formData.occupation.trim()) newErrors.occupation = 'Occupation is required'

    // Validate email format
    if (formData.principal_key_holder_email_address && 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.principal_key_holder_email_address)) {
      newErrors.principal_key_holder_email_address = 'Invalid email format'
    }

    // Validate date range
    if (formData.contract_start_date && formData.contract_end_date) {
      const startDate = new Date(formData.contract_start_date)
      const endDate = new Date(formData.contract_end_date)
      if (endDate <= startDate) {
        newErrors.contract_end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      const url = isEditing ? `/api/clients/${client.id}` : '/api/clients'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSave()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save client')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Error saving client')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Box Number *
              </label>
              <input
                type="text"
                name="box_number"
                value={formData.box_number}
                onChange={handleChange}
                className={`input ${errors.box_number ? 'border-red-500' : ''}`}
                placeholder="e.g., BOX001"
              />
              {errors.box_number && (
                <p className="text-red-500 text-sm mt-1">{errors.box_number}</p>
              )}
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size *
              </label>
              <select
                name="size"
                value={formData.size}
                onChange={handleChange}
                className={`input ${errors.size ? 'border-red-500' : ''}`}
              >
                <option value="">Select size</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="Extra Large">Extra Large</option>
              </select>
              {errors.size && (
                <p className="text-red-500 text-sm mt-1">{errors.size}</p>
              )}
            </div>

            {/* Contract Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Number *
              </label>
              <input
                type="text"
                name="contract_no"
                value={formData.contract_no}
                onChange={handleChange}
                className={`input ${errors.contract_no ? 'border-red-500' : ''}`}
                placeholder="e.g., CON001"
              />
              {errors.contract_no && (
                <p className="text-red-500 text-sm mt-1">{errors.contract_no}</p>
              )}
            </div>

            {/* Principal Key Holder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Principal Key Holder *
              </label>
              <input
                type="text"
                name="principal_key_holder"
                value={formData.principal_key_holder}
                onChange={handleChange}
                className={`input ${errors.principal_key_holder ? 'border-red-500' : ''}`}
                placeholder="Full name"
              />
              {errors.principal_key_holder && (
                <p className="text-red-500 text-sm mt-1">{errors.principal_key_holder}</p>
              )}
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Number *
              </label>
              <input
                type="text"
                name="principal_key_holder_id_number"
                value={formData.principal_key_holder_id_number}
                onChange={handleChange}
                className={`input ${errors.principal_key_holder_id_number ? 'border-red-500' : ''}`}
                placeholder="ID number"
              />
              {errors.principal_key_holder_id_number && (
                <p className="text-red-500 text-sm mt-1">{errors.principal_key_holder_id_number}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="principal_key_holder_email_address"
                value={formData.principal_key_holder_email_address}
                onChange={handleChange}
                className={`input ${errors.principal_key_holder_email_address ? 'border-red-500' : ''}`}
                placeholder="email@example.com"
              />
              {errors.principal_key_holder_email_address && (
                <p className="text-red-500 text-sm mt-1">{errors.principal_key_holder_email_address}</p>
              )}
            </div>

            {/* Cell Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cell Phone *
              </label>
              <input
                type="tel"
                name="telephone_cell"
                value={formData.telephone_cell}
                onChange={handleChange}
                className={`input ${errors.telephone_cell ? 'border-red-500' : ''}`}
                placeholder="+27123456789"
              />
              {errors.telephone_cell && (
                <p className="text-red-500 text-sm mt-1">{errors.telephone_cell}</p>
              )}
            </div>

            {/* Home Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Home Phone
              </label>
              <input
                type="tel"
                name="telephone_home"
                value={formData.telephone_home}
                onChange={handleChange}
                className="input"
                placeholder="+27987654321 (optional)"
              />
            </div>

            {/* Contract Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Start Date *
              </label>
              <input
                type="date"
                name="contract_start_date"
                value={formData.contract_start_date}
                onChange={handleChange}
                className={`input ${errors.contract_start_date ? 'border-red-500' : ''}`}
              />
              {errors.contract_start_date && (
                <p className="text-red-500 text-sm mt-1">{errors.contract_start_date}</p>
              )}
            </div>

            {/* Contract End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract End Date *
              </label>
              <input
                type="date"
                name="contract_end_date"
                value={formData.contract_end_date}
                onChange={handleChange}
                className={`input ${errors.contract_end_date ? 'border-red-500' : ''}`}
              />
              {errors.contract_end_date && (
                <p className="text-red-500 text-sm mt-1">{errors.contract_end_date}</p>
              )}
            </div>

            {/* Occupation */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Occupation *
              </label>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                className={`input ${errors.occupation ? 'border-red-500' : ''}`}
                placeholder="Job title or profession"
              />
              {errors.occupation && (
                <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="input"
                placeholder="Additional notes about the client (optional)"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Update Client' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}