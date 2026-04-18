import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { salesAPI } from '../../api/index'

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
      <div className="w-8 h-8 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
    </div>
  )
}

export default function QuotePage() {
  const { token } = useParams()

  const [quote, setQuote]    = useState(null)
  const [error, setError]    = useState('')
  const [loadingQ, setLoadQ] = useState(true)
  const [paying, setPaying]  = useState(null) // 'partial' | 'full' | null

  // Public page — no auth required
  useEffect(() => {
    if (!token) return
    const load = async () => {
      setLoadQ(true)
      try {
        const res = await salesAPI.publicQuote(token)
        if (res.data?.success) {
          setQuote(res.data.data)
        } else {
          setError('Quote not found or expired.')
        }
      } catch {
        setError('Quote not found or expired.')
      }
      setLoadQ(false)
    }
    load()
  }, [token])

  const handlePay = async (type) => {
    setPaying(type)
    try {
      const res = await salesAPI.quotePayment(token, { payment_type: type })
      if (res.data?.success && res.data?.session_url) {
        window.location.href = res.data.session_url
      } else {
        alert('Payment initiation failed. Please try again.')
        setPaying(null)
      }
    } catch (e) {
      alert(e?.response?.data?.error || 'Payment failed.')
      setPaying(null)
    }
  }

  if (loadingQ) return <Spinner />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white px-4">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2">Quote Not Found</h1>
        <p className="text-white/50 text-sm mb-6">{error}</p>
        <a href="/" className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold transition-colors">
          Go Home
        </a>
      </div>
    )
  }

  const total = Number(quote?.amount || 0)
  const partial = total / 2
  const isPayable = (quote?.status === 'pending' || quote?.status === 'draft') && total > 0

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-red-500 tracking-tight">AOQOLT</h1>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Quote header */}
          <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-white/40">{quote?.quote_number}</p>
              <h2 className="text-xl font-bold mt-1">{quote?.title || 'Treatment Quote'}</h2>
            </div>
            <span className="text-xs font-semibold bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full capitalize">
              {quote?.status}
            </span>
          </div>

          {/* Bill to */}
          <div className="px-8 py-6 border-b border-white/10 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Bill To</p>
              <p className="font-semibold">{quote?.client_name}</p>
              <p className="text-sm text-white/60">{quote?.client_email}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">From</p>
              <p className="font-semibold text-red-400">Aoqolt</p>
              <p className="text-sm text-white/60">contact@aoqolt.com</p>
              {quote?.valid_until && (
                <p className="text-xs text-white/40 mt-1">Valid until: {quote.valid_until}</p>
              )}
            </div>
          </div>

          {/* Line items */}
          {quote?.items?.length > 0 && (
            <div className="px-8 py-6 border-b border-white/10">
              <div className="grid grid-cols-[1fr_64px_110px] gap-3 text-xs text-white/40 uppercase tracking-wide mb-3">
                <span>Description</span><span className="text-center">Qty</span><span className="text-right">Price</span>
              </div>
              <div className="space-y-3">
                {quote.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_64px_110px] gap-3 items-center">
                    <p className="text-sm text-white">{item.description}</p>
                    <p className="text-sm text-center text-white/60">{item.quantity}</p>
                    <p className="text-sm text-right font-medium">${Number(item.total_price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="px-8 py-5 border-b border-white/10 flex justify-between items-center">
            <span className="text-white/50">Total Amount</span>
            <span className="text-2xl font-black text-white">${total.toFixed(2)} <span className="text-sm font-normal text-white/40">{quote?.currency || 'USD'}</span></span>
          </div>

          {/* Payment options */}
          {(quote?.status === 'pending' || quote?.status === 'draft') && total === 0 ? (
            <div className="px-8 py-8 text-center">
              <p className="text-yellow-400/80 text-sm font-medium">Quote amount not set yet</p>
              <p className="text-white/40 text-xs mt-1">The team is preparing your quote. You'll be notified when it's ready.</p>
            </div>
          ) : isPayable ? (
            <div className="px-8 py-7 space-y-4">
              <p className="text-sm text-white/60 text-center mb-5">Choose your payment option</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Partial */}
                <div className="border border-white/15 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-yellow-400/50 transition-colors">
                  <div className="text-center">
                    <p className="text-xs text-white/40 uppercase tracking-wide">50% Deposit</p>
                    <p className="text-2xl font-black text-yellow-300 mt-1">${partial.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-white/40 text-center">Pay 50% now to begin the treatment</p>
                  <button
                    onClick={() => handlePay('partial')}
                    disabled={!!paying}
                    className="w-full py-2.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {paying === 'partial' ? 'Redirecting…' : 'Pay Deposit'}
                  </button>
                </div>
                {/* Full */}
                <div className="border border-red-500/30 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-red-500/60 transition-colors">
                  <div className="text-center">
                    <p className="text-xs text-white/40 uppercase tracking-wide">Full Payment</p>
                    <p className="text-2xl font-black text-white mt-1">${total.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-white/40 text-center">Pay in full and start immediately</p>
                  <button
                    onClick={() => handlePay('full')}
                    disabled={!!paying}
                    className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {paying === 'full' ? 'Redirecting…' : 'Pay in Full'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/30 text-center mt-3">
                Secure payment via Stripe. Your card details are never stored.
              </p>
            </div>
          ) : (
            <div className="px-8 py-8 text-center">
              {quote?.status === 'accepted' && (
                <>
                  <p className="text-green-400 font-semibold mb-1">Payment received! ✓</p>
                  <p className="text-sm text-white/50">Your treatment is now in progress.</p>
                </>
              )}
              {quote?.status === 'rejected' && (
                <p className="text-white/50 text-sm">This quote was declined.</p>
              )}
              {quote?.status === 'expired' && (
                <p className="text-white/50 text-sm">This quote has expired. Please contact us for a new quote.</p>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">Aoqolt · contact@aoqolt.com</p>
      </div>
    </div>
  )
}
