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
import PaymentSuccessPage from './pages/Payment/PaymentSuccessPage'
import PaymentCancelPage from './pages/Payment/PaymentCancelPage'

// Auth pages
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import VerifyOtpPage from './pages/Auth/VerifyOtpPage'
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/Auth/ResetPasswordPage'
import SetPasswordPage from './pages/Auth/SetPasswordPage'
import YahooCallbackPage from './pages/Auth/YahooCallbackPage'

// Admin pages
import AdminDashboardPage from './pages/Admin/AdminDashboardPage'
import AdminCasesPage from './pages/Admin/AdminCasesPage'
import AdminCaseDetailPage from './pages/Admin/AdminCaseDetailPage'

// SuperAdmin pages
import SuperAdminDashboardPage from './pages/SuperAdmin/SuperAdminDashboardPage'
import SuperAdminCasesPage from './pages/SuperAdmin/SuperAdminCasesPage'
import SuperAdminUsersPage from './pages/SuperAdmin/SuperAdminUsersPage'
import SuperAdminBookingsPage from './pages/SuperAdmin/SuperAdminBookingsPage'
import SuperAdminClientsPage from './pages/SuperAdmin/SuperAdminClientsPage'
import SuperAdminAuraAssignmentsPage from './pages/SuperAdmin/SuperAdminAuraAssignmentsPage'
import SuperAdminChatPage from './pages/SuperAdmin/SuperAdminChatPage'
import SuperAdminSalesQuotesPage from './pages/SuperAdmin/SuperAdminSalesQuotesPage'
import SuperAdminSalesOrdersPage from './pages/SuperAdmin/SuperAdminSalesOrdersPage'
import SuperAdminInvoicePage from './pages/SuperAdmin/SuperAdminInvoicePage'
import SuperAdminReportsPage from './pages/SuperAdmin/SuperAdminReportsPage'
import SuperAdminAdminsPage from './pages/SuperAdmin/SuperAdminAdminsPage'
import SuperAdminSettingsPage from './pages/SuperAdmin/SuperAdminSettingsPage'

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
                background: 'var(--color-dark-3)',
                color: '#fff',
                border: '1px solid var(--color-primary-dim)',
              },
              success: { iconTheme: { primary: 'var(--color-primary)', secondary: '#fff' } },
              error:   { iconTheme: { primary: 'var(--color-accent)',  secondary: '#fff' } },
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
            {/* Admin-invitation routes — public, token-protected by the backend */}
            <Route path="/invite/:token" element={<SetPasswordPage />} />
            <Route path="/admin-reset/:token" element={<SetPasswordPage />} />
            <Route path="/oauth/yahoo/callback" element={<YahooCallbackPage />} />

            {/* Protected — requires auth */}
            <Route element={<ProtectedRoute />}>
              {/* ── Core booking flow ── */}
              <Route path="/booking/:token" element={<BookingPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/payment/cancel" element={<PaymentCancelPage />} />
              <Route path="/booking-form/:form2Token" element={<DetailsFormPage />} />
              <Route path="/booking/success" element={<BookingSuccessPage />} />

              {/* ── Admin dashboard ── */}
              <Route element={<RoleRoute allowedRoles={['admin', 'superadmin']} />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/cases" element={<AdminCasesPage />} />
                <Route path="/admin/cases/:id" element={<AdminCaseDetailPage />} />
              </Route>

              {/* ── SuperAdmin dashboard ── */}
              <Route element={<RoleRoute allowedRoles={['superadmin']} />}>
                <Route path="/superadmin"                       element={<SuperAdminDashboardPage />} />
                <Route path="/superadmin/bookings"              element={<SuperAdminBookingsPage />} />
                <Route path="/superadmin/cases"                 element={<SuperAdminCasesPage />} />
                <Route path="/superadmin/users"                 element={<SuperAdminUsersPage />} />
                <Route path="/superadmin/clients"               element={<SuperAdminClientsPage />} />
                <Route path="/superadmin/aura-assignments"      element={<SuperAdminAuraAssignmentsPage />} />
                <Route path="/superadmin/chat"                  element={<SuperAdminChatPage />} />
                <Route path="/superadmin/sales-quotes"          element={<SuperAdminSalesQuotesPage />} />
                <Route path="/superadmin/sales-orders"          element={<SuperAdminSalesOrdersPage />} />
                <Route path="/superadmin/invoice"               element={<SuperAdminInvoicePage />} />
                <Route path="/superadmin/reports"               element={<SuperAdminReportsPage />} />
                <Route path="/superadmin/admins"                element={<SuperAdminAdminsPage />} />
                <Route path="/superadmin/settings"              element={<SuperAdminSettingsPage />} />
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
