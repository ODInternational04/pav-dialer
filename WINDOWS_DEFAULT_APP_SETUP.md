# 🔧 Windows Default App Setup for 3CX

## ✅ **System Updated - Default App Selection Ready**

The dialer now uses the `tel:` protocol to trigger Windows' "Choose default app" dialog, allowing you to set 3CX as your default phone handler.

## 🚀 **How It Works Now:**

### **First Time Setup:**
1. **Click "Call" button** → Windows shows "Choose an app" dialog
2. **Select "3CX Desktop App"** from the list
3. **Check "Always use this app"** 
4. **Click OK** to set as default

### **After Setup:**
- All future calls will open directly in 3CX Desktop App
- Phone number will be pre-filled automatically
- No more web client - pure desktop app experience

## 📋 **What Happens When You Click Call:**

### **Step 1: tel: Protocol**
- System uses `tel:[PHONE_NUMBER]` protocol
- Windows detects this and shows app selection dialog
- You can choose 3CX Desktop App as default

### **Step 2: Fallback (if needed)**
- If tel: protocol doesn't work, web client opens as backup
- Ensures you can always make the call

### **Step 3: Guidance**
- Helpful notification explains the setup process
- Shows instructions for Windows Settings if needed

## 🎯 **Expected Windows Dialog:**

When you click "Call" for the first time, Windows should show:

```
How do you want to open tel links?

○ Microsoft Teams
○ 3CX Desktop App        ← Select this one
○ Skype for Business
○ Other apps...

☑ Always use this app     ← Check this box
   
[OK]  [Cancel]
```

## 🔧 **Manual Setup (if dialog doesn't appear):**

### **Windows 10/11 Settings:**
1. Open **Settings** → **Apps** → **Default apps**
2. Scroll to **"Choose default apps by protocol"**
3. Find **"TEL"** in the protocol list
4. Click current app (probably "Microsoft Teams")
5. Select **"3CX Desktop App"** from the list
6. Close Settings

## 📞 **Testing Instructions:**

### **Step 1: First Call**
1. Go to http://localhost:3001/dashboard/clients
2. Click any "Call" button
3. **Look for Windows dialog** asking which app to use
4. **Select 3CX Desktop App** and check "Always use this app"

### **Step 2: Verify Setup**
1. Click another "Call" button
2. **3CX Desktop App should open directly**
3. **Phone number should be pre-filled**
4. No more dialogs - direct launch

## 🛠️ **Troubleshooting:**

### **If No Dialog Appears:**
- Windows might have a default already set
- Use manual setup method above
- Or try a different browser

### **If Teams Still Opens:**
- Teams was already set as default
- Use Windows Settings to change default to 3CX
- Clear browser cache and try again

### **If 3CX Desktop App Not in List:**
- Install/reinstall 3CX Desktop App
- Register it with Windows during installation
- Check 3CX app settings for protocol registration

## 🎉 **Result:**

Once set up, clicking "Call" will:
- ✅ **Open 3CX Desktop App directly**
- ✅ **Pre-fill the phone number** 
- ✅ **No Teams interference**
- ✅ **No web client popups**
- ✅ **Clean desktop app experience**

**Ready to set up! Click a "Call" button to start the process!** 🚀