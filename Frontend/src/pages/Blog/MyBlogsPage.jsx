import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiBookOpen } from 'react-icons/fi'
import { blogsAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'
import LoadingScreen from '../../components/LoadingScreen'

const STATUS_BADGE = {
  published: 'bg-green-900/30 text-green-400',
  draft:     'bg-white/8 text-white/40',
}

export default function MyBlogsPage() {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const [blogs, setBlogs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    blogsAPI
      .myBlogs()
      .then(({ data }) => setBlogs(data.results || []))
      .catch(() => toast.error('Failed to load blogs.'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (blog) => {
    if (!window.confirm(`Delete "${blog.title}"?`)) return
    setDeleting(blog.id)
    try {
      await blogsAPI.delete(blog.id)
      setBlogs((prev) => prev.filter((b) => b.id !== blog.id))
      toast.success('Blog deleted.')
    } catch {
      toast.error('Failed to delete blog.')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-dark pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white">My Blog Posts</h1>
            <p className="text-white/30 text-sm mt-1">{blogs.length} article{blogs.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            to="/blogs/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
          >
            <FiPlus size={15} />
            New Post
          </Link>
        </motion.div>

        {blogs.length === 0 ? (
          <div className="text-center py-24 text-white/20">
            <FiBookOpen size={40} className="mx-auto mb-4 opacity-30" />
            <p className="mb-4">No posts yet.</p>
            <Link to="/blogs/create" className="text-red-400 hover:text-red-300 text-sm underline underline-offset-4">
              Write your first article →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {blogs.map((blog, i) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-2xl border border-white/5 hover:border-white/10 p-5 flex items-center gap-4 flex-wrap transition-all"
              >
                {/* Poster thumb */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                  {blog.poster_image_url ? (
                    <img src={blog.poster_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      <FiBookOpen size={22} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{blog.title}</p>
                  <p className="text-white/35 text-xs mt-0.5 line-clamp-1">{blog.description}</p>
                  <p className="text-white/20 text-[11px] mt-1">
                    {format(new Date(blog.created_at), 'MMM d, yyyy')}
                  </p>
                </div>

                {/* Status badge */}
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STATUS_BADGE[blog.status] || STATUS_BADGE.draft}`}>
                  {blog.status}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/blogs/${blog.slug}`}
                    title="View"
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                  >
                    <FiEye size={14} />
                  </Link>
                  <Link
                    to={`/blogs/edit/${blog.id}`}
                    title="Edit"
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                  >
                    <FiEdit2 size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(blog)}
                    disabled={deleting === blog.id}
                    title="Delete"
                    className="w-8 h-8 rounded-lg bg-red-900/15 hover:bg-red-900/30 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-all disabled:opacity-40"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
