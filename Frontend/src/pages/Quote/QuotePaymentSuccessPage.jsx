import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { salesAPI } from '../../api/index'
import { useAuth } from '../../context/AuthContext'

export default function QuotePaymentSuccessPage() {
  const [params]      = useSearchParams()
  const navigate      = useNavigate()
  const { user }      = useAuth()
  const [status, setStatus]   = useState('loading') // loading | success | error
  const [details, setDetails] = useState(null)

  useEffect(() => {
    const sessionId   = params.get('session_id')
    const quoteId     = params.get('quote_id')
    const paymentType = params.get('type') || 'full'

    if (!sessionId || !quoteId) {
      setStatus('error')
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
          setStatus('success')
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }
    confirm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Confirming your payment…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white px-4 gap-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-white/50 text-sm text-center">
          We couldn't confirm your payment. If you were charged, please contact us.
        </p>
        <button onClick={() => navigate('/')} className="mt-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold transition-colors">
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/15 text-green-400 text-4xl">
          ✓
        </div>

        <h1 className="text-2xl font-black mb-2">Payment Successful!</h1>
        <p className="text-white/50 text-sm mb-6">
          {details?.payment_type === 'partial'
            ? 'Your 50% deposit has been received. The remaining balance can be paid later.'
            : 'Your full payment has been received.'}
        </p>

        {details && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 text-left space-y-2">
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
              <span className="text-green-300 font-medium capitalize">{details.payment_type === 'partial' ? '50% Deposit' : 'Full'}</span>
            </div>
          </div>
        )}

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 mb-6">
          <p className="text-green-300 text-sm font-medium">Your case is now processing</p>
          <p className="text-white/50 text-xs mt-1">Our team will contact you soon via chat.</p>
        </div>

        <button
          onClick={() => navigate(user ? '/' : '/login')}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold transition-colors"
        >
          OK, Got it
        </button>
        <p className="text-xs text-white/25 mt-4">Aoqolt Spiritual Insights · contact@aoqolt.com</p>
      </div>
    </div>
  )
}
