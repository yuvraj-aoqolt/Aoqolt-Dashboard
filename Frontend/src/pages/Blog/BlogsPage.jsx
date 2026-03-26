import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { FiArrowRight, FiSearch, FiCalendar, FiUser, FiBookOpen, FiPlus, FiList, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { blogsAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import LoadingScreen from '../../components/LoadingScreen'

const PAGE_SIZE = 9

function BlogCard({ blog, index, user, onDelete }) {
  const date = blog.published_at || blog.created_at
  const canEdit = user && (
    user.role === 'superadmin' ||
    (user.can_manage_blogs && blog.author?.id === user.id)
  )
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.preventDefault()
    if (!window.confirm(`Delete "${blog.title}"?`)) return
    setDeleting(true)
    try {
      await blogsAPI.delete(blog.id)
      toast.success('Blog deleted.')
      onDelete(blog.id)
    } catch {
      toast.error('Delete failed.')
    } finally {
      setDeleting(false)
    }
  }
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="group glass rounded-2xl border border-white/5 hover:border-red-900/30 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Poster image */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-white/3 flex-shrink-0">
        {blog.poster_image_url ? (
          <img
            src={blog.poster_image_url}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiBookOpen className="text-white/10" size={48} />
          </div>
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Edit/Delete overlay for managers */}
        {canEdit && (
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              to={`/blogs/edit/${blog.id}`}
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all"
              title="Edit post"
            >
              <FiEdit2 size={12} />
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-7 h-7 rounded-lg bg-red-900/70 hover:bg-red-700 flex items-center justify-center text-white transition-all disabled:opacity-40"
              title="Delete post"
            >
              <FiTrash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5">
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 text-[11px] text-white/30">
          {blog.author?.full_name && (
            <span className="flex items-center gap-1">
              <FiUser size={10} />
              {blog.author.full_name}
            </span>
          )}
          {date && (
            <span className="flex items-center gap-1">
              <FiCalendar size={10} />
              {format(new Date(date), 'MMM d, yyyy')}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-base leading-snug mb-2 line-clamp-2 group-hover:text-red-300 transition-colors">
          {blog.title}
        </h3>

        {/* Description */}
        <p className="text-white/45 text-sm leading-relaxed line-clamp-3 flex-1">
          {blog.description}
        </p>

        {/* Read More */}
        <Link
          to={`/blogs/${blog.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm font-medium transition-colors group/link"
        >
          Read More
          <FiArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.article>
  )
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  return (
    <div className="flex items-center justify-center gap-2 mt-14 flex-wrap">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ← Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
            p === page
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
              : 'text-white/40 hover:text-white hover:bg-white/8'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Next →
      </button>
    </div>
  )
}

export default function BlogsPage() {
  const { user, isSuperAdmin } = useAuth()
  const isManager = isSuperAdmin || !!user?.can_manage_blogs

  const [blogs, setBlogs]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [debouncedSearch, setDeb]   = useState('')
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]           = useState(0)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setDeb(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    blogsAPI
      .list({ page, page_size: PAGE_SIZE, search: debouncedSearch })
      .then(({ data }) => {
        setBlogs(data.results || [])
        setTotalPages(data.total_pages || 1)
        setTotal(data.count || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])

  const handleDelete = (id) => setBlogs((prev) => prev.filter((b) => b.id !== id))

  return (
    <div className="min-h-screen bg-dark pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <span className="text-xs text-red-400 uppercase tracking-widest font-medium">
            Insights & Wisdom
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mt-3 mb-4">
            Our Blog
          </h1>
          <p className="text-white/40 max-w-xl mx-auto text-base">
            Explore articles on spiritual growth, aura readings, astrology, and inner awakening.
          </p>
        </motion.div>

        {/* Manager toolbar */}
        {isManager && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-end gap-3 mb-8 -mt-4"
          >
            <Link
              to="/blogs/my"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/8 text-white/70 hover:text-white text-sm font-medium transition-all"
            >
              <FiList size={14} />
              My Posts
            </Link>
            <Link
              to="/blogs/create"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-red-900/30"
            >
              <FiPlus size={14} />
              New Post
            </Link>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-12">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="w-full bg-white/5 border border-white/10 focus:border-red-600/30 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-white/25 outline-none transition-all text-sm"
          />
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-white/25 text-xs mb-6 text-center">
            {total} article{total !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-white/10 border-t-red-500 rounded-full"
            />
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24 text-white/20">
            <FiBookOpen size={40} className="mx-auto mb-4 opacity-30" />
            <p>No articles found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog, i) => (
              <BlogCard key={blog.id} blog={blog} index={i} user={user} onDelete={handleDelete} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
