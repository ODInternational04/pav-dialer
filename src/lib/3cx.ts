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
   * Open 3CX web client and automatically initiate call
   */
  private openWebClient(phoneNumber: string, priority?: 'normal' | 'urgent' | 'overdue'): void {
    console.log('Initiating call to:', phoneNumber, '(3CX Standard edition compatible mode)')
    
    if (priority === 'overdue') {
      console.log('🚨 URGENT CALLBACK CALL - OVERDUE!')
    } else if (priority === 'urgent') {
      console.log('⚠️ URGENT CALLBACK CALL - DUE SOON!')
    }
    
    // For 3CX Standard edition, focus on protocol handlers and web client opening
    // Skip API endpoints that cause 404 errors
    
    // Try automatic dialing methods (protocols + web client variations)
    this.tryAutomaticDialing(phoneNumber, priority)

    // Always open main client as primary interface (most reliable)
    setTimeout(() => {
      this.openMainClientWithAutoDial(phoneNumber, priority)
    }, 500)
  }

  /**
   * Try various automatic dialing methods
   */
  private tryAutomaticDialing(phoneNumber: string, priority?: 'normal' | 'urgent' | 'overdue'): boolean {
    const formattedNumber = encodeURIComponent(phoneNumber)
    const rawNumber = phoneNumber.replace(/\+/g, '') // Some systems prefer without +
    
    // Focus on methods that work with 3CX Standard edition
    // Skip API endpoints that cause 404 errors
    
    console.log('Attempting automatic dialing with 3CX Standard edition compatible methods')
    if (priority === 'overdue') {
      console.log('🚨 PRIORITY: OVERDUE CALLBACK - Attempting aggressive dialing')
    }
    
    // Try protocol handlers first (most likely to work)
    if (this.tryProtocolHandlersFirst(phoneNumber, priority)) {
      return true
    }
    
    // Try 3CX web client URL variations that might work
    const webClientUrls = [
      // Direct hash-based routing (more likely to work)
      `${this.config.webClientUrl}#dial=${rawNumber}`,
      `${this.config.webClientUrl}#/dial=${formattedNumber}`,
      `${this.config.webClientUrl}#!/dial/${formattedNumber}`,
      
      // Query parameter based (less intrusive)
      `${this.config.webClientUrl}?number=${formattedNumber}`,
      `${this.config.webClientUrl}?dial=${rawNumber}`,
      
      // With extension context
      `${this.config.webClientUrl}?number=${formattedNumber}&ext=${this.config.extension}`,
    ]

    // Try each web client URL with hidden iframe approach
    for (const url of webClientUrls) {
      try {
        console.log('Trying web client URL variation:', url)
        
        // Use hidden iframe to avoid popup 404 errors
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.style.width = '1px'
        iframe.style.height = '1px'
        iframe.src = url
        document.body.appendChild(iframe)
        
        // Clean up iframe after a moment
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
        }, 2000)
        
      } catch (error) {
        console.warn(`Web client URL failed: ${url}`, error)
      }
    }

    // Always return false to continue to main client opening
    // This ensures the main 3CX client always opens as backup
    return false
  }

  /**
   * Try protocol handlers as primary method
   */
  private tryProtocolHandlersFirst(phoneNumber: string, priority?: 'normal' | 'urgent' | 'overdue'): boolean {
    const protocols = [
      // 3CX specific protocols (most likely to work)
      `3cx://call/${phoneNumber}`,
      `3cx://dial/${phoneNumber}`,
      
      // Standard telephony protocols
      `tel:${phoneNumber}`,
      `callto:${phoneNumber}`,
      
      // SIP protocol
      `sip:${phoneNumber}@${this.config.serverUrl.replace(/https?:\/\//, '').replace(/:.*/, '')}`,
    ]

    let protocolWorked = false

    for (const protocol of protocols) {
      try {
        console.log('Trying priority protocol:', protocol)
        if (priority === 'overdue') {
          console.log('🚨 URGENT CALLBACK PROTOCOL ATTEMPT')
        }
        
        // Create and click a link (most reliable method)
        const link = document.createElement('a')
        link.href = protocol
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        protocolWorked = true
        
      } catch (error) {
        console.warn(`Protocol ${protocol} failed:`, error)
      }
    }

    if (protocolWorked) {
      this.showCallInstructions(phoneNumber, 'protocol', priority)
    }

    return protocolWorked
  }

  /**
   * Open main client and attempt auto-dial injection
   */
  private openMainClientWithAutoDial(phoneNumber: string, priority?: 'normal' | 'urgent' | 'overdue'): void {
    try {
      console.log('Opening 3CX main client (primary interface):', phoneNumber)
      if (priority === 'overdue') {
        console.log('🚨 URGENT: Opening 3CX for OVERDUE callback!')
      }
      
      // Open the main 3CX web client (most reliable method)
      const clientWindow = window.open(this.config.webClientUrl, '3cx_webclient', 'width=900,height=700,scrollbars=yes,resizable=yes,menubar=no,toolbar=no')
      
      if (clientWindow) {
        clientWindow.focus()
        
        // Store the number for reference
        localStorage.setItem('threecx_pending_number', phoneNumber)
        
        // Give the client time to load, then try gentle injection methods
        setTimeout(() => {
          this.attemptGentleDialInjection(clientWindow, phoneNumber)
        }, 4000)
        
        // Show instruction that covers both auto and manual possibilities
        this.showCallInstructions(phoneNumber, 'manual', priority)
        return
      }
    } catch (error) {
      console.warn('Failed to open main web client:', error)
    }

    // Only if main client fails, try protocol handlers as last resort
    this.tryProtocolHandlers(phoneNumber, priority)
  }

  /**
   * Attempt gentle dialing methods that won't cause errors
   */
  private attemptGentleDialInjection(clientWindow: Window, phoneNumber: string): void {
    try {
      if (clientWindow && !clientWindow.closed) {
        console.log('Attempting gentle dial injection methods')
        
        // Try URL hash manipulation (least intrusive)
        try {
          const hashVariations = [
            `#dial=${phoneNumber.replace(/\+/g, '')}`,
            `#/dial/${encodeURIComponent(phoneNumber)}`,
            `#!/call/${phoneNumber.replace(/\+/g, '')}`
          ]
          
          for (const hash of hashVariations) {
            setTimeout(() => {
              try {
                if (clientWindow && !clientWindow.closed) {
                  clientWindow.location.hash = hash
                  console.log('Tried hash:', hash)
                }
              } catch (e) {
                // Cross-origin restrictions expected
              }
            }, 1000)
          }
        } catch (error) {
          console.log('Hash injection blocked (expected due to cross-origin)')
        }

        // Try postMessage (safe method)
        try {
          clientWindow.postMessage({
            action: 'dial',
            number: phoneNumber,
            source: 'dialer-system'
          }, '*')
          console.log('PostMessage dial command sent')
        } catch (error) {
          console.log('PostMessage failed (expected)')
        }
      }
    } catch (error) {
      // All injection methods fail due to cross-origin restrictions
      // This is expected and normal - the manual dialing will work
      console.log('Injection methods blocked by browser security (this is normal)')
    }
  }

  /**
   * Try protocol handlers for automatic dialing
   */
  private tryProtocolHandlers(phoneNumber: string, priority?: 'normal' | 'urgent' | 'overdue'): void {
    const protocols = [
      // 3CX specific protocols
      `3cx://call/${phoneNumber}`,
      `3cx://dial/${phoneNumber}`,
      `3cx://make-call/${phoneNumber}`,
      
      // SIP protocols for direct calling
      `sip:${phoneNumber}@${this.config.serverUrl.replace(/https?:\/\//, '').replace(/:.*/, '')}`,
      `sip:${phoneNumber}`,
      
      // Generic telephony protocols
      `tel:${phoneNumber}`,
      `callto:${phoneNumber}`,
      
      // Alternative formats
      `3cx:dial:${phoneNumber}`,
      `voip:${phoneNumber}`
    ]

    let protocolWorked = false

    for (const protocol of protocols) {
      try {
        console.log('Trying protocol for auto-dial:', protocol)
        
        // Create multiple attempts with different methods
        
        // Method 1: Direct window.open
        try {
          const protocolWindow = window.open(protocol, '_blank')
          if (protocolWindow) {
            setTimeout(() => protocolWindow.close(), 1000)
            protocolWorked = true
          }
        } catch (e) {}
        
        // Method 2: Create and click a link
        const link = document.createElement('a')
        link.href = protocol
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Method 3: Try to set window location
        try {
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.src = protocol
          document.body.appendChild(iframe)
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe)
            }
          }, 1000)
        } catch (e) {}
        
        protocolWorked = true
        this.showCallInstructions(phoneNumber, 'protocol', priority)
        
        // Don't break - try multiple protocols for better chance of success
        
      } catch (error) {
        console.warn(`Protocol ${protocol} failed:`, error)
      }
    }

    if (!protocolWorked) {
      // Ultimate fallback: open web client with enhanced manual instructions
      this.openWebClientFallback(phoneNumber, priority)
    } else {
      // Even if protocols worked, also open the web client as backup
      setTimeout(() => {
        this.openWebClientFallback(phoneNumber, priority)
      }, 2000)
    }
  }

  /**
   * Fallback: Open web client normally
   */
  private openWebClientFallback(phoneNumber: string, priority?: 'normal' | 'urgent' | 'overdue'): void {
    try {
      console.log('Opening 3CX web client as fallback:', this.config.webClientUrl)
      const clientWindow = window.open(this.config.webClientUrl, '3cx_webclient', 'width=900,height=700,scrollbars=yes,resizable=yes,menubar=no,toolbar=no')
      
      if (clientWindow) {
        clientWindow.focus()
        localStorage.setItem('threecx_pending_number', phoneNumber)
        this.showCallInstructions(phoneNumber, 'manual', priority)
      } else {
        throw new Error('Popup blocked or failed to open')
      }
    } catch (error) {
      console.error('All 3CX integration methods failed:', error)
      this.showCallInstructions(phoneNumber, 'error', priority)
    }
  }

  /**
   * Show instructions for different call scenarios
   */
  private showCallInstructions(phoneNumber: string, type: 'direct' | 'protocol' | 'manual' | 'error', priority?: 'normal' | 'urgent' | 'overdue'): void {
    // Store instruction type for the component to read
    localStorage.setItem('threecx_instruction_type', type)
    localStorage.setItem('threecx_pending_number', phoneNumber)
    
    if (priority) {
      localStorage.setItem('threecx_call_priority', priority)
    }
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
      localStorage.removeItem('threecx_instruction_type')
      localStorage.removeItem('threecx_call_priority')
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
    const instructionType = this.getLastInstructionType()
    const priority = this.getCallPriority()
    
    const priorityPrefix = priority === 'overdue' ? '🚨 URGENT CALLBACK - ' : 
                          priority === 'urgent' ? '⚠️ CALLBACK DUE SOON - ' : ''
    
    switch (instructionType) {
      case 'direct':
        return `${priorityPrefix}Call attempt made to ${formatted}. Check your 3CX client - if a call started automatically, great! If not, manually dial the number in the 3CX web client that opened.`
      case 'protocol':
        return `${priorityPrefix}System protocols triggered for ${formatted}. Check your 3CX desktop client, phone app, or the web client. If no call started automatically, use the manual dial option in 3CX.`
      case 'error':
        return `${priorityPrefix}Unable to connect to 3CX for ${formatted}. Please manually dial this number in your 3CX client or check your 3CX configuration.`
      default:
        return `${priorityPrefix}Call initiated for ${formatted}. 3CX web client opened - check if the call started automatically, otherwise manually dial the number using the 3CX interface.`
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