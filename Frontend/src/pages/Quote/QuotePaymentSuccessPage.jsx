import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { salesAPI } from '../../api/index'
import { useAuth } from '../../context/AuthContext'

export default function QuotePaymentSuccessPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const [pageStatus, setPageStatus] = useState('loading') // loading | success | error
  const [details, setDetails]       = useState(null)

  useEffect(() => {
    const sessionId   = params.get('session_id')
    const quoteId     = params.get('quote_id')
    const paymentType = params.get('type') || 'full'

    if (!sessionId || !quoteId) {
      setPageStatus('error')
      return
    }

    const confirm = async () => {
      try {
        const res = await salesAPI.confirmPayment({
          session_id: sessionId,
          quote_id: quoteId,
          payment_type: paymentType,
        })
        if (res.data?.success) {
          setDetails(res.data)
          setPageStatus('success')
        } else {
          setPageStatus('error')
        }
      } catch {
        setPageStatus('error')
      }
    }
    confirm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (pageStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Confirming your payment...</p>
      </div>
    )
  }

  if (pageStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white px-4 gap-4">
        <div className="text-5xl">Warning</div>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-white/50 text-sm text-center">
          We could not confirm your payment. If you were charged, please contact us at contact@aoqolt.com
        </p>
        <a href="/" className="mt-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold transition-colors">
          Go Home
        </a>
      </div>
    )
  }

  const isRegisteredUser = details?.client_has_account

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/15 border border-green-500/20">
          <span className="text-4xl text-green-400">v</span>
        </div>
        <h1 className="text-2xl font-black mb-2">Payment Successful!</h1>
        <p className="text-white/50 text-sm mb-6">
          {details?.payment_type === 'partial'
            ? 'Your 50% deposit has been received. The remaining balance can be paid later.'
            : 'Your full payment has been received.'}
        </p>
        {details && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 text-left space-y-3">
            {details.case_number && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Case</span>
                <span className="font-mono text-white/80">{details.case_number}</span>
              </div>
            )}
            {details.order_number && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Order</span>
                <span className="font-mono text-white/80">{details.order_number}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Payment</span>
              <span className="text-green-300 font-medium">
                {details.payment_type === 'partial' ? '50% Deposit' : 'Full Payment'}
              </span>
            </div>
          </div>
        )}
        {isRegisteredUser ? (
          <>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4 mb-6">
              <p className="text-blue-300 text-sm font-medium">Your case is now open</p>
              <p className="text-white/50 text-xs mt-1">
                {user
                  ? 'You can now chat with our team directly from your dashboard.'
                  : 'Login to your account to track progress and chat with our team.'}
              </p>
            </div>
            {user ? (
              <button
                onClick={() => navigate('/dashboard/chat', {
                  state: { caseId: details?.case_id }
                })}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold transition-colors mb-3"
              >
                Open Chat with Our Team
              </button>
            ) : (
              <button
                onClick={() => navigate('/login', {
                  state: { redirect: '/dashboard/chat', caseId: details?.case_id }
                })}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold transition-colors mb-3"
              >
                Login to Track My Case
              </button>
            )}
            <a href="/" className="block text-sm text-white/40 hover:text-white/60 transition-colors">Go to Home</a>
          </>
        ) : (
          <>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 mb-6">
              <p className="text-green-300 text-sm font-medium">Our team will contact you soon</p>
              <p className="text-white/50 text-xs mt-2">
                We have received your payment. A member of our team will reach out to you at the email provided.
              </p>
            </div>
            <a href="/" className="block w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold transition-colors text-center">
              OK, Got it
            </a>
          </>
        )}
        <p className="text-xs text-white/20 mt-6">Aoqolt Spiritual Insights - contact@aoqolt.com</p>
      </div>
    </div>
  )
}
