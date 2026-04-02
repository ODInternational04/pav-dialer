# User Status System Implementation

## Overview
The user status system allows users to set their availability status with pause options for breaks, meetings, and coaching sessions. This feature helps track agent availability in real-time and provides better visibility for administrators.

## Features Implemented

### 1. Database Schema
**File**: `database/add-user-status.sql`

Added the following fields to the `users` table:
- `user_status`: Enum type with values:
  - `available` - Ready to take calls
  - `on_call` - Currently on a call
  - `lunch_break` - On lunch break
  - `comfort_break` - Toilet/restroom break
  - `meeting` - Attending a meeting
  - `coaching` - In coaching session
  - `unavailable` - Not available for calls

- `status_changed_at`: Timestamp tracking when status was last changed
- `status_reason`: Optional text field for additional notes/reasons

**Features**:
- Automatic trigger to update `status_changed_at` when status changes
- Automatic sync between `is_on_call` and `user_status` fields
- View `user_status_summary` for easy monitoring
- Indexes for optimized queries

### 2. TypeScript Types
**File**: `src/types/index.ts`

Added:
- `UserStatus` type with all status options
- Extended `User` interface with status fields

### 3. API Endpoints

#### Status Update API
**File**: `src/app/api/user-status-update/route.ts`

**Endpoints**:
- `GET /api/user-status-update` - Get current user's status
- `PUT /api/user-status-update` - Update user status

**Request Body** (PUT):
```json
{
  "status": "lunch_break",
  "reason": "Optional reason text"
}
```

**Validations**:
- Prevents status changes while on a call (except to available)
- Validates status against allowed values
- Requires authentication token

#### User Status Listing API
**File**: `src/app/api/user-status/route.ts`

Updated to include:
- `user_status`
- `status_changed_at`
- `status_reason`

### 4. User Status Selector Component
**File**: `src/components/UserStatusSelector.tsx`

**Features**:
- Visual grid of status options with icons and colors
- Shows current status with duration
- Modal for adding optional reason/note
- Real-time status updates (refreshes every 30 seconds)
- Prevents status changes while on call
- Visual feedback for status changes

**Status Options**:
1. **Available** (Green) - Ready to take calls
2. **Lunch Break** (Orange) - On lunch break
3. **Comfort Break** (Blue) - Toilet/restroom break
4. **Meeting** (Purple) - Attending a meeting (requires reason)
5. **Coaching** (Indigo) - In coaching session (requires reason)
6. **Unavailable** (Red) - Not available (requires reason)

### 5. Dashboard Integration
**File**: `src/app/dashboard/page.tsx`

- Added `UserStatusSelector` component to main dashboard
- Prominently displayed in a dedicated section
- Shows alongside today's summary stats

### 6. User Status Display Component
**File**: `src/components/UserStatusDisplay.tsx`

**Updates**:
- Shows user status with appropriate icon and color
- Displays status duration
- Shows status reason/note if provided
- Updated both compact and full view modes
- Color-coded status indicators

## Usage Instructions

### For Users

#### Changing Your Status:
1. Navigate to the dashboard
2. Locate the "Your Current Status" section
3. Click on desired status option
4. For Meeting, Coaching, or Unavailable: Enter optional note
5. Click "Confirm"

#### When to Use Each Status:
- **Available**: Default status when ready to work
- **Lunch Break**: During scheduled lunch time
- **Comfort Break**: Short breaks (toilet, water, etc.)
- **Meeting**: Team meetings, one-on-ones, etc.
- **Coaching**: Training or coaching sessions
- **Unavailable**: Other situations requiring pause

### For Administrators

#### Monitoring User Status:
1. Go to Dashboard → User Status page
2. View all users with their current status
3. See duration of each status
4. Review status notes/reasons

#### Status Details Shown:
- User name and role
- Current status with icon
- Time in current status
- Optional status reason
- Current call details (if on call)

## Database Setup

Run the following SQL file in Supabase SQL Editor:
```bash
database/add-user-status.sql
```

This will:
1. Create the `user_status_type` enum
2. Add status columns to users table
3. Create triggers for automatic updates
4. Add indexes for performance
5. Create monitoring view

## API Usage Examples

### Update Status to Lunch Break
```javascript
const response = await fetch('/api/user-status-update', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'lunch_break'
  })
})
```

### Update Status with Reason
```javascript
const response = await fetch('/api/user-status-update', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'meeting',
    reason: 'Weekly team sync'
  })
})
```

### Get Current Status
```javascript
const response = await fetch('/api/user-status-update', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
const data = await response.json()
console.log(data.user.user_status) // Current status
```

## Technical Details

### Automatic Status Sync
When a user starts a call (`is_on_call = true`), the system automatically:
- Sets `user_status` to `on_call`
- Prevents manual status changes until call ends

When a call ends (`is_on_call = false`):
- Automatically reverts to `available` if status was `on_call`

### Status Duration Calculation
Duration is calculated from `status_changed_at`:
- Less than 1 minute: "Just now"
- Less than 60 minutes: "X min ago"
- More than 60 minutes: "Xh Ym ago"

### Security
- All endpoints require valid JWT authentication
- Users can only update their own status
- Admins can view all user statuses
- Validates status values server-side

## Files Modified

1. `database/add-user-status.sql` - Database schema
2. `src/types/index.ts` - TypeScript types
3. `src/app/api/user-status-update/route.ts` - New API endpoint
4. `src/app/api/user-status/route.ts` - Updated to include status fields
5. `src/components/UserStatusSelector.tsx` - New component
6. `src/components/UserStatusDisplay.tsx` - Updated to show status
7. `src/app/dashboard/page.tsx` - Integrated status selector

## Future Enhancements

Potential improvements:
1. Status history tracking
2. Break time reports and analytics
3. Automatic status reminders
4. Scheduled status changes
5. Status-based call routing
6. Break time limits and alerts
7. Integration with time tracking systems

## Troubleshooting

### Status Not Updating
1. Check browser console for errors
2. Verify token is valid
3. Ensure database migration was run
4. Check user permissions

### Cannot Change Status While on Call
- This is by design
- End the current call first
- Then change status

### Status Selector Not Showing
1. Clear browser cache
2. Verify component import
3. Check authentication status
4. Ensure user is logged in

## Support

For issues or questions:
1. Check browser console for errors
2. Review API response messages
3. Verify database schema is up to date
4. Check authentication token validity
