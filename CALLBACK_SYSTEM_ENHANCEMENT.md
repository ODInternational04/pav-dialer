# Enhanced Callback System - "Call Soon" to "CALL NOW" Implementation

## Overview

This implementation enhances the dialer system to automatically trigger 3CX calls and navigate to the client workflow when callbacks become overdue or urgent. When a scheduled callback time is reached, the system automatically:

1. **Changes status from "Call Soon" to "CALL NOW"**
2. **Automatically triggers 3CX call**
3. **Redirects to clients tab**
4. **Opens call log process for follow-up**

## Key Features Implemented

### 1. Enhanced Notification Center (`NotificationCenter.tsx`)

#### Visual Indicators
- **OVERDUE callbacks**: Red background with pulsing "CALL NOW" button
- **URGENT callbacks**: Orange background with "Call Soon" button
- **Normal callbacks**: Blue background with "Call" button

#### Automatic Call Workflow
```typescript
const handleCallNowProcess = async (notification: Notification) => {
  // 1. Import 3CX service dynamically
  const { threeCXService } = await import('@/lib/3cx')
  
  // 2. Initiate 3CX call automatically
  const callSession = threeCXService.initiateCall(
    clientId, 
    phoneNumber,
    {
      isCallback: true,
      notificationId: notification.id,
      priority: 'overdue'
    }
  )
  
  // 3. Navigate to clients tab with call context
  window.location.href = `/dashboard/clients?callClient=${clientId}&callbackNotification=${notificationId}`
}
```

#### Button Enhancements
- **Overdue**: Red pulsing button with animated background
- **Enhanced styling**: Priority-based colors and animations
- **Automatic workflow**: Clicks trigger full 3CX + navigation process

### 2. Enhanced 3CX Service (`3cx.ts`)

#### Priority-Aware Call Initiation
```typescript
interface CallSession {
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
```

#### Callback Context Management
- **Stores callback context** in localStorage during call
- **Priority indicators** in console logs and instructions
- **Enhanced logging** for callback-initiated calls

#### New Utility Methods
```typescript
// Get callback context
getCallbackContext(): CallbackContext | null

// Clear callback context after call completion
clearCallbackContext(): void

// Get call priority level
getCallPriority(): 'normal' | 'urgent' | 'overdue' | null
```

### 3. Callback Action API (`/api/notifications/callback-action`)

#### Supported Actions
- **`initiate_call`**: Mark callback as initiated, create call log
- **`mark_completed`**: Mark callback as completed with call data
- **`snooze`**: Reschedule callback for later

#### Example Usage
```typescript
// Initiate callback call
POST /api/notifications/callback-action
{
  "notification_id": "123",
  "action": "initiate_call"
}

// Complete callback with call details
POST /api/notifications/callback-action
{
  "notification_id": "123", 
  "action": "mark_completed",
  "call_data": {
    "call_status": "completed",
    "call_duration": 180,
    "notes": "Successful callback completion"
  }
}
```

### 4. Enhanced Clients Page (`clients/page.tsx`)

#### URL Parameter Processing
- **Detects callback workflow**: `?callClient=ID&callbackNotification=ID`
- **Auto-loads client**: Even if not on current page
- **Highlights target client**: Visual scroll and highlight effects

#### Callback Workflow Integration
```typescript
const handleCallbackWorkflow = async (client: Client, notificationId: string) => {
  // 1. Show immediate feedback
  alert(`🚨 CALLBACK DUE NOW! Processing callback for: ${client.name}`)
  
  // 2. Trigger callback action API
  await fetch('/api/notifications/callback-action', {
    method: 'POST',
    body: JSON.stringify({
      notification_id: notificationId,
      action: 'initiate_call'
    })
  })
  
  // 3. Initiate 3CX call with context
  const callSession = threeCXService.initiateCall(client.id, client.phone, {
    isCallback: true,
    notificationId: notificationId,
    priority: 'overdue'
  })
  
  // 4. Handle call start and open modal
  await handle3CXCallStart(callSession)
  
  // 5. Highlight client in UI
  highlightCallbackClient(client.id)
}
```

### 5. Enhanced Call Log Modal (`CallLogModal.tsx`)

#### Callback Context Detection
- **Automatically detects** callback-initiated calls
- **Pre-fills form** with callback indicators
- **Visual priority indicators** in header

#### Callback Indicators
```typescript
// Header shows callback status
{isCallbackCall && (
  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
    callbackPriority === 'overdue' 
      ? 'bg-red-100 text-red-800 animate-pulse' 
      : 'bg-orange-100 text-orange-800'
  }`}>
    {callbackPriority === 'overdue' ? '🚨 OVERDUE CALLBACK' : '⚠️ CALLBACK DUE'}
  </div>
)}
```

#### Automatic Context Cleanup
- **Clears callback context** when call log is saved
- **Prevents duplicate processing** of same callback

## User Experience Flow

### 1. Callback Creation
User schedules a callback for a client (e.g., "Call back in 2 hours")

### 2. Notification Display
- **Future**: Blue "Call" button
- **Due Soon (1 min)**: Orange "Call Soon" button  
- **Overdue**: Red pulsing "CALL NOW" button with animations

### 3. Overdue Callback Workflow
When user clicks "CALL NOW":

1. **Immediate feedback**: Toast notification about callback
2. **3CX integration**: Automatic call initiation with priority context
3. **Navigation**: Redirect to clients page with URL parameters
4. **Client highlighting**: Auto-scroll and highlight target client
5. **Call modal**: Opens with callback context and priority indicators
6. **Form pre-fill**: Notes include "🚨 CALLBACK CALL" prefix

### 4. Call Completion
- **Call log saves** with callback context
- **Notification marked** as completed
- **Callback context cleared** to prevent re-processing
- **3CX session ended** and cleaned up

## Technical Implementation Details

### Time-Based Priority Detection
```typescript
const isCallbackOverdue = (notification: Notification) => {
  if (notification.type !== 'callback' || !notification.scheduled_for) return false
  const now = new Date()
  const scheduledTime = new Date(notification.scheduled_for)
  return scheduledTime <= now  // Overdue = past scheduled time
}

const isCallbackUrgent = (notification: Notification) => {
  if (notification.type !== 'callback' || !notification.scheduled_for) return false
  const now = new Date()
  const scheduledTime = new Date(notification.scheduled_for)
  const oneMinuteFromNow = new Date(now.getTime() + 60000)
  return scheduledTime <= oneMinuteFromNow && scheduledTime > now  // Due within 1 minute
}
```

### URL-Based Navigation
```typescript
// Notification center redirects with parameters
const clientsUrl = `/dashboard/clients?callClient=${clientId}&callbackNotification=${notificationId}`
window.location.href = clientsUrl

// Clients page processes parameters
const urlParams = new URLSearchParams(window.location.search)
const callClientId = urlParams.get('callClient')
const callbackNotificationId = urlParams.get('callbackNotification')
```

### Visual Highlighting System
```typescript
const highlightCallbackClient = (clientId: string) => {
  const clientRow = document.querySelector(`[data-client-id="${clientId}"]`)
  if (clientRow) {
    clientRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
    clientRow.classList.add('bg-yellow-100', 'border-yellow-500', 'border-2')
    
    setTimeout(() => {
      clientRow.classList.remove('bg-yellow-100', 'border-yellow-500', 'border-2')
    }, 5000)
  }
}
```

## Benefits

### 1. **Automated Workflow**
- No manual navigation required
- Seamless transition from notification to call
- Reduced user decision-making

### 2. **Visual Priority System**
- Clear priority indicators (colors, animations)
- Immediate recognition of urgent callbacks
- Progressive urgency as time approaches

### 3. **Context Preservation**
- Callback context maintained throughout process
- Call logs automatically tagged as callback calls
- Complete audit trail

### 4. **3CX Integration**
- Automatic call initiation with priority
- Enhanced logging for callback calls
- Context-aware call instructions

### 5. **Error Handling**
- Graceful fallbacks if 3CX fails
- Manual modal opening as backup
- Clear error messages and user guidance

## Future Enhancements

1. **Push Notifications**: Browser notifications for urgent callbacks
2. **Sound Alerts**: Audio alerts for overdue callbacks
3. **Escalation**: Auto-assign to manager if callback missed
4. **Analytics**: Callback completion rates and timing analytics
5. **Bulk Operations**: Snooze/complete multiple callbacks
6. **Smart Scheduling**: AI-suggested optimal callback times

## Configuration

### Timing Thresholds
```typescript
// Current thresholds (can be made configurable)
const URGENT_THRESHOLD = 60000  // 1 minute = urgent
const OVERDUE_THRESHOLD = 0     // Past scheduled time = overdue
```

### Notification Polling
```typescript
// Notifications refresh every 30 seconds
const NOTIFICATION_POLL_INTERVAL = 30000
```

This implementation provides a complete, automated callback workflow that enhances user productivity and ensures important client communications are not missed.