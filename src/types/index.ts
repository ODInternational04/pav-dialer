export type UserStatus = 
  | 'available'
  | 'on_call' 
  | 'lunch_break'
  | 'comfort_break'
  | 'meeting'
  | 'coaching'
  | 'unavailable'

export interface User {
  id: string
  email: string
  password?: string
  first_name: string
  last_name: string
  role: 'admin' | 'user'
  is_active: boolean
  created_at: string
  updated_at: string
  last_login?: string
  user_status?: UserStatus
  status_changed_at?: string
  status_reason?: string
  is_on_call?: boolean
  call_started_at?: string
  current_call_client_id?: string
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  notes: string
  created_at: string
  updated_at: string
  created_by: string
  last_updated_by: string
  // Zoho Bigin custom fields
  quotation_done?: boolean
  booking_status?: string
  zoho_contact_id?: string
  zoho_synced_at?: string
  zoho_last_sync_status?: string
  // Enhanced fields for call tracking
  total_calls?: number
  last_call_date?: string
  has_been_called?: boolean
  call_logs?: CallLog[]
}

export interface CallLog {
  id: string
  client_id: string
  user_id: string
  call_type: 'outbound' | 'inbound'
  call_status: 'completed' | 'missed' | 'declined' | 'busy' | 'no_answer'
  call_duration?: number // in seconds
  notes: string
  feedback: string // Customer feedback during call
  callback_requested: boolean
  callback_time?: string
  call_started_at: string
  call_ended_at?: string
  created_at: string
  // Related data from API joins
  clients?: {
    id: string
    name: string
    phone: string
    email: string | null
  }
  users?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface Notification {
  id: string
  user_id: string
  client_id: string
  call_log_id?: string
  type: 'callback' | 'reminder' | 'system'
  title: string
  message: string
  scheduled_for: string
  is_read: boolean
  is_sent: boolean
  created_at: string
  // Related data from API joins
  clients?: {
    id: string
    name: string
    phone: string
    email: string | null
  }
  call_logs?: {
    id: string
    call_status: string
    notes: string
    feedback: string
  }
}

export interface CallStatistics {
  user_id: string
  total_calls: number
  completed_calls: number
  missed_calls: number
  declined_calls: number
  success_rate: number
  average_call_duration: number
  date: string
}

export interface CreateUserRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  role: 'admin' | 'user'
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: Omit<User, 'password'>
  token: string
}

export interface CreateClientRequest {
  name: string
  phone: string
  email?: string
  notes?: string
  quotation_done?: boolean
  booking_status?: string
  custom_fields?: Record<string, any>
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: string
}

export interface CreateCallLogRequest {
  client_id: string
  call_type: 'outbound' | 'inbound'
  call_status: 'completed' | 'missed' | 'declined' | 'busy' | 'no_answer'
  call_duration?: number
  notes?: string
  callback_requested: boolean
  callback_time?: string
}

export interface CallSummaryReport {
  total_clients: number
  total_calls_today: number
  total_calls_this_week: number
  total_calls_this_month: number
  success_rate: number
  average_call_duration: number
  pending_callbacks: number
  active_users: number
}

export interface UserPerformanceReport {
  feedback?: string
  user: Omit<User, 'password'>
  total_calls: number
  completed_calls: number
  missed_calls: number
  declined_calls: number
  success_rate: number
  average_call_duration: number
  callbacks_completed: number
  last_active: string
}

export interface CustomerFeedback {
  id: string
  client_id: string
  user_id: string
  call_log_id?: string
  feedback_type: 'complaint' | 'happy' | 'suggestion' | 'general'
  subject: string
  notes: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_resolved: boolean
  resolved_by?: string
  resolved_at?: string
  resolution_notes?: string
  created_at: string
  updated_at: string
  // Related data from API joins
  clients?: {
    id: string
    name: string
    phone: string
    email: string
    notes: string
  }
  users?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  call_logs?: {
    id: string
    call_status: string
    notes: string
    created_at: string
  }
  resolved_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface CreateCustomerFeedbackRequest {
  client_id: string
  call_log_id?: string
  feedback_type: 'complaint' | 'happy' | 'suggestion' | 'general'
  subject: string
  notes: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface UpdateCustomerFeedbackRequest extends Partial<CreateCustomerFeedbackRequest> {
  id: string
  is_resolved?: boolean
  resolution_notes?: string
}

export interface FeedbackStatistics {
  total_feedback: number
  complaints_count: number
  happy_count: number
  suggestions_count: number
  general_count: number
  resolved_count: number
  pending_count: number
  high_priority_count: number
  urgent_priority_count: number
  average_resolution_time_hours: number
}

export interface CustomerFeedbackFilters {
  feedback_type?: 'complaint' | 'happy' | 'suggestion' | 'general' | 'all'
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'all'
  is_resolved?: boolean | 'all'
  search?: string
  start_date?: string
  end_date?: string
}

// Campaign Management Types
export interface Campaign {
  id: string
  name: string
  description?: string
  department?: string
  status: 'active' | 'inactive' | 'completed' | 'archived'
  criteria?: {
    size?: string[]
    gender?: string[]
    [key: string]: any
  }
  client_fields?: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'date' | 'select' | 'boolean'
    required?: boolean
    options?: string[]
  }>
  target_count: number
  completed_count: number
  created_by: string
  created_at: string
  updated_at: string
  start_date?: string
  end_date?: string
  // Related data from API joins
  created_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  assigned_users?: UserCampaignAssignment[]
  statistics?: CampaignStatistics
}

export interface UserCampaignAssignment {
  id: string
  user_id: string
  campaign_id: string
  assigned_by: string
  assigned_at: string
  // Related data from API joins
  users?: {
    id: string
    first_name: string
    last_name: string
    email: string
    role: string
  }
  campaigns?: {
    id: string
    name: string
    department: string
    status: string
  }
  assigned_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface CampaignStatistics {
  total_clients: number
  called_clients: number
  uncalled_clients: number
  total_calls: number
  completed_calls: number
  success_rate: number
  assigned_users: number
  average_calls_per_client: number
}

export interface CreateCampaignRequest {
  name: string
  description?: string
  department?: string
  status?: 'active' | 'inactive' | 'completed' | 'archived'
  criteria?: Record<string, any>
  client_fields?: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'date' | 'select' | 'boolean'
    required?: boolean
    options?: string[]
  }>
  target_count?: number
  start_date?: string
  end_date?: string
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  id: string
}

export interface AssignUserToCampaignRequest {
  user_id: string
  campaign_id: string
}

export interface BulkClientImportRequest {
  campaign_id: string
  clients: Partial<CreateClientRequest>[]
}

export interface CSVImportResult {
  success: boolean
  imported_count: number
  failed_count: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
  created_clients: string[]
}