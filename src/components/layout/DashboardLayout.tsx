'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRealTime } from '@/contexts/RealTimeContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificationCenter from '@/components/NotificationCenter'
import { useState, useEffect, useCallback } from 'react'
import { throttledApiCall, debounce } from '@/lib/requestThrottle'
import { 
  HomeIcon, 
  UsersIcon, 
  PhoneIcon, 
  ClipboardDocumentListIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline'

interface SidebarProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth()
  const { triggerRefresh, isConnected } = useRealTime()
  const router = useRouter()
  const pathname = usePathname()
  const [callbackCount, setCallbackCount] = useState(0)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Fetch callback count with throttling
  const fetchCallbackCount = useCallback(async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const data = await throttledApiCall(
        '/api/notifications?type=callback&isRead=false',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        },
        'dashboard-callback-count',
        60000 // Cache for 1 minute
      )

      setCallbackCount(data.notifications?.length || 0)
    } catch (error) {
      console.error('Error fetching callback count:', error)
    }
  }, [user])

  // Poll for callback count every 2 minutes (reduced frequency)
  useEffect(() => {
    if (user) {
      // Create debounced version
      const debouncedFetch = debounce(fetchCallbackCount, 3000)
      
      fetchCallbackCount() // Initial call
      const interval = setInterval(debouncedFetch, 120000) // 2 minutes
      return () => clearInterval(interval)
    }
  }, [user, fetchCallbackCount])

  const adminNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
    { name: 'User Status', href: '/dashboard/user-status', icon: UsersIcon },
    { name: 'Clients', href: '/dashboard/clients', icon: ClipboardDocumentListIcon },
    { name: 'Callbacks', href: '/dashboard/callbacks', icon: ExclamationTriangleIcon, badge: callbackCount },
    { name: 'Call Logs', href: '/dashboard/calls', icon: PhoneIcon },
    { name: 'Customer Feedback', href: '/dashboard/customer-feedback', icon: ChatBubbleLeftIcon },
    { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon },
  ]

  const userNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Clients', href: '/dashboard/clients', icon: ClipboardDocumentListIcon },
    { name: 'Callbacks', href: '/dashboard/callbacks', icon: ExclamationTriangleIcon, badge: callbackCount },
    { name: 'My Calls', href: '/dashboard/calls', icon: PhoneIcon },
  ]

  const navItems = isAdmin ? adminNavItems : userNavItems

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Fixed, no scroll */}
      <div className="flex flex-col w-64 bg-white shadow-medium fixed h-full overflow-hidden">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 bg-primary-600 flex-shrink-0">
          <h1 className="text-xl font-bold text-white">
            Pavilion Hotel
          </h1>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold text-sm">
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable if needed */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''} relative`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-left text-danger-600 hover:bg-danger-50 hover:text-danger-700"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content - Offset for fixed sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        {/* Header */}
        <header className="bg-white shadow-soft border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {navItems.find(item => item.href === pathname)?.name || 'Dashboard'}
            </h2>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className={`flex items-center text-sm ${
                isConnected ? 'text-success-600' : 'text-danger-600'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? 'bg-success-500' : 'bg-danger-500'
                } ${isConnected ? 'animate-pulse' : ''}`}></div>
                {isConnected ? 'Live' : 'Offline'}
              </div>

              {/* Refresh Button */}
              <button
                onClick={triggerRefresh}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Refresh data"
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}