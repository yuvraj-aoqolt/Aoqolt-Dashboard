import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiEye,
  FiBookOpen, FiShield,
} from 'react-icons/fi'
import { blogsAPI } from '../../api'
import SuperAdminLayout from './SuperAdminLayout'
import LoadingScreen from '../../components/LoadingScreen'

const STATUS_BADGE = {
  published: 'bg-green-900/30 text-green-400',
  draft:     'bg-white/8 text-white/40',
}

export default function SuperAdminBlogsPage() {
  const [blogs, setBlogs]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setFilter] = useState('all')
  const [deleting, setDeleting] = useState(null)
  const [page, setPage]         = useState(1)
  const [totalPages, setTotal]  = useState(1)

  const load = (p = 1) => {
    setLoading(true)
    const params = { page: p, page_size: 15, search }
    if (statusFilter !== 'all') params.status = statusFilter
    blogsAPI
      .list(params)
      .then(({ data }) => {
        setBlogs(data.results || [])
        setTotal(data.total_pages || 1)
        setPage(p)
      })
      .catch(() => toast.error('Failed to load blogs.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [search, statusFilter])

  const handleDelete = async (blog) => {
    if (!window.confirm(`Delete "${blog.title}"?`)) return
    setDeleting(blog.id)
    try {
      await blogsAPI.delete(blog.id)
      setBlogs((prev) => prev.filter((b) => b.id !== blog.id))
      toast.success('Blog deleted.')
    } catch {
      toast.error('Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  const toggleStatus = async (blog) => {
    const newStatus = blog.status === 'published' ? 'draft' : 'published'
    const fd = new FormData()
    fd.append('status', newStatus)
    try {
      await blogsAPI.update(blog.id, fd)
      setBlogs((prev) => prev.map((b) => b.id === blog.id ? { ...b, status: newStatus } : b))
      toast.success(`Blog ${newStatus === 'published' ? 'published' : 'moved to draft'}.`)
    } catch {
      toast.error('Failed to update status.')
    }
  }

  if (loading && blogs.length === 0) return (
    <SuperAdminLayout>
      <LoadingScreen />
    </SuperAdminLayout>
  )

  return (
    <SuperAdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
            <p className="text-white/30 text-sm mt-1">{blogs.length} articles</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blogs…"
                className="pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/8 focus:border-white/20 rounded-xl text-white placeholder:text-white/25 outline-none transition-colors w-48"
              />
            </div>
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setFilter(e.target.value)}
              className="py-2 px-3 text-sm bg-white/5 border border-white/8 rounded-xl text-white/70 outline-none cursor-pointer"
            >
              <option value="all"       className="bg-gray-900">All</option>
              <option value="published" className="bg-gray-900">Published</option>
              <option value="draft"     className="bg-gray-900">Draft</option>
            </select>
            {/* Manage Permissions */}
            <Link
              to="/superadmin/blog-permissions"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12 text-white/70 hover:text-white text-sm font-medium transition-colors border border-white/8"
            >
              <FiShield size={14} />
              Manage Permissions
            </Link>
            {/* Create */}
            <Link
              to="/blogs/create"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
            >
              <FiPlus size={14} />
              New Post
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-7 h-7 border-2 border-white/10 border-t-red-500 rounded-full" />
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-16 text-white/20">
              <FiBookOpen size={34} className="mx-auto mb-3 opacity-30" />
              No blog posts found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/6">
                    {['Post', 'Author', 'Status', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-white/35 text-[11px] font-semibold uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blogs.map((blog, i) => (
                    <motion.tr
                      key={blog.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025 }}
                      className="border-b border-white/4 hover:bg-white/3 transition-colors"
                    >
                      {/* Post */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                            {blog.poster_image_url ? (
                              <img src={blog.poster_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/15">
                                <FiBookOpen size={14} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate max-w-[200px]">{blog.title}</p>
                            <p className="text-white/30 text-xs truncate max-w-[200px]">{blog.description}</p>
                          </div>
                        </div>
                      </td>
                      {/* Author */}
                      <td className="py-3 px-4 text-white/50 text-sm">{blog.author?.full_name || '—'}</td>
                      {/* Status toggle */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleStatus(blog)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:ring-1 hover:ring-white/20 ${STATUS_BADGE[blog.status] || STATUS_BADGE.draft}`}
                          title="Click to toggle"
                        >
                          {blog.status}
                        </button>
                      </td>
                      {/* Date */}
                      <td className="py-3 px-4 text-white/35 text-xs whitespace-nowrap">
                        {format(new Date(blog.created_at), 'MMM d, yyyy')}
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Link to={`/blogs/${blog.slug}`}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all" title="View">
                            <FiEye size={13} />
                          </Link>
                          <Link to={`/blogs/edit/${blog.id}`}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all" title="Edit">
                            <FiEdit2 size={13} />
                          </Link>
                          <button onClick={() => handleDelete(blog)} disabled={deleting === blog.id}
                            className="w-7 h-7 rounded-lg bg-red-900/15 hover:bg-red-900/30 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-all disabled:opacity-40" title="Delete">
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 mt-6 justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => load(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  p === page ? 'bg-red-600 text-white' : 'text-white/35 hover:bg-white/8 hover:text-white'
                }`}>{p}</button>
            ))}
          </div>
        )}
      </motion.div>
    </SuperAdminLayout>
  )
}
