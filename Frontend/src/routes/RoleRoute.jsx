import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from '../components/LoadingScreen'

export default function RoleRoute({ allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!user || !allowedRoles.includes(user.role)) {
    if (user?.role === 'superadmin') return <Navigate to="/superadmin" replace />
    if (user?.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/services" replace />
  }

  return <Outlet />
}
