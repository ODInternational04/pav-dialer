'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Client, CreateCallLogRequest } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { 
  XMarkIcon,
  PhoneIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  LightBulbIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface InboundCallWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (callLog: CreateCallLogRequest, client: Client) => Promise<void>
}

interface QuickClientData {
  phone: string
  name: string
  email?: string
}

type WizardStep = 'capture' | 'match' | 'create' | 'complete'

export default function InboundCallWizard({ 
  isOpen, 
  onClose,
  onComplete 
}: InboundCallWizardProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<WizardStep>('capture')
  const [quickData, setQuickData] = useState<QuickClientData>({
    phone: '',
    name: '',
    email: ''
  })
  const [searchResults, setSearchResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [callStartTime, setCallStartTime] = useState<Date>(new Date())
  const [currentDuration, setCurrentDuration] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset the start time to NOW when modal opens
      setCallStartTime(new Date())
      setCurrentDuration(0)
    }
  }, [isOpen])

  // Call timer
  useEffect(() => {
    if (isOpen) {
      timerRef.current = setInterval(() => {
        setCurrentDuration(Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isOpen, callStartTime])

  // Search for clients when phone or name changes
  useEffect(() => {
    const searchQuery = quickData.phone || quickData.name
    
    if (searchQuery.length >= 3) {
      const debounceTimer = setTimeout(() => {
        searchClients(searchQuery)
      }, 500)

      return () => clearTimeout(debounceTimer)
    } else {
      setSearchResults([])
    }
  }, [quickData.phone, quickData.name])

  const searchClients = async (query: string) => {
    setIsSearching(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/clients/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.clients || [])
      }
    } catch (error) {
      console.error('Error searching clients:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleSelectExistingClient = (client: Client) => {
    setSelectedClient(client)
    setCurrentStep('complete')
  }

  const handleCreateNewClient = () => {
    setCurrentStep('create')
  }

  const handleClientCreated = async (clientData: Partial<Client>) => {
    setIsCreatingClient(true)
    try {
      const token = localStorage.getItem('token')
      console.log('Creating client with data:', clientData)
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(clientData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Client created successfully:', result)
        setSelectedClient(result.client || result)
        setCurrentStep('complete')
      } else {
        const errorData = await response.json()
        console.error('Failed to create client:', errorData)
        throw new Error(errorData.error || 'Failed to create client')
      }
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Failed to create client. Please try again.\n\nError: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsCreatingClient(false)
    }
  }

  const handleCompleteCall = async (callData: any) => {
    if (!selectedClient) return

    const callLog: CreateCallLogRequest = {
      client_id: selectedClient.id,
      call_type: 'inbound',
      call_status: callData.call_status || 'completed',
      call_duration: currentDuration,
      notes: callData.notes || '',
      callback_requested: callData.callback_requested || false,
      callback_time: callData.callback_time || ''
    }

    await onComplete(callLog, selectedClient)

    // Save customer feedback if enabled
    if (callData.feedback_enabled && callData.feedback_subject && callData.feedback_notes) {
      try {
        const token = localStorage.getItem('token')
        const feedbackResponse = await fetch('/api/customer-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            client_id: selectedClient.id,
            feedback_type: callData.feedback_type,
            subject: callData.feedback_subject,
            notes: callData.feedback_notes,
            priority: callData.feedback_priority
          })
        })

        if (!feedbackResponse.ok) {
          console.error('Failed to save customer feedback')
        }
      } catch (error) {
        console.error('Error saving customer feedback:', error)
      }
    }

    handleClose()
  }

  const handleClose = () => {
    setCurrentStep('capture')
    setQuickData({ phone: '', name: '', email: '' })
    setSearchResults([])
    setSelectedClient(null)
    setCurrentDuration(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white px-6 py-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="flex items-center space-x-4 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
              <PhoneIcon className="w-8 h-8 animate-pulse relative" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Incoming Call</h2>
              <div className="flex items-center space-x-2 text-sm text-green-100 mt-1">
                <ClockIcon className="w-4 h-4" />
                <span className="font-mono text-base font-semibold">{formatDuration(currentDuration)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 relative z-10"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)] bg-gradient-to-b from-gray-50 to-white">
          {/* Step 1: Capture Info */}
          {currentStep === 'capture' && (
            <CaptureStep
              quickData={quickData}
              setQuickData={setQuickData}
              searchResults={searchResults}
              isSearching={isSearching}
              onSelectClient={handleSelectExistingClient}
              onCreateNew={handleCreateNewClient}
            />
          )}

          {/* Step 2: Create Client */}
          {currentStep === 'create' && (
            <CreateClientStep
              quickData={quickData}
              onSave={handleClientCreated}
              onBack={() => setCurrentStep('capture')}
              isLoading={isCreatingClient}
            />
          )}

          {/* Step 3: Complete Call Log */}
          {currentStep === 'complete' && selectedClient && (
            <CompleteCallStep
              client={selectedClient}
              duration={currentDuration}
              onSave={handleCompleteCall}
              onBack={() => setCurrentStep('capture')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Step 1: Capture caller info and search
function CaptureStep({ 
  quickData, 
  setQuickData, 
  searchResults, 
  isSearching,
  onSelectClient,
  onCreateNew
}: {
  quickData: QuickClientData
  setQuickData: (data: QuickClientData) => void
  searchResults: Client[]
  isSearching: boolean
  onSelectClient: (client: Client) => void
  onCreateNew: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-emerald-900 mb-4 flex items-center text-lg">
          <div className="p-2 bg-emerald-600 rounded-lg mr-3">
            <PhoneIcon className="w-5 h-5 text-white" />
          </div>
          Caller Information
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={quickData.phone}
              onChange={(e) => setQuickData({ ...quickData, phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 text-lg"
              placeholder="e.g., 555-1234"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Caller Name *
            </label>
            <input
              type="text"
              value={quickData.name}
              onChange={(e) => setQuickData({ ...quickData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 text-lg"
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={quickData.email}
              onChange={(e) => setQuickData({ ...quickData, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200"
              placeholder="e.g., john@example.com"
            />
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center text-lg">
            <MagnifyingGlassIcon className="w-5 h-5 mr-2 text-emerald-600" />
            Matching Clients
          </h3>
          {isSearching && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
        </div>

        {searchResults.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {searchResults.map((client) => (
              <button
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 group transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-emerald-900">{client.principal_key_holder}</p>
                    <p className="text-sm text-gray-600 mt-1">📦 Box: {client.box_number} | 📱 {client.telephone_cell}</p>
                    <p className="text-xs text-gray-500 mt-1">📄 Contract: {client.contract_no}</p>
                  </div>
                  <ArrowRightIcon className="w-6 h-6 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-3 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <UserPlusIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-4">
              {quickData.phone || quickData.name 
                ? 'No matching clients found' 
                : 'Enter phone or name to search'}
            </p>
            {(quickData.phone || quickData.name) && (
              <button
                onClick={onCreateNew}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <UserPlusIcon className="w-5 h-5 mr-2" />
                Create New Client
              </button>
            )}
          </div>
        )}

        {searchResults.length > 0 && (
          <button
            onClick={onCreateNew}
            className="w-full mt-4 px-5 py-3 border-2 border-emerald-600 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all duration-200 flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Not Listed - Create New Client
          </button>
        )}
      </div>
    </div>
  )
}

// Step 2: Create new client
function CreateClientStep({
  quickData,
  onSave,
  onBack,
  isLoading
}: {
  quickData: QuickClientData
  onSave: (client: Partial<Client>) => void
  onBack: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    client_type: 'vault' as 'vault' | 'gold',
    box_number: '',
    size: '',
    contract_no: '',
    principal_key_holder: quickData.name,
    principal_key_holder_id_number: '',
    principal_key_holder_email_address: quickData.email || '',
    telephone_cell: quickData.phone,
    telephone_home: '',
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    occupation: '',
    notes: 'Created during incoming call',
    gender: 'unknown' as 'male' | 'female' | 'other' | 'unknown',
    campaign_id: undefined as string | undefined,
    assigned_to: undefined as string | undefined,
    custom_fields: undefined as Record<string, any> | undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Common required fields for both types
    if (!formData.principal_key_holder.trim()) newErrors.principal_key_holder = 'Name is required'
    if (!formData.telephone_cell.trim()) newErrors.telephone_cell = 'Phone is required'
    
    // Email is not required for gold clients, only for vault
    // For vault clients, only name and phone are required (no other fields)

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      // For Gold clients, only send required fields and let API set defaults
      const clientData = formData.client_type === 'gold' 
        ? {
            client_type: formData.client_type,
            principal_key_holder: formData.principal_key_holder,
            principal_key_holder_email_address: formData.principal_key_holder_email_address,
            telephone_cell: formData.telephone_cell,
            telephone_home: formData.telephone_home,
            notes: formData.notes,
            gender: formData.gender,
            campaign_id: formData.campaign_id,
            assigned_to: formData.assigned_to,
            custom_fields: formData.custom_fields
          }
        : formData
      
      onSave(clientData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-blue-900 mb-2 flex items-center text-lg">
          <div className="p-2 bg-blue-600 rounded-lg mr-3\">
            <UserPlusIcon className="w-5 h-5 text-white" />
          </div>
          Create New Client Record
        </h3>
        <p className="text-sm text-blue-700 ml-12">Fill in the essential details. You can update more information later.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Client Type</label>
          <select
            value={formData.client_type}
            onChange={(e) => setFormData({ ...formData, client_type: e.target.value as any })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-lg font-medium"
          >
            <option value="vault">🔒 Vault</option>
            <option value="gold">⭐ Gold</option>
          </select>
          <p className="text-xs text-gray-500 mt-2 flex items-center">
            {formData.client_type === 'gold' ? '⭐ Gold clients require minimal information' : '🔒 Vault clients require full details'}
          </p>
        </div>

        {/* Full Name - Required for both */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
          <input
            type="text"
            value={formData.principal_key_holder}
            onChange={(e) => setFormData({ ...formData, principal_key_holder: e.target.value })}
            className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:ring-4 ${errors.principal_key_holder ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
          />
          {errors.principal_key_holder && <p className="text-sm text-red-600 mt-2 font-medium">⚠️ {errors.principal_key_holder}</p>}
        </div>

        {/* Email - Optional */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={formData.principal_key_holder_email_address}
            onChange={(e) => setFormData({ ...formData, principal_key_holder_email_address: e.target.value })}
            className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:ring-4 ${errors.principal_key_holder_email_address ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
          />
          {errors.principal_key_holder_email_address && <p className="text-sm text-red-600 mt-2 font-medium">⚠️ {errors.principal_key_holder_email_address}</p>}
        </div>

        {/* Cell Phone - Required for both */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cell Phone *</label>
          <input
            type="tel"
            value={formData.telephone_cell}
            onChange={(e) => setFormData({ ...formData, telephone_cell: e.target.value })}
            className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:ring-4 ${errors.telephone_cell ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
          />
          {errors.telephone_cell && <p className="text-sm text-red-600 mt-2 font-medium">⚠️ {errors.telephone_cell}</p>}
        </div>

        {/* Home Phone - Optional for both */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Home Phone</label>
          <input
            type="tel"
            value={formData.telephone_home}
            onChange={(e) => setFormData({ ...formData, telephone_home: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
          />
        </div>

        {/* Vault-specific fields */}
        {formData.client_type === 'vault' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Box Number</label>
              <input
                type="text"
                value={formData.box_number}
                onChange={(e) => setFormData({ ...formData, box_number: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:ring-4 ${errors.box_number ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
              />
              {errors.box_number && <p className="text-sm text-red-600 mt-2 font-medium">⚠️ {errors.box_number}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Size</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                placeholder="e.g., Small, Medium, Large"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contract Number</label>
              <input
                type="text"
                value={formData.contract_no}
                onChange={(e) => setFormData({ ...formData, contract_no: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:ring-4 ${errors.contract_no ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
              />
              {errors.contract_no && <p className="text-sm text-red-600 mt-2 font-medium">⚠️ {errors.contract_no}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ID Number</label>
              <input
                type="text"
                value={formData.principal_key_holder_id_number}
                onChange={(e) => setFormData({ ...formData, principal_key_holder_id_number: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:ring-4 ${errors.principal_key_holder_id_number ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
              />
              {errors.principal_key_holder_id_number && <p className="text-sm text-red-600 mt-2 font-medium">⚠️ {errors.principal_key_holder_id_number}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Occupation</label>
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              />
            </div>
          </>
        )}
      </div>

      {/* Notes - Available for both */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 h-24 resize-none"
          placeholder="Any additional information about this client..."
        />
      </div>

      <div className="flex items-center justify-end space-x-4 pt-6 border-t-2 border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create & Continue'}
          <ArrowRightIcon className="w-5 h-5 ml-2" />
        </button>
      </div>
    </form>
  )
}

// Step 3: Complete call log
function CompleteCallStep({
  client,
  duration,
  onSave,
  onBack
}: {
  client: Client
  duration: number
  onSave: (callData: Partial<CreateCallLogRequest>) => void
  onBack: () => void
}) {
  const [formData, setFormData] = useState({
    call_status: 'completed' as any,
    notes: '',
    callback_requested: false,
    callback_time: '',
    // Customer feedback fields
    feedback_enabled: false,
    feedback_type: 'general' as 'complaint' | 'happy' | 'suggestion' | 'general',
    feedback_subject: '',
    feedback_notes: '',
    feedback_priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Summary */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-green-900 flex items-center text-lg">
            <div className="p-2 bg-green-600 rounded-lg mr-3">
              <CheckCircleIcon className="w-5 h-5 text-white" />
            </div>
            Client Matched
          </h3>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-green-700 hover:text-green-900 font-semibold underline hover:no-underline transition-all"
          >
            Change Client
          </button>
        </div>
        <div className="ml-12 space-y-1">
          <p className="font-bold text-gray-900 text-lg">{client.principal_key_holder}</p>
          <p className="text-sm text-gray-700">📦 Box: {client.box_number} • 📱 {client.telephone_cell}</p>
          <p className="text-sm text-green-700 font-semibold">⏱️ Duration: {formatDuration(duration)}</p>
        </div>
      </div>

      {/* Call Outcome */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">Call Outcome *</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'completed', label: 'Completed', icon: CheckCircleIcon, color: 'green' },
            { value: 'missed', label: 'Missed', icon: XMarkIcon, color: 'red' },
            { value: 'no_answer', label: 'No Answer', icon: PhoneIcon, color: 'yellow' },
            { value: 'busy', label: 'Busy', icon: PhoneIcon, color: 'orange' }
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                formData.call_status === option.value
                  ? `border-${option.color}-500 bg-${option.color}-50 shadow-md`
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="call_status"
                value={option.value}
                checked={formData.call_status === option.value}
                onChange={(e) => setFormData({ ...formData, call_status: e.target.value as any })}
                className="sr-only"
              />
              <option.icon className="w-6 h-6 mr-3" />
              <span className="font-semibold">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">Call Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 h-28 resize-none"
          placeholder="Enter any notes about this call..."
        />
      </div>

      {/* Callback */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="callback"
            checked={formData.callback_requested}
            onChange={(e) => setFormData({ ...formData, callback_requested: e.target.checked })}
            className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 transition-all"
          />
          <label htmlFor="callback" className="ml-3 font-bold text-gray-900 text-lg">
            🔔 Schedule Callback
          </label>
        </div>

        {formData.callback_requested && (
          <div className="ml-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Callback Time</label>
            <input
              type="datetime-local"
              value={formData.callback_time}
              onChange={(e) => setFormData({ ...formData, callback_time: e.target.value })}
              className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}
      </div>

      {/* Customer Feedback */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="feedback"
            checked={formData.feedback_enabled}
            onChange={(e) => setFormData({ ...formData, feedback_enabled: e.target.checked })}
            className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 transition-all"
          />
          <label htmlFor="feedback" className="ml-3 font-bold text-gray-900 text-lg">
            💬 Add Customer Feedback
          </label>
        </div>

        {formData.feedback_enabled && (
          <div className="ml-8 space-y-4">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Feedback Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, feedback_type: 'complaint', feedback_subject: '' })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.feedback_type === 'complaint'
                      ? 'border-red-500 bg-red-50 text-red-700 font-semibold'
                      : 'border-gray-300 hover:border-red-300 hover:bg-red-50/50'
                  }`}
                >
                  <FaceFrownIcon className="w-5 h-5" />
                  Complaint
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, feedback_type: 'happy', feedback_subject: '' })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.feedback_type === 'happy'
                      ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                      : 'border-gray-300 hover:border-green-300 hover:bg-green-50/50'
                  }`}
                >
                  <FaceSmileIcon className="w-5 h-5" />
                  Happy
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, feedback_type: 'suggestion', feedback_subject: '' })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.feedback_type === 'suggestion'
                      ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                      : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <LightBulbIcon className="w-5 h-5" />
                  Suggestion
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, feedback_type: 'general', feedback_subject: '' })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.feedback_type === 'general'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <InformationCircleIcon className="w-5 h-5" />
                  General
                </button>
              </div>
            </div>

            {/* Feedback Priority */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
              <select
                value={formData.feedback_priority}
                onChange={(e) => setFormData({ ...formData, feedback_priority: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Feedback Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
              {formData.feedback_type === 'general' ? (
                <select
                  value={formData.feedback_subject}
                  onChange={(e) => setFormData({ ...formData, feedback_subject: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                >
                  <option value="">Select a subject...</option>
                  <option value="Not interested">Not interested</option>
                  <option value="Possible Sale">Possible Sale</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.feedback_subject}
                  onChange={(e) => setFormData({ ...formData, feedback_subject: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                  placeholder="Brief subject for the feedback..."
                  maxLength={255}
                />
              )}
            </div>

            {/* Feedback Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Feedback Details</label>
              <textarea
                value={formData.feedback_notes}
                onChange={(e) => setFormData({ ...formData, feedback_notes: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 h-24 resize-none"
                placeholder="Enter detailed feedback from the customer..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t-2 border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          <CheckCircleIcon className="w-6 h-6 mr-2" />
          Save Call Log
        </button>
      </div>
    </form>
  )
}
