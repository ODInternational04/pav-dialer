/**
 * Zoho Bigin API Client
 * Handles authentication and API calls to Zoho Bigin CRM
 */

interface ZohoTokenResponse {
  access_token: string
  expires_in: number
  api_domain?: string
  token_type: string
}

interface ZohoContact {
  id: string
  First_Name?: string
  Last_Name: string
  Phone?: string
  Mobile?: string
  Email?: string
  Description?: string
}

interface ZohoActivity {
  id: string
  Activity_Type: string
  Subject: string
  Call_Type?: string
  Call_Duration?: string
  Call_Result?: string
  Description?: string
  Call_Start_Time?: string
}

export class ZohoBiginClient {
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  /**
   * Get valid access token, refresh if needed
   */
  async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 1 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    // Refresh token
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN
    const clientId = process.env.ZOHO_CLIENT_ID
    const clientSecret = process.env.ZOHO_CLIENT_SECRET

    if (!refreshToken) {
      console.error('❌ ZOHO_REFRESH_TOKEN is not configured')
      throw new Error('ZOHO_REFRESH_TOKEN not configured. Run OAuth flow first.')
    }

    if (!clientId || !clientSecret) {
      console.error('❌ ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET is not configured')
      throw new Error('Zoho client credentials not configured')
    }

    console.log('🔄 Refreshing Zoho access token...')

    try {
      const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Zoho token refresh failed:', response.status, errorText)
        throw new Error(`Failed to refresh Zoho token (${response.status}): ${errorText}`)
      }

      const data: ZohoTokenResponse = await response.json()
      
      if (!data.access_token) {
        console.error('❌ No access token in response:', data)
        throw new Error('No access token received from Zoho')
      }

      this.accessToken = data.access_token
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000 // 1 min buffer
      
      console.log('✅ Zoho access token refreshed successfully')
      return this.accessToken
    } catch (error: any) {
      console.error('❌ Error in getAccessToken:', error.message)
      throw error
    }
  }

  /**
   * Create a task activity in Zoho Bigin for call logging
   */
  async createActivity(callLog: any) {
    const token = await this.getAccessToken()
    
    // Format duration for display
    const durationInMinutes = callLog.call_duration ? Math.ceil(callLog.call_duration / 60) : 1
    
    // Map call status
    const callResult = this.mapCallStatus(callLog.call_status)
    
    // Get due date (today)
    const today = new Date()
    const dueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    const taskData = {
      data: [{
        Subject: `${callLog.call_type === 'outbound' ? 'Outbound' : 'Inbound'} Call - ${callResult}`,
        Status: 'Completed',
        Priority: 'Normal',
        Due_Date: dueDate,
        Description: `Call Duration: ${durationInMinutes} min\nStatus: ${callResult}\n\nNotes: ${callLog.notes || 'No notes'}`,
        $se_module: 'Contacts',
        Who_Id: callLog.zoho_contact_id
      }]
    }

    console.log(`[Zoho] Creating task for contact ${callLog.zoho_contact_id}`)

    const response = await fetch(`${process.env.ZOHO_API_DOMAIN}/bigin/v1/Tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    })

    const result = await response.json()
    
    if (!response.ok || result.data?.[0]?.code !== 'SUCCESS') {
      console.error('[Zoho] Tasks API error:', JSON.stringify(result, null, 2))
      throw new Error(`Failed to create Zoho task: ${result.data?.[0]?.message || result.message || 'Unknown error'}`)
    }

    console.log(`[Zoho] ✓ Task created successfully with ID: ${result.data[0].details.id}`)
    return result
  }

  /**
   * Get contacts from Zoho Bigin with pagination
   */
  async getContacts(page = 1, perPage = 200) {
    const token = await this.getAccessToken()
    
    const url = `${process.env.ZOHO_API_DOMAIN}/bigin/v1/Contacts?page=${page}&per_page=${perPage}`
    console.log(`📡 Fetching contacts from: ${url}`)
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Zoho API error (${response.status}):`, errorText)
        throw new Error(`Failed to fetch Zoho contacts (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Retrieved ${data.data?.length || 0} contacts from page ${page}`)
      return data
    } catch (error: any) {
      console.error('❌ Error fetching contacts:', error.message)
      throw error
    }
  }

  /**
   * Search for a contact by phone number
   */
  async searchContactByPhone(phone: string): Promise<{ data: ZohoContact[] } | null> {
    const token = await this.getAccessToken()
    
    // Clean phone number for search
    const cleanPhone = phone.replace(/[^\d+]/g, '')
    
    const response = await fetch(
      `${process.env.ZOHO_API_DOMAIN}/bigin/v1/Contacts/search?phone=${encodeURIComponent(cleanPhone)}`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        }
      }
    )

    if (response.status === 204) {
      // No results found
      return null
    }

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to search Zoho contact: ${error}`)
    }

    return response.json()
  }

  /**
   * Create a new contact in Zoho Bigin
   */
  async createContact(clientData: any) {
    const token = await this.getAccessToken()
    
    // Split name into first and last if possible
    const nameParts = clientData.name.trim().split(' ')
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : clientData.name
    
    const contactData = {
      data: [{
        First_Name: firstName,
        Last_Name: lastName,
        Phone: clientData.phone,
        Mobile: clientData.phone,
        Email: clientData.email || null,
        Description: clientData.notes || '',
        Source: 'Dialer System',
        Quotation_done: clientData.quotation_done ? 'yes' : 'no',
        Booking_status: clientData.booking_status && clientData.booking_status.trim() !== '' ? [clientData.booking_status] : null
      }]
    }

    console.log('🔄 Creating in Zoho:', JSON.stringify(contactData, null, 2))

    const response = await fetch(`${process.env.ZOHO_API_DOMAIN}/bigin/v1/Contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    })

    const result = await response.json()
    
    console.log('✅ Zoho create response:', JSON.stringify(result, null, 2))
    
    if (!response.ok) {
      console.error('Zoho API error:', result)
      throw new Error(`Failed to create Zoho contact: ${result.message || 'Unknown error'}`)
    }

    console.log(`[Zoho] ✓ Contact created with ID: ${result.data?.[0]?.details?.id}`)
    return result
  }

  /**
   * Update an existing contact in Zoho Bigin
   */
  async updateContact(zohoContactId: string, clientData: any) {
    const token = await this.getAccessToken()
    
    const nameParts = clientData.name.trim().split(' ')
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : clientData.name
    
    const updateData = {
      data: [{
        id: zohoContactId,
        First_Name: firstName,
        Last_Name: lastName,
        Phone: clientData.phone,
        Mobile: clientData.phone,
        Email: clientData.email || null,
        Description: clientData.notes || '',
        Source: 'Dialer System',
        Quotation_done: clientData.quotation_done ? 'yes' : 'no',
        Booking_status: clientData.booking_status && clientData.booking_status.trim() !== '' ? [clientData.booking_status] : null
      }]
    }

    console.log('🔄 Sending to Zoho:', JSON.stringify(updateData, null, 2))

    const response = await fetch(`${process.env.ZOHO_API_DOMAIN}/bigin/v1/Contacts`, {
      method: 'PUT',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    const result = await response.json()
    
    console.log('✅ Zoho response:', JSON.stringify(result, null, 2))
    
    if (!response.ok) {
      console.error('Zoho API error:', result)
      throw new Error(`Failed to update Zoho contact: ${result.message || 'Unknown error'}`)
    }

    return result
  }

  /**
   * Add a note to a contact's timeline
   */
  async addNoteToContact(zohoContactId: string, noteTitle: string, noteContent: string) {
    const token = await this.getAccessToken()
    
    const noteData = {
      data: [{
        Note_Title: noteTitle,
        Note_Content: noteContent,
        Parent_Id: {
          id: zohoContactId
        },
        se_module: 'Contacts'
      }]
    }

    const response = await fetch(`${process.env.ZOHO_API_DOMAIN}/bigin/v1/Notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(noteData)
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('Zoho API error:', result)
      throw new Error(`Failed to add note to Zoho contact: ${result.message || 'Unknown error'}`)
    }

    return result
  }

  /**
   * Delete a contact from Zoho Bigin
   */
  async deleteContact(zohoContactId: string) {
    const token = await this.getAccessToken()
    
    const response = await fetch(`${process.env.ZOHO_API_DOMAIN}/bigin/v1/Contacts?ids=${zohoContactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('Zoho API error:', result)
      throw new Error(`Failed to delete Zoho contact: ${result.message || 'Unknown error'}`)
    }

    return result
  }

  /**
   * Map internal call status to Zoho-friendly format
   */
  private mapCallStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'completed': 'Completed',
      'missed': 'Missed',
      'declined': 'Declined',
      'busy': 'Busy',
      'no_answer': 'No Answer'
    }
    return statusMap[status] || 'Completed'
  }
}

// Singleton instance
export const zohoClient = new ZohoBiginClient()
