# 📧 Admin Email Notifications for Customer Feedback

## 🎯 **Feature Overview**
When a user logs customer feedback in the system, all active admin users automatically receive email notifications to ensure prompt attention and response.

## ✅ **What's Been Implemented**

### 1. **Email Service Infrastructure**
- **Location**: `src/lib/emailService.ts`
- **Technology**: Nodemailer with SMTP support
- **Features**:
  - Professional HTML email templates
  - Plain text fallback
  - Priority-based emoji indicators
  - Feedback type categorization
  - Client information display
  - Direct dashboard links

### 2. **Admin User Management**
- **Location**: `src/lib/adminUtils.ts`
- **Functions**:
  - `getAdminUsers()`: Fetches all active admin users
  - `getAdminEmails()`: Extracts email addresses from admin users
  - `getUserById()`: Gets user details for email context

### 3. **API Integration**
- **Primary Route**: `src/app/api/customer-feedback/route.ts`
- **Debug Route**: `src/app/api/debug/customer-feedback/route.ts`
- **Functionality**: Automatically sends notifications after successful feedback creation

### 4. **Email Configuration**
- **Environment Variables Added**:
  ```bash
  EMAIL_HOST=smtp.gmail.com
  EMAIL_PORT=587
  EMAIL_USER=your-email@gmail.com
  EMAIL_PASS=your-app-password
  EMAIL_FROM=Dialer System <noreply@dialersystem.com>
  EMAIL_FROM_NAME=Dialer System
  ```

## 📧 **Email Template Features**

### **Visual Indicators**
- **Priority**: 🟢 Low | 🟡 Medium | 🟠 High | 🔴 Urgent
- **Type**: 😞 Complaint | 😊 Happy | 💡 Suggestion | 💬 General

### **Information Included**
- Feedback type and priority level
- Subject and detailed notes
- Client information (name, box number, phone)
- User who submitted the feedback
- Timestamp of submission
- Direct link to admin dashboard

### **Professional Design**
- Clean, responsive HTML template
- Color-coded priority alerts
- Structured table layout
- Call-to-action button for dashboard access

## 🔧 **How It Works**

### **Automatic Workflow**
1. User submits customer feedback through any interface
2. Feedback is saved to database
3. System fetches all active admin users
4. Email notifications sent to all admin email addresses
5. Non-blocking operation (feedback saves even if email fails)

### **Error Handling**
- Graceful degradation if email service fails
- Detailed logging for troubleshooting
- Development mode simulation (logs instead of sending)
- No impact on feedback saving if email fails

## 🚀 **Setup Instructions**

### **For Development**
1. **No Email Config Required**: System will log intended emails to console
2. **Test Endpoint**: `POST /api/test/email-notification` for testing

### **For Production**
1. **Configure Email Service**:
   - Update `.env.local` with actual SMTP credentials
   - Recommended: Gmail with App Password
   - Alternative: SendGrid, Mailgun, AWS SES

2. **Gmail Setup Example**:
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-business-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

3. **Test Configuration**:
   - Create test feedback
   - Check admin email inboxes
   - Verify dashboard links work correctly

## 📱 **Admin User Requirements**

### **Automatic Notification Recipients**
- All users with `role = 'admin'`
- Must have `is_active = true`
- Must have valid email address
- Default admin: `admin@dialersystem.com`

### **Email Content Customization**
The email template can be customized in `src/lib/emailService.ts`:
- Subject line format
- Email body content
- HTML styling
- Priority indicators
- Call-to-action buttons

## 🧪 **Testing**

### **Test Scenarios**
1. **Different Priority Levels**: Test low, medium, high, urgent feedback
2. **Different Feedback Types**: Test complaint, happy, suggestion, general
3. **Multiple Admins**: Verify all admins receive notifications
4. **Email Failure**: Confirm feedback still saves if email fails

### **Test Endpoint**
```bash
POST /api/test/email-notification
# Sends test email to all admins with mock feedback data
```

### **Manual Testing**
1. Login as a user (not admin)
2. Create customer feedback through:
   - Call log modal
   - Customer feedback page
   - Debug endpoint
3. Check admin email inboxes
4. Verify dashboard link functionality

## 🔍 **Monitoring & Logs**

### **Console Logs**
- `📧 Sending email notifications to admins...`
- `📧 Notifying X admin(s): [email1, email2]`
- `✅ Admin email notifications sent successfully`
- `❌ Failed to send admin email notifications`

### **Error Scenarios**
- No admin users found
- Email service configuration missing
- SMTP connection failures
- Invalid email addresses

## 🎯 **Benefits**

### **For Admins**
- Immediate notification of customer feedback
- Priority-based visual indicators
- Complete feedback context in email
- Direct dashboard access for response

### **For Business**
- Faster response times to customer issues
- Improved customer satisfaction
- Better issue tracking and resolution
- Professional communication system

## 🔄 **Future Enhancements**

### **Potential Improvements**
- SMS notifications for urgent feedback
- Email templates for different feedback types
- Notification preferences per admin
- Escalation rules based on response time
- Integration with ticketing systems

The email notification system is now fully operational and will automatically notify all admin users whenever customer feedback is submitted to the system!