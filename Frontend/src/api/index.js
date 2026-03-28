import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 — try token refresh only for authenticated requests
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      // Only attempt refresh/redirect if this request was made with a token.
      // Public endpoints (AllowAny) that receive an expired token still return
      // 401 — we must NOT redirect to /login in that case.
      const hadToken = !!(original.headers?.Authorization || original.headers?.authorization)
      if (!hadToken) return Promise.reject(error)

      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${BASE_URL}/api/v1/auth/token/refresh/`,
            { refresh }
          )
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          // Refresh failed — clear tokens and retry the request WITHOUT a token.
          // If the endpoint is public it will succeed; if protected the component
          // should handle the resulting error and show a login prompt.
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          delete original.headers.Authorization
          original._retry = true
          return api(original)
        }
      } else {
        // Had a stale access token but no refresh token — clear and retry without auth.
        original._retry = true
        localStorage.removeItem('access_token')
        delete original.headers.Authorization
        return api(original)
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: (data) => api.post('/auth/logout/', data),
  guestLogin: () => api.post('/auth/guest/'),
  verifyOtp: (data) => api.post('/auth/verify-otp/', data),
  resendOtp: (data) => api.post('/auth/resend-otp/', data),
  forgotPassword: (data) => api.post('/auth/forgot-password/', data),
  resetPassword: (data) => api.post('/auth/reset-password/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  refreshToken: (data) => api.post('/auth/token/refresh/', data),
  socialLogin: (data) => api.post('/auth/social-login/', data),
}

// ── Accounts ──────────────────────────────────────────────────────────────
export const accountsAPI = {
  // Full user object (id, email, full_name, role, etc.)
  me: () => api.get('/accounts/users/me/'),
  // UserProfile fields (date_of_birth, gender, notifications, etc.)
  getProfile: () => api.get('/accounts/profile/'),
  updateProfile: (data) => api.patch('/accounts/profile/', data),
  uploadAvatar: (formData) =>
    api.post('/accounts/profile/avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  // SuperAdmin
  allUsers: () => api.get('/accounts/users/'),
  adminUsers: () => api.get('/accounts/users/admins/'),
  promoteToAdmin: (id) => api.post(`/accounts/users/${id}/promote/`),
}

// ── Invite / Account-Setup ────────────────────────────────────────────────
export const inviteAPI = {
  /** SuperAdmin: create a new user (no password) and get back an invite link */
  createUser: (data) => api.post('/accounts/admin/create-user/', data),
  /** SuperAdmin: regenerate an invite link for an existing inactive user */
  generateInvite: (data) => api.post('/accounts/admin/generate-invite/', data),
  /** SuperAdmin: generate an admin-controlled password-reset link */
  generateReset: (data) => api.post('/accounts/admin/generate-reset/', data),
  /** SuperAdmin: view invite/reset token history for a user */
  inviteStatus: (userId) => api.get(`/accounts/admin/invite-status/${userId}/`),
  /** Public: validate token before showing the set-password form */
  validateToken: (token) => api.get(`/accounts/validate-token/${token}/`),
  /** Public: set password via invite or reset token */
  setPassword: (data) => api.post('/accounts/set-password/', data),
}

// ── Services ─────────────────────────────────────────────────────────────
export const servicesAPI = {
  list: () => api.get('/services/active/'),
  detail: (id) => api.get(`/services/${id}/details/`),
}

// ── Bookings ──────────────────────────────────────────────────────────────
export const bookingsAPI = {
  // Generate a single-use token before navigating to the booking form
  initiate: (serviceId) => api.post('/bookings/initiate/', { service_id: serviceId }),
  // Validate a booking token and retrieve its associated service details
  validateBookingToken: (token) => api.get(`/bookings/token/${token}/`),
  // Retrieve booking info using the form2 token (for the Details Form page)
  getByForm2Token: (token) => api.get(`/bookings/form2/${token}/`),
  create: (data) => api.post('/bookings/', data),
  myBookings: () => api.get('/bookings/my_bookings/'),
  detail: (id) => api.get(`/bookings/${id}/`),
  cancel: (id) => api.post(`/bookings/${id}/cancel/`),
  addDetails: (id, data) => api.post(`/bookings/${id}/add_details/`, data),
  uploadAttachment: (id, formData) =>
    api.post(`/bookings/${id}/upload_attachment/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  requestCorrection: (id, data) => api.post(`/bookings/${id}/request_correction/`, data),
  // SuperAdmin
  allBookings: () => api.get('/bookings/'),
}

// ── Correction (public, token-based) ─────────────────────────────────────
export const correctionAPI = {
  get: (token) => api.get(`/bookings/correction/${token}/`),
  submit: (token, formData) =>
    api.post(`/bookings/correction/${token}/submit/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
}

// ── Cases ─────────────────────────────────────────────────────────────────
export const casesAPI = {
  myCases: () => api.get('/cases/my_cases/'),
  detail: (id) => api.get(`/cases/${id}/`),
  submitRating: (id, data) => api.post(`/cases/${id}/submit_rating/`, data),
  // Admin
  allCases: () => api.get('/cases/'),
  assign: (id, data) => api.post(`/cases/${id}/assign/`, data),
  uploadResult: (id, formData) =>
    api.post(`/cases/${id}/upload_result/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  updateStatus: (id, data) => api.post(`/cases/${id}/update_status/`, data),
}

// ── Chat ──────────────────────────────────────────────────────────────────
export const chatAPI = {
  getMessages: (caseId) =>
    api.get(`/chat/messages/case_messages/?case_id=${caseId}`),
  sendMessage: (data) => api.post('/chat/messages/', data),
  sendFile: (formData) =>
    api.post('/chat/messages/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  getConversations: () => api.get('/chat/messages/conversations/'),
  markConversationRead: (caseId) =>
    api.post('/chat/messages/mark_conversation_read/', { case_id: caseId }),
  editMessage: (id, message) => api.patch(`/chat/messages/${id}/`, { message }),
  deleteMessage: (id) => api.delete(`/chat/messages/${id}/`),
}

// ── Payments ──────────────────────────────────────────────────────────────
export const paymentsAPI = {
  createCheckout: (data) => api.post('/payments/create_checkout_session/', data),
  myPayments: () => api.get('/payments/my_payments/'),
  detail: (id) => api.get(`/payments/${id}/`),
  recentPayments: (limit = 20) => api.get(`/payments/recent_payments/?limit=${limit}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  superAdmin: () => api.get('/dashboard/superadmin/'),
  client: () => api.get('/dashboard/client/'),
  admin: () => api.get('/dashboard/admin/'),
}

// ── Blogs ─────────────────────────────────────────────────────────────────
export const blogsAPI = {
  /** Public: paginated published blogs */
  list: (params = {}) => api.get('/blogs/', { params }),
  /** Public: single blog by slug */
  detail: (slug) => api.get(`/blogs/${slug}/`),
  /** Blog manager / superadmin: all owned blogs */
  myBlogs: () => api.get('/blogs/my/'),
  /** Blog manager / superadmin: create a blog — accepts FormData */
  create: (formData) =>
    api.post('/blogs/create/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  /** Author / superadmin: update blog (PATCH for partial) */
  update: (id, formData) =>
    api.patch(`/blogs/update/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  /** Author / superadmin: delete blog */
  delete: (id) => api.delete(`/blogs/delete/${id}/`),
  /** Author / superadmin: upload gallery image */
  uploadGallery: (id, formData) =>
    api.post(`/blogs/${id}/gallery/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  /** SuperAdmin: assign or revoke blog-manager role */
  assignRole: (data) => api.post('/blogs/admin/assign-blog-role/', data),
  /** SuperAdmin: list all blog managers */
  blogManagers: () => api.get('/blogs/admin/blog-managers/'),
  /** SuperAdmin: search users by name/email to grant blog role */
  searchUsers: (q) => api.get('/accounts/users/', { params: { search: q, page_size: 20 } }),
}

// ── Sales ─────────────────────────────────────────────────────────────────
export const salesAPI = {
  // Quotes
  listQuotes: () => api.get('/sales/quotes/'),
  getQuote: (id) => api.get(`/sales/quotes/${id}/`),
  saveItems: (id, data) => api.post(`/sales/quotes/${id}/save_items/`, data),
  sendQuote: (id) => api.post(`/sales/quotes/${id}/send_quote/`),
  publicQuote: (token) => api.get(`/sales/quotes/public/${token}/`),
  quotePayment: (token, data) => api.post(`/sales/quotes/pay/${token}/`, data),
  confirmPayment: (data) => api.post(`/sales/quotes/confirm_payment/`, data),
  // Orders
  listOrders: () => api.get('/sales/orders/'),
  getOrder: (id) => api.get(`/sales/orders/${id}/`),
  markOrderCompleted: (id) => api.post(`/sales/orders/${id}/mark_completed/`),
}

export default api
