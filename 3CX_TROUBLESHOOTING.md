# 3CX Integration Troubleshooting Guide

## Issue: 404 Page Not Found

### Problem:
The 3CX web client URL is returning a "404: Page not found" error when trying to access the web client.

### Solutions:

#### 1. **Find the Correct Web Client URL**

Try these common 3CX web client URLs by clicking on them directly in your browser:

- `https://ibvglobal.3cx.co.za:6001/webclient/`
- `https://ibvglobal.3cx.co.za:6001/webclient`
- `https://ibvglobal.3cx.co.za/webclient/`
- `https://ibvglobal.3cx.co.za/webclient`
- `https://ibvglobal.3cx.co.za:5001/webclient/`
- `https://ibvglobal.3cx.co.za:6001/`
- `https://ibvglobal.3cx.co.za/`

#### 2. **Check 3CX Management Console**

1. Access your 3CX Management Console
2. Go to **Settings > Web Client**
3. Check if the web client is enabled
4. Note the exact URL path shown

#### 3. **Alternative Access Methods**

If web client doesn't work, try:

- **3CX Desktop Client**: Install the 3CX desktop application
- **3CX Mobile App**: Use the mobile app for calling
- **Direct SIP**: Configure a SIP client with your 3CX credentials

#### 4. **Update Integration Settings**

1. Go to your **Dashboard → 3CX Settings**
2. Use the "Find Your 3CX Web Client URL" section
3. Test each URL until you find one that works
4. Click "Use This" for the working URL
5. Save your settings

#### 5. **Check Network Access**

- Ensure you can access the 3CX server directly
- Check if you're on the same network as the 3CX server
- Verify firewall settings allow access to the web client

### Quick Test:

1. Open your browser
2. Go to: `https://ibvglobal.3cx.co.za:6001`
3. Look for login page or dashboard
4. If that works, try adding `/webclient/` to the end

### Expected Behavior:

When the correct URL is found, you should see:
- 3CX login page, OR
- 3CX web client interface, OR
- 3CX dashboard

### Integration Workflow After Fix:

1. Click green phone button → 3CX web client opens
2. Login to 3CX if required
3. Use the dial pad or number field in 3CX
4. Enter the phone number displayed in the instructions
5. Click "Call" or "Dial" in 3CX
6. Manage your call in 3CX
7. When finished, hang up in 3CX
8. Click "End Call" in your dialer system

### Still Having Issues?

1. **Check with IT/Admin**: Verify 3CX web client is enabled
2. **Browser Settings**: Ensure popups are allowed
3. **VPN/Network**: Check if you need VPN access to 3CX
4. **Alternative Integration**: Consider using 3CX desktop client instead

### Contact Information:

If you continue having issues, contact your 3CX administrator with:
- The exact error message
- URLs you've tried
- Your network setup details