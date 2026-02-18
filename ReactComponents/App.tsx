import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'
import ProtectedRoute from './components/ProtectedRoute'

// Import admin pages
import Clients from './pages/admin/Clients'
import CallLogs from './pages/admin/CallLogs'
import Users from './pages/admin/Users'
import CustomerFeedback from './pages/admin/CustomerFeedback'
import Reports from './pages/admin/Reports'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requireAdmin>
        <AdminDashboard />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'clients',
        element: <Clients />
      },
      {
        path: 'calls',
        element: <CallLogs />
      },
      {
        path: 'users',
        element: <Users />
      },
      {
        path: 'feedback',
        element: <CustomerFeedback />
      },
      {
        path: 'reports',
        element: <Reports />
      }
    ]
  },
  {
    path: '/user',
    element: (
      <ProtectedRoute>
        <UserDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: '/',
    element: <Login />
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
})

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
