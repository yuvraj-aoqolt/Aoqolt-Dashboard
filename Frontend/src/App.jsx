import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ServicesProvider } from './context/ServicesContext'

// Layout
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// Pages
import HomePage from './pages/Home/HomePage'
import ServicesPage from './pages/Services/ServicesPage'
import ServiceDetailPage from './pages/Services/ServiceDetailPage'
import BookingPage from './pages/Booking/BookingPage'
import DetailsFormPage from './pages/Booking/DetailsFormPage'
import BookingSuccessPage from './pages/Booking/BookingSuccessPage'
import CorrectionFormPage from './pages/Booking/CorrectionFormPage'
import PaymentSuccessPage from './pages/Payment/PaymentSuccessPage'
import PaymentCancelPage from './pages/Payment/PaymentCancelPage'

// Auth pages
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import VerifyOtpPage from './pages/Auth/VerifyOtpPage'
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/Auth/ResetPasswordPage'
import YahooCallbackPage from './pages/Auth/YahooCallbackPage'

// Dashboard pages (kept for future use)
import ClientDashboardPage from './pages/Dashboard/ClientDashboardPage'
import MyBookingsPage from './pages/Dashboard/MyBookingsPage'
import MyCasesPage from './pages/Dashboard/MyCasesPage'
import CaseDetailPage from './pages/Dashboard/CaseDetailPage'
import ProfilePage from './pages/Dashboard/ProfilePage'

// Admin pages
import AdminDashboardPage from './pages/Admin/AdminDashboardPage'
import AdminCasesPage from './pages/Admin/AdminCasesPage'
import AdminCaseDetailPage from './pages/Admin/AdminCaseDetailPage'

// SuperAdmin pages
import SuperAdminDashboardPage from './pages/SuperAdmin/SuperAdminDashboardPage'
import SuperAdminCasesPage from './pages/SuperAdmin/SuperAdminCasesPage'
import SuperAdminUsersPage from './pages/SuperAdmin/SuperAdminUsersPage'
import SuperAdminBookingsPage from './pages/SuperAdmin/SuperAdminBookingsPage'

// Route guards
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ServicesProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid rgba(220,38,38,0.3)',
              },
              success: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public pages with Navbar + Footer */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/:id" element={<ServiceDetailPage />} />
            </Route>

            {/* Auth pages — no navbar */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/oauth/yahoo/callback" element={<YahooCallbackPage />} />

            {/* Public correction form — token-based, no login required */}
            <Route path="/form/:token" element={<CorrectionFormPage />} />

            {/* Protected — requires auth */}
            <Route element={<ProtectedRoute />}>
              {/* ── Core booking flow ── */}
              <Route path="/booking/:serviceId" element={<BookingPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/payment/cancel" element={<PaymentCancelPage />} />
              <Route path="/booking-form/:bookingId" element={<DetailsFormPage />} />
              <Route path="/booking/success" element={<BookingSuccessPage />} />

              {/* ── Client dashboard (kept for future use) ── */}
              <Route element={<RoleRoute allowedRoles={['client', 'admin', 'superadmin']} />}>
                <Route path="/dashboard" element={<ClientDashboardPage />} />
                <Route path="/dashboard/bookings" element={<MyBookingsPage />} />
                <Route path="/dashboard/cases" element={<MyCasesPage />} />
                <Route path="/dashboard/cases/:id" element={<CaseDetailPage />} />
                <Route path="/dashboard/profile" element={<ProfilePage />} />
              </Route>

              {/* ── Admin dashboard ── */}
              <Route element={<RoleRoute allowedRoles={['admin', 'superadmin']} />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/cases" element={<AdminCasesPage />} />
                <Route path="/admin/cases/:id" element={<AdminCaseDetailPage />} />
              </Route>

              {/* ── SuperAdmin dashboard ── */}
              <Route element={<RoleRoute allowedRoles={['superadmin']} />}>
                <Route path="/superadmin" element={<SuperAdminDashboardPage />} />
                <Route path="/superadmin/bookings" element={<SuperAdminBookingsPage />} />
                <Route path="/superadmin/cases" element={<SuperAdminCasesPage />} />
                <Route path="/superadmin/users" element={<SuperAdminUsersPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ServicesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Layout wrapper that includes Navbar and Footer
function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}
