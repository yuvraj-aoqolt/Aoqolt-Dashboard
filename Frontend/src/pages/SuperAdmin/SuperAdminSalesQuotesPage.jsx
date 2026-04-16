import { useState, useEffect, useCallback } from 'react'
import SuperAdminLayout from './SuperAdminLayout'
import { salesAPI } from '../../api/index'
import {
  FiFileText, FiPlus, FiTrash2, FiSend, FiSave, FiCopy, FiCheck,
  FiRefreshCw, FiExternalLink, FiMail,
} from 'react-icons/fi'

const STATUS_BADGE = {
  draft:    'bg-white/10 text-white/50',
  pending:  'bg-yellow-500/20 text-yellow-300',
  accepted: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-400',
  expired:  'bg-white/10 text-white/30',
}

const EMPTY_ITEM = () => ({ description: '', quantity: 1, unit_price: '' })

function QuoteEditor({ quote, onSaved, onSent }) {
  const [items, setItems] = useState(
    quote.items?.length ? quote.items.map(i => ({ ...i })) : [EMPTY_ITEM()]
  )
  const [title, setTitle]       = useState(quote.title || '')
  const [validUntil, setValid]  = useState(quote.valid_until || '')
  const [saving, setSaving]     = useState(false)
  const [sending, setSending]   = useState(false)
  const [copiedUrl, setCopied]  = useState(false)
  const [quoteUrl, setQuoteUrl] = useState('')
  const [toast, setToast]       = useState(null)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const total = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  const addItem    = () => setItems(prev => [...prev, EMPTY_ITEM()])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await salesAPI.saveItems(quote.id, {
        title,
        valid_until: validUntil || null,
        items: items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unit_price: String(Number(i.unit_price) || 0),
        })),
      })
      if (res.data?.success) {
        showToast('Draft saved')
        onSaved(res.data.data)
      }
    } catch (e) {
      showToast('Save failed', false)
    }
    setSaving(false)
  }

  const handleSend = async () => {
    if (!window.confirm(`Send quote to ${quote.client_email}?`)) return
    setSending(true)
    try {
      // Always save items first so amount is up to date before sending
      const saveRes = await salesAPI.saveItems(quote.id, {
        title,
        valid_until: validUntil || null,
        items: items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unit_price: String(Number(i.unit_price) || 0),
        })),
      })
      if (!saveRes.data?.success) {
        showToast('Failed to save items before sending', false)
        setSending(false)
        return
      }
      onSaved(saveRes.data.data)

      const res = await salesAPI.sendQuote(quote.id)
      if (res.data?.success) {
        setQuoteUrl(res.data.quote_url)
        showToast(res.data.email_sent ? 'Quote emailed to client!' : 'Quote sent (email failed, use manual URL)')
        onSent(res.data.data)
      }
    } catch (e) {
      showToast('Send failed', false)
    }
    setSending(false)
  }

  const handleResend = async () => {
    if (!window.confirm(`Resend quote to ${quote.client_email}?`)) return
    setSending(true)
    try {
      // Re-save items to ensure amount is current before resending
      const saveRes = await salesAPI.saveItems(quote.id, {
        title,
        valid_until: validUntil || null,
        items: items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unit_price: String(Number(i.unit_price) || 0),
        })),
      })
      if (!saveRes.data?.success) {
        showToast('Failed to save items before resending', false)
        setSending(false)
        return
      }
      onSaved(saveRes.data.data)

      const res = await salesAPI.sendQuote(quote.id)
      if (res.data?.success) {
        setQuoteUrl(res.data.quote_url)
        showToast('Quote resent!')
        onSent(res.data.data)
      }
    } catch (e) {
      showToast('Resend failed', false)
    }
    setSending(false)
  }

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const frontendUrl = window.location.origin
  const shareUrl = quoteUrl || (quote.is_sent ? `${frontendUrl}/quote/${quote.access_token}` : null)

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <div className="text-xs text-white/40 font-mono mb-0.5">{quote.quote_number}</div>
          <h2 className="text-lg font-semibold text-white">Quote Editor</h2>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_BADGE[quote.status] || 'bg-white/10 text-white/40'}`}>
          {quote.status}
        </span>
      </div>

      {/* Bill To */}
      <div className="px-6 py-4 border-b border-white/10 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Bill To</p>
          <p className="font-semibold">{quote.client_name}</p>
          <p className="text-sm text-white/60">{quote.client_email}</p>
          {quote.service_name && <p className="text-xs text-white/40 mt-0.5">Service: {quote.service_name}</p>}
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-1">From</p>
          <p className="font-semibold text-red-400">Aoqolt</p>
          <p className="text-sm text-white/60">contact@aoqolt.com</p>
        </div>
      </div>

      {/* Title + Valid Until */}
      <div className="px-6 py-4 border-b border-white/10 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/40 mb-1">Quote Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-red-500/60"
            placeholder="e.g. Treatment for Spiritual Consultation"
          />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Valid Until</label>
          <input
            type="date"
            value={validUntil}
            onChange={e => setValid(e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-red-500/60"
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-[1fr_80px_120px_32px] gap-2 text-xs text-white/40 uppercase tracking-wide mb-2">
          <span>Description</span><span>Qty</span><span>Unit Price</span><span />
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_80px_120px_32px] gap-2 items-center">
              <input
                value={item.description}
                onChange={e => updateItem(idx, 'description', e.target.value)}
                className="bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-red-500/60"
                placeholder="Treatment / service description"
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                className="bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-red-500/60 text-center"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                  className="w-full bg-white/5 rounded-lg pl-7 pr-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-red-500/60"
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={() => removeItem(idx)}
                className="text-white/30 hover:text-red-400 transition-colors p-1"
                disabled={items.length === 1}
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-3 flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
        >
          <FiPlus size={14} /> Add line item
        </button>
      </div>

      {/* Total */}
      <div className="px-6 py-3 border-t border-white/10 flex justify-end">
        <div className="text-right">
          <span className="text-sm text-white/50 mr-4">Total</span>
          <span className="text-2xl font-bold text-white">${total.toFixed(2)}</span>
          <span className="text-sm text-white/40 ml-1">{quote.currency || 'USD'}</span>
        </div>
      </div>

      {/* Share URL (if sent) */}
      {shareUrl && (
        <div className="px-6 py-3 border-t border-white/10 bg-white/3">
          <p className="text-xs text-white/40 mb-1.5">Client quote link</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs text-white/70 border border-white/10 outline-none font-mono"
            />
            <button
              onClick={() => copyUrl(shareUrl)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
              title="Copy"
            >
              {copiedUrl ? <FiCheck size={14} className="text-green-400" /> : <FiCopy size={14} />}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
              title="Open"
            >
              <FiExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <FiSave size={14} />{saving ? 'Saving…' : 'Save Draft'}
        </button>
        {quote.is_sent ? (
          <button
            onClick={handleResend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <FiMail size={14} />{sending ? 'Resending…' : 'Resend Quote'}
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={sending || total === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <FiSend size={14} />{sending ? 'Sending…' : 'Send Quote'}
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-6 mb-4 px-4 py-2 rounded-lg text-sm font-medium text-center ${toast.ok ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function SuperAdminSalesQuotesPage() {
  const [quotes, setQuotes]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [refreshKey, setRefresh]  = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await salesAPI.listQuotes()
      const data = res.data?.results || res.data?.data || res.data || []
      setQuotes(Array.isArray(data) ? data : [])
    } catch { setQuotes([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const handleSaved = (updated) => {
    setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q))
    setSelected(updated)
  }
  const handleSent = (updated) => {
    setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q))
    setSelected(updated)
  }

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Quotes</h1>
          <p className="text-white/35 text-sm mt-1">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setRefresh(k => k + 1)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/60"
          title="Refresh"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      <div className="flex gap-5 h-[calc(100vh-180px)] min-h-0">
        {/* Quote list */}
        <div className="w-72 flex-shrink-0 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
            ))
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-white/20">
              <FiFileText size={36} className="mb-3" />
              <p className="text-xs">No quotes yet</p>
              <p className="text-xs mt-1 text-white/15">Mark a case completed to auto-create</p>
            </div>
          ) : quotes.map(q => (
            <button
              key={q.id}
              onClick={() => setSelected(q)}
              className={`w-full text-left rounded-xl p-3.5 border transition-all ${selected?.id === q.id ? 'border-red-500/60 bg-red-500/10' : 'border-white/8 bg-white/5 hover:bg-white/8'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-mono text-white/50 leading-tight">{q.quote_number}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_BADGE[q.status] || 'bg-white/10 text-white/40'}`}>
                  {q.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{q.client_name}</p>
              <p className="text-xs text-white/45 truncate">{q.title || q.service_name || 'No title'}</p>
              <p className="text-sm font-bold text-red-400 mt-1">${Number(q.amount).toFixed(2)}</p>
            </button>
          ))}
        </div>

        {/* Editor panel */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <QuoteEditor
              key={selected.id}
              quote={selected}
              onSaved={handleSaved}
              onSent={handleSent}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
              <FiFileText size={48} className="mb-4 text-white/10" />
              <p className="text-sm">Select a quote to edit</p>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  )
}
