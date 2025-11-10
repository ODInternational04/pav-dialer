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
  initiateCall(clientId: string, phoneNumber: string): CallSession {
    const formattedNumber = this.formatPhoneNumber(phoneNumber)
    const callId = `call_${Date.now()}_${clientId}`
    
    // Create call session
    const callSession: CallSession = {
      id: callId,
      clientId,
      phoneNumber: formattedNumber,
      startTime: new Date(),
      isActive: true,
      duration: 0
    }

    // Store active call
    this.activeCalls.set(callId, callSession)

    // Start duration timer
    this.startCallTimer(callId)

    // Open 3CX web client with the number
    this.openWebClient(formattedNumber)

    return callSession
  }

  /**
   * Open 3CX web client for manual dialing
   */
  private openWebClient(phoneNumber: string): void {
    // Since direct dial URLs are giving 404, let's open the main client instead
    console.log('Opening 3CX web client for number:', phoneNumber)
    
    try {
      // Open the main 3CX web client
      const clientWindow = window.open(this.config.webClientUrl, '3cx_webclient', 'width=900,height=700,scrollbars=yes,resizable=yes,menubar=no,toolbar=no')
      
      if (clientWindow) {
        clientWindow.focus()
        
        // Store the number for the user to dial manually
        localStorage.setItem('threecx_pending_number', phoneNumber)
        
        // Show instructions for manual dialing
        this.showCallInstructions(phoneNumber, 'manual')
        return
      }
    } catch (error) {
      console.warn('Failed to open main web client:', error)
    }

    // If opening main client fails, try protocol handlers
    this.tryProtocolHandlers(phoneNumber)
  }

  /**
   * Try protocol handlers as fallback
   */
  private tryProtocolHandlers(phoneNumber: string): void {
    const protocols = [
      `3cx://call/${phoneNumber}`,
      `3cx://dial/${phoneNumber}`,
      `tel:${phoneNumber}`,
      `sip:${phoneNumber}@${this.config.serverUrl.replace(/https?:\/\//, '').replace(/:.*/, '')}`,
      `callto:${phoneNumber}`
    ]

    let protocolWorked = false

    for (const protocol of protocols) {
      try {
        console.log('Trying protocol:', protocol)
        
        // Create a temporary link and click it
        const link = document.createElement('a')
        link.href = protocol
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        protocolWorked = true
        this.showCallInstructions(phoneNumber, 'protocol')
        break
      } catch (error) {
        console.warn(`Protocol ${protocol} failed:`, error)
      }
    }

    if (!protocolWorked) {
      // Ultimate fallback: open web client normally
      this.openWebClientFallback(phoneNumber)
    }
  }

  /**
   * Fallback: Open web client normally
   */
  private openWebClientFallback(phoneNumber: string): void {
    try {
      console.log('Opening 3CX web client as fallback:', this.config.webClientUrl)
      const clientWindow = window.open(this.config.webClientUrl, '3cx_webclient', 'width=900,height=700,scrollbars=yes,resizable=yes,menubar=no,toolbar=no')
      
      if (clientWindow) {
        clientWindow.focus()
        localStorage.setItem('threecx_pending_number', phoneNumber)
        this.showCallInstructions(phoneNumber, 'manual')
      } else {
        throw new Error('Popup blocked or failed to open')
      }
    } catch (error) {
      console.error('All 3CX integration methods failed:', error)
      this.showCallInstructions(phoneNumber, 'error')
    }
  }

  /**
   * Show instructions for different call scenarios
   */
  private showCallInstructions(phoneNumber: string, type: 'direct' | 'protocol' | 'manual' | 'error'): void {
    // Store instruction type for the component to read
    localStorage.setItem('threecx_instruction_type', type)
    localStorage.setItem('threecx_pending_number', phoneNumber)
  }

  /**
   * Get the last instruction type used
   */
  getLastInstructionType(): 'direct' | 'protocol' | 'manual' | 'error' {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('threecx_instruction_type') as any) || 'manual'
    }
    return 'manual'
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
   * Clear pending call data
   */
  clearPendingCall(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('threecx_pending_number')
      localStorage.removeItem('threecx_instruction_type')
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
   * Focus existing 3CX web client window
   */
  focus3CXClient(): void {
    try {
      // Try to focus existing window
      const existingWindow = window.open('', '3cx_webclient')
      if (existingWindow) {
        existingWindow.focus()
      } else {
        // If no existing window, open new one
        window.open(this.config.webClientUrl, '3cx_webclient', 'width=900,height=700,scrollbars=yes,resizable=yes')
      }
    } catch (error) {
      console.warn('Could not focus 3CX client window:', error)
    }
  }

  /**
   * Generate call instructions for user
   */
  getCallInstructions(phoneNumber: string): string {
    const formatted = this.formatPhoneNumber(phoneNumber)
    return `3CX web client opened. Please manually dial ${formatted} in the 3CX client. Click the dial pad and enter the number to start the call.`
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