# Pavilion Hotel Dialer Tracking - Client Fields Overview

## Current Client System Structure

The system currently supports two types of clients with different field requirements:

---

## **Client Type 1: Vault Clients** 🔒

### Required Fields:
- **Box Number** - Unique identifier for vault box
- **Size** - Vault size (options: A, B, C, D, E)
- **Contract Number** - Unique contract reference
- **Principal Key Holder** - Full name of client
- **ID Number** - Principal key holder's identification number
- **Email Address** - Contact email
- **Cell Phone** - Mobile contact number
- **Contract Start Date** - When contract begins
- **Contract End Date** - When contract expires
- **Occupation** - Client's profession

### Optional Fields:
- **Home Phone** - Alternative contact number
- **Notes** - Additional information or comments

### Database Constraints:
- Box Number must be unique
- Contract Number must be unique
- All required fields must be filled before saving

---

## **Client Type 2: Gold Clients** ⭐

### Required Fields:
- **Full Name** - Client's complete name
- **Email Address** - Contact email
- **Cell Phone** - Mobile contact number

### Optional Fields:
- **Home Phone** - Alternative contact number
- **Notes** - Additional information or comments

### Key Differences:
- Simplified form with fewer required fields
- No contract or vault-related information
- Faster client registration process
- More flexible for general contacts

---

## Additional Features Available

### Campaign Management:
- **Campaign Assignment** - Link clients to specific campaigns
- **Department Tracking** - Organize by department
- **Custom Fields** - Extensible JSON field for additional data
- **Gender** - Optional demographic field (male/female/other/unknown)
- **User Assignment** - Assign clients to specific staff members

### Call Tracking:
- **Total Calls** - Automatic count of calls made
- **Last Call Date** - Timestamp of most recent call
- **Has Been Called** - Boolean flag for filtering
- **Call Logs** - Complete history of all interactions
- **Call Duration** - Track time spent on calls
- **Call Status** - Completed, Missed, Declined, Busy, No Answer

### Callback System:
- **Callback Requested** - Flag for follow-up needed
- **Callback Time** - Scheduled callback datetime
- **Notifications** - Automatic reminders for callbacks
- **Red Flag System** - Priority marking for urgent clients

### Metadata:
- **Created At** - Record creation timestamp
- **Updated At** - Last modification timestamp
- **Created By** - User who created the record
- **Last Updated By** - User who last modified the record

---

## Permissions System

### User Access Control:
- **can_access_vault_clients** - Permission to view/edit vault clients
- **can_access_gold_clients** - Permission to view/edit gold clients
- **Role-based Access** - Admin vs. User permissions
- **Activity Tracking** - Monitor who calls which clients

---

## Recommended Refinements for Pavilion Hotel

### Consider These Questions:

1. **Do you need vault-related fields?**
   - If not managing vault services, we can simplify to a single client type

2. **What information is essential for your hotel operations?**
   - Guest name
   - Contact details (phone/email)
   - Room number or reservation details?
   - Loyalty program information?
   - Special requirements or preferences?

3. **What type of clients will you track?**
   - Hotel guests
   - Corporate clients
   - Event planners
   - Regular visitors
   - VIP members

4. **Additional fields you might need:**
   - Room number
   - Check-in/Check-out dates
   - Reservation number
   - Loyalty tier (Bronze/Silver/Gold/Platinum)
   - Preferred room type
   - Special requests (dietary, accessibility, etc.)
   - Billing information
   - Company name (for corporate bookings)
   - Number of guests
   - Purpose of visit (business/leisure/event)

---

## Next Steps

Please review this structure and let me know:
1. Which fields you want to keep
2. Which fields you want to remove
3. What new fields you need for hotel operations
4. Whether you need one or two client types
5. Any specific naming preferences for fields

Once you provide your requirements, I'll update the database schema, forms, and all related components accordingly.
