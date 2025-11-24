/**
 * 3CX Integration Service
 * Handles 3CX web client integration for click-to-call functionality
 */

export interface ThreeCXConfig {
  serverUrl: string
  webClientUrl: string
  extension: string
  countryCode: string
  defaultExtension: string
}

export interface CallSession {
  id: string
  clientId: string
  phoneNumber: string
  startTime: Date
  isActive: boolean
  duration: number
  context?: {
    isCallback?: boolean
    notificationId?: string
    priority?: 'normal' | 'urgent' | 'overdue'
  }
}

class ThreeCXService {
  private config: ThreeCXConfig
  private activeCalls: Map<string, CallSession> = new Map()
  private callTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    // Load configuration from localStorage if available
    const savedConfig = typeof window !== 'undefined' ? localStorage.getItem('threecx_config') : null
    if (savedConfig) {
      try {
        this.config = { ...this.getDefaultConfig(), ...JSON.parse(savedConfig) }
      } catch (error) {
        console.warn('Failed to load 3CX config from localStorage:', error)
        this.config = this.getDefaultConfig()
      }
    } else {
      this.config = this.getDefaultConfig()
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ThreeCXConfig {
    return {
      serverUrl: 'https://ibvglobal.3cx.co.za:6001',
      webClientUrl: 'https://ibvglobal.3cx.co.za:6001/webclient/',
      extension: '302',
      countryCode: '+27',
      defaultExtension: '302'
    }
  }

  /**
   * Update 3CX server configuration
   */
  updateServerConfig(serverUrl: string, webClientUrl?: string): void {
    this.config.serverUrl = serverUrl
    this.config.webClientUrl = webClientUrl || `${serverUrl}/webclient/`
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('threecx_config', JSON.stringify(this.config))
    }
    
    console.log('3CX server configuration updated:', this.config)
  }

  /**
   * Format phone number for 3CX dialing
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // Handle South African numbers
    if (cleaned.startsWith('27')) {
      // Already has country code
      return `+${cleaned}`
    } else if (cleaned.startsWith('0')) {
      // Remove leading 0 and add country code
      return `${this.config.countryCode}${cleaned.substring(1)}`
    } else if (cleaned.length === 9) {
      // Assume it's a 9-digit SA number without country code or leading 0
      return `${this.config.countryCode}${cleaned}`
    } else {
      // Default case - add country code
      return `${this.config.countryCode}${cleaned}`
    }
  }

  /**
   * Initiate call via 3CX web client
   */
  initiateCall(clientId: string, phoneNumber: string, context?: { 
    isCallback?: boolean, 
    notificationId?: string, 
    priority?: 'normal' | 'urgent' | 'overdue' 
  }): CallSession {
    const formattedNumber = this.formatPhoneNumber(phoneNumber)
    const callId = `call_${Date.now()}_${clientId}`
    
    // Create call session with additional context
    const callSession: CallSession = {
      id: callId,
      clientId,
      phoneNumber: formattedNumber,
      startTime: new Date(),
      isActive: true,
      duration: 0,
      ...(context && { context })
    }

    // Store active call
    this.activeCalls.set(callId, callSession)

    // Start duration timer
    this.startCallTimer(callId)

    // Store callback context if provided
    if (context?.isCallback) {
      localStorage.setItem('threecx_callback_context', JSON.stringify({
        clientId,
        notificationId: context.notificationId,
        priority: context.priority,
        initiated_at: new Date().toISOString()
      }))
    }

    // Open 3CX web client with the number
    this.openWebClient(formattedNumber, context?.priority)

    return callSession
  }

  /**
   * Open 3CX desktop app only (no web client)
   */
  private openWebClient(phoneNumber: string, priority?: 'normal' | 'urgent' | 'overdue'): void {
    console.log('Initiating call to:', phoneNumber, '(Desktop 3CX app only)')
    
    if (priority === 'overdue') {
      console.log('🚨 URGENT CALLBACK CALL - OVERDUE!')
    } else if (priority === 'urgent') {
      console.log('⚠️ URGENT CALLBACK CALL - DUE SOON!')
    }
    
    // Only try desktop 3CX app protocols - no web client
    this.tryDesktopAppOnly(phoneNumber, priority)
  }

  /**
   * Try to launch 3CX desktop app and trigger Windows default app selection
   */
  private tryDesktopAppOnly(phoneNumber: string, priority?: 'normal' | 'urgent' | 'overdue'): boolean {
    console.log('Attempting to trigger Windows default phone app selection for 3CX')
    if (priority === 'overdue') {
      console.log('🚨 PRIORITY: OVERDUE CALLBACK - Launching with tel: protocol')
    }
    
    try {
      // Use tel: protocol to trigger Windows "Choose default app" dialog
      // This will allow user to select 3CX as their default phone handler
      const telUrl = `tel:${phoneNumber}`
      
      console.log('Using tel: protocol to trigger default app selection:', telUrl)
      
      // Create and click a tel: link to trigger the default app selection
      const link = document.createElement('a')
      link.href = telUrl
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('✅ tel: protocol triggered - Windows should show default app selection')
      return true
      
    } catch (error) {
      console.error('❌ Error with tel: protocol:', error)
      this.showInAppNotification(phoneNumber, 'error', priority)
      return false
    }
  }

  /**
   * Try alternative methods to launch 3CX specifically (not Teams)
   */
  private tryAlternative3CXMethods(phoneNumber: string): boolean {
    const rawNumber = phoneNumber.replace(/\D/g, '')
    console.log('Trying alternative 3CX launch methods to avoid Teams conflict')
    
    try {
      // Method 1: Try to launch 3CX executable directly via file protocol
      const _3cxPaths = [
        `file:///C:/Program%20Files/3CXPhone/3CXPhone.exe`,
        `file:///C:/Program%20Files%20(x86)/3CXPhone/3CXPhone.exe`,
        `file:///C:/Users/${process.env.USERNAME || 'Default'}/AppData/Local/3CX/3CXPhone.exe`
      ]
      
      for (const path of _3cxPaths) {
        try {
          const link = document.createElement('a')
          link.href = path
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } catch (error) {
          console.warn(`3CX path failed: ${path}`, error)
        }
      }
      
      // Method 2: Try Windows-specific 3CX protocols (NO generic phone protocols)
      const windowsProtocols = [
        `3cxdesktop://call/${rawNumber}`,
        `threecx://dial/${phoneNumber}`,
        `3cx-desktop://call/${rawNumber}`
      ]
      
      for (const protocol of windowsProtocols) {
        try {
          const link = document.createElement('a')
          link.href = protocol
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } catch (error) {
          console.warn(`Windows 3CX protocol failed: ${protocol}`, error)
        }
      }
      
      return true
    } catch (error) {
      console.error('All alternative 3CX methods failed:', error)
      return false
    }
  }

  /**
   * Show in-app notification instead of opening web clients
   */
  private showInAppNotification(phoneNumber: string, type: 'desktop_app' | 'error' | 'manual_dial', priority?: 'normal' | 'urgent' | 'overdue'): void {
    // Store notification data for the component to read
    localStorage.setItem('threecx_notification_type', type)
    localStorage.setItem('threecx_pending_number', phoneNumber)
    
    if (priority) {
      localStorage.setItem('threecx_call_priority', priority)
    }
    
    // Set timestamp for notification display
    localStorage.setItem('threecx_notification_time', Date.now().toString())
  }



  /**
   * Get the last notification type used
   */
  getLastNotificationType(): 'desktop_app' | 'error' | 'manual_dial' {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('threecx_notification_type') as any) || 'manual_dial'
    }
    return 'manual_dial'
  }

  /**
   * Get notification timestamp
   */
  getNotificationTime(): number | null {
    if (typeof window !== 'undefined') {
      const time = localStorage.getItem('threecx_notification_time')
      return time ? parseInt(time) : null
    }
    return null
  }

  /**
   * Get pending number to dial
   */
  getPendingNumber(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('threecx_pending_number')
    }
    return null
  }

  /**
   * Get callback context if available
   */
  getCallbackContext(): { clientId: string; notificationId?: string; priority?: string; initiated_at: string } | null {
    if (typeof window !== 'undefined') {
      const context = localStorage.getItem('threecx_callback_context')
      if (context) {
        try {
          return JSON.parse(context)
        } catch (error) {
          console.warn('Failed to parse callback context:', error)
        }
      }
    }
    return null
  }

  /**
   * Clear callback context
   */
  clearCallbackContext(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('threecx_callback_context')
      localStorage.removeItem('threecx_call_priority')
    }
  }

  /**
   * Get call priority
   */
  getCallPriority(): 'normal' | 'urgent' | 'overdue' | null {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('threecx_call_priority') as any) || null
    }
    return null
  }

  /**
   * Clear pending call data
   */
  clearPendingCall(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('threecx_pending_number')
      localStorage.removeItem('threecx_notification_type')
      localStorage.removeItem('threecx_call_priority')
      localStorage.removeItem('threecx_notification_time')
    }
  }

  /**
   * End call session
   */
  endCall(callId: string): CallSession | null {
    const callSession = this.activeCalls.get(callId)
    if (!callSession) return null

    // Stop timer
    this.stopCallTimer(callId)

    // Mark as ended
    callSession.isActive = false

    // Remove from active calls
    this.activeCalls.delete(callId)

    return callSession
  }

  /**
   * Start call duration timer
   */
  private startCallTimer(callId: string): void {
    const timer = setInterval(() => {
      const callSession = this.activeCalls.get(callId)
      if (callSession && callSession.isActive) {
        callSession.duration = Math.floor((Date.now() - callSession.startTime.getTime()) / 1000)
      }
    }, 1000)

    this.callTimers.set(callId, timer)
  }

  /**
   * Stop call duration timer
   */
  private stopCallTimer(callId: string): void {
    const timer = this.callTimers.get(callId)
    if (timer) {
      clearInterval(timer)
      this.callTimers.delete(callId)
    }
  }

  /**
   * Get active call by client ID
   */
  getActiveCallByClient(clientId: string): CallSession | null {
    for (const [, callSession] of this.activeCalls) {
      if (callSession.clientId === clientId && callSession.isActive) {
        return callSession
      }
    }
    return null
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): CallSession[] {
    return Array.from(this.activeCalls.values()).filter(call => call.isActive)
  }

  /**
   * Check if client is currently being called
   */
  isClientBeingCalled(clientId: string): boolean {
    return this.getActiveCallByClient(clientId) !== null
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ThreeCXConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('threecx_config', JSON.stringify(this.config))
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ThreeCXConfig {
    return { ...this.config }
  }

  /**
   * Focus existing 3CX desktop app (no web client)
   */
  focus3CXClient(): void {
    console.log('Attempting to focus 3CX desktop app (no web client)')
    // Try to trigger 3CX desktop app focus
    try {
      const link = document.createElement('a')
      link.href = '3cx://focus'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.warn('Could not focus 3CX desktop app:', error)
    }
  }

  /**
   * Generate call instructions for user (in-app notifications)
   */
  getCallInstructions(phoneNumber: string): string {
    const formatted = this.formatPhoneNumber(phoneNumber)
    const notificationType = this.getLastNotificationType()
    const priority = this.getCallPriority()
    
    const priorityPrefix = priority === 'overdue' ? '🚨 URGENT CALLBACK - ' : 
                          priority === 'urgent' ? '⚠️ CALLBACK DUE SOON - ' : ''
    
    switch (notificationType) {
      case 'desktop_app':
        return `${priorityPrefix}Desktop 3CX app protocols triggered for ${formatted}. Check your 3CX desktop application - the call should start automatically. If not, manually dial the number in your 3CX desktop app.`
      case 'error':
        return `${priorityPrefix}Unable to connect to 3CX desktop app for ${formatted}. Please manually open your 3CX desktop application and dial this number, or check your 3CX installation.`
      default:
        return `${priorityPrefix}Call initiated for ${formatted}. Check your 3CX desktop application for the call.`
    }
  }
}

// Export singleton instance
export const threeCXService = new ThreeCXService()

// Export utility functions
export const formatPhoneForDisplay = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '')
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Format as: 012 345 6789
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  } else if (cleaned.length === 11 && cleaned.startsWith('27')) {
    // Format as: +27 12 345 6789
    return `+${cleaned.replace(/(\d{2})(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4')}`
  }
  return phoneNumber
}

export default threeCXService