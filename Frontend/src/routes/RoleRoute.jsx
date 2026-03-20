import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard
    if (user?.role === 'superadmin') return <Navigate to="/superadmin" replace />
    if (user?.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
