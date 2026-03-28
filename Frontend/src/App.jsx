import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ServicesProvider } from './context/ServicesContext'
import { NotificationProvider } from './context/NotificationContext'

// Layout & guards — eagerly loaded (tiny, needed on every render)
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LoadingScreen from './components/LoadingScreen'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'

// ── Lazy-loaded pages (each becomes its own JS chunk) ────────────────────────
const HomePage           = lazy(() => import('./pages/Home/HomePage'))
const ServicesPage       = lazy(() => import('./pages/Services/ServicesPage'))
const ServiceDetailPage  = lazy(() => import('./pages/Services/ServiceDetailPage'))
const BookingPage        = lazy(() => import('./pages/Booking/BookingPage'))
const DetailsFormPage    = lazy(() => import('./pages/Booking/DetailsFormPage'))
const BookingSuccessPage = lazy(() => import('./pages/Booking/BookingSuccessPage'))
const PaymentSuccessPage = lazy(() => import('./pages/Payment/PaymentSuccessPage'))
const PaymentCancelPage  = lazy(() => import('./pages/Payment/PaymentCancelPage'))

// Auth
const LoginPage          = lazy(() => import('./pages/Auth/LoginPage'))
const RegisterPage       = lazy(() => import('./pages/Auth/RegisterPage'))
const VerifyOtpPage      = lazy(() => import('./pages/Auth/VerifyOtpPage'))
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('./pages/Auth/ResetPasswordPage'))
const SetPasswordPage    = lazy(() => import('./pages/Auth/SetPasswordPage'))
const YahooCallbackPage  = lazy(() => import('./pages/Auth/YahooCallbackPage'))

// Admin
const AdminDashboardPage  = lazy(() => import('./pages/Admin/AdminDashboardPage'))
const AdminCasesPage      = lazy(() => import('./pages/Admin/AdminCasesPage'))
const AdminCaseDetailPage = lazy(() => import('./pages/Admin/AdminCaseDetailPage'))
const AdminChatPage       = lazy(() => import('./pages/Admin/AdminChatPage'))

// SuperAdmin
const SuperAdminDashboardPage       = lazy(() => import('./pages/SuperAdmin/SuperAdminDashboardPage'))
const SuperAdminCasesPage           = lazy(() => import('./pages/SuperAdmin/SuperAdminCasesPage'))
const SuperAdminUsersPage           = lazy(() => import('./pages/SuperAdmin/SuperAdminUsersPage'))
const SuperAdminBookingsPage        = lazy(() => import('./pages/SuperAdmin/SuperAdminBookingsPage'))
const SuperAdminClientsPage         = lazy(() => import('./pages/SuperAdmin/SuperAdminClientsPage'))
const SuperAdminAuraAssignmentsPage = lazy(() => import('./pages/SuperAdmin/SuperAdminAuraAssignmentsPage'))
const SuperAdminChatPage            = lazy(() => import('./pages/SuperAdmin/SuperAdminChatPage'))
const SuperAdminSalesQuotesPage     = lazy(() => import('./pages/SuperAdmin/SuperAdminSalesQuotesPage'))
const SuperAdminSalesOrdersPage     = lazy(() => import('./pages/SuperAdmin/SuperAdminSalesOrdersPage'))
const SuperAdminInvoicePage         = lazy(() => import('./pages/SuperAdmin/SuperAdminInvoicePage'))
const SuperAdminReportsPage         = lazy(() => import('./pages/SuperAdmin/SuperAdminReportsPage'))
const SuperAdminAdminsPage          = lazy(() => import('./pages/SuperAdmin/SuperAdminAdminsPage'))
const SuperAdminSettingsPage        = lazy(() => import('./pages/SuperAdmin/SuperAdminSettingsPage'))
const SuperAdminBlogsPage           = lazy(() => import('./pages/SuperAdmin/SuperAdminBlogsPage'))
const SuperAdminBlogPermissionsPage = lazy(() => import('./pages/SuperAdmin/SuperAdminBlogPermissionsPage'))
const SuperAdminNotificationsPage   = lazy(() => import('./pages/SuperAdmin/SuperAdminNotificationsPage'))

// Blog
const BlogsPage          = lazy(() => import('./pages/Blog/BlogsPage'))
const BlogDetailPage     = lazy(() => import('./pages/Blog/BlogDetailPage'))
const CreateEditBlogPage = lazy(() => import('./pages/Blog/CreateEditBlogPage'))
const MyBlogsPage        = lazy(() => import('./pages/Blog/MyBlogsPage'))

// Quote (client-facing)
const QuotePage               = lazy(() => import('./pages/Quote/QuotePage'))
const QuotePaymentSuccessPage = lazy(() => import('./pages/Quote/QuotePaymentSuccessPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ServicesProvider>
          <NotificationProvider>
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
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public pages with Navbar + Footer */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/:id" element={<ServiceDetailPage />} />
              <Route path="/blogs" element={<BlogsPage />} />
              <Route path="/blogs/:slug" element={<BlogDetailPage />} />
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

            {/* Quote pages — login-gated but accessible from email link */}
            <Route path="/quote/payment/success" element={<QuotePaymentSuccessPage />} />
            <Route path="/quote/:token" element={<QuotePage />} />

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
                <Route path="/admin/chat" element={<AdminChatPage />} />
              </Route>

              {/* ── Blog manager routes ── */}
              <Route element={<BlogManagerRoute />}>
                <Route path="/blogs/create"   element={<CreateEditBlogPage />} />
                <Route path="/blogs/edit/:id" element={<CreateEditBlogPage />} />
                <Route path="/blogs/my"       element={<MyBlogsPage />} />
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
                <Route path="/superadmin/blogs"                 element={<SuperAdminBlogsPage />} />
                <Route path="/superadmin/blog-permissions"      element={<SuperAdminBlogPermissionsPage />} />
                <Route path="/superadmin/notifications"         element={<SuperAdminNotificationsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </NotificationProvider>
        </ServicesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Blog manager guard — requires can_manage_blogs OR superadmin
function BlogManagerRoute() {
  const { isSuperAdmin, isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isSuperAdmin || user?.can_manage_blogs) return <Outlet />
  return <Navigate to="/" replace />
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
