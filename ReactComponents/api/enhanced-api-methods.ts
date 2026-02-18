// Add these methods to your existing src/lib/api.ts file

// ==================== CALLBACKS API ====================

async getNotifications(page = 1, filters: any = {}) {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      clients (*),
      call_logs (*),
      users (
        id,
        first_name,
        last_name,
        email,
        role
      )
    `, { count: 'exact' })
    .eq('type', filters.type || 'callback')
    .order('scheduled_for', { ascending: false })
    .range((page - 1) * 10, page * 10 - 1)

  if (error) throw error

  const totalCount = data?.length || 0
  const totalPages = Math.ceil(totalCount / 10)

  return {
    notifications: data || [],
    page,
    limit: 10,
    totalCount,
    totalPages
  }
}

async markNotificationAsRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single()

  if (error) throw error
  return data
}

async markAllNotificationsAsRead() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .select()

  if (error) throw error
  return data
}

async getUnreadNotificationCount() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) throw error
  return count || 0
}

async deleteNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) throw error
  return true
}

async scheduleCallback(callbackData: {
  client_id: string
  scheduled_for: string
  notes?: string
  priority?: string
}) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      type: 'callback',
      title: 'Callback Scheduled',
      message: callbackData.notes || 'Callback requested',
      scheduled_for: callbackData.scheduled_for,
      client_id: callbackData.client_id,
      user_id: user.id,
      is_read: false,
      is_sent: false
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async completeCallback(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ 
      is_sent: true,
      is_read: true 
    })
    .eq('id', notificationId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== DASHBOARD STATS API ====================

async getDashboardStats() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get this week's date range
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  
  // Get this month's date range
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  // Fetch all call logs
  const { data: allCalls, error: callsError } = await supabase
    .from('call_logs')
    .select('*')
    .order('call_time', { ascending: false })

  if (callsError) throw callsError

  const calls = allCalls || []
  
  // Calculate stats
  const totalCallsToday = calls.filter((call: any) => 
    new Date(call.call_time) >= today && new Date(call.call_time) < tomorrow
  ).length

  const totalCallsThisWeek = calls.filter((call: any) => 
    new Date(call.call_time) >= startOfWeek
  ).length

  const totalCallsThisMonth = calls.filter((call: any) => 
    new Date(call.call_time) >= startOfMonth
  ).length

  const completedCalls = calls.filter((call: any) => 
    call.call_status === 'completed'
  ).length

  const successRate = calls.length > 0 
    ? Math.round((completedCalls / calls.length) * 100) 
    : 0

  // Get pending callbacks
  const { count: callbacksCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'callback')
    .eq('is_sent', false)

  // Get total clients
  const { count: clientsCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  // Get active users (admin only)
  let activeUsers = 0
  if (user.role === 'admin') {
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    activeUsers = usersCount || 0
  }

  return {
    totalCallsToday,
    totalCallsThisWeek,
    totalCallsThisMonth,
    pendingCallbacks: callbacksCount || 0,
    totalClients: clientsCount || 0,
    successRate,
    activeUsers
  }
}

async getWeeklyCallsData() {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - 6) // Last 7 days
  startOfWeek.setHours(0, 0, 0, 0)

  const { data: calls, error } = await supabase
    .from('call_logs')
    .select('*')
    .gte('call_time', startOfWeek.toISOString())
    .order('call_time', { ascending: true })

  if (error) throw error

  // Group by date
  const dailyData: any = {}
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    dailyData[dateStr] = { calls: 0, success: 0 }
  }

  calls?.forEach((call: any) => {
    const dateStr = call.call_time.split('T')[0]
    if (dailyData[dateStr]) {
      dailyData[dateStr].calls++
      if (call.call_status === 'completed') {
        dailyData[dateStr].success++
      }
    }
  })

  return Object.entries(dailyData).map(([date, stats]: [string, any]) => ({
    date,
    calls: stats.calls,
    success: stats.success
  }))
}

async getRecentActivity(limit = 10) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  const [callLogs, clients, notifications] = await Promise.all([
    supabase
      .from('call_logs')
      .select('*, clients (*), users (*)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('notifications')
      .select('*, clients (*)')
      .eq('type', 'callback')
      .order('created_at', { ascending: false })
      .limit(5)
  ])

  const activity: any[] = []

  // Add call logs
  callLogs.data?.forEach((log: any) => {
    activity.push({
      id: log.id,
      type: 'call',
      description: `Call to ${log.clients?.principal_key_holder || 'Unknown'}`,
      time: log.created_at,
      status: log.call_status === 'completed' ? 'success' : 
              log.call_status === 'missed' ? 'failed' : 'pending',
      details: log.notes
    })
  })

  // Add new clients
  clients.data?.forEach((client: any) => {
    activity.push({
      id: client.id,
      type: 'client',
      description: `New client added: ${client.principal_key_holder}`,
      time: client.created_at,
      status: 'success'
    })
  })

  // Add callbacks
  notifications.data?.forEach((notif: any) => {
    activity.push({
      id: notif.id,
      type: 'callback',
      description: `Callback scheduled for ${notif.clients?.principal_key_holder || 'Unknown'}`,
      time: notif.created_at,
      status: notif.is_sent ? 'success' : 'pending'
    })
  })

  // Sort by time and limit
  return activity
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit)
}

// ==================== CAMPAIGNS API ====================

async getCampaigns(filters: any = {}) {
  let query = supabase
    .from('campaigns')
    .select('*, campaign_assignments (*), users (*)')

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.department && filters.department !== 'all') {
    query = query.eq('department', filters.department)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return { campaigns: data || [] }
}

async createCampaign(campaignData: any) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      ...campaignData,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async updateCampaign(campaignId: string, campaignData: any) {
  const { data, error } = await supabase
    .from('campaigns')
    .update(campaignData)
    .eq('id', campaignId)
    .select()
    .single()

  if (error) throw error
  return data
}

async deleteCampaign(campaignId: string) {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)

  if (error) throw error
  return true
}

async getCampaignStats(campaignId: string) {
  const [campaign, assignments, callLogs] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', campaignId).single(),
    supabase.from('campaign_assignments').select('*').eq('campaign_id', campaignId),
    supabase.from('call_logs').select('*').eq('campaign_id', campaignId)
  ])

  const completedCalls = callLogs.data?.filter((log: any) => 
    log.call_status === 'completed'
  ).length || 0

  return {
    campaign: campaign.data,
    totalUsers: assignments.data?.length || 0,
    totalCalls: callLogs.data?.length || 0,
    completedCalls,
    successRate: callLogs.data?.length 
      ? Math.round((completedCalls / callLogs.data.length) * 100) 
      : 0
  }
}

// ==================== USER STATUS API ====================

async getUserStatus() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  const { data, error } = await supabase
    .from('users')
    .select('status, last_activity')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

async updateUserStatus(status: string) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  const { data, error } = await supabase
    .from('users')
    .update({ 
      status,
      last_activity: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

async getAllUsersStatus() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, status, last_activity')
    .order('last_activity', { ascending: false })

  if (error) throw error
  return data || []
}

// ==================== EXPORT UTILITIES ====================

function exportToCSV(data: any[], filename: string) {
  const csvContent = data.map(row => Object.values(row).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

async function importClientsFromCSV(file: File, campaignId?: string) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n')
        const headers = lines[0].split(',')
        
        const clients = lines.slice(1).map(line => {
          const values = line.split(',')
          const client: any = {}
          headers.forEach((header, index) => {
            client[header.trim()] = values[index]?.trim()
          })
          return client
        })

        // Insert clients
        const { data, error } = await supabase
          .from('clients')
          .insert(clients)
          .select()

        if (error) throw error

        // If campaign specified, link clients to campaign
        if (campaignId && data) {
          const campaignLinks = data.map((client: any) => ({
            campaign_id: campaignId,
            client_id: client.id
          }))

          await supabase
            .from('campaign_clients')
            .insert(campaignLinks)
        }

        resolve(data)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
