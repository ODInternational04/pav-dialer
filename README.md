# Dialer System

A comprehensive dialer system built with Next.js, TypeScript, Tailwind CSS, and Supabase for managing client information, call tracking, and user management.

## Features

### User Management
- **Admin Dashboard**: Complete system overview with user management, reports, and system settings
- **User Dashboard**: Individual user interface for client interactions and call management
- **Role-Based Access Control**: Admin and User roles with appropriate permissions
- **Authentication**: Secure login/logout with JWT tokens

### Client Management
- **Complete Client Database**: All required fields including:
  - Box Number
  - Size
  - Contract Number
  - Principal Key Holder Information
  - Contact Details (Cell, Home, Email)
  - Contract Dates
  - Occupation
  - Notes
- **Search & Filter**: Advanced search across all client fields
- **CRUD Operations**: Create, read, update, and delete client records
- **Real-time Updates**: Ensures all users see the most current information

### Call Tracking System
- **Call Logging**: Track all inbound and outbound calls
- **Call Status**: Completed, Missed, Declined, Busy, No Answer
- **Call Duration**: Automatic tracking of call length
- **Success Metrics**: Performance analytics and success rates
- **User Attribution**: Track which user made each call

### Notification System
- **Callback Reminders**: Automatic notifications for scheduled callbacks
- **Time-Based Alerts**: "Call back in 1 hour" functionality
- **Real-time Notifications**: Instant updates across the system
- **Notification Management**: Mark as read, track status

### Admin Features
- **User Management**: Create, edit, activate/deactivate users
- **Comprehensive Reports**: 
  - Call statistics by user
  - Client interaction summaries
  - Success rate analytics
  - Missed call reports
- **System Overview**: Dashboard with key metrics
- **Export Capabilities**: Data export for external analysis

### User Interface
- **Modern Design**: Clean, professional interface with Tailwind CSS
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Intuitive Navigation**: Easy-to-use sidebar navigation
- **Loading States**: Smooth user experience with loading indicators
- **Error Handling**: Graceful error messages and validation

## Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT with bcrypt password hashing
- **UI Components**: Heroicons for icons
- **Styling**: Tailwind CSS with custom design system

## Database Schema

### Users Table
- Authentication and role management
- Admin and user role distinction
- Activity tracking

### Clients Table
- Complete client information storage
- Foreign key relationships to users
- Audit trail (created_by, last_updated_by)

### Call Logs Table
- Complete call history
- Status and duration tracking
- User and client relationships
- Callback scheduling

### Notifications Table
- Callback reminders
- System notifications
- Read/unread status tracking

## Installation

### Prerequisites
- Node.js 18+ installed
- Supabase account and project

### Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   The `.env.local` file is already configured with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://lhxfwwlrarosclpehwoq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
   ```

3. **Database Setup**
   - Go to your Supabase project
   - Navigate to the SQL Editor
   - Run the SQL script from `database/schema.sql`
   - This will create all tables, indexes, and sample data

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Open http://localhost:3000
   - Use the default admin account:
     - Email: admin@dialersystem.com
     - Password: admin123
   - Or test users:
     - user1@dialersystem.com / admin123
     - user2@dialersystem.com / admin123

## Default Accounts

The system comes with pre-configured accounts for testing:

### Admin Account
- **Email**: admin@dialersystem.com
- **Password**: admin123
- **Role**: Admin
- **Permissions**: Full system access

### Test User Accounts
- **Email**: user1@dialersystem.com / user2@dialersystem.com
- **Password**: admin123
- **Role**: User
- **Permissions**: Client management and call logging

⚠️ **Important**: Change all default passwords in production!

## Usage

### For Administrators
1. **Login** with admin credentials
2. **Manage Users**: Add, edit, or deactivate user accounts
3. **View Reports**: Monitor call statistics and user performance
4. **System Overview**: Dashboard with key metrics
5. **Client Management**: Full CRUD access to client database

### For Users
1. **Login** with user credentials
2. **View Clients**: Access complete client database
3. **Make Calls**: Initiate calls and log results
4. **Track Callbacks**: Schedule and manage callback reminders
5. **View Performance**: Personal call statistics and metrics

## Key Features Implemented

### Real-time Data Synchronization
- All users see updated information immediately
- No data conflicts or outdated information
- Automatic refresh on data changes

### Callback Management
- "Call back in 1 hour" functionality
- Automatic notifications at scheduled times
- Callback tracking and completion status

### Comprehensive Reporting
- Call success rates by user
- Missed call tracking
- Client interaction history
- Performance analytics

### Security Features
- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Row-level security in database

## File Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # Dashboard pages
│   ├── login/         # Login page
│   └── layout.tsx     # Root layout
├── components/
│   └── layout/        # Layout components
├── contexts/          # React contexts
├── lib/              # Utility libraries
└── types/            # TypeScript types

database/
└── schema.sql        # Database schema
```

## Development

### Adding New Features
1. Define TypeScript types in `src/types/`
2. Create API routes in `src/app/api/`
3. Build UI components
4. Update database schema if needed

### Customization
- Modify colors in `tailwind.config.js`
- Update global styles in `src/app/globals.css`
- Add new API endpoints as needed
- Extend database schema for additional features

## Production Deployment

### Security Checklist
- [ ] Change all default passwords
- [ ] Update JWT_SECRET to a secure random string
- [ ] Review and update CORS settings
- [ ] Enable rate limiting on API routes
- [ ] Review database security policies
- [ ] Set up proper backup procedures

### Performance Optimization
- [ ] Implement connection pooling
- [ ] Add Redis for session management
- [ ] Configure CDN for static assets
- [ ] Enable database query optimization
- [ ] Set up monitoring and logging

## Support

For issues or questions:
1. Check the logs in browser developer tools
2. Review Supabase logs for database issues
3. Verify environment configuration
4. Ensure all dependencies are installed

## License

This project is for internal use. All rights reserved.

---

Built with ❤️ using modern web technologies for efficient client management and call tracking.