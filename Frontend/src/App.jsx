import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import RoleRoute from './routes/RoleRoute'

import Navbar from './components/Navbar'
import Footer from './components/Footer'

// ── All pages lazy (each is its own JS chunk) except immediate visible pages ─────────────
import HomePage from './pages/Home/HomePage'
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
const AdminWorkPage       = lazy(() => import('./pages/Admin/AdminWorkPage'))
const AdminDonePage       = lazy(() => import('./pages/Admin/AdminDonePage'))

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

// Quote
const QuotePage               = lazy(() => import('./pages/Quote/QuotePage'))
const QuotePaymentSuccessPage = lazy(() => import('./pages/Quote/QuotePaymentSuccessPage'))

// Client dashboard
const ChatListPage        = lazy(() => import('./pages/Dashboard/chat/ChatListPage'))
const CaseChatPage        = lazy(() => import('./pages/Dashboard/chat/CaseChatPage'))
const BookingChatPage     = lazy(() => import('./pages/Dashboard/chat/BookingChatPage'))
const ClientDashboardPage = lazy(() => import('./pages/Dashboard/ClientDashboardPage'))
const MyBookingsPage      = lazy(() => import('./pages/Dashboard/MyBookingsPage'))
const MyCasesPage         = lazy(() => import('./pages/Dashboard/MyCasesPage'))
const CaseDetailPage      = lazy(() => import('./pages/Dashboard/CaseDetailPage'))
const ProfilePage         = lazy(() => import('./pages/Dashboard/ProfilePage'))

// Zero-cost fallback — renders nothing, blocks nothing
const Noop = null

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          {/* No global Suspense — each route is individually wrapped */}
          <Routes>
            {/* Public pages with Navbar + Footer */}
            <Route element={<PublicLayout />}>
              <Route path="/"             element={<HomePage />} />
              <Route path="/services"     element={<S><ServicesPage /></S>} />
              <Route path="/services/:id" element={<S><ServiceDetailPage /></S>} />
              <Route path="/blogs"        element={<S><BlogsPage /></S>} />
              <Route path="/blogs/:slug"  element={<S><BlogDetailPage /></S>} />
            </Route>

            {/* Auth pages — no navbar */}
            <Route path="/login"              element={<S><LoginPage /></S>} />
            <Route path="/register"           element={<S><RegisterPage /></S>} />
            <Route path="/verify-otp"         element={<S><VerifyOtpPage /></S>} />
            <Route path="/forgot-password"    element={<S><ForgotPasswordPage /></S>} />
            <Route path="/reset-password"     element={<S><ResetPasswordPage /></S>} />
            <Route path="/invite/:token"      element={<S><SetPasswordPage /></S>} />
            <Route path="/admin-reset/:token" element={<S><SetPasswordPage /></S>} />
            <Route path="/oauth/yahoo/callback" element={<S><YahooCallbackPage /></S>} />

            {/* Quote pages */}
            <Route path="/quote/payment/success" element={<S><QuotePaymentSuccessPage /></S>} />
            <Route path="/quote/:token"          element={<S><QuotePage /></S>} />

            {/* Protected — requires auth; NotificationProvider only mounts here */}
            <Route element={<ProtectedLayout />}>
              {/* ── Client dashboard ── */}
              <Route path="/dashboard"           element={<S><ClientDashboardPage /></S>} />
              <Route path="/dashboard/bookings"  element={<S><MyBookingsPage /></S>} />
              <Route path="/dashboard/cases"     element={<S><MyCasesPage /></S>} />
              <Route path="/dashboard/cases/:id" element={<S><CaseDetailPage /></S>} />
              <Route path="/dashboard/chat"                   element={<S><ChatListPage /></S>} />
              <Route path="/dashboard/chat/case/:id"          element={<S><CaseChatPage /></S>} />
              <Route path="/dashboard/chat/booking/:id"       element={<S><BookingChatPage /></S>} />
              <Route path="/dashboard/profile"   element={<S><ProfilePage /></S>} />

              {/* ── Core booking flow ── */}
              <Route path="/booking/:token"           element={<S><BookingPage /></S>} />
              <Route path="/payment/success"          element={<S><PaymentSuccessPage /></S>} />
              <Route path="/payment/cancel"           element={<S><PaymentCancelPage /></S>} />
              <Route path="/booking-form/:form2Token" element={<S><DetailsFormPage /></S>} />
              <Route path="/booking/success"          element={<S><BookingSuccessPage /></S>} />

              {/* ── Admin dashboard ── */}
              <Route element={<RoleRoute allowedRoles={['admin', 'superadmin']} />}>
                <Route path="/admin"           element={<S><AdminDashboardPage /></S>} />
                <Route path="/admin/cases"     element={<S><AdminCasesPage /></S>} />
                <Route path="/admin/cases/:id" element={<S><AdminCaseDetailPage /></S>} />
                <Route path="/admin/chat"      element={<S><AdminChatPage /></S>} />
                <Route path="/admin/work"      element={<S><AdminWorkPage /></S>} />
                <Route path="/admin/done"      element={<S><AdminDonePage /></S>} />
              </Route>

              {/* ── Blog manager routes ── */}
              <Route element={<BlogManagerRoute />}>
                <Route path="/blogs/create"   element={<S><CreateEditBlogPage /></S>} />
                <Route path="/blogs/edit/:id" element={<S><CreateEditBlogPage /></S>} />
                <Route path="/blogs/my"       element={<S><MyBlogsPage /></S>} />
              </Route>

              {/* ── SuperAdmin dashboard ── */}
              <Route element={<RoleRoute allowedRoles={['superadmin']} />}>
                <Route path="/superadmin"                  element={<S><SuperAdminDashboardPage /></S>} />
                <Route path="/superadmin/bookings"         element={<S><SuperAdminBookingsPage /></S>} />
                <Route path="/superadmin/cases"            element={<S><SuperAdminCasesPage /></S>} />
                <Route path="/superadmin/users"            element={<S><SuperAdminUsersPage /></S>} />
                <Route path="/superadmin/clients"          element={<S><SuperAdminClientsPage /></S>} />
                <Route path="/superadmin/aura-assignments" element={<S><SuperAdminAuraAssignmentsPage /></S>} />
                <Route path="/superadmin/chat"             element={<S><SuperAdminChatPage /></S>} />
                <Route path="/superadmin/sales-quotes"     element={<S><SuperAdminSalesQuotesPage /></S>} />
                <Route path="/superadmin/sales-orders"     element={<S><SuperAdminSalesOrdersPage /></S>} />
                <Route path="/superadmin/invoice"          element={<S><SuperAdminInvoicePage /></S>} />
                <Route path="/superadmin/reports"          element={<S><SuperAdminReportsPage /></S>} />
                <Route path="/superadmin/admins"           element={<S><SuperAdminAdminsPage /></S>} />
                <Route path="/superadmin/settings"         element={<S><SuperAdminSettingsPage /></S>} />
                <Route path="/superadmin/blogs"            element={<S><SuperAdminBlogsPage /></S>} />
                <Route path="/superadmin/blog-permissions" element={<S><SuperAdminBlogPermissionsPage /></S>} />
                <Route path="/superadmin/notifications"    element={<S><SuperAdminNotificationsPage /></S>} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Lightweight per-route Suspense wrapper — zero fallback, no paint block
function S({ children }) {
  return <Suspense fallback={Noop}>{children}</Suspense>
}

// Blog manager guard — requires can_manage_blogs OR superadmin
function BlogManagerRoute() {
  const { isSuperAdmin, isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isSuperAdmin || user?.can_manage_blogs) return <Outlet />
  return <Navigate to="/" replace />
}

// Combines auth guard + NotificationProvider — only mounts for logged-in users
function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return (
    <NotificationProvider>
      <Outlet />
    </NotificationProvider>
  )
}

// Lazy Navbar/Footer is removed to improve initial load
function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}
