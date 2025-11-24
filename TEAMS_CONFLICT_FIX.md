# 3CX vs Microsoft Teams Conflict Resolution

## Issue
When clicking "Call" in the dialer system, Microsoft Teams opens instead of the 3CX desktop application.

## Root Cause
Windows associates the `tel:` protocol with Microsoft Teams by default, causing Teams to intercept phone number clicks intended for 3CX.

## Solution Implemented

### 1. Protocol Changes
- **Removed `tel:` protocol** from the dialer system to avoid Teams conflict
- **Added 3CX-specific protocols**:
  - `3cx://call/{number}`
  - `3cx://dial/{number}` 
  - `3CX://call/{number}` (case variation)
  - `3cxphone://dial/{number}`
  - `3cxclient://call/{number}`

### 2. Alternative Launch Methods
- **Direct executable paths**: Attempts to launch 3CX.exe directly
- **Windows Store protocol**: Tries 3CX Windows app store version
- **Multiple protocol attempts**: Tries various 3CX protocols in sequence

### 3. User Guidance
- **Clear error messages**: Explains Teams conflict and provides manual steps
- **3CX-specific instructions**: Guides users to open 3CX desktop app manually
- **Default app guidance**: Suggests checking Windows default apps settings

## Manual Fix for Users

If calls still open Teams instead of 3CX:

### Option 1: Change Default Phone App (Windows 10/11)
1. Open **Settings** → **Apps** → **Default apps**
2. Scroll down to **Choose default apps by protocol**
3. Find **TEL** protocol
4. Change from "Microsoft Teams" to "3CX Desktop App"

### Option 2: 3CX Desktop App Settings
1. Open **3CX Desktop App**
2. Go to **Settings** → **General**
3. Enable **"Register as default phone application"**
4. Restart the 3CX app

### Option 3: Registry Fix (Advanced Users)
```registry
[HKEY_CURRENT_USER\Software\Classes\tel]
@="3CX.Phone"
"URL Protocol"=""

[HKEY_CURRENT_USER\Software\Classes\tel\shell\open\command]
@="\"C:\\Program Files\\3CXPhone\\3CXPhone.exe\" \"%1\""
```

## Testing the Fix

1. **Start development server**: `npm run dev` (http://localhost:3001)
2. **Navigate to Clients page**
3. **Click "Call" button** on any client
4. **Verify**: 3CX desktop app opens instead of Teams
5. **Check notification**: Should show "3CX Desktop App Launched" message

## Troubleshooting

### If Teams Still Opens:
- Check Windows default apps settings
- Verify 3CX desktop app is installed and running
- Try the registry fix above
- Contact IT to configure proper default phone handlers

### If Nothing Opens:
- Verify 3CX desktop app installation
- Check 3CX app is configured and logged in
- Try opening 3CX manually first, then test dialer
- Check Windows security settings for protocol handlers

## Files Modified
- `src/lib/3cx.ts` - Removed tel: protocol, added 3CX-specific protocols
- `src/components/ThreeCXCallButton.tsx` - Updated error messages for Teams conflict