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
}

export interface Client {
  id: string
  box_number: string
  size: string
  contract_no: string
  principal_key_holder: string
  principal_key_holder_id_number: string
  principal_key_holder_email_address: string
  telephone_cell: string
  telephone_home?: string
  contract_start_date: string
  contract_end_date: string
  occupation: string
  notes: string
  created_at: string
  updated_at: string
  created_by: string
  last_updated_by: string
}

export interface CallLog {
  id: string
  client_id: string
  user_id: string
  call_type: 'outbound' | 'inbound'
  call_status: 'completed' | 'missed' | 'declined' | 'busy' | 'no_answer'
  call_duration?: number // in seconds
  notes: string
  callback_requested: boolean
  callback_time?: string
  call_started_at: string
  call_ended_at?: string
  created_at: string
  // Related data from API joins
  clients?: {
    id: string
    box_number: string
    principal_key_holder: string
    telephone_cell: string
    contract_no: string
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
    box_number: string
    principal_key_holder: string
    telephone_cell: string
  }
  call_logs?: {
    id: string
    call_status: string
    notes: string
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
  box_number: string
  size: string
  contract_no: string
  principal_key_holder: string
  principal_key_holder_id_number: string
  principal_key_holder_email_address: string
  telephone_cell: string
  telephone_home?: string
  contract_start_date: string
  contract_end_date: string
  occupation: string
  notes: string
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: string
}

export interface CreateCallLogRequest {
  client_id: string
  call_type: 'outbound' | 'inbound'
  call_status: 'completed' | 'missed' | 'declined' | 'busy' | 'no_answer'
  call_duration?: number
  notes: string
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