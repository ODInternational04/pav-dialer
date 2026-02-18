import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Handle navigation in useEffect, not during render
    if (!loading && !user) {
      navigate('/login', { replace: true })
    } else if (!loading && requireAdmin && user?.role !== 'admin') {
      navigate('/user', { replace: true })
    }
  }, [user, loading, requireAdmin, navigate])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Check authentication
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check admin requirement
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/user" replace />
  }

  return <>{children}</>
}
